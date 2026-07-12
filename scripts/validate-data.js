#!/usr/bin/env node
/**
 * Validates JSON data files against their schemas.
 * 
 * Usage: node scripts/validate-data.js
 * Exit code 0 = all valid, 1 = validation errors found
 */

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCHEMAS_DIR = path.join(DATA_DIR, 'schemas');
const REPO_DIR = path.resolve(__dirname, '..');

const VALIDATIONS = [
  { data: 'works.json', schema: 'works.schema.json' },
  { data: 'author.json', schema: 'author.schema.json' },
  { data: 'media.json', schema: 'media.schema.json' },
  { data: 'sources.json', schema: 'sources.schema.json' },
];

function loadJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function validate(schemaFile, dataFile) {
  const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
  const dataPath = path.join(DATA_DIR, dataFile);

  console.log(`\nValidating ${dataFile} against ${schemaFile}...`);

  if (!fs.existsSync(dataPath)) {
    console.error(`  ✗ Data file not found: ${dataPath}`);
    return false;
  }

  if (!fs.existsSync(schemaPath)) {
    console.error(`  ✗ Schema file not found: ${schemaPath}`);
    return false;
  }

  try {
    const schema = loadJson(schemaPath);
    const data = loadJson(dataPath);

    const ajv = new Ajv2020({ allErrors: true, verbose: true });
    addFormats(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      console.log(`  ✓ ${dataFile} is valid`);
      return true;
    } else {
      console.error(`  ✗ ${dataFile} has validation errors:`);
      validate.errors.forEach((error, index) => {
        const location = error.instancePath || '(root)';
        console.error(`    ${index + 1}. ${location}: ${error.message}`);
        if (error.params) {
          const paramStr = Object.entries(error.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          console.error(`       (${paramStr})`);
        }
      });
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Error validating ${dataFile}:`, error.message);
    return false;
  }
}

function validateCrossReferences(worksData, mediaData) {
  const errors = [];
  const mediaIds = new Set((mediaData.items || []).map((media) => media.id));
  const familyIds = new Set((worksData.workFamilies || []).map((family) => family.id));

  for (const family of worksData.workFamilies || []) {
    const routePath = path.join(REPO_DIR, family.route || '', 'index.html');
    if (!fs.existsSync(routePath)) {
      errors.push(`  ✗ Missing work route file for "${family.id}": ${family.route}`);
    }

    for (const mediaId of family.mediaIds || []) {
      if (!mediaIds.has(mediaId)) {
        errors.push(`  ✗ Missing mediaId in media.json for "${family.id}": ${mediaId}`);
      }
    }
  }

  for (const character of worksData.characters || []) {
    if (!familyIds.has(character.workFamilyId)) {
      errors.push(`  ✗ Character "${character.id}" references unknown workFamilyId: ${character.workFamilyId}`);
    }
  }

  return errors;
}

console.log('='.repeat(60));
console.log('Data Schema Validation');
console.log('='.repeat(60));

let allValid = true;

for (const { data, schema } of VALIDATIONS) {
  const valid = validate(schema, data);
  if (!valid) {
    allValid = false;
  }
}

console.log('\n' + '='.repeat(60));
if (allValid) {
  try {
    const worksData = loadJson(path.join(DATA_DIR, 'works.json'));
    const mediaData = loadJson(path.join(DATA_DIR, 'media.json'));
    const crossRefErrors = validateCrossReferences(worksData, mediaData);

    if (crossRefErrors.length > 0) {
      console.error('\nCross-reference validation failed:');
      crossRefErrors.forEach((error) => console.error(error));
      console.error('✗ Referential integrity check failed');
      process.exit(1);
    }

    console.log('✓ All data files are valid');
    console.log('✓ Referential integrity checks passed');
  } catch (error) {
    console.error('✗ Failed to run referential validation:', error.message);
    process.exit(1);
  }

  process.exit(0);
} else {
  console.error('✗ Validation failed');
  process.exit(1);
}
