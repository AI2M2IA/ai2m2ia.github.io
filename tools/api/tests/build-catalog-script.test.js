const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoDir = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoDir, 'tools/api/scripts/build_catalog.py');

function runBuildCatalog(args, env = {}) {
  const cleanEnv = { ...process.env, ...env };
  delete cleanEnv.AI2M2IA_WORKSPACE;
  return spawnSync('python3', [scriptPath, ...args], {
    cwd: repoDir,
    env: cleanEnv,
    encoding: 'utf8',
  });
}

test('build_catalog.py documents its required arguments', () => {
  const result = runBuildCatalog(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Build the AI\(2\)M\(2\)IA static book API/);
});

test('build_catalog.py requires explicit source directories without workspace env', () => {
  const result = runBuildCatalog([]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AI2M2IA_WORKSPACE must be set/);
});

test('build_catalog.py rejects output directories outside this repository', () => {
  const result = runBuildCatalog([
    '--aws-book-dir', path.join(repoDir, 'missing-aws-book'),
    '--last-archive-dir', path.join(repoDir, 'missing-last-archive'),
    '--out-dir', '/tmp/ai2m2ia-api-outside-repo',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--out-dir must be inside the repository/);
});
