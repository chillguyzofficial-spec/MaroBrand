// Prepara le immagini del sito da design-source/ → assets/foto/ (webp).
// Ritagli, bianco e nero con grana per le foto di campagna, fotogrammi dai video.
// Uso: node _build/foto.js   (usa Edge tramite Playwright installato nel progetto Hedoné)
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.resolve(__dirname, '../../hedonè progetto serio/node_modules/playwright'));

const SRC = path.resolve(__dirname, '../design-source');
const OUT = path.resolve(__dirname, '../assets/foto');
fs.mkdirSync(OUT, { recursive: true });

// crop: [x, y, w, h] in pixel della sorgente · bn: bianco e nero con grana · t: secondo del video
const LAVORI = [
  // prodotti (a colori, 4:5)
  { out: 'polo-linee-fronte', src: 'mockup-ai/polo-nere-tre.jpg', crop: [80, 50, 620, 775] },
  { out: 'polo-linee-retro', src: 'mockup-ai/polo-nere-tre.jpg', crop: [1330, 50, 620, 775] },
  { out: 'polo-tricolore-fronte', src: 'mockup-ai/polo-nere-tricolore.jpg', crop: [710, 50, 620, 775] },
  { out: 'polo-tricolore-retro', src: 'mockup-ai/polo-nere-tricolore.jpg', crop: [1330, 50, 620, 775] },
  { out: 'polo-jacquard-intera', src: 'video-prodotto/polo-campione-dettagli.mp4', t: 2, crop: [0, 200, 464, 580] },
  { out: 'polo-jacquard-ricamo', src: 'video-prodotto/polo-campione-dettagli.mp4', t: 4, crop: [0, 126, 464, 580] },
  { out: 'felpa-stretta-retro', src: 'foto-reali/felpa-grigia-retro-stretta-di-mano.jpg', crop: [200, 0, 1324, 1656] },
  { out: 'felpa-stretta-indossata', src: 'foto-reali/felpa-grigia-parete-verde.jpg', crop: [65, 0, 1076, 1345] },
  { out: 'felpa-firma-retro', src: 'foto-reali/felpa-blu-retro-duomo.jpg', crop: [7, 0, 1192, 1490] },
  { out: 'felpa-nera-retro', src: 'mockup-ai/felpa-nera-montagne.jpg', crop: [194, 0, 690, 863] },
  // campagna, storia, lookbook (bianco e nero con grana, proporzioni originali)
  { out: 'campagna-due-ragazzi', src: 'foto-reali/due-ragazzi-parco-ringhiera.jpg', bn: true },
  { out: 'storia-stretta-di-mano', src: 'foto-reali/stretta-di-mano-parco.jpg', bn: true },
  { out: 'lookbook-metro-polo-1', src: 'mockup-ai/metro-gruppo-polo-1.jpg', bn: true },
  { out: 'lookbook-metro-polo-2', src: 'mockup-ai/metro-gruppo-polo-2.jpg', bn: true },
  // locandina del video d'apertura (mostrata finché il video non parte)
  { out: 'apertura-locandina', src: 'video-home/home-metro-1.mp4', t: 0.2, max: 1600 },
];

const srv = http.createServer((q, r) => {
  const f = path.join(SRC, decodeURIComponent(q.url.split('?')[0]));
  if (q.url === '/__vuota') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>foto</title>'); }
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  const size = fs.statSync(f).size, type = /mp4$/.test(f) ? 'video/mp4' : 'image/jpeg';
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  if (m) {
    const a = +m[1], b = m[2] ? +m[2] : size - 1;
    r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(r);
  }
  r.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  fs.createReadStream(f).pipe(r);
}).listen(8981);

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage();
  await p.goto('http://localhost:8981/__vuota');
  for (const l of LAVORI) {
    const dataUrl = await p.evaluate(async (l) => {
      let el, W, H;
      const url = '/' + l.src.split('/').map(encodeURIComponent).join('/');
      if (/\.mp4$/.test(l.src)) {
        el = document.createElement('video'); el.muted = true; el.preload = 'auto'; el.src = url;
        await new Promise((ok, ko) => { el.onloadeddata = ok; el.onerror = () => ko(new Error('video ' + l.src)); });
        await new Promise(ok => { el.onseeked = ok; el.currentTime = l.t; });
        W = el.videoWidth; H = el.videoHeight;
      } else {
        el = new Image(); el.src = url; await el.decode(); W = el.naturalWidth; H = el.naturalHeight;
      }
      const [x, y, w, h] = l.crop || [0, 0, W, H];
      const max = l.max || 1400, k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(el, x, y, w, h, 0, 0, c.width, c.height);
      if (l.bn || l.out === 'apertura-locandina') {
        const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
        let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < px.length; i += 4) {
          let v = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (l.bn) { v = (v - 128) * 1.12 + 128 + (rnd() - 0.5) * 22; } // contrasto + grana
          v = Math.max(0, Math.min(255, v));
          px[i] = px[i + 1] = px[i + 2] = v;
        }
        g.putImageData(d, 0, 0);
      }
      return { url: c.toDataURL('image/webp', 0.82), w: c.width, h: c.height };
    }, l);
    fs.writeFileSync(path.join(OUT, l.out + '.webp'), Buffer.from(dataUrl.url.split(',')[1], 'base64'));
    console.log(l.out.padEnd(26), dataUrl.w + '×' + dataUrl.h);
  }
  // dimensioni per il build (width/height nelle <img>, niente salti di impaginazione)
  const dims = {};
  for (const f of fs.readdirSync(OUT)) {
    const buf = fs.readFileSync(path.join(OUT, f));
    // webp VP8/VP8L/VP8X: leggiamo le misure dall'intestazione
    const tipo = buf.toString('ascii', 12, 16);
    let w, h;
    if (tipo === 'VP8 ') { w = buf.readUInt16LE(26) & 0x3fff; h = buf.readUInt16LE(28) & 0x3fff; }
    else if (tipo === 'VP8L') { const n = buf.readUInt32LE(21); w = (n & 0x3fff) + 1; h = ((n >> 14) & 0x3fff) + 1; }
    else { w = 1 + buf.readUIntLE(24, 3); h = 1 + buf.readUIntLE(27, 3); }
    dims[f.replace('.webp', '')] = [w, h];
  }
  fs.writeFileSync(path.join(__dirname, 'foto-misure.json'), JSON.stringify(dims, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
