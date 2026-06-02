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
  console.log('✓ All data files are valid');
  process.exit(0);
} else {
  console.error('✗ Validation failed');
  process.exit(1);
}
