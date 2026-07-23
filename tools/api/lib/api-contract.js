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

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
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

function validateCatalog(catalog, apiDir) {
  const errors = [];
  requireCondition(catalog.schemaVersion === 2, 'catalog.schemaVersion must be 2', errors);
  requireCondition(isIsoDateTime(catalog.generatedAt), 'catalog.generatedAt must be ISO-8601 datetime', errors);
  requireCondition(isAbsoluteUrl(catalog.apiBaseUrl), 'catalog.apiBaseUrl must be an absolute URL', errors);
  requireCondition(typeof catalog.apiPrefix === 'string' && catalog.apiPrefix.startsWith('/'), 'catalog.apiPrefix must start with /', errors);
  requireCondition(Array.isArray(catalog.books) && catalog.books.length > 0, 'catalog.books must be a non-empty list', errors);

  const seenIds = new Set();
  const seenSpokeUrls = new Set();
  for (const [index, book] of (catalog.books || []).entries()) {
    const prefix = `books[${index}]`;
    requireCondition(typeof book.id === 'string' && book.id.length > 0, `${prefix}.id is required`, errors);
    requireCondition(!seenIds.has(book.id), `${prefix}.id is duplicated: ${book.id}`, errors);
    seenIds.add(book.id);

    requireCondition(typeof book.title === 'string' && book.title.length > 0, `${prefix}.title is required`, errors);
    requireCondition(typeof book.spokeUrl === 'string' && book.spokeUrl.length > 0, `${prefix}.spokeUrl is required`, errors);
    requireCondition(isHttpsUrl(book.spokeUrl), `${prefix}.spokeUrl must be an https URL`, errors);
    requireCondition(!seenSpokeUrls.has(book.spokeUrl), `${prefix}.spokeUrl is duplicated: ${book.spokeUrl}`, errors);
    seenSpokeUrls.add(book.spokeUrl);

    requireCondition(typeof book.author === 'string' && book.author.length > 0, `${prefix}.author is required`, errors);
    requireCondition(Array.isArray(book.languages) && book.languages.length > 0, `${prefix}.languages must be non-empty`, errors);

    if (book.format !== undefined && book.format !== null) {
      requireCondition(FORMATS.has(book.format), `${prefix}.format is invalid`, errors);
    }

    if (book.coverUrl !== undefined && book.coverUrl !== null) {
      requireCondition(isAbsoluteUrl(book.coverUrl), `${prefix}.coverUrl must be null or an absolute URL`, errors);
    }
  }

  const booksDir = path.join(apiDir, 'books');
  requireCondition(!fs.existsSync(booksDir), 'api/books/ directory must not exist — content is hosted in spoke repos', errors);

  return errors;
}

function validateApi(apiDir) {
  const catalogPath = path.join(apiDir, 'catalog.json');
  const schemaDir = path.join(apiDir, 'schemas');
  const catalogSchema = readJson(path.join(schemaDir, 'catalog.schema.json'));
  const catalog = readJson(catalogPath);
  return [
    ...validateJsonAgainstSchema(catalog, catalogSchema, 'catalog'),
    ...validateCatalog(catalog, apiDir),
  ];
}

module.exports = {
  FORMATS,
  formatSchemaErrors,
  isAbsoluteUrl,
  isHttpsUrl,
  isIsoDateTime,
  readJson,
  validateApi,
  validateCatalog,
  validateJsonAgainstSchema,
};
