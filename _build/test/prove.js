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
const PAGINE = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== '404.html'); // la 404 usa <base href="/MaroBrand/">: si prova online
let ok = 0, ko = 0;
const prova = (cond, nome) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nome); } };

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  // il sito parla con un motore finto locale (mai con quello vero): ogni nuova finestra lo riceve all'avvio
  const motore = await require('./motore-finto').avvia(8985, 'http://localhost:8990');
  const nuovaFinestra = b.newContext.bind(b);
  b.newContext = async (o) => { const c = await nuovaFinestra(o); await c.addInitScript((u) => { window.MARO_MOTORE = u; }, motore.url); return c; };
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
          if (el.closest('svg') || el.closest('[hidden]') || el.closest('.sr') || el.classList.contains('salta') || el.classList.contains('apertura-video') || el.closest('.vetrina-binario') || el.closest('.lb-binario') || el.closest('.avviso-nastro') || el.closest('.fascia-nastro') || el.closest('.tir-binario')) return; // barra e fasce a scorrimento escono apposta, ritagliate // il video esce apposta dentro .apertura (overflow:hidden)
          const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.display === 'none') return;
          // foto che si allargano dentro un riquadro che le ritaglia (apertura e banner del brand): conta il riquadro, non la foto
          if (el.tagName === 'IMG' && getComputedStyle(el.parentElement).overflow === 'hidden') { const f = el.parentElement.getBoundingClientRect(); if (f.left >= -1 && f.right <= W + 1) return; }
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
  // pagine delle categorie (19/10)
  await p.goto(BASE + 'felpe.html', { waitUntil: 'load' });
  prova(await p.evaluate(() => document.querySelectorAll('.catalogo .scheda-cella:not([hidden])').length === 3 && document.querySelector('[data-cat-conta]').textContent === '(3)'), 'felpe.html: 3 felpe, conta (3)');
  prova(await p.evaluate(() => document.querySelector('.catalogo').classList.contains('filtri-chiusi')), 'telefono: filtri chiusi alla partenza');
  await p.tap('[data-filtri-mostra]'); await p.tap('[data-f-taglia="S"]');
  prova(await p.evaluate(() => document.querySelectorAll('.catalogo .scheda-cella:not([hidden])').length) === 2, 'filtro taglia S: 2 felpe (Firma S esaurita)');
  await p.selectOption('[data-ordina]', 'prezzo-giu');
  prova(await p.evaluate(() => [...document.querySelectorAll('.catalogo .scheda-cella:not([hidden])')].map(c => +c.dataset.prezzo).join()) === '120,110', 'ordina dal prezzo più alto');
  await p.goto(BASE + 'shop.html', { waitUntil: 'load' });
  prova(await p.evaluate(() => document.querySelectorAll('.catalogo .scheda-cella').length) === 10, 'shop.html: tutti i 10 capi');
  await p.goto(BASE + 'pantaloni.html', { waitUntil: 'load' });
  prova(await p.evaluate(() => document.querySelectorAll('.catalogo .scheda-cella').length) === 1, 'pantaloni.html: il Cargo Firma');
  // iscrizione (in home)
  await p.goto(BASE + 'index.html', { waitUntil: 'load' });
  await p.fill('#email', 'prova'); await p.tap('.iscriviti-form .btn');
  prova(await p.evaluate(() => document.querySelector('.esito').classList.contains('errore')), 'email sbagliata segnalata');
  await p.fill('#email', 'mario.rossi@esempio.it'); await p.tap('.iscriviti-form .btn');
  prova(await p.waitForFunction(() => /Sei dentro/.test(document.querySelector('.esito').textContent), null, { timeout: 5000 }).then(() => true, () => false), 'email valida accettata (anche con la s)');
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
  await p.goto(BASE + 'shop.html', { waitUntil: 'load' });
  await p.tap('.catalogo .scheda-cella:nth-child(2) .rapido-apri');
  prova(await p.isVisible('.catalogo .scheda-cella:nth-child(2) .rapido-taglie') && await p.isDisabled('[data-rapido="polo-tricolore|XL"]'), 'rapido: taglie aperte, XL esaurita disattiva');
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

  // preferiti
  await p.goto(BASE + 'shop.html', { waitUntil: 'load' });
  await p.tap('.catalogo .scheda-cella:nth-child(1) .cuore');
  prova(await p.evaluate(() => document.querySelector('.pref-num').textContent === '1' && document.querySelector('.catalogo .cuore').getAttribute('aria-pressed') === 'true'), 'preferiti: cuore salva, contatore 1');
  prova(/shop.html/.test(p.url()), 'preferiti: il cuore non apre la scheda');
  await p.goto(BASE + 'preferiti.html', { waitUntil: 'load' });
  prova(/Polo Linee/.test(await p.textContent('.pref-lista')) && !(await p.isVisible('.pref-vuoto')), 'preferiti: pagina con la Polo Linee');
  await p.tap('.pref-lista .cuore');
  prova(await p.isVisible('.pref-vuoto'), 'preferiti: tolto, pagina vuota');
  // recensioni di esempio dichiarate
  await p.goto(BASE + 'polo-linee.html', { waitUntil: 'load' });
  prova(/di esempio/.test(await p.textContent('.rec-esempio')), 'recensioni marcate di esempio');
  // 6 per capo, tutte diverse da un capo all'altro, con taglia e vestibilità; media coerente con le stelle
  const testiVisti = new Set();
  for (const id of ['polo-linee', 'polo-tricolore', 'polo-jacquard', 'felpa-stretta', 'felpa-firma', 'felpa-verticale']) {
    await p.goto(BASE + id + '.html', { waitUntil: 'load' });
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('.rec-lista li').length, testi: [...document.querySelectorAll('.rec-lista li > p:not(.piccolo)')].map(e => e.textContent), info: [...document.querySelectorAll('.rec-lista .piccolo')].every(e => /taglia (XS|S|M|L|XL|XXL) · veste (piccola|giusta|grande)/.test(e.textContent)), media: document.querySelector('.rec-media').textContent, conto: document.querySelector('.rec-sintesi .piccolo').textContent, stelle: [...document.querySelectorAll('.rec-lista .stelle')].map(s => +s.getAttribute('aria-label')[0]) }));
    const m = (r.stelle.reduce((a, b) => a + b, 0) / r.stelle.length).toFixed(1).replace('.', ',');
    prova(r.n === 6 && r.conto === '6 recensioni' && r.info && r.media === m, id + ': 6 recensioni con taglia e vestibilità, media ' + r.media + ' = ' + m);
    prova(r.testi.every(t => !testiVisti.has(t)), id + ': nessuna recensione ripetuta da un altro capo');
    r.testi.forEach(t => testiVisti.add(t));
  }
  // barra in alto: scorre, due copie uguali, la seconda fuori dalla tabulazione, una riga sola
  const bar = await p.evaluate(() => { const g = document.querySelectorAll('.avviso-giro'); const a = document.querySelector('.avviso'); return { giri: g.length, uguali: g[0].textContent === g[1].textContent, nascosta: g[1].getAttribute('aria-hidden') === 'true' && [...g[1].querySelectorAll('a')].every(x => x.tabIndex === -1), anim: getComputedStyle(document.querySelector('.avviso-nastro')).animationName, h: a.getBoundingClientRect().height, largo: g[0].getBoundingClientRect().width >= innerWidth }; });
  prova(bar.giri === 2 && bar.uguali && bar.nascosta && bar.anim === 'avviso-scorre' && bar.h < 40 && bar.largo, 'barra in alto che scorre ' + JSON.stringify(bar));

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
  await p.goto(BASE + 'felpe.html', { waitUntil: 'load' }); await p.tap('.catalogo .scheda[href="felpa-stretta.html"]'); await p.waitForLoadState('load');
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
    // dal 19/10 il popup compare appena si entra nell'abbigliamento, mai in home
    await q.goto(BASE + 'index.html', { waitUntil: 'load' });
    await q.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2)); await q.waitForTimeout(1600);
    prova(!(await q.isVisible('#popup')), 'popup: mai in home');
    await q.goto(BASE + 'polo.html', { waitUntil: 'load' }); await q.waitForTimeout(1600);
    prova(await q.isVisible('#popup'), 'popup: compare appena entri nell’abbigliamento');
    await q.tap('.popup-no'); await q.waitForTimeout(400);
    prova(!(await q.isVisible('#popup')), 'popup: No grazie lo chiude');
    await q.reload(); await q.waitForTimeout(1600);
    prova(!(await q.isVisible('#popup')), 'popup: dopo No grazie non ricompare');
    await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(1600);
    await q.fill('#email-popup', 'luca@esempio.it'); await q.tap('.popup-form .btn');
    prova(await q.waitForSelector('.popup-codice', { state: 'visible', timeout: 5000 }).then(() => true, () => false), 'popup: iscrizione mostra il codice');
    await q.tap('[data-popup-ok]');
    await q.goto(BASE + 'polo-linee.html'); await q.tap('.taglie label:nth-child(2)'); await q.tap('[data-aggiungi]');
    prova(/7,50/.test(await q.textContent('.sconto')), 'popup: sconto 10% applicato in borsa');
    await c.close();
  }

  // 2a. zona d'acquisto: nessun elemento sopra un altro (pulsante, consegna, Salva/Condividi), testo di consegna più lungo possibile
  for (const w of [320, 375, 390, 768, 1024, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } }); const q = await c.newPage();
    await q.clock.install({ time: new Date('2026-12-23T16:00:00') }); // "Parte giovedì 24 dicembre, arriva tra martedì 29 e giovedì 31 dicembre."
    for (const pg of ['polo-linee.html', 'felpa-firma.html']) {
      await q.goto(BASE + pg, { waitUntil: 'load' });
      const r = await q.evaluate(() => { const box = s => document.querySelector(s).getBoundingClientRect(); const a = box('[data-aggiungi]'), c0 = box('[data-consegna]'), c1 = box('.regalo-scheda'), c = { top: c0.top, bottom: c1.bottom, ok: c1.top >= c0.bottom }, z = box('.azioni-scheda'); if (!c.ok) return { a: 0, cTop: -1, cBot: 0, z: 0 }; return { a: Math.round(a.bottom), cTop: Math.round(c.top), cBot: Math.round(c.bottom), z: Math.round(z.top) }; });
      prova(r.cTop >= r.a && r.z >= r.cBot, pg + ' @' + w + ': consegna tra il pulsante e Salva/Condividi, senza sovrapporsi ' + JSON.stringify(r));
    }
    await c.close();
  }
  // (Tiratura limitata tolta dalla home il 19/10: le prove girano solo se la sezione torna)
  if (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('data-giostra')) {
  // 2a-bis. home › Tiratura limitata: fila a scorrimento, si accende il capo al centro (frecce, dito, tocco su uno spento)
  for (const dev of ['iPhone SE', 'iPhone 13']) {
    const c = await b.newContext({ ...devices[dev] }); await c.addInitScript(() => { try { localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} });
    const q = await c.newPage(); await q.goto(BASE + 'index.html', { waitUntil: 'load' });
    await q.locator('[data-giostra]').scrollIntoViewIfNeeded(); await q.waitForTimeout(400);
    const stato = () => q.evaluate(() => ({ att: [...document.querySelectorAll('.tir-binario > li')].findIndex(l => l.classList.contains('attiva')), conta: document.querySelector('.tir-conta').textContent, info: getComputedStyle(document.querySelector('.tir-binario > li.attiva .tir-info')).opacity, sw: document.documentElement.scrollWidth <= innerWidth }));
    const s0 = await stato(); prova(s0.att === 0 && s0.conta === '1 / 3' && s0.sw, dev + ': fila, primo capo acceso ' + JSON.stringify(s0));
    await q.click('[data-giostra-vai="1"]'); await q.waitForTimeout(900);
    const s1 = await stato(); prova(s1.att === 1 && s1.conta === '2 / 3', dev + ': freccia avanti, secondo capo acceso ' + JSON.stringify(s1));
    await q.locator('.tir-binario > li').nth(2).locator('a').click({ position: { x: 20, y: 40 } }); await q.waitForTimeout(900);
    const s2 = await stato(); prova(s2.att === 2 && q.url().endsWith('index.html'), dev + ': tocco su un capo spento lo porta al centro senza aprire la scheda ' + JSON.stringify(s2));
    await q.evaluate(() => document.querySelector('.tir-binario').scrollTo({ left: 0, behavior: 'instant' })); await q.waitForTimeout(700);
    const s3 = await stato(); prova(s3.att === 0, dev + ': col dito si torna al primo e si riaccende ' + JSON.stringify(s3));
    const s4 = await q.evaluate(() => { const l = document.querySelector('.tir-binario > li.attiva'); return { bordi: [...document.querySelectorAll('.tir-binario > li')].every(x => x.querySelector('img').getBoundingClientRect().height > 100) }; });
    prova(s4.bordi, dev + ': foto della fila intere e caricate');
    await c.close();
  }
  // fila su PC: tre capi in vista e leggibili; la rotella sopra la fila fa scorrere la pagina
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const q = await c.newPage(); await q.goto(BASE + 'index.html', { waitUntil: 'load' });
    await q.locator('[data-giostra]').scrollIntoViewIfNeeded(); await q.waitForTimeout(300);
    const r = await q.evaluate(() => ({ op: [...document.querySelectorAll('.tir-binario > li .tir-info')].map(e => getComputedStyle(e).opacity), dentro: [...document.querySelectorAll('.tir-binario > li')].every(l => { const x = l.getBoundingClientRect(); return x.left >= 0 && x.right <= innerWidth; }) }));
    prova(r.op.every(o => o === '1') && r.dentro, 'PC: tre capi in vista con le informazioni leggibili ' + JSON.stringify(r));
    const y0 = await q.evaluate(() => scrollY); const box = await q.locator('.tir-binario > li').nth(1).boundingBox();
    await q.mouse.move(box.x + box.width / 2, box.y + 100); await q.mouse.wheel(0, 400); await q.waitForTimeout(400);
    prova((await q.evaluate(() => scrollY)) > y0 + 200, 'PC: la rotella sopra la fila fa scorrere la pagina');
    await c.close(); }
  { const c = await b.newContext({ ...devices['iPhone 13'] }); const q = await c.newPage(); await q.goto(BASE + 'index.html', { waitUntil: 'load' });
    const ov = await q.evaluate(() => getComputedStyle(document.querySelector('.tir-binario')).overflowY);
    prova(ov === 'hidden', 'telefono: la fila non scorre in verticale (' + ov + ')'); await c.close(); }
  }
  // 2b. data di consegna: orario limite 13, weekend, festivi (1/11, 8/12), Pasquetta, cambio di mese
  for (const [quando, atteso] of [
    ['2026-10-13T10:00:00', 'Se ordini entro 3 h, arriva tra giovedì 15 e lunedì 19 ottobre.'],
    ['2026-10-13T12:35:30', 'Se ordini entro 25 min, arriva tra giovedì 15 e lunedì 19 ottobre.'],
    ['2026-10-16T15:00:00', 'Se ordini oggi, arriva tra mercoledì 21 e venerdì 23 ottobre.'],
    ['2026-10-30T12:00:00', 'Se ordini entro 1 h, arriva tra martedì 3 e giovedì 5 novembre.'],
    ['2026-10-31T09:00:00', 'Se ordini oggi, arriva tra mercoledì 4 e venerdì 6 novembre.'],
    ['2026-12-07T14:00:00', 'Se ordini oggi, arriva tra venerdì 11 e martedì 15 dicembre.'],
    ['2026-12-23T16:00:00', 'Se ordini oggi, arriva tra martedì 29 e giovedì 31 dicembre.'],
    ['2027-03-29T10:00:00', 'Se ordini oggi, arriva tra giovedì 1 e lunedì 5 aprile.'],
  ]) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const q = await c.newPage();
    await q.clock.install({ time: new Date(quando) });
    await q.goto(BASE + 'polo-linee.html', { waitUntil: 'load' });
    const t = await q.textContent('[data-consegna]');
    prova(t === atteso, 'consegna ' + quando + ': "' + t + '"');
    await c.close();
  }
  // 2c. carta regalo: errori chiari, anteprima, borsa (via email, fuori dalla soglia e dallo sconto)
  {
    const c = await b.newContext({ ...devices['iPhone 13'] });
    await c.addInitScript(() => { try { localStorage.setItem('maro-popup-no', String(Date.now())); localStorage.setItem('maro-motore', '1'); localStorage.setItem('maro-codice', JSON.stringify({ tipo: 'benvenuto', codice: 'MARO-PROV', pct: 10 })); } catch (e) {} });
    const q = await c.newPage(); const err = []; q.on('pageerror', e => err.push(e.message));
    await q.goto(BASE + 'carta-regalo.html', { waitUntil: 'load' });
    await q.tap('.cr-form [type=submit]');
    prova(/nome di chi riceve/.test(await q.textContent('.cr-esito')), 'carta: senza nome, errore chiaro');
    await q.fill('[name=per]', 'Giulia'); await q.fill('[name=email]', 'giulia@email'); await q.tap('.cr-form [type=submit]');
    prova(/email/.test(await q.textContent('.cr-esito')), 'carta: email incompleta, errore chiaro');
    await q.tap('[data-importo="150"]'); await q.fill('[name=msg]', 'Buon compleanno'); await q.fill('[name=da]', 'Marco');
    const ant = await q.evaluate(() => [...document.querySelectorAll('[data-cr-importo], [data-cr-per], [data-cr-msg], [data-cr-da], [data-cr-conta]')].map(e => e.textContent).join(' | '));
    prova(ant === '150 € | Per Giulia | Buon compleanno | Da Marco | 15/120', 'carta: anteprima dal vivo ' + ant);
    await q.fill('[name=email]', 'giulia@email.it'); await q.tap('.cr-form [type=submit]');
    await q.waitForTimeout(300);
    const s1 = await q.evaluate(() => ({ aperta: !document.querySelector('#borsa').hidden, riga: document.querySelector('#borsa-righe').textContent, tot: document.querySelector('.totale').textContent, sped: [...document.querySelectorAll('.riepilogo')].map(x => x.textContent).join(' | '), soglia: !!document.querySelector('.soglia') }));
    prova(s1.aperta && /Carta regalo/.test(s1.riga) && /Per Giulia/.test(s1.riga) && /150,00 €/.test(s1.tot) && /Via email/.test(s1.sped) && !/MARO10/.test(s1.sped) && !s1.soglia, 'carta: in borsa, via email, senza sconto né soglia ' + JSON.stringify(s1));
    // con un capo da 75 €: sconto e soglia solo sul capo (75 → mancano 75 €), spedizione 5,90
    await q.goto(BASE + 'polo-linee.html', { waitUntil: 'load' });
    await q.evaluate(() => window.MARO_aggiungi('polo-linee', 'M'));
    const s2 = await q.evaluate(() => ({ tot: document.querySelector('.totale').textContent, soglia: document.querySelector('.soglia').textContent, sconto: (document.querySelector('.riepilogo.sconto') || {}).textContent || '' }));
    prova(/75,00/.test(s2.soglia) && /7,50/.test(s2.sconto) && /223,40 €/.test(s2.tot), 'borsa mista: soglia e sconto solo sui capi, totale 150+75-7,50+5,90 ' + JSON.stringify(s2));
    prova(!err.length, 'carta: nessun errore JS ' + err.join(' | '));
    // quando inviarla: oggi di default, domani, un altro giorno dal calendario (passato non selezionabile)
    {
      const c3 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q3 = await c3.newPage();
      await q3.clock.install({ time: new Date('2026-10-13T22:00:00') });
      await q3.goto(BASE + 'carta-regalo.html', { waitUntil: 'load' });
      const v = () => q3.inputValue('[name=quando]');
      prova(await v() === '2026-10-13' && /oggi, martedì 13 ottobre/.test(await q3.textContent('.cr-quando-scelto')), 'quando: oggi di default');
      await q3.click('[data-quando="domani"]'); prova(await v() === '2026-10-14', 'quando: domani');
      await q3.click('[data-quando="altro"]');
      const cal = await q3.evaluate(() => ({ aperto: !document.querySelector('#cr-cal').hidden, mese: document.querySelector('.cr-cal-testa p').textContent, passato: document.querySelector('[data-giorno="2026-10-12"]').disabled, prec: document.querySelector('[data-mese="-1"]').disabled, w: Math.round(document.querySelector('#cr-cal').getBoundingClientRect().width), f: Math.round(document.querySelector('.cr-form').getBoundingClientRect().width) }));
      prova(cal.aperto && cal.mese === 'ottobre 2026' && cal.passato && cal.prec && cal.w === cal.f, 'calendario: aperto su ottobre, passato bloccato, largo come il modulo ' + JSON.stringify(cal));
      for (const w of [320, 1440]) { await q3.setViewportSize({ width: w, height: 844 }); const sw = await q3.evaluate(() => [document.documentElement.scrollWidth, innerWidth, Math.round(document.querySelector('#cr-cal').getBoundingClientRect().height)]); prova(sw[0] <= sw[1] && sw[2] < 480, 'calendario aperto @' + w + ': niente scorrimento laterale, alto ' + sw[2] + ' px'); }
      await q3.click('[data-mese="1"]'); await q3.click('[data-giorno="2026-11-14"]');
      prova(await v() === '2026-11-14' && await q3.isHidden('#cr-cal') && /sabato 14 novembre\.$/.test(await q3.textContent('.cr-quando-scelto')) && (await q3.textContent('[data-quando="altro"]')) === '14/11', 'calendario: scelto il 14 novembre, si chiude, anno non ripetuto');
      // anno dopo: l'anno si scrive sempre
      await q3.click('[data-quando="altro"]'); for (let k = 0; k < 2; k++) await q3.click('[data-mese="1"]'); // si riapre su novembre (data scelta)
      await q3.click('[data-giorno="2027-01-14"]');
      const anno = [await q3.textContent('.cr-quando-scelto'), await q3.textContent('[data-quando="altro"]')];
      prova(anno[0] === 'Arriva via email giovedì 14 gennaio 2027.' && anno[1] === '14/01/27', 'calendario: data dell’anno dopo con l’anno scritto ' + JSON.stringify(anno));
      await c3.close();
    }
    // la carta non resta attaccata quando si scorre, e i testi lunghi stanno dentro la carta (telefono e PC)
    for (const w of [320, 390, 900, 1440]) {
      const c2 = await b.newContext({ viewport: { width: w, height: 800 } }); const q2 = await c2.newPage();
      await q2.goto(BASE + 'carta-regalo.html', { waitUntil: 'load' });
      await q2.fill('[name=per]', 'Massimiliano Alessandro'); await q2.fill('[name=da]', 'Francesca e tutta la famiglia'); await q2.fill('[name=msg]', 'Buon compleanno! Ci vediamo al drop del 14 novembre, scegli quello che vuoi e mettilo subito, ok?');
      const r = await q2.evaluate(async () => { const c = document.querySelector('.cr-carta'), y0 = c.getBoundingClientRect().top; scrollBy(0, 200); await new Promise(f => setTimeout(f, 100)); const k = c.getBoundingClientRect(); return { scorre: Math.round(y0 - k.top) === 200, dentro: [...c.querySelectorAll('p, .cr-carta-alto')].filter(e => e.offsetParent).every(e => { const r = e.getBoundingClientRect(); return r.bottom <= k.bottom + 1 && r.right <= k.right + 1; }) }; });
      prova(r.scorre && r.dentro, 'carta @' + w + ': scorre con la pagina e testi dentro ' + JSON.stringify(r));
      await c2.close();
    }
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
  await b.close(); srv.close(); await motore.chiudi(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
