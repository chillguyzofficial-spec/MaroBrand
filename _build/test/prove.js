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
      await ctx.addInitScript(() => { try { localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} });
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
          if (el.closest('svg') || el.closest('[hidden]') || el.closest('.sr') || el.classList.contains('salta') || el.classList.contains('apertura-video') || el.closest('.vetrina-binario') || el.closest('.lb-binario')) return; // il video esce apposta dentro .apertura (overflow:hidden)
          const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.display === 'none') return;
          const q = el.getBoundingClientRect(); if (q.width && (q.right > W + 1 || q.left < -1)) fuori.push(el.tagName + '.' + el.className + ' ' + Math.round(q.left) + '→' + Math.round(q.right));
        });
        const imgRotte = [...document.images].filter(i => i.getAttribute('src') && i.complete && !i.naturalWidth).map(i => i.src);
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
  await ctx.addInitScript(() => { try { localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} });
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
  // lookbook a scorrimento (telefono: una foto per volta)
  await p.goto(BASE + 'index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('#lookbook').scrollIntoView());
  prova((await p.textContent('.lb-conta')).startsWith('1 / 8') && await p.isDisabled('[data-lb="-1"]'), 'lookbook: parte da 1, indietro disattivo');
  await p.tap('[data-lb="1"]'); await p.waitForTimeout(600);
  prova((await p.textContent('.lb-conta')).startsWith('2 / 8'), 'lookbook: avanti → 2');
  prova(await p.evaluate(() => { const v = document.querySelector('.lb-vetrina').getBoundingClientRect(), f = document.querySelectorAll('.lb-binario figure')[1].getBoundingClientRect(); return Math.abs(v.left - f.left) < 2; }), 'lookbook: foto 2 al suo posto');

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

  // aggiunta rapida dalla griglia
  await p.goto(BASE + 'index.html#drop', { waitUntil: 'load' });
  await p.tap('.drop .scheda-cella:nth-child(2) .rapido-apri');
  prova(await p.isVisible('.drop .scheda-cella:nth-child(2) .rapido-taglie') && await p.isDisabled('[data-rapido="polo-tricolore|XL"]'), 'rapido: taglie aperte, XL esaurita disattiva');
  await p.tap('[data-rapido="polo-tricolore|M"]');
  prova(!(await p.evaluate(() => document.getElementById('borsa').hidden)) && /Polo Tricolore/.test(await p.textContent('#borsa-righe')), 'rapido: Polo Tricolore M in borsa');
  await p.tap('.borsa-testa button');
  await p.evaluate(() => localStorage.removeItem('maro-borsa-1'));
  // zoom
  await p.goto(BASE + 'polo-linee.html', { waitUntil: 'load' });
  await p.tap('.vetrina', { position: { x: 150, y: 200 } });
  prova(await p.isVisible('#zoom') && await p.evaluate(() => document.documentElement.style.overflow === 'hidden'), 'zoom: tocco sulla foto apre lo zoom');
  await p.tap('.zoom-area'); prova(await p.evaluate(() => document.querySelector('.zoom-area').classList.contains('dentro')), 'zoom: tocco ingrandisce');
  await p.tap('.zoom-chiudi'); prova(!(await p.isVisible('#zoom')) && await p.evaluate(() => document.documentElement.style.overflow === ''), 'zoom: si chiude e la pagina scorre');
  // visti di recente
  await p.goto(BASE + 'felpa-firma.html', { waitUntil: 'load' });
  prova(await p.isVisible('.visti') && /Polo Linee/.test(await p.textContent('.visti')), 'visti di recente: compare la Polo Linee');

  // conto alla rovescia
  await p.goto(BASE + 'index.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  prova(await p.evaluate(() => /^[0-9]+$/.test(document.querySelector('[data-u="g"]').textContent) && /^[0-9][0-9]$/.test(document.querySelector('[data-u="s"]').textContent)), 'conto alla rovescia acceso');
  // trova la tua taglia + taglia esaurita
  await p.goto(BASE + 'felpa-verticale.html', { waitUntil: 'load' });
  await p.tap('.trova-apri');
  await p.tap('[data-chiave="altezza"] [data-v="1"]'); await p.tap('[data-chiave="corpo"] [data-v="0"]'); await p.tap('[data-chiave="fit"] [data-v="0"]');
  prova(/consigliamo la M/.test(await p.textContent('.trova-esito')), 'trova taglia: 170-179, media, giusta → M');
  await p.tap('[data-usa="M"]');
  prova(await p.evaluate(() => document.querySelector('input[value="M"]').checked), 'trova taglia: M selezionata');
  prova(!(await p.isVisible('[data-aggiungi]')) && await p.isVisible('.avvisami'), 'M esaurita: compare Avvisami al posto di Aggiungi');
  await p.fill('#email-avvisami', 'sara@esempio.it'); await p.tap('.avvisami .btn');
  prova(/Fatto/.test(await p.textContent('.avvisami-esito')), 'avvisami: email accettata');
  await p.tap('.taglie label:nth-child(4)');
  prova(await p.isVisible('[data-aggiungi]') && !(await p.isVisible('.avvisami')), 'taglia disponibile: torna Aggiungi alla borsa');

  // scheda prodotto + borsa
  await p.goto(BASE + 'index.html', { waitUntil: 'load' });
  await p.tap('.drop .scheda[href="felpa-stretta.html"]'); await p.waitForLoadState('load');
  await p.tap('[data-aggiungi]');
  prova(await p.isVisible('.taglie-errore'), 'senza taglia: errore');
  prova(await p.evaluate(() => document.getElementById('borsa').hidden), 'senza taglia: borsa chiusa');
  await p.tap('.taglie label:nth-child(3)'); await p.tap('[data-aggiungi]');
  prova(!(await p.evaluate(() => document.getElementById('borsa').hidden)), 'con taglia: borsa aperta');
  prova(await p.evaluate(() => document.documentElement.style.overflow === 'hidden' && document.body.style.overflow === ''), 'blocco scorrimento solo su html');
  prova(/113,90/.test(await p.textContent('.totale')) && /30,00/.test(await p.textContent('.soglia')) && /12,00/.test(await p.textContent('.sconto')), 'totale 120 − 10% + 5,90 di spedizione (iscritto), mancano 30 €');
  await p.tap('[data-piu="0"]');
  prova(/216,00/.test(await p.textContent('.totale')) && /gratuita/i.test(await p.textContent('.soglia')), 'più: 240 − 10% = 216,00 €, spedizione gratuita');
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'borsa-tel.png') });
  await p.tap('.borsa-testa button');
  prova(await p.evaluate(() => document.querySelector('.borsa-num').textContent) === '2', 'contatore borsa 2');
  await p.goto(BASE + 'index.html');
  prova(await p.evaluate(() => document.querySelector('.borsa-num').textContent) === '2', 'borsa ricordata cambiando pagina');
  await ctx.close();

  // 2b. popup 10% (contesto pulito)
  {
    const c = await b.newContext({ ...devices['iPhone 13'] }); const q = await c.newPage();
    await q.goto(BASE + 'index.html', { waitUntil: 'load' });
    await q.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2)); await q.waitForTimeout(1400);
    prova(await q.isVisible('#popup'), 'popup: compare dopo un terzo di pagina');
    await q.tap('.popup-no'); await q.waitForTimeout(400);
    prova(!(await q.isVisible('#popup')), 'popup: No grazie lo chiude');
    await q.reload(); await q.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2)); await q.waitForTimeout(1400);
    prova(!(await q.isVisible('#popup')), 'popup: dopo No grazie non ricompare');
    await q.evaluate(() => localStorage.clear()); await q.reload();
    await q.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2)); await q.waitForTimeout(1400);
    await q.fill('#email-popup', 'luca@esempio.it'); await q.tap('.popup-form .btn');
    prova(await q.isVisible('.popup-codice'), 'popup: iscrizione mostra il codice');
    await q.tap('[data-popup-ok]');
    await q.goto(BASE + 'polo-linee.html'); await q.tap('.taglie label:nth-child(2)'); await q.tap('[data-aggiungi]');
    prova(/7,50/.test(await q.textContent('.sconto')), 'popup: sconto 10% applicato in borsa');
    await c.close();
  }

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
