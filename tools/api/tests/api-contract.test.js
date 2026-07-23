const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  isAbsoluteUrl,
  isHttpsUrl,
  readJson,
  validateApi,
  validateCatalog,
  validateJsonAgainstSchema,
} = require('../lib/api-contract');

const repoDir = path.resolve(__dirname, '../../..');
const apiDir = path.join(repoDir, 'api');

test('URL validation accepts only HTTP(S) absolute URLs and null', () => {
  assert.equal(isAbsoluteUrl('https://ai2m2ia.github.io/api/catalog.json'), true);
  assert.equal(isAbsoluteUrl('http://localhost:3000/api/catalog.json'), true);
  assert.equal(isAbsoluteUrl(null), true);
  assert.equal(isAbsoluteUrl('/api/catalog.json'), false);
  assert.equal(isAbsoluteUrl('notaurl'), false);
});

test('isHttpsUrl accepts only HTTPS URLs', () => {
  assert.equal(isHttpsUrl('https://ai2m2ia.github.io/book/'), true);
  assert.equal(isHttpsUrl('http://ai2m2ia.github.io/book/'), false);
  assert.equal(isHttpsUrl('notaurl'), false);
  assert.equal(isHttpsUrl(null), false);
  assert.equal(isHttpsUrl(undefined), false);
  assert.equal(isHttpsUrl(''), false);
});

test('validates the published API contract', () => {
  assert.deepEqual(validateApi(apiDir), []);
});

test('JSON Schema validation rejects unexpected catalog fields', () => {
  const schema = readJson(path.join(apiDir, 'schemas/catalog.schema.json'));
  const catalog = {
    ...readJson(path.join(apiDir, 'catalog.json')),
    unexpected: true,
  };

  assert.match(validateJsonAgainstSchema(catalog, schema, 'catalog').join('\n'), /must NOT have additional properties/);
});

test('catalog validation reports duplicate ids', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const duplicate = {
    ...catalog,
    books: [catalog.books[0], catalog.books[0]],
  };

  assert.match(validateCatalog(duplicate, apiDir).join('\n'), /duplicated/);
});

test('catalog validation rejects non-HTTPS spoke URLs', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = {
    ...catalog,
    books: [{ ...catalog.books[0], spokeUrl: 'http://example.com/book/' }],
  };

  assert.match(validateCatalog(bad, apiDir).join('\n'), /spokeUrl must be an https URL/);
});

test('catalog validation rejects missing spokeUrl', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = {
    ...catalog,
    books: [{ ...catalog.books[0], spokeUrl: undefined }],
  };

  const errors = validateCatalog(bad, apiDir);
  assert.ok(errors.some(e => /spokeUrl is required/.test(e)));
});

test('catalog validation rejects missing author', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = {
    ...catalog,
    books: [{ ...catalog.books[0], author: '' }],
  };

  const errors = validateCatalog(bad, apiDir);
  assert.ok(errors.some(e => /author is required/.test(e)));
});

test('catalog validation rejects duplicate spoke URLs', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = {
    ...catalog,
    books: [
      { ...catalog.books[0], id: 'book-a' },
      { ...catalog.books[0], id: 'book-b' },
    ],
  };

  assert.match(validateCatalog(bad, apiDir).join('\n'), /spokeUrl is duplicated/);
});

test('catalog validation rejects empty books list', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = { ...catalog, books: [] };

  const errors = validateCatalog(bad, apiDir);
  assert.ok(errors.some(e => /non-empty list/.test(e)));
});

test('catalog validation rejects schemaVersion 1', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const bad = { ...catalog, schemaVersion: 1 };

  assert.match(validateCatalog(bad, apiDir).join('\n'), /schemaVersion must be 2/);
});

test('catalog contains exactly the expected spoke entries', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  assert.equal(catalog.books.length, 1);
  assert.equal(catalog.books[0].id, 'lets-build-on-aws-together');
  assert.equal(catalog.books[0].spokeUrl, 'https://ai2m2ia.github.io/book-lets-build-on-aws-together/');
});

test('no hosted content directory exists', () => {
  const booksDir = path.join(apiDir, 'books');
  assert.equal(require('node:fs').existsSync(booksDir), false);
});
