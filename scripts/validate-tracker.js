// path: scripts/validate-tracker.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'docs', 'SECURITY_COMPLIANCE_AUDIT_TRACKER.md');

function formatRuDate(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

function ensureFile() {
  if (!fs.existsSync(FILE)) {
    console.error(`Tracker file not found: ${FILE}`);
    process.exit(1);
  }
  return fs.readFileSync(FILE, 'utf8');
}

function updateLastUpdated(md) {
  const today = formatRuDate();
  const re = /(Последнее обновление:\s*)(\d{2}\.\d{2}\.\d{4})/;
  if (!re.test(md)) return { md, changed: false };

  const current = md.match(re)?.[2];
  if (current === today) return { md, changed: false };

  const updated = md.replace(re, `$1${today}`);
  return { md: updated, changed: true, info: { from: current, to: today } };
}

function checkMasterTable(md) {
  const rowRe = /^\|\s*14\s*\|\s*inventory\/alerts\s*\|([^\|]+)\|\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\|]+)\|$/m;
  const match = md.match(rowRe);
  if (!match) return { ok: false, reason: 'Строка inventory/alerts в мастер‑таблице не найдена' };

  const tech = match[1].trim();
  const legal = match[2].trim();
  const status = match[4].trim();

  const techOk = tech.includes('Tech‑Hardened') || tech.includes('Tech-Hardened');
  const statusOk = status.includes('Near‑Ready (Tech)') || status.includes('Near-Ready (Tech)');
  const legalOk = legal.includes('402‑ФЗ') || legal.includes('402-ФЗ');

  if (techOk && statusOk && legalOk) return { ok: true };

  return {
    ok: false,
    reason: `Строка inventory/alerts устарела: tech="${tech}", legal="${legal}", status="${status}"`,
  };
}

function checkDetailsSection(md) {
  const hasSection = md.includes('## 🧩 Inventory/Alerts — детальное состояние') || md.includes('## 🧩 Inventory/Alerts');
  return { ok: hasSection };
}

function maybeWrite(md, original, changes) {
  const write = process.env.TRACKER_WRITE === '1';
  if (!write) return false;
  if (md !== original) {
    fs.writeFileSync(FILE, md, 'utf8');
    console.log('Tracker auto-updated:', changes.filter(Boolean).join('; '));
    return true;
  }
  return false;
}

(function main() {
  const original = ensureFile();
  let md = original;
  const changes = [];

  // 1) Обновить дату
  const upd = updateLastUpdated(md);
  md = upd.md;
  if (upd.changed) changes.push(`LastUpdated ${upd.info?.from} -> ${upd.info?.to}`);

  // 2) Проверить мастер‑таблицу
  const table = checkMasterTable(md);
  if (!table.ok) {
    console.error(`Tracker check failed: ${table.reason}`);
    if (!maybeWrite(md, original, changes)) process.exit(1);
  }

  // 3) Проверить наличие секции Alerts
  const details = checkDetailsSection(md);
  if (!details.ok) {
    console.error('Tracker check failed: не найден детальный раздел Inventory/Alerts');
    if (!maybeWrite(md, original, changes)) process.exit(1);
  }

  // Если были изменения даты — возможно записать
  if (!table.ok || !details.ok) return;
  if (upd.changed) {
    if (!maybeWrite(md, original, changes)) {
      console.error('Tracker date is outdated; run: TRACKER_WRITE=1 npm run tracker:sync');
      process.exit(1);
    }
  }

  console.log('Tracker OK');
})();
