/**
 * i18n coverage tests for definitive-site
 * Run: node tests/i18n.test.js
 *
 * Validates that every i18n JSON file:
 *   1. Is valid JSON with a "strings" object and a "lastUpdated" field
 *   2. Contains every required key (no missing translations)
 *   3. Has no empty-string values for required keys
 *   4. Has consistent key sets across all 23 language files
 */

const fs   = require('fs');
const path = require('path');

// ─── Required keys ───────────────────────────────────────────────────────────
const WORK_IDS = [
  'level-zero',
  'analyze',
  'bell-that-remembers',
  'crater-gospel',
  'venomous-garden',
  'ashen-bloom',
  'the-princess-and-the-turtle',
];

const REQUIRED_KEYS = [
  // Navigation
  'navCatalog', 'navMedia', 'navPhilosophy',
  // Hero
  'heroPrimaryCTA', 'heroSecondaryCTA',
  // Catalog section
  'catalogEyebrow', 'catalogTitle', 'catalogLead',
  'filterAll', 'filterProgression', 'filterDark', 'filterWar', 'filterFantasy',
  'authorshipHuman', 'authorshipHumanAI', 'wipBadge',
  'learnMore', 'buyOnAmazon',
  // Work tags (one per work)
  ...WORK_IDS.map(id => `workTag_${id}`),
  // Work summaries (one per work)
  ...WORK_IDS.map(id => `workSummary_${id}`),
  // Philosophy section
  'philEyebrow', 'philTitle', 'philLead',
  'philDisclosureTitle', 'philDisclosureText',
  'philResponsibilityText',
  'analogyCalcTitle', 'analogyCalcText',
  'analogyTypeTitle', 'analogyTypeText',
  // Media section
  'mediaEyebrow', 'mediaTitle',
  // Footer
  'footerTagline',
];

// ─── Language files ───────────────────────────────────────────────────────────
const I18N_DIR = path.join(__dirname, '..', 'data', 'i18n');

const EXPECTED_LANGS = [
  'en', 'pt-BR', 'es-419', 'fr', 'it', 'de', 'pl', 'tr', 'ru',
  'id', 'vi', 'fil', 'th', 'ja', 'zh-CN', 'zh-TW', 'yue',
  'ko', 'hi', 'ur', 'ar', 'fa', 'he',
];

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`  FAIL: ${message}`);
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section('File existence');
for (const lang of EXPECTED_LANGS) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  assert(fs.existsSync(filePath), `${lang}.json exists`);
}

section('JSON validity & structure');
const langData = {};
for (const lang of EXPECTED_LANGS) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert(true, `${lang}.json parses as valid JSON`);
  } catch (e) {
    assert(false, `${lang}.json parses as valid JSON — ${e.message}`);
    continue;
  }

  assert(typeof data === 'object' && data !== null, `${lang}.json is an object`);
  assert(typeof data.strings === 'object' && data.strings !== null, `${lang}.json has "strings" object`);
  assert(typeof data.lastUpdated === 'string' && data.lastUpdated.length > 0, `${lang}.json has non-empty "lastUpdated"`);

  langData[lang] = data.strings || {};
}

section('Required key coverage');
for (const lang of EXPECTED_LANGS) {
  if (!langData[lang]) continue;
  const strings = langData[lang];

  for (const key of REQUIRED_KEYS) {
    const hasKey = key in strings;
    assert(hasKey, `${lang}: has key "${key}"`);

    if (hasKey) {
      const val = strings[key];
      assert(typeof val === 'string' && val.trim().length > 0, `${lang}: key "${key}" is non-empty`);
    }
  }
}

section('No unexpected empty strings (all keys)');
for (const lang of EXPECTED_LANGS) {
  if (!langData[lang]) continue;
  const strings = langData[lang];
  for (const [key, val] of Object.entries(strings)) {
    assert(
      typeof val === 'string' && val.length > 0,
      `${lang}: key "${key}" is non-empty`
    );
  }
}

section('Key-set consistency across languages');
const enKeys = Object.keys(langData['en'] || {}).sort();
for (const lang of EXPECTED_LANGS) {
  if (lang === 'en' || !langData[lang]) continue;
  const langKeys = Object.keys(langData[lang]).sort();

  // Find keys in en but missing from this lang
  const missing = enKeys.filter(k => !langData[lang][k]);
  assert(missing.length === 0, `${lang}: no keys missing vs en.json${missing.length ? ' — missing: ' + missing.join(', ') : ''}`);

  // Find extra keys in this lang not in en
  const extra = langKeys.filter(k => !langData['en'][k]);
  assert(extra.length === 0, `${lang}: no extra keys vs en.json${extra.length ? ' — extra: ' + extra.join(', ') : ''}`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (errors.length) {
  console.log('\nFailures:');
  errors.forEach(e => console.log(e));
}
console.log('═'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
