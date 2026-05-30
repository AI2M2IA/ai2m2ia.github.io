const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
  'navCatalog', 'navMedia', 'navPhilosophy',
  'heroPrimaryCTA', 'heroSecondaryCTA',
  'catalogEyebrow', 'catalogTitle', 'catalogLead',
  'filterAll', 'filterProgression', 'filterDark', 'filterWar', 'filterFantasy',
  'authorshipHuman', 'authorshipHumanAI', 'wipBadge',
  'learnMore', 'buyOnAmazon',
  ...WORK_IDS.map((id) => `workTag_${id}`),
  ...WORK_IDS.map((id) => `workSummary_${id}`),
  'philEyebrow', 'philTitle', 'philLead',
  'philDisclosureTitle', 'philDisclosureText',
  'philResponsibilityText',
  'analogyCalcTitle', 'analogyCalcText',
  'analogyTypeTitle', 'analogyTypeText',
  'mediaEyebrow', 'mediaTitle',
  'footerTagline',
];

const I18N_DIR = path.join(__dirname, '..', 'data', 'i18n');

const EXPECTED_LANGS = [
  'en', 'pt-BR', 'es-419', 'fr', 'it', 'de', 'pl', 'tr', 'ru',
  'id', 'vi', 'fil', 'th', 'ja', 'zh-CN', 'zh-TW', 'yue',
  'ko', 'hi', 'ur', 'ar', 'fa', 'he',
];

function readLanguage(lang) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  assert.equal(fs.existsSync(filePath), true, `${lang}.json exists`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(typeof data, 'object', `${lang}.json is an object`);
  assert.notEqual(data, null, `${lang}.json is not null`);
  assert.equal(typeof data.strings, 'object', `${lang}.json has strings object`);
  assert.notEqual(data.strings, null, `${lang}.json strings is not null`);
  assert.equal(typeof data.lastUpdated, 'string', `${lang}.json has lastUpdated`);
  assert.ok(data.lastUpdated.length > 0, `${lang}.json lastUpdated is non-empty`);

  return data.strings;
}

function sortedKeys(value) {
  return Object.keys(value).sort();
}

test('all expected language files exist and parse', () => {
  for (const lang of EXPECTED_LANGS) {
    readLanguage(lang);
  }
});

test('all languages include required non-empty keys', () => {
  for (const lang of EXPECTED_LANGS) {
    const strings = readLanguage(lang);
    for (const key of REQUIRED_KEYS) {
      assert.ok(key in strings, `${lang}: has key "${key}"`);
      assert.equal(typeof strings[key], 'string', `${lang}: key "${key}" is a string`);
      assert.ok(strings[key].trim().length > 0, `${lang}: key "${key}" is non-empty`);
    }
  }
});

test('all translation values are non-empty strings', () => {
  for (const lang of EXPECTED_LANGS) {
    const strings = readLanguage(lang);
    for (const [key, value] of Object.entries(strings)) {
      assert.equal(typeof value, 'string', `${lang}: key "${key}" is a string`);
      assert.ok(value.length > 0, `${lang}: key "${key}" is non-empty`);
    }
  }
});

test('all languages have the same key set as English', () => {
  const english = readLanguage('en');
  const englishKeys = sortedKeys(english);

  for (const lang of EXPECTED_LANGS.filter((item) => item !== 'en')) {
    const strings = readLanguage(lang);
    const missing = englishKeys.filter((key) => !(key in strings));
    const extra = sortedKeys(strings).filter((key) => !(key in english));

    assert.deepEqual(missing, [], `${lang}: no keys missing vs en.json`);
    assert.deepEqual(extra, [], `${lang}: no extra keys vs en.json`);
  }
});
