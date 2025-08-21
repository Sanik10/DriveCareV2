#!/usr/bin/env node
/* Apply AI changes from clipboard or stdin.
   Supported formats:
   A) Unified diff (contains "diff --git") → applies via `git apply`.
   B) Path-blocks:
      <!-- path: relative/path.ext[, action: delete|replace|append|move, from: old/path.ext] -->
      ```lang
      ...full file content...
      ```
   - Default action is "replace".
   - delete: removes file.
   - append: appends content to file (creates if not exists).
   - move: moves file from "from" to "path" (no content block needed, but allowed).
   Usage:
     pbpaste | node scripts/apply-from-clipboard.mjs [--root .] [--dry-run] [--verbose]
     node scripts/apply-from-clipboard.mjs --dry-run (reads from clipboard on macOS)
*/
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const flags = {
  root: '.',
  dryRun: false,
  verbose: false,
};

for (const a of args) {
  if (a === '--dry-run') flags.dryRun = true;
  else if (a === '--verbose') flags.verbose = true;
  else if (a.startsWith('--root=')) flags.root = a.slice('--root='.length);
}

function log(...m) {
  if (flags.verbose) console.log('[apply]', ...m);
}

async function readInput() {
  const isPiped = !process.stdin.isTTY;
  if (isPiped) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  }
  const r = spawnSync('bash', ['-lc', 'pbpaste'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('Failed to read from clipboard. Pipe content via stdin or install pbpaste.');
    process.exit(1);
  }
  return r.stdout;
}

function applyGitPatch(patchText) {
  console.log('Detected unified diff. Applying via git apply...');
  const tryApply = (extraArgs = []) =>
    spawnSync('git', ['apply', '--index', '--reject', '--whitespace=fix', ...extraArgs], {
      input: patchText,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit'],
    });

  let res = tryApply([]);
  if (res.status !== 0) {
    console.warn('git apply failed, retry with -p1');
    res = tryApply(['-p1']);
  }
  if (res.status !== 0) {
    const tmp = path.join(process.cwd(), 'ai.patch');
    fs.writeFileSync(tmp, patchText, 'utf8');
    console.error(`git apply failed. Patch saved to ${tmp}. Try: git apply --index --reject ${tmp}`);
    process.exit(2);
  }
  console.log('Patch applied.');
}

function parseBlocks(input) {
  // Matches:
  // <!-- path: file[, key: value, key2: value2] -->
  // ```lang
  // content
  // ```
  const re =
    /<!--\s*path:\s*([^\s,>]+)(?:\s*,\s*([^>]*))?\s*-->\s*```(?:[a-zA-Z0-9#+.\-]*)\s*\n([\s\S]*?)```/g;
  const blocks = [];
  let m;
  while ((m = re.exec(input)) !== null) {
    const relPath = m[1].trim();
    const optsRaw = (m[2] || '').trim();
    const content = m[3] ?? '';
    const options = {};
    if (optsRaw) {
      for (const kv of optsRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
        const idx = kv.indexOf(':');
        if (idx === -1) {
          options[kv.toLowerCase()] = true;
        } else {
          const key = kv.slice(0, idx).trim().toLowerCase();
          const val = kv.slice(idx + 1).trim();
          options[key] = val;
        }
      }
    }
    blocks.push({ relPath, options, content });
  }
  return blocks;
}

function normalizeEOL(s) {
  return s.replace(/\r\n/g, '\n');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function resolveSafe(rootDir, rel) {
  const rootAbs = path.resolve(rootDir);
  const out = path.resolve(rootAbs, rel);
  if (out !== rootAbs && !out.startsWith(rootAbs + path.sep)) {
    throw new Error(`Path escapes root: ${rel}`);
  }
  return out;
}

function applyBlocks(blocks, rootDir) {
  const actions = [];
  for (const b of blocks) {
    const outPath = resolveSafe(rootDir, b.relPath);
    const action = ((b.options.action || b.options.mode) ?? 'replace').toString().toLowerCase();
    if (action === 'delete') {
      actions.push({ type: 'delete', outPath });
    } else if (action === 'append') {
      actions.push({ type: 'append', outPath, content: normalizeEOL(b.content) });
    } else if (action === 'move') {
      const fromRel = b.options.from;
      if (!fromRel) {
        console.error(`Move action requires "from: old/path". Block: ${b.relPath}`);
        process.exit(2);
      }
      const fromPath = resolveSafe(rootDir, fromRel);
      actions.push({ type: 'move', fromPath, outPath });
      // Optional: if content present with move, also replace destination content after move
      if (b.content && b.content.trim()) {
        actions.push({ type: 'replace', outPath, content: normalizeEOL(b.content) });
      }
    } else {
      actions.push({ type: 'replace', outPath, content: normalizeEOL(b.content) });
    }
  }

  if (flags.dryRun) {
    console.log('Dry-run. Planned changes:');
    for (const a of actions) {
      if (a.type === 'move') {
        console.log('- move', path.relative(process.cwd(), a.fromPath), '→', path.relative(process.cwd(), a.outPath));
      } else {
        console.log('-', a.type, path.relative(process.cwd(), a.outPath));
      }
    }
    return;
  }

  let changed = 0;
  for (const a of actions) {
    if (a.type === 'delete') {
      if (fs.existsSync(a.outPath)) {
        fs.rmSync(a.outPath);
        log('deleted', a.outPath);
        changed++;
      } else {
        log('skip delete (not found)', a.outPath);
      }
    } else if (a.type === 'append') {
      ensureDir(a.outPath);
      fs.appendFileSync(a.outPath, a.content);
      log('appended', a.outPath);
      changed++;
    } else if (a.type === 'move') {
      ensureDir(a.outPath);
      if (!fs.existsSync(a.fromPath)) {
        console.error(`Move failed: source not found ${a.fromPath}`);
        process.exit(2);
      }
      fs.renameSync(a.fromPath, a.outPath);
      log('moved', a.fromPath, '→', a.outPath);
      changed++;
    } else if (a.type === 'replace') {
      ensureDir(a.outPath);
      fs.writeFileSync(a.outPath, a.content);
      log('wrote', a.outPath);
      changed++;
    }
  }
  console.log(`Applied ${changed} change(s).`);
}

(async () => {
  const input = await readInput();
  if (!input || !input.trim()) {
    console.error('No input. Copy message to clipboard or pipe it via stdin.');
    process.exit(1);
  }

  if (/(^|\n)diff --git\s/.test(input)) {
    applyGitPatch(input);
    process.exit(0);
  }

  const blocks = parseBlocks(input);
  if (!blocks.length) {
    console.error('No blocks found. Expect either "diff --git" or <!-- path: ... --> + ```...``` blocks.');
    process.exit(1);
  }

  applyBlocks(blocks, path.resolve(flags.root));
})();
