#!/usr/bin/env node
/* Apply AI changes from clipboard or stdin.
   Formats:
   A) Unified diff (raw or inside ```diff/```patch) → git apply
      - Auto-extracts diff code blocks from the message
      - Dry-run uses `git apply --check`
      - Tries strategies:
          default, unidiff-zero,
          -p1, -p1 + unidiff-zero,
          -p2, -p2 + unidiff-zero,
          (and for apply) --3way, --3way + unidiff-zero, --3way -p1 (+unidiff-zero), --3way -p2 (+unidiff-zero)
      - Always uses --recount to recalc broken hunk counts
      - Path rewrite: a/src/... → a/apps/<base>/src/... (base=backend|frontend) or custom --map
      - Sanitizes malformed diffs: adds missing context " " in hunks, strips BOM/ZW/NBSP, normalizes EOL
      - Strips non-diff trailers in raw text (промпт/описания в конце не попадут в git apply)
   B) Path-blocks:
      <!-- path: relative/path.ext[, action: delete|replace|append|move, from: old/path.ext] -->
      ```lang
      ...full file content...
      ```
   Default action for blocks: replace

   Usage:
     pbpaste | node scripts/apply-from-clipboard.mjs [--root .] [--dry-run] [--verbose]
     node scripts/apply-from-clipboard.mjs --dry-run
   Extra flags:
     --map=FROM:TO        Add path rewrite rule (e.g. --map=src:apps/backend/src)
     --src-base=backend|frontend  Shortcut for mapping plain "src" (default: backend)
     --save-input         Save raw input to ai.last.txt
     --no-path-rewrite    Disable automatic path rewrite heuristics
*/
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const flags = {
  root: '.',
  dryRun: false,
  verbose: false,
  saveInput: false,
  noPathRewrite: false,
  srcBase: 'backend',
  maps: [],
};

for (const a of args) {
  if (a === '--dry-run') flags.dryRun = true;
  else if (a === '--verbose') flags.verbose = true;
  else if (a === '--save-input') flags.saveInput = true;
  else if (a === '--no-path-rewrite') flags.noPathRewrite = true;
  else if (a.startsWith('--root=')) flags.root = a.slice('--root='.length);
  else if (a.startsWith('--src-base=')) flags.srcBase = a.slice('--src-base='.length);
  else if (a.startsWith('--map=')) {
    const v = a.slice('--map='.length);
    const idx = v.indexOf(':');
    if (idx > 0) flags.maps.push({ from: v.slice(0, idx).replace(/^\/+/, ''), to: v.slice(idx + 1).replace(/^\/+/, '') });
    else {
      console.error('Invalid --map format. Expected --map=FROM:TO');
      process.exit(1);
    }
  }
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

// ---------- Helpers ----------
function normalizeEOL(s) {
  return s.replace(/\r\n/g, '\n');
}
function ensureTrailingLF(s) {
  return s.endsWith('\n') ? s : s + '\n';
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
// ---------- End helpers ----------

// Extract diff/patch code blocks
function extractCodeBlockDiffs(input) {
  const re = /```(?:diff|patch)[^\n]*\n([\s\S]*?)```/gi;
  const parts = [];
  let m;
  while ((m = re.exec(input)) !== null) parts.push(m[1]);
  return parts;
}

// Extract all raw unified diff segments from free text (strip trailers)
function extractUnifiedDiffSegments(input) {
  const txt = normalizeEOL(input);
  const lines = txt.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^diff --git /.test(lines[i])) starts.push(i);
  }
  if (!starts.length) return [];

  const segments = [];
  const allowedHeaderPrefixes = [
    'diff --git ',
    'index ',
    '--- ',
    '+++ ',
    'new file mode',
    'deleted file mode',
    'rename from ',
    'rename to ',
    'similarity index ',
    'dissimilarity index ',
    'old mode ',
    'new mode ',
    'Binary files ',
    'GIT binary patch',
  ];

  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : lines.length;
    const seg = lines.slice(start, end);

    let inHunk = false;
    let lastValid = -1;

    for (let i = 0; i < seg.length; i++) {
      const l = seg[i];

      if (/^@@ /.test(l)) {
        inHunk = true;
        lastValid = i;
        continue;
      }

      if (inHunk) {
        if (/^[ +\-\\]/.test(l) || /^@@ /.test(l)) {
          lastValid = i;
          continue;
        }
        if (allowedHeaderPrefixes.some((p) => l.startsWith(p))) {
          inHunk = false;
          lastValid = i;
          continue;
        }
        continue;
      } else {
        if (allowedHeaderPrefixes.some((p) => l.startsWith(p))) {
          lastValid = i;
          continue;
        }
      }
    }

    if (lastValid >= 0) {
      const trimmed = seg.slice(0, lastValid + 1);
      segments.push(ensureTrailingLF(trimmed.join('\n')));
    }
  }

  return segments;
}

