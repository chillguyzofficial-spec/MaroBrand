// Prove del sito: node _build/test/prove.js [cartella-screenshot]
// Serve la cartella del sito su :8990 e controlla tutte le pagine a più larghezze.
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require(path.resolve(__dirname, '../../../hedonè progetto serio/node_modules/playwright'));
const ROOT = path.resolve(__dirname, '../..');
const SHOTS = process.argv[2];
const TIPI = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  const size = fs.statSync(f).size, type = TIPI[path.extname(f)] || 'application/octet-stream';
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  if (m) { const a = +m[1], b = m[2] ? +m[2] : size - 1; r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  r.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(f).pipe(r);
}).listen(8990);
const BASE = 'http://localhost:8990/';
const PAGINE = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let ok = 0, ko = 0;
const prova = (cond, nome) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nome); } };

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  // 1. tutte le pagine a tutte le larghezze
  for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 800 : 900 } });
    for (const pg of PAGINE) {
      const p = await ctx.newPage(); const errori = [];
      p.on('pageerror', e => errori.push(e.message));
      p.on('response', r => { if (r.status() >= 400) errori.push(r.status() + ' ' + r.url()); });
      await p.goto(BASE + pg, { waitUntil: 'load' });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => {
        const fuori = [];
        const W = document.documentElement.clientWidth;
        document.querySelectorAll('body *').forEach(el => {
          if (el.closest('svg') || el.closest('[hidden]') || el.closest('.sr') || el.classList.contains('salta') || el.classList.contains('apertura-video') || el.closest('.vetrina-binario')) return; // il video esce apposta dentro .apertura (overflow:hidden)
          const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.display === 'none') return;
          const q = el.getBoundingClientRect(); if (q.width && (q.right > W + 1 || q.left < -1)) fuori.push(el.tagName + '.' + el.className + ' ' + Math.round(q.left) + '→' + Math.round(q.right));
        });
        const imgRotte = [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src);
        const piccoli = [...document.querySelectorAll('p, a, span, button, li, td, label, summary')].filter(e => e.offsetParent && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length;
        return { sw: document.documentElement.scrollWidth, W, fuori: fuori.slice(0, 5), imgRotte, piccoli, noindex: !!document.querySelector('meta[name=robots][content*=noindex]') };
      });
      const n = `${pg} @${w}`;
      prova(r.sw <= r.W, n + ' scorrimento laterale ' + r.sw + '>' + r.W);
      prova(!r.fuori.length, n + ' elementi fuori: ' + r.fuori.join(' | '));
      prova(!r.imgRotte.length, n + ' immagini rotte: ' + r.imgRotte.join(', '));
      prova(!r.piccoli, n + ' testi < 12px: ' + r.piccoli);
      prova(!errori.length, n + ' errori: ' + errori.join(' | '));
      prova(r.noindex, n + ' manca noindex');
      await p.close();
    }
    await ctx.close();
  }
  console.log('Larghezze: ok');

  // 1a. link interni
  {
    const c = await b.newContext(); const q = await c.newPage(); const rotti = [];
    for (const pg of PAGINE) {
      await q.goto(BASE + pg, { waitUntil: 'domcontentloaded' });
      const hrefs = await q.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(https?:|mailto:|tel:)/.test(h)));
      for (const h of new Set(hrefs)) {
        const [file, id] = h.split('#'); const dest = file || pg;
        if (!fs.existsSync(path.join(ROOT, dest))) { rotti.push(pg + ' → ' + h); continue; }
        if (id) { const html = fs.readFileSync(path.join(ROOT, dest), 'utf8'); if (!html.includes('id="' + id + '"')) rotti.push(pg + ' → ' + h); }
      }
    }
    prova(!rotti.length, 'link interni rotti: ' + rotti.join(', '));
    await c.close();
  }

  // 1b. schede prodotto: tutte le foto della galleria con la stessa misura, su tutte le schede
  for (const w of [390, 768, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } }); const misure = new Set();
    for (const pg of PAGINE.filter(x => !['index.html', 'aiuto.html', 'storia.html'].includes(x))) {
      const q = await c.newPage(); await q.goto(BASE + pg, { waitUntil: 'load' });
      (await q.evaluate(() => [...document.querySelectorAll('.vetrina')].map(f => { const r = f.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }))).forEach(m => misure.add(m));
      await q.close();
    }
    prova(misure.size === 1, 'foto delle schede tutte uguali @' + w + ': ' + [...misure].join(', '));
    await c.close();
  }

  // 2. percorso su telefono
  const ctx = await b.newContext({ ...devices['iPhone 13'], browserName: undefined });
  const p = await ctx.newPage();
  await p.goto(BASE + 'index.html', { waitUntil: 'load' });
  const vid = await p.evaluate(() => new Promise(r => setTimeout(() => { const v = document.querySelector('video'); r({ t: v.currentTime, err: v.error && v.error.code }); }, 1500)));
  prova(!vid.err && vid.t > 0, 'video d\'apertura parte (t=' + vid.t + ', err=' + vid.err + ')');
  // menu a metà e in fondo alla pagina
  for (const f of [0, 0.5, 1]) {
    await p.evaluate(f => scrollTo(0, (document.body.scrollHeight - innerHeight) * f), f); await p.waitForTimeout(200);
    const t = await p.evaluate(() => document.querySelector('.testata').getBoundingClientRect().top);
    prova(f === 0 ? t >= 0 : Math.abs(t) < 2, `testata visibile al ${f * 100}% (top=${t})`);
    await p.tap('.menu-apri');
    const m = await p.evaluate(() => { const r = document.querySelector('#menu').getBoundingClientRect(), h = document.querySelector('.testata').getBoundingClientRect(), bt = document.querySelector('.menu-apri').getBoundingClientRect(); const su = document.elementFromPoint(bt.left + bt.width / 2, bt.top + bt.height / 2); return { vis: r.height > 200 && Math.abs(r.top - h.bottom) < 2, chiudi: !!(su && su.closest('.menu-apri')) }; });
    prova(m.vis && m.chiudi, `menu aperto al ${f * 100}% sotto la testata e Chiudi toccabile: ${JSON.stringify(m)}`);
    await p.tap('.menu-apri');
    prova(await p.evaluate(() => !document.querySelector('#menu').classList.contains('aperto') && document.documentElement.style.overflow === ''), `menu si chiude al ${f * 100}%`);
  }
  // filtri
  await p.goto(BASE + 'index.html#felpe'); await p.waitForTimeout(200);
  prova(await p.evaluate(() => document.querySelectorAll('.drop .scheda:not([hidden])').length) === 3, '#felpe mostra 3 felpe');
  await p.tap('[data-filtro="tutto"]');
  prova(await p.evaluate(() => document.querySelectorAll('.drop .scheda:not([hidden])').length) === 6, 'Tutto mostra 6 capi');
  // iscrizione
  await p.fill('#email', 'prova'); await p.tap('.iscriviti-form .btn');
  prova(await p.evaluate(() => document.querySelector('.esito').classList.contains('errore')), 'email sbagliata segnalata');
  await p.fill('#email', 'mario.rossi@esempio.it'); await p.tap('.iscriviti-form .btn');
  prova(await p.evaluate(() => /Sei dentro/.test(document.querySelector('.esito').textContent)), 'email valida accettata (anche con la s)');
  // vetrina a scorrimento
  await p.goto(BASE + 'polo-linee.html', { waitUntil: 'load' });
  const conta = () => p.textContent('.vetrina-conta');
  await p.tap('.vetrina-freccia.succ'); prova((await conta()) === '2 / 4', 'freccia avanti: 2 / 4');
  const box = await p.locator('.vetrina').boundingBox();
  await p.mouse.move(box.x + box.width * .8, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width * .2, box.y + box.height / 2, { steps: 5 }); await p.mouse.up();
  prova((await conta()) === '3 / 4', 'scorrimento col dito: 3 / 4 (' + (await conta()) + ')');
  await p.tap('.miniature button[data-foto="0"]'); prova((await conta()) === '1 / 4', 'miniatura: 1 / 4');
  await p.tap('.vetrina-freccia.prec'); prova((await conta()) === '4 / 4', 'indietro dalla prima: 4 / 4');
  await p.waitForTimeout(700);
  prova(await p.evaluate(() => { const v = document.querySelector('.vetrina').getBoundingClientRect(), i = document.querySelectorAll('.vetrina figure')[3].getBoundingClientRect(); return Math.abs(v.left - i.left) < 2; }), 'foto 4 al suo posto');

  // aiuto: tabella taglie polo / felpe
  await p.goto(BASE + 'aiuto.html#taglie', { waitUntil: 'load' });
  prova(await p.isVisible('[data-tabella-di="polo"]') && !(await p.isVisible('[data-tabella-di="felpe"]')), 'aiuto: tabella polo visibile');
  await p.tap('[data-tabella="felpe"]');
  prova(await p.isVisible('[data-tabella-di="felpe"]') && !(await p.isVisible('[data-tabella-di="polo"]')), 'aiuto: tabella felpe dopo il tocco');
  await p.tap('#spedizioni details:first-of-type summary');
  prova(await p.evaluate(() => document.querySelector('#spedizioni details').open), 'aiuto: domanda si apre');

  // scheda prodotto + borsa
  await p.goto(BASE + 'index.html', { waitUntil: 'load' });
  await p.tap('.drop .scheda[href="felpa-stretta.html"]'); await p.waitForLoadState('load');
  await p.tap('[data-aggiungi]');
  prova(await p.isVisible('.taglie-errore'), 'senza taglia: errore');
  prova(await p.evaluate(() => document.getElementById('borsa').hidden), 'senza taglia: borsa chiusa');
  await p.tap('.taglie label:nth-child(3)'); await p.tap('[data-aggiungi]');
  prova(!(await p.evaluate(() => document.getElementById('borsa').hidden)), 'con taglia: borsa aperta');
  prova(await p.evaluate(() => document.documentElement.style.overflow === 'hidden' && document.body.style.overflow === ''), 'blocco scorrimento solo su html');
  prova(/120,00/.test(await p.textContent('.totale')), 'totale 120,00 €');
  await p.tap('[data-piu="0"]');
  prova(/240,00/.test(await p.textContent('.totale')), 'più: totale 240,00 €');
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'borsa-tel.png') });
  await p.tap('.borsa-testa button');
  prova(await p.evaluate(() => document.querySelector('.borsa-num').textContent) === '2', 'contatore borsa 2');
  await p.goto(BASE + 'index.html');
  prova(await p.evaluate(() => document.querySelector('.borsa-num').textContent) === '2', 'borsa ricordata cambiando pagina');
  await ctx.close();

  // 3. screenshot
  if (SHOTS) {
    for (const [pg, w, nome] of [['index.html', 1440, 'home-pc'], ['index.html', 390, 'home-tel'], ['polo-linee.html', 1440, 'prodotto-pc'], ['felpa-stretta.html', 390, 'prodotto-tel']]) {
      const c = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
      const q = await c.newPage(); await q.goto(BASE + pg, { waitUntil: 'load' });
      await q.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
      await q.waitForTimeout(800);
      await q.screenshot({ path: path.join(SHOTS, nome + '.png'), fullPage: true }); await c.close();
    }
  }
  console.log(`\nProve: ${ok} ok, ${ko} fallite`);
  await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
