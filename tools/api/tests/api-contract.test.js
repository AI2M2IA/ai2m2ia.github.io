const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  findContentManifests,
  isAbsoluteUrl,
  localPathForApiUrl,
  readJson,
  validateApi,
  validateCatalog,
  validateContent,
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

test('maps canonical API URLs to local files', () => {
  const catalog = {
    apiBaseUrl: 'https://ai2m2ia.github.io',
    apiPrefix: '/api',
  };

  assert.equal(
    localPathForApiUrl(apiDir, catalog, 'https://ai2m2ia.github.io/api/books/example/content.json'),
    path.join(apiDir, 'books/example/content.json'),
  );
  assert.equal(localPathForApiUrl(apiDir, catalog, 'https://example.com/api/books/example/content.json'), null);
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

test('catalog contains one content manifest per listed book', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const manifests = findContentManifests(path.join(apiDir, 'books'));

  assert.equal(catalog.books.length, manifests.length);
  assert.equal(catalog.books.length, 31);
});

test('catalog validation reports duplicate ids', () => {
  const catalog = readJson(path.join(apiDir, 'catalog.json'));
  const duplicate = {
    ...catalog,
    books: [catalog.books[0], catalog.books[0]],
  };

  assert.match(validateCatalog(duplicate, apiDir).join('\n'), /duplicated/);
});

test('content validation reports malformed chapters', () => {
  const errors = validateContent({
    schemaVersion: 1,
    generatedAt: '2026-05-30T00:00:00Z',
    bookId: 'sample',
    format: 'PROSE',
    language: 'en',
    revision: '2026-05-30',
    chapters: [{ index: -1, title: '' }],
  }, path.join(apiDir, 'books/sample/content.json'));

  assert.match(errors.join('\n'), /index must be >= 0/);
  assert.match(errors.join('\n'), /title is required/);
});