function extractUnifiedDiffSegment(input) {
  const segs = extractUnifiedDiffSegments(input);
  if (segs.length) return ensureTrailingLF(segs.join('\n'));
  return '';
}

function getPatchText(input) {
  const blocks = extractCodeBlockDiffs(input);
  if (blocks.length) {
    log(`found ${blocks.length} diff/patch code block(s)`);
    return ensureTrailingLF(blocks.join('\n\n'));
  }
  if (/(^|\n)diff --git\s/.test(input) || /(^|\n)From [0-9a-f]{7,}\s/m.test(input)) {
    const seg = extractUnifiedDiffSegment(input);
    if (seg) {
      log('using unified diff segment(s) from raw text');
      return seg;
    }
  }
  return '';
}

// ---------- Sanitization of malformed diffs ----------
function sanitizePatch(patch) {
  let txt = normalizeEOL(patch)
    .replace(/^\uFEFF/, '')
    .replace(/\n\uFEFF/g, '\n');
  const lines = txt.split('\n');
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];

    // Remove leading zero-width and NBSP characters; they often break prefixes
    l = l.replace(/^[\u200B\u200C\u200D\u00A0]+/, '');

    if (/^@@ /.test(l)) {
      inHunk = true;
      lines[i] = l;
      continue;
    }
    // Headers turn hunk mode off
    if (/^(diff --git |index |--- |\+\+\+ |new file mode|deleted file mode|rename from |rename to |similarity index |dissimilarity index |old mode |new mode |Binary files |GIT binary patch)/.test(l)) {
      inHunk = false;
      lines[i] = l;
      continue;
    }
    if (inHunk) {
      // Valid hunk lines: ' ', '+', '-', '\' (No newline at end of file)
      if (!/^[ +\-\\]/.test(l)) {
        l = ' ' + l;
      }
      lines[i] = l;
    } else {
      lines[i] = l;
    }
  }
  return ensureTrailingLF(lines.join('\n'));
}
// ---------- end sanitization ----------

function rewritePatchPaths(patch, pairs) {
  let out = patch;
  for (const p of pairs) {
    const from = p.from.replace(/^\/+/, '').replace(/\/+$/, '');
    const to = p.to.replace(/^\/+/, '').replace(/\/+$/, '');
    const rules = [
      { from: `a/${from}/`, to: `a/${to}/` },
      { from: `b/${from}/`, to: `b/${to}/` },
      { from: `--- a/${from}/`, to: `--- a/${to}/` },
      { from: `+++ b/${from}/`, to: `+++ b/${to}/` },
    ];
    for (const r of rules) out = out.replace(new RegExp(escapeRe(r.from), 'g'), r.to);
  }
  return out;
}
function inferDefaultMappingsForSrc(patch) {
  const pairs = [];
  if (/(^|\n)(--- a\/src\/|\+\+\+ b\/src\/|diff --git a\/src\/|diff --git [^\n]* b\/src\/)/.test(patch)) {
    const target = flags.srcBase === 'frontend' ? 'apps/frontend/src' : 'apps/backend/src';
    pairs.push({ from: 'src', to: target });
  }
  return pairs;
}

