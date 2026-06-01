const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const FORMATS = new Set(['PROSE', 'LIGHT_NOVEL', 'MANGA', 'MANHWA']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function formatSchemaErrors(label, errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    return `${label}${location} ${error.message}`;
  });
}

function validateJsonAgainstSchema(value, schema, label) {
  const ajv = createSchemaValidator();
  const validate = ajv.compile(schema);
  return validate(value) ? [] : formatSchemaErrors(label, validate.errors);
}

function isAbsoluteUrl(value) {
  if (value === null || value === undefined) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isIsoDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function requireCondition(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function localPathForApiUrl(apiDir, catalog, urlValue) {
  if (!urlValue || !catalog.apiBaseUrl || !catalog.apiPrefix) {
    return null;
  }

  const baseUrl = catalog.apiBaseUrl.replace(/\/$/, '');
  const apiPrefix = `/${catalog.apiPrefix.replace(/^\/+|\/+$/g, '')}`;
  const expectedPrefix = `${baseUrl}${apiPrefix}/`;

  if (!urlValue.startsWith(expectedPrefix)) {
    return null;
  }

  const relativePath = urlValue.slice(expectedPrefix.length);
  const apiRoot = path.resolve(apiDir);
  const safeApiRoot = apiRoot.endsWith(path.sep) ? apiRoot : `${apiRoot}${path.sep}`;
  const resolvedPath = path.resolve(apiRoot, relativePath);
  if (resolvedPath !== apiRoot && !resolvedPath.startsWith(safeApiRoot)) {
    return null;
  }
  return resolvedPath;
}

function validateCatalog(catalog, apiDir) {
  const errors = [];
  requireCondition(catalog.schemaVersion === 1, 'catalog.schemaVersion must be 1', errors);
  requireCondition(isIsoDateTime(catalog.generatedAt), 'catalog.generatedAt must be ISO-8601 datetime', errors);
  requireCondition(isAbsoluteUrl(catalog.apiBaseUrl), 'catalog.apiBaseUrl must be an absolute URL', errors);
  requireCondition(typeof catalog.apiPrefix === 'string' && catalog.apiPrefix.startsWith('/'), 'catalog.apiPrefix must start with /', errors);
  requireCondition(Array.isArray(catalog.books) && catalog.books.length > 0, 'catalog.books must be a non-empty list', errors);

  const seenIds = new Set();
  for (const [index, book] of (catalog.books || []).entries()) {
    const prefix = `books[${index}]`;
    requireCondition(typeof book.id === 'string' && book.id.length > 0, `${prefix}.id is required`, errors);
    requireCondition(!seenIds.has(book.id), `${prefix}.id is duplicated: ${book.id}`, errors);
    seenIds.add(book.id);

    requireCondition(typeof book.title === 'string' && book.title.length > 0, `${prefix}.title is required`, errors);
    requireCondition(FORMATS.has(book.format), `${prefix}.format is invalid`, errors);
    requireCondition(isAbsoluteUrl(book.manifestUrl), `${prefix}.manifestUrl must be an absolute URL`, errors);
    requireCondition(isAbsoluteUrl(book.coverUrl), `${prefix}.coverUrl must be null or an absolute URL`, errors);
    requireCondition(Array.isArray(book.languages) && book.languages.length > 0, `${prefix}.languages must be non-empty`, errors);

    const manifestPath = localPathForApiUrl(apiDir, catalog, book.manifestUrl);
    requireCondition(Boolean(manifestPath), `${prefix}.manifestUrl must point inside the configured API prefix`, errors);
    if (manifestPath) {
      requireCondition(fs.existsSync(manifestPath), `${prefix}.manifestUrl target is missing locally: ${manifestPath}`, errors);
    }

    const coverPath = localPathForApiUrl(apiDir, catalog, book.coverUrl);
    if (coverPath) {
      requireCondition(fs.existsSync(coverPath), `${prefix}.coverUrl target is missing locally: ${coverPath}`, errors);
    }
  }

  return errors;
}

function validateContent(content, filePath) {
  const errors = [];
  const label = path.relative(process.cwd(), filePath);
  requireCondition(content.schemaVersion === 1, `${label}.schemaVersion must be 1`, errors);
  requireCondition(isIsoDateTime(content.generatedAt), `${label}.generatedAt must be ISO-8601 datetime`, errors);
  requireCondition(typeof content.bookId === 'string' && content.bookId.length > 0, `${label}.bookId is required`, errors);
  requireCondition(FORMATS.has(content.format), `${label}.format is invalid`, errors);
  requireCondition(typeof content.language === 'string' && content.language.length >= 2, `${label}.language is required`, errors);
  requireCondition(typeof content.revision === 'string' && content.revision.length > 0, `${label}.revision is required`, errors);
  requireCondition(Array.isArray(content.chapters), `${label}.chapters must be a list`, errors);

  for (const [index, chapter] of (content.chapters || []).entries()) {
    const prefix = `${label}.chapters[${index}]`;
    requireCondition(Number.isInteger(chapter.index) && chapter.index >= 0, `${prefix}.index must be >= 0`, errors);
    requireCondition(typeof chapter.title === 'string' && chapter.title.length > 0, `${prefix}.title is required`, errors);
    requireCondition(chapter.images === undefined || Array.isArray(chapter.images), `${prefix}.images must be a list`, errors);

    for (const [imageIndex, image] of (chapter.images || []).entries()) {
      const imagePrefix = `${prefix}.images[${imageIndex}]`;
      requireCondition(isAbsoluteUrl(image.url), `${imagePrefix}.url must be an absolute URL`, errors);
      requireCondition(Number.isInteger(image.order) && image.order >= 0, `${imagePrefix}.order must be >= 0`, errors);
    }
  }

  return errors;
}

function findContentManifests(booksDir) {
  if (!fs.existsSync(booksDir)) {
    return [];
  }

  return fs.readdirSync(booksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(booksDir, entry.name, 'content.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

function validateApi(apiDir) {
  const catalogPath = path.join(apiDir, 'catalog.json');
  const booksDir = path.join(apiDir, 'books');
  const schemaDir = path.join(apiDir, 'schemas');
  const catalogSchema = readJson(path.join(schemaDir, 'catalog.schema.json'));
  const contentSchema = readJson(path.join(schemaDir, 'content.schema.json'));
  const catalog = readJson(catalogPath);
  const errors = [
    ...validateJsonAgainstSchema(catalog, catalogSchema, 'catalog'),
    ...validateCatalog(catalog, apiDir),
  ];

  // Build map of manifestUrl -> expected bookId for cross-validation
  const manifestToBookId = new Map();
  for (const book of (catalog.books || [])) {
    if (book.manifestUrl) {
      manifestToBookId.set(book.manifestUrl, book.id);
    }
  }

  for (const manifestPath of findContentManifests(booksDir)) {
    const content = readJson(manifestPath);
    const label = path.relative(process.cwd(), manifestPath);
    errors.push(...validateJsonAgainstSchema(content, contentSchema, label));
    errors.push(...validateContent(content, manifestPath));
    
    // Cross-validate bookId matches catalog entry
    if (content.bookId && catalog.apiBaseUrl && catalog.apiPrefix) {
      const expectedManifestUrl = `${catalog.apiBaseUrl}${catalog.apiPrefix}/books/${content.bookId}/content.json`;
      const expectedBookId = manifestToBookId.get(expectedManifestUrl);
      if (!expectedBookId) {
        errors.push(`${label}: bookId "${content.bookId}" does not match any catalog entry (expected manifestUrl: ${expectedManifestUrl})`);
      }
    }
  }

  return errors;
}

module.exports = {
  FORMATS,
  findContentManifests,
  formatSchemaErrors,
  isAbsoluteUrl,
  isIsoDateTime,
  localPathForApiUrl,
  readJson,
  validateJsonAgainstSchema,
  validateApi,
  validateCatalog,
  validateContent,
};
