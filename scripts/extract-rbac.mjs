// scripts/extract-rbac.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "apps/backend/src/modules";

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function stripQuotes(s) {
  s = (s || "").trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("`") && s.endsWith("`"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseRolesArgs(argsRaw) {
  const raw = (argsRaw || "").trim();
  if (!raw) return [];

  // Вытащим строковые роли 'company_owner', "platform_admin"
  const roles = [];
  const strRe = /['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = strRe.exec(raw))) roles.push(m[1]);

  // Если есть spread/константы — добавим как токены (чтобы ты потом прислал только constants)
  // пример: ...PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT
  const tokenRe = /(\.\.\.[A-Z0-9_]+\.[A-Z0-9_]+\.[A-Z0-9_]+)/g;
  while ((m = tokenRe.exec(raw))) roles.push(m[1]);

  // пример: AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN (без кавычек)
  const constRe = /\b([A-Z0-9_]+\.[A-Z0-9_]+\.[A-Z0-9_]+)\b/g;
  while ((m = constRe.exec(raw))) {
    const t = m[1];
    // отфильтруем мусор типа ApiResponse.HttpStatus и т.п.
    if (t.includes("CONSTANTS") || t.includes("SYSTEM_ROLES") || t.includes("ROLES")) roles.push(t);
  }

  // дедуп
  return [...new Set(roles)];
}

function extractFromController(file) {
  const text = fs.readFileSync(file, "utf8");
  const base = (/@Controller\(\s*(['"`][^'"`]*['"`])\s*\)/.exec(text)?.[1]) || "''";
  const basePath = stripQuotes(base);

  const lines = text.split("\n");
  const entries = [];
  let buf = [];

  const flush = (methodName) => {
    if (!buf.length) return;

    const chunk = buf.join("\n");

    const httpM = /@(Get|Post|Put|Patch|Delete)\s*\(\s*([^\)]*)\)/.exec(chunk);
    if (!httpM) { buf = []; return; }

    const httpMethod = httpM[1].toUpperCase();
    const argRaw = (httpM[2] || "").trim();
    const subPath = argRaw ? stripQuotes(argRaw.split(",")[0].trim()) : "";

    const rolesM = /@Roles\s*\(\s*([^\)]*)\)/.exec(chunk);
    const roles = rolesM ? parseRolesArgs(rolesM[1]) : [];

    const summaryM = /summary\s*:\s*['"`]([^'"`]+)['"`]/s.exec(chunk);
    const summary = summaryM ? summaryM[1].trim() : methodName;

    const fullPath = ("/" + [basePath, subPath].filter(Boolean).join("/")).replaceAll("//", "/");

    entries.push({ httpMethod, fullPath, summary, roles, file });
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (l.trim().startsWith("@")) {
      buf.push(l);
      continue;
    }

    // метод класса контроллера
    const sig = /^\s*(async\s+)?([A-Za-z0-9_]+)\s*\(/.exec(l);
    if (sig) {
      flush(sig[2]);
      continue;
    }

    // если пошёл какой-то код/пустые строки — просто продолжаем накапливать декораторы до сигнатуры
  }

  buf = [];
  return entries;
}

const files = walk(root).filter((f) => f.endsWith(".controller.ts"));

const all = files.flatMap(extractFromController);

// Вывод TSV: METHOD \t PATH \t SUMMARY \t ROLES
for (const e of all) {
  const roles = e.roles.length ? e.roles.join(",") : "(no Roles decorator)";
  process.stdout.write(`${e.httpMethod}\t${e.fullPath}\t${e.summary}\t${roles}\n`);
}
