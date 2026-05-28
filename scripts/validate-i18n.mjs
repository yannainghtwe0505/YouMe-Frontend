/**
 * Compares translation key paths across en / ja / my locale files.
 * Run: node scripts/validate-i18n.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/locales');

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function load(code) {
  const raw = readFileSync(join(localesDir, `${code}.json`), 'utf8');
  return JSON.parse(raw);
}

const en = load('en');
const ja = load('ja');
const my = load('my');

const enKeys = new Set(flatten(en));
const jaKeys = flatten(ja);
const myKeys = flatten(my);

let exitCode = 0;

const missingJa = [...enKeys].filter((k) => !jaKeys.includes(k));
const missingMy = [...enKeys].filter((k) => !myKeys.includes(k));
const extraJa = jaKeys.filter((k) => !enKeys.has(k));
const extraMy = myKeys.filter((k) => !enKeys.has(k));

if (missingJa.length) {
  console.error(`Missing in ja.json (${missingJa.length}):`);
  missingJa.slice(0, 40).forEach((k) => console.error(`  - ${k}`));
  if (missingJa.length > 40) console.error(`  … and ${missingJa.length - 40} more`);
  exitCode = 1;
}
if (missingMy.length) {
  console.warn(`Missing in my.json (${missingMy.length}) — fallbackLng=en applies`);
  missingMy.slice(0, 20).forEach((k) => console.warn(`  - ${k}`));
}
if (extraJa.length) {
  console.warn(`Extra keys in ja.json (${extraJa.length}) not in en`);
}
if (extraMy.length) {
  console.warn(`Extra keys in my.json (${extraMy.length}) not in en`);
}

if (exitCode === 0) {
  console.log(`OK: ${enKeys.size} en keys; ja missing ${missingJa.length}; my missing ${missingMy.length}`);
}

process.exit(exitCode);
