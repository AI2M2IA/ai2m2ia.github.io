const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const server = http.createServer((req, res) => {
  const rootDir = path.resolve(__dirname, '..');
  const safeRootDir = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  const requestPath = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  const targetPath = requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath;
  const resolvedPath = path.resolve(path.join(rootDir, targetPath));

  // Prevent path traversal
  if (resolvedPath !== rootDir && !resolvedPath.startsWith(safeRootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden: Path traversal attempt detected');
    return;
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.readFile(resolvedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end(`500 Internal Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(resolvedPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        ...SECURITY_HEADERS,
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
