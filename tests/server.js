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
};

const server = http.createServer((req, res) => {
  const rootDir = path.resolve(__dirname, '..');
  const targetPath = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  const resolvedPath = path.resolve(path.join(rootDir, targetPath));

  // Prevent path traversal
  if (!resolvedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Path traversal attempt detected');
    return;
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.readFile(resolvedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(resolvedPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
