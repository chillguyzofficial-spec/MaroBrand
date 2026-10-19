// Prove della pagina del brand v4 (19/10): linea verticale che si disegna, punti che si accendono, entrate, foto intere, MARO mai in orizzontale
// Uso: node _build/test/brand.js   (versione del 13/10 con anagramma e zoom: sostituita il 19/10)
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8989);
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const init = () => { try { localStorage.setItem('maro-popup', String(Date.now())); localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} };
const FERMO = x => x === 'none' || x === 'matrix(1, 0, 0, 1, 0, 0)';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz] of [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['iPhone SE', { ...devices['iPhone SE'] }], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(opz); await ctx.addInitScript(init);
    const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
    await pg.goto('http://localhost:8989/storia.html', { waitUntil: 'networkidle' });
    // regola di Omar: MARO mai in orizzontale (niente anagramma, niente fasce a scorrimento)
    prova(!(await pg.$('.br-lettere, .fascia')), nome + ': nessuna scritta MARO orizzontale animata');
    prova(!/\bOMAR\b/.test(await pg.$eval('main, body', e => e.innerText)), nome + ': nessun OMAR in maiuscolo');
    prova(await pg.$$eval('.bn-voce', es => es.length === 3 && es.every(e => e.classList.contains('in-attesa'))), nome + ': 3 sport, in attesa prima di arrivarci');
    // la linea verticale sta dietro: riquadri della foto e del testo sempre opachi e neri, sfuma solo il contenuto (bug 19/10)
    prova(await pg.$$eval('.bn-voce figure, .bn-voce-testo', es => es.every(e => { const s = getComputedStyle(e); return s.opacity === '1' && s.backgroundColor === 'rgb(0, 0, 0)'; })), nome + ': riquadri opachi durante l’entrata, la linea non passa sopra');
    // firma verticale di Omar accanto al testo d'apertura (al posto dell'anagramma, tolto il 19/10)
    prova(!(await pg.$('[data-anagramma], .bn-lettere')), nome + ': anagramma tolto');
    const fi = await pg.$eval('.bn-firma', i => { const r = i.getBoundingClientRect(), l = document.querySelector('.bn-lead').getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, w: r.width, h: r.height, l: r.left, r: r.right, lead: l.width, accanto: l.left > r.right }; });
    prova(fi.ok, nome + ': firma caricata');
    prova(fi.h > fi.w * 2, nome + ': firma in verticale (' + Math.round(fi.w) + '×' + Math.round(fi.h) + ')');
    prova(fi.l >= 0 && fi.r <= opz.viewport.width, nome + ': firma dentro lo schermo');
    prova(fi.accanto && fi.lead >= 190, nome + ': testo accanto alla firma, largo ' + Math.round(fi.lead));
    const luce =() => pg.$eval('.bn-filo-luce', e => { const m = getComputedStyle(e).transform.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[3] : 1; });
    prova(await luce() < 0.05, nome + ': linea spenta in cima (' + (await luce()).toFixed(2) + ')');
    prova(await pg.$$eval('.bn-punto.acceso', p => p.length) === 0, nome + ': nessun punto acceso in cima');
    // scorre fino in fondo, a passi, come una persona
    const H = await pg.evaluate(() => document.documentElement.scrollHeight);
    let met = null;
    for (let y = 0; y <= H; y += 250) {
      await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(30);
      if (met === null && await pg.evaluate(() => { const s = document.querySelector('.bn-linea').getBoundingClientRect(); return s.top + s.height / 2 < innerHeight * 0.6; })) met = await luce();
    }
    await pg.waitForTimeout(2200);
    prova(met > 0.3 && met < 0.7, nome + ': a metà sezione la linea è a metà (' + (met || 0).toFixed(2) + ')');
    prova(await luce() > 0.99, nome + ': in fondo la linea è tutta disegnata');
    prova(await pg.$$eval('.bn-punto.acceso', p => p.length) === 3, nome + ': 3 punti accesi in fondo');
    prova(await pg.$$eval('[data-entra]', es => es.every(e => e.classList.contains('entrato') && !e.classList.contains('in-attesa'))), nome + ': tutte le sezioni entrate');
    prova((await pg.$$eval('.bn-voce figure, .bn-voce-testo, .bn-fine-logo, .bn-fine h2, .bn-fine .btn', es => es.map(e => getComputedStyle(e).transform))).every(FERMO), nome + ': elementi entrati fermi al loro posto');
    const opBt = await pg.$eval('.bn-fine .btn', e => getComputedStyle(e).opacity);
    prova(opBt === '1', nome + ': pulsante finale pieno (' + opBt + ')');
    // foto: caricate, intere (proporzioni originali), mai più alte dell'86% dello schermo nelle voci
    const foto = await pg.$$eval('.bn-apertura figure img, .bn-linea img, .bn-ali img', is => is.map(i => { const r = i.getBoundingClientRect(); return { s: i.src.split('/').pop().split('?')[0], ok: i.complete && i.naturalWidth > 0, nat: i.naturalWidth / i.naturalHeight, vis: r.width / r.height, h: r.height, voce: !!i.closest('.bn-voce') }; }));
    prova(foto.length === 5, nome + ': 5 foto (' + foto.length + ')');
    for (const f of foto) {
      prova(f.ok, nome + ': ' + f.s + ' caricata');
      prova(Math.abs(f.nat / f.vis - 1) < 0.01, nome + ': ' + f.s + ' intera, non tagliata (' + f.nat.toFixed(3) + ' / ' + f.vis.toFixed(3) + ')');
    }
    const vh = await pg.evaluate(() => innerHeight);
    prova(foto.filter(f => f.voce).every(f => f.h <= vh * 0.86 + 1), nome + ': foto degli sport entro lo schermo');
    // niente sforamenti, titoli dentro lo schermo
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': nessuno scorrimento laterale');
    prova(!(await pg.$$eval('.bn-apertura h1, .bn-linea h2, .bn-voce h3, .bn-ali h2, .bn-fine h2', es => es.some(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1 || e.scrollWidth > e.clientWidth + 1; }))), nome + ': titoli dentro lo schermo');
    // pulsanti: ogni link porta a una pagina che esiste, nessun pulsante su due righe, tocchi da 44 px
    const bt = await pg.$$eval('.bn-linea .btn, .bn-ali .btn, .bn-fine .btn', es => es.map(e => ({ h: e.getAttribute('href'), t: e.textContent, alto: e.getBoundingClientRect().height, righe: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20)) })));
    prova(bt.length === 5, nome + ': 5 pulsanti (' + bt.length + ')');
    for (const x of bt) {
      prova(fs.existsSync(path.join(ROOT, x.h)), nome + ': ' + x.t + ' → ' + x.h + ' esiste');
      prova(x.alto >= 44 && x.alto < 60, nome + ': ' + x.t + ' su una riga, alto ' + x.alto);
    }
    prova(new Set(bt.map(x => x.h)).size === bt.length, nome + ': nessun pulsante ripetuto');
    prova(!err.length, nome + ': errori JS ' + err.join(' | '));
    await ctx.close();
  }
  // movimento ridotto: tutto visibile subito, linea intera, punti accesi
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); await ctx.addInitScript(init);
  const pg = await ctx.newPage(); await pg.goto('http://localhost:8989/storia.html', { waitUntil: 'networkidle' });
  prova(!(await pg.$$eval('[data-entra]', es => es.some(e => e.classList.contains('in-attesa')))), 'movimento ridotto: sezioni visibili subito');
  prova(FERMO(await pg.$eval('.bn-filo-luce', e => getComputedStyle(e).transform)), 'movimento ridotto: linea intera');
  prova(await pg.$$eval('.bn-punto.acceso', p => p.length) === 3, 'movimento ridotto: punti accesi');
  await ctx.close(); await b.close(); srv.close();
  console.log('Prove pagina del brand: ' + ok + ' ok, ' + ko + ' fallite');
})();
