#!/usr/bin/env node
/* Apply AI changes from clipboard or stdin.
   Formats:
   A) Unified diff (raw or inside ```diff/```patch) → git apply
      - Auto-extract multiple diff/patch code blocks and concatenate
      - If code blocks exist → use only them (no raw autoscan)
      - Dry-run uses `git apply --check` with enhanced strategy matrix
      - Tries strategies (no --reject, no --index):
          default, unidiff-zero,
          -p1, -p1 + unidiff-zero,
          -p2, -p2 + unidiff-zero,
          each with: --ignore-space-change, --ignore-whitespace,
          and 3-way variants (also for dry-run)
      - Always uses --recount and --whitespace=fix
      - Reverse-check per segment: if already applied → skip
      - Path rewrite: a/src/... → a/apps/<base>/src/... (base=backend|frontend) or custom --map
      - Sanitizes malformed diffs: context padding " ", strips BOM/ZW/NBSP, normalizes EOL
      - Splits mega-patch into diff segments (by diff --git) and applies sequentially (robust to duplicates)
      - If no "diff --git" segments found, tries whole unified patch (---/+++)
      - Saves ai.patch / ai.rewritten.patch / ai.sanitized.patch for debugging
      - On failure: falls back to path-blocks if present
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
     --map=FROM:TO               Add path rewrite rule (e.g. --map=src:apps/backend/src)
     --src-base=backend|frontend Shortcut for mapping plain "src" (default: backend)
     --save-input                Save raw input to ai.last.txt
     --no-path-rewrite          Disable automatic path rewrite heuristics
     --prefer-blocks            Skip diffs and apply path-blocks if present
     --only-diff                Ignore path-blocks completely (for testing pure patch)
     --only-blocks              Ignore diffs completely (alias of --prefer-blocks)
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
  preferBlocks: false,
  onlyDiff: false,
  onlyBlocks: false,
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
  } else if (a === '--prefer-blocks' || a === '--only-blocks') {
    flags.preferBlocks = true;
    flags.onlyBlocks = true;
  } else if (a === '--only-diff') {
    flags.onlyDiff = true;
  }
}

function log(...m) {
  if (flags.verbose) console.log('[apply]', ...m);
}

async function readInput() {
  const isPiped = !process.stdin.isTTY;
  if (isPiped) {
    const chunks = [];
    for await (const c of process.stdin) {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
    }
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

// Extract diff/patch code blocks (concat all blocks)
function extractCodeBlockDiffs(input) {
  const re = /```(?:diff|patch)[^\n]*\n([\s\S]*?)```/gi;
  const parts = [];
  let m;
  while ((m = re.exec(input)) !== null) parts.push(m[1]);
  return parts;
}

// Extract raw unified diff segments only if they start with "diff --git"
function extractUnifiedDiffSegmentsByDiffGit(input) {
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
      let l = seg[i];

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

// If message contains unified diff without "diff --git" (e.g. plain ---/+++), extract whole patch
function extractWholeUnifiedPatch(input) {
  const txt = normalizeEOL(input);
  // find first plausible patch header
  const lines = txt.split('\n');

  const isHeader = (l) =>
    /^diff --git /.test(l) ||
    /^---\s+\S/.test(l) ||
    /^\*\*\*\s+\S/.test(l) ||   // context diff (rare from LLMs)
    /^Index:\s+\S/.test(l);

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isHeader(lines[i])) { start = i; break; }
  }
  if (start === -1) return '';

  const patch = lines.slice(start).join('\n');

  // quick sanity check: unified diff should have +++ and @@ somewhere
  const hasTriple = /(^|\n)\+\+\+ /.test(patch);
  const hasHunk = /(^|\n)@@ /.test(patch);
  if (hasTriple || hasHunk) return ensureTrailingLF(patch);

  return '';
}

// Build final patch text (no duplication)
function getPatchText(input) {
  const blocks = extractCodeBlockDiffs(input);
  if (blocks.length) {
    log(`found ${blocks.length} diff/patch code block(s)`);
    // If blocks exist → use only them to avoid duplication
    return ensureTrailingLF(blocks.join('\n\n'));
  }
  const segs = extractUnifiedDiffSegmentsByDiffGit(input);
  if (segs.length) {
    log(`found ${segs.length} raw unified diff segment(s) via diff --git`);
    return ensureTrailingLF(segs.join('\n'));
  }
  // Try a whole unified patch (---/+++), if any
  const whole = extractWholeUnifiedPatch(input);
  if (whole) {
    log('found raw unified patch (---/+++ without diff --git)');
    return ensureTrailingLF(whole);
  }
  return '';
}

// ---------- Sanitization of malformed diffs ----------
function sanitizePatch(patch) {
  let txt = normalizeEOL(patch)
    .replace(/^\uFEFF/, '')
    .replace(/\n\uFEFF/g, '\n');

  // Common invisible troublemakers
  txt = txt.replace(/[\u200B\u200C\u200D\u2060\u00A0]/g, (m) => {
    // remove zero-widths and NBSP entirely
    return '';
  });

  const lines = txt.split('\n');
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];

    // Trim only trailing \r (in case some sneaked in)
    if (l.endsWith('\r')) l = l.slice(0, -1);

    if (/^@@ /.test(l)) {
      inHunk = true;
      lines[i] = l;
      continue;
    }
    // Headers turn hunk mode off
    if (/^(diff --git |index |--- |\+\+\+ |new file mode|deleted file mode|rename from |rename to |similarity index |dissimilarity index |old mode |new mode |Binary files |GIT binary patch|Index: )/.test(l)) {
      inHunk = false;
      lines[i] = l;
      continue;
    }
    if (inHunk) {
      // Valid hunk lines: ' ', '+', '-', '\' (No newline at end of file)
      if (!/^[ +\-\\]/.test(l)) {
        // Prepend space to salvage malformed context lines
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
      // Also attempt raw ---/+++ without a/b prefixes
      { from: `--- ${from}/`, to: `--- ${to}/` },
      { from: `+++ ${from}/`, to: `+++ ${to}/` },
    ];
    for (const r of rules) out = out.replace(new RegExp(escapeRe(r.from), 'g'), r.to);
  }
  return out;
}

function inferDefaultMappingsForSrc(patch) {
  const pairs = [];
  if (/(^|\n)(--- a\/src\/|\+\+\+ b\/src\/|diff --git a\/src\/|diff --git [^\n]* b\/src\/|--- src\/|\+\+\+ src\/)/.test(patch)) {
    const target = flags.srcBase === 'frontend' ? 'apps/frontend/src' : 'apps/backend/src';
    pairs.push({ from: 'src', to: target });
  }
  return pairs;
}

function splitPatchIntoSegments(patch) {
  const lines = patch.split('\n');
  const segments = [];
  let buf = [];
  let sawAnyDiffGit = false;

  for (const l of lines) {
    if (l.startsWith('diff --git ')) {
      sawAnyDiffGit = true;
      if (buf.length) segments.push(ensureTrailingLF(buf.join('\n')));
      buf = [l];
    } else {
      buf.push(l);
    }
  }
  if (buf.length) segments.push(ensureTrailingLF(buf.join('\n')));

  // If there was no diff --git at all, treat the "segment" as a single patch
  if (!sawAnyDiffGit) {
    return [ensureTrailingLF(patch)];
  }

  return segments.filter(s => s.trim().length > 0);
}

function tryGitApply(text, extraArgs = [], label = '') {
  const baseArgs = flags.dryRun
    ? ['--check', '--recount', '--whitespace=fix']
    : ['--recount', '--whitespace=fix'];
  const args = ['apply', ...baseArgs, ...extraArgs];
  log('git', args.join(' '), label ? `[${label}]` : '');
  return spawnSync('git', args, { input: text, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
}

function buildStrategies() {
  const bases = [
    [],
    ['--unidiff-zero'],
    ['-p1'],
    ['-p1', '--unidiff-zero'],
    ['-p2'],
    ['-p2', '--unidiff-zero'],
  ];
  const ignores = [
    [],
    ['--ignore-space-change'],
    ['--ignore-whitespace'],
  ];
  const combos = [];
  for (const b of bases) for (const ig of ignores) combos.push([...b, ...ig]);

  const with3way = [];
  for (const c of combos) with3way.push(['--3way', ...c]);

  // Prefer 3-way first (helps when worktree diverged), then plain combos
  return [...with3way, ...combos];
}

function reverseCheck(text) {
  // If segment seems already applied, `git apply --reverse --check` should succeed for some combo
  const reverseCombos = [
    [],
    ['--unidiff-zero'],
    ['-p1'],
    ['-p2'],
    ['--ignore-space-change'],
    ['--ignore-whitespace'],
    ['--3way'],
  ];
  for (const s of reverseCombos) {
    const res = tryGitApply(text, ['--reverse', ...s], `reverse ${s.join(' ')}`);
    if (res.status === 0) return true;
  }
  return false;
}

function applySegment(seg) {
  const strategies = buildStrategies();

  // Quick reverse-check per segment
  if (!flags.dryRun && reverseCheck(seg)) {
    console.log('Segment already applied (reverse-check). Skipping.');
    return { ok: true, alreadyApplied: true };
  }

  for (const s of strategies) {
    const res = tryGitApply(seg, s, `seg ${s.join(' ')}`);
    if (res.status === 0) return { ok: true, alreadyApplied: false };
  }
  return { ok: false, alreadyApplied: false };
}

function applyGitPatch(patchText, { tryRewrites = true } = {}) {
  console.log(`Detected unified diff. ${flags.dryRun ? 'Checking patch (dry-run)...' : 'Applying patch...'}`);

  const orig = sanitizePatch(patchText);

  // 1) Try original, split into segments, apply sequentially
  let segments = splitPatchIntoSegments(orig);
  let allOk = true;
  let anyApplied = false;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    console.log(`>>> Applying segment ${i + 1}/${segments.length}`);
    const r = applySegment(seg);
    if (r.ok) { anyApplied = true; continue; }
    allOk = false;
    console.warn(`Segment ${i + 1} failed on original paths.`);
  }
  if (allOk) {
    console.log('Patch OK (all segments).');
    return { ok: true, alreadyApplied: !anyApplied };
  }

  // 2) Try path rewrites if allowed
  if (tryRewrites && !flags.noPathRewrite) {
    let mapped = rewritePatchPaths(orig, flags.maps);
    const inferred = inferDefaultMappingsForSrc(mapped);
    if (inferred.length) mapped = rewritePatchPaths(mapped, inferred);
    mapped = sanitizePatch(mapped);

    const segs2 = splitPatchIntoSegments(mapped);
    let allOk2 = true;
    let anyApplied2 = false;
    for (let i = 0; i < segs2.length; i++) {
      const seg = segs2[i];
      console.log(`>>> Applying (rewritten) segment ${i + 1}/${segs2.length}`);
      const r = applySegment(seg);
      if (r.ok) { anyApplied2 = true; continue; }
      allOk2 = false;
      console.warn(`Segment ${i + 1} failed on rewritten paths.`);
    }
    if (allOk2) {
      console.log('Patch OK after rewrite (all segments).');
      return { ok: true, alreadyApplied: !anyApplied2 };
    }

    // Save debugging artifacts
    const p1 = path.join(process.cwd(), 'ai.patch');
    const p2 = path.join(process.cwd(), 'ai.rewritten.patch');
    const p3 = path.join(process.cwd(), 'ai.sanitized.patch');
    fs.writeFileSync(p1, patchText, 'utf8');
    fs.writeFileSync(p2, mapped, 'utf8');
    fs.writeFileSync(p3, orig, 'utf8');
    console.warn(`Some segments failed. Saved to:\n  ${p1}\n  ${p2}\n  ${p3}`);
    return { ok: false, alreadyApplied: false };
  }

  const tmp = path.join(process.cwd(), 'ai.patch');
  fs.writeFileSync(tmp, patchText, 'utf8');
  console.warn(`git apply failed. Patch saved to ${tmp}.`);
  return { ok: false, alreadyApplied: false };
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

  const patch = flags.onlyBlocks ? '' : getPatchText(input);
  const blocks = flags.onlyDiff ? [] : parseBlocks(input);

  // Prefer blocks if asked
  if (flags.preferBlocks && blocks.length) {
    applyBlocks(blocks, path.resolve(flags.root));
    process.exit(0);
  }

  if (patch) {
    const res = applyGitPatch(patch, { tryRewrites: !flags.noPathRewrite });
    if (res.ok) process.exit(0);

    // Fallback to blocks if diff failed and blocks exist
    if (blocks.length) {
      console.warn('Diff failed. Falling back to path-blocks...');
      applyBlocks(blocks, path.resolve(flags.root));
      process.exit(0);
    }

    // Final failure
    console.error('Diff/patch failed and no path-blocks found. See ai.patch/ai.rewritten.patch/ai.sanitized.patch for details.');
    process.exit(2);
  }

  // No diff → try blocks
  if (blocks.length) {
    applyBlocks(blocks, path.resolve(flags.root));
    process.exit(0);
  }

  console.error('No diff/patch block or path-blocks found. Provide either ```diff ...``` or <!-- path: ... --> blocks.');
  process.exit(1);
})();
