#!/usr/bin/env node
const path = require('node:path');
const { validateApi } = require('./lib/api-contract');

function parseArgs(argv) {
  const apiDirFlag = argv.indexOf('--api-dir');
  if (apiDirFlag !== -1 && argv[apiDirFlag + 1]) {
    return path.resolve(argv[apiDirFlag + 1]);
  }
  return path.resolve(process.cwd(), 'api');
}

const apiDir = parseArgs(process.argv.slice(2));
const errors = validateApi(apiDir);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log(`Validated manifests in ${path.relative(process.cwd(), apiDir) || apiDir}`);