function applyGitPatch(patchText, { tryRewrites = true } = {}) {
  const modeLabel = flags.dryRun ? 'Checking patch (dry-run)...' : 'Applying patch...';
  console.log(`Detected unified diff. ${modeLabel}`);

  // Always try to recalc broken hunk counts; fix whitespace
  const baseArgs = flags.dryRun ? ['--check', '--recount', '--whitespace=fix'] : ['--index', '--reject', '--recount', '--whitespace=fix'];
  const tryApply = (text, extraArgs = [], label = '') =>
    spawnSync('git', ['apply', ...baseArgs, ...extraArgs], { input: text, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });

  const strategies = flags.dryRun
    ? [
        { args: [], label: 'default' },
        { args: ['--unidiff-zero'], label: 'unidiff-zero' },
        { args: ['-p1'], label: 'strip -p1' },
        { args: ['-p1', '--unidiff-zero'], label: 'strip -p1 + unidiff-zero' },
        { args: ['-p2'], label: 'strip -p2' },
        { args: ['-p2', '--unidiff-zero'], label: 'strip -p2 + unidiff-zero' },
      ]
    : [
        { args: [], label: 'default' },
        { args: ['--unidiff-zero'], label: 'unidiff-zero' },
        { args: ['-p1'], label: 'strip -p1' },
        { args: ['-p1', '--unidiff-zero'], label: 'strip -p1 + unidiff-zero' },
        { args: ['-p2'], label: 'strip -p2' },
        { args: ['-p2', '--unidiff-zero'], label: 'strip -p2 + unidiff-zero' },
        { args: ['--3way'], label: '3-way' },
        { args: ['--3way', '--unidiff-zero'], label: '3-way + unidiff-zero' },
        { args: ['--3way', '-p1'], label: '3-way -p1' },
        { args: ['--3way', '-p1', '--unidiff-zero'], label: '3-way -p1 + unidiff-zero' },
        { args: ['--3way', '-p2'], label: '3-way -p2' },
        { args: ['--3way', '-p2', '--unidiff-zero'], label: '3-way -p2 + unidiff-zero' },
      ];

  // First sanitize the incoming patch
  let working = sanitizePatch(patchText);

  for (const s of strategies) {
    const res = tryApply(working, s.args, s.label);
    if (res.status === 0) {
      console.log(`Patch OK (${s.label}).`);
      return true;
    }
    console.warn(`git apply failed (${s.label}), trying next...`);
  }

  if (tryRewrites && !flags.noPathRewrite) {
    // User-defined map rules have priority
    let mapped = rewritePatchPaths(working, flags.maps);
    const inferred = inferDefaultMappingsForSrc(mapped);
    if (inferred.length) mapped = rewritePatchPaths(mapped, inferred);

    mapped = sanitizePatch(mapped);

    console.warn('Retrying with rewritten paths...');
    for (const s of strategies) {
      const res = tryApply(mapped, s.args, `rewrite + ${s.label}`);
      if (res.status === 0) {
        console.log(`Patch OK after rewrite (${s.label}).`);
        return true;
      }
      console.warn(`git apply failed (rewrite + ${s.label}), trying next...`);
    }
    const p1 = path.join(process.cwd(), 'ai.patch');
    const p2 = path.join(process.cwd(), 'ai.rewritten.patch');
    const p3 = path.join(process.cwd(), 'ai.sanitized.patch');
    fs.writeFileSync(p1, patchText, 'utf8');
    fs.writeFileSync(p2, mapped, 'utf8');
    fs.writeFileSync(p3, working, 'utf8');
    console.error(`All strategies failed. Saved to:\n  ${p1}\n  ${p2}\n  ${p3}\nTry: git apply ${flags.dryRun ? '--check ' : '--index --reject '} ${p2}`);
    process.exit(2);
  }

  const tmp = path.join(process.cwd(), 'ai.patch');
  fs.writeFileSync(tmp, patchText, 'utf8');
  console.error(`git apply failed. Patch saved to ${tmp}. Try: git apply ${flags.dryRun ? '--check ' : '--index --reject '} ${tmp}`);
  process.exit(2);
}

function parseBlocks(input) {
  const re = /<!--\s*path:\s*([^\s,>]+)(?:\s*,\s*([^>]*))?\s*-->\s*```(?:[a-zA-Z0-9#+.\-]*)\s*\n([\s\S]*?)```/g;
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
        if (idx === -1) options[kv.toLowerCase()] = true;
        else {
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

function applyBlocks(blocks, rootDir) {
  const actions = [];
  for (const b of blocks) {
    const outPath = resolveSafe(rootDir, b.relPath);
    const action = ((b.options.action || b.options.mode) ?? 'replace').toString().toLowerCase();
    if (action === 'delete') actions.push({ type: 'delete', outPath });
    else if (action === 'append') actions.push({ type: 'append', outPath, content: normalizeEOL(b.content) });
    else if (action === 'move') {
      const fromRel = b.options.from;
      if (!fromRel) {
        console.error(`Move action requires "from: old/path". Block: ${b.relPath}`);
        process.exit(2);
      }
      const fromPath = resolveSafe(rootDir, fromRel);
      actions.push({ type: 'move', fromPath, outPath });
      if (b.content && b.content.trim()) actions.push({ type: 'replace', outPath, content: normalizeEOL(b.content) });
    } else actions.push({ type: 'replace', outPath, content: normalizeEOL(b.content) });
  }

  if (flags.dryRun) {
    console.log('Dry-run. Planned changes:');
    for (const a of actions) {
      if (a.type === 'move') console.log('- move', path.relative(process.cwd(), a.fromPath), '→', path.relative(process.cwd(), a.outPath));
      else console.log('-', a.type, path.relative(process.cwd(), a.outPath));
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
      } else log('skip delete (not found)', a.outPath);
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
  if (flags.saveInput) fs.writeFileSync(path.join(process.cwd(), 'ai.last.txt'), input, 'utf8');

  const patch = getPatchText(input);
  if (patch) {
    applyGitPatch(patch, { tryRewrites: !flags.noPathRewrite });
    process.exit(0);
  }

  const blocks = parseBlocks(input);
  if (blocks.length) {
    applyBlocks(blocks, path.resolve(flags.root));
    process.exit(0);
  }

  console.error('No diff/patch block or path-blocks found. Provide either ```diff ...``` or <!-- path: ... --> blocks.');
  process.exit(1);
})();