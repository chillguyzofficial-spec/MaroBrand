// Anteprima locale: node _build/server.js  →  http://localhost:8991
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const TIPI = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json' };
http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || u.startsWith('/_build') || u.startsWith('/design-source') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('Non trovato'); }
  const size = fs.statSync(f).size, type = TIPI[path.extname(f)] || 'application/octet-stream';
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  if (m) { const a = +m[1], b = m[2] ? +m[2] : size - 1; r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  r.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(r);
}).listen(process.env.PORT || 8991, () => console.log('MARO in anteprima su http://localhost:' + (process.env.PORT || 8991)));
