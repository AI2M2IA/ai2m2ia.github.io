const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
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

test('build_catalog.py removes orphan book directories from output', () => {
  const repo = fs.mkdtempSync(path.join(path.resolve(__dirname, '..', '..', '..'), '.tmp-build-catalog-'));
  try {
    const awsBookDir = path.join(repo, 'aws-book');
    const lastArchiveDir = path.join(repo, 'last-archive');
    const outDir = path.join(repo, 'api');
    const booksOutDir = path.join(outDir, 'books');
    const staleBookDir = path.join(booksOutDir, 'obsolete-old-volume');

    fs.mkdirSync(path.join(awsBookDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(awsBookDir, 'chapters'), { recursive: true });
    fs.writeFileSync(path.join(awsBookDir, 'assets', 'metadata.yaml'), 'title: Test AWS Book\n');
    fs.writeFileSync(path.join(awsBookDir, 'chapters', 'ch-1.md'), '# Ch 1\n\nHello\n');

    fs.mkdirSync(path.join(lastArchiveDir, 'manuscripts', 'vol-001'), { recursive: true });
    fs.writeFileSync(path.join(lastArchiveDir, 'manuscripts', 'vol-001', 'ch-1.md'), '# Volume 1\n\nVolume text\n');

    fs.mkdirSync(staleBookDir, { recursive: true });
    fs.writeFileSync(path.join(staleBookDir, 'content.json'), '{}');

    const result = runBuildCatalog([
      '--aws-book-dir',
      awsBookDir,
      '--last-archive-dir',
      lastArchiveDir,
      '--out-dir',
      outDir,
    ]);

    assert.equal(result.status, 0, result.stderr);

    const catalog = JSON.parse(fs.readFileSync(path.join(outDir, 'catalog.json'), 'utf8'));
    const bookIds = catalog.books.map((book) => book.id);
    const publishedBooks = fs.readdirSync(booksOutDir);

    assert.ok(publishedBooks.includes('lets-learn-aws-together'), 'AWS book must exist');
    assert.ok(publishedBooks.includes('the-last-archive-vol-001'), 'Archive volume should exist');
    assert.ok(!publishedBooks.includes('obsolete-old-volume'), 'orphan book directory should be removed');
    assert.ok(!bookIds.includes('obsolete-old-volume'), 'orphan book should not be published');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
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
