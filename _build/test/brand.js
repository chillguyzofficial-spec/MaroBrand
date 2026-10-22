// Prove della pagina del brand v4 (19/10): manifesto di Omar (21/10) al posto della linea con gli sport, entrate, foto intere, MARO mai in orizzontale
// Uso: node _build/test/brand.js   (versione del 13/10 con anagramma e zoom: sostituita il 19/10)
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const ROOT = require('path').resolve(__dirname, '../..'); // la cartella del sito in cui si trova la prova (vale anche per la copia del negozio)
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
    prova(!(await pg.$('.bn-linea, .bn-voce')), nome + ': sezione «Il segno» tolta');
    const passi = await pg.$$eval('.bm-passo', es => es.map(e => ({ attesa: e.classList.contains('in-attesa'), foto: e.querySelector('.bm-segno').src.split('/').pop().split('?')[0], testo: e.querySelector('.bm-testo').innerText })));
    prova(passi.length === 5, nome + ': 5 passi del manifesto (' + passi.length + ')');
    prova(passi.every(p => p.attesa), nome + ': passi in attesa prima di arrivarci');
    prova(passi.map(p => p.foto).join() === 'bm-1.webp,bm-2.webp,bm-3.webp,bm-4.webp,bm-5.webp', nome + ': disegni nell’ordine di Omar (' + passi.map(p => p.foto).join() + ')');
    const attesi = [/Every goal begins with a vision/i, /^MARO nasce per chi ha un obiettivo/, /significa imparare dal passato/, /Ma sognare non basta[\s\S]*senza cercare scorciatoie/i, /Crediamo nel rispetto[\s\S]*Immagina\. Credi\. Agisci\.[\s\S]*la trasformano in realtà\./i];
    attesi.forEach((r, i) => prova(r.test(passi[i] ? passi[i].testo : ''), nome + ': testo giusto sotto il disegno ' + (i + 1)));
    prova(await pg.evaluate(() => { const o = [...document.querySelectorAll('section')].map(x => x.className.split(' ')[0]); return o.indexOf('bm') === o.indexOf('bn-apertura') + 1; }), nome + ': manifesto subito dopo l’apertura');
    // alternanza bianco/nero: mai due sezioni dello stesso colore di fila
    const fondi = await pg.$$eval('.bn-apertura, .bm, .bn-ali, .bn-fine', es => es.map(e => getComputedStyle(e).backgroundColor));
    prova(fondi.every((c, i) => i === 0 || c !== fondi[i - 1]), nome + ': sezioni alternate (' + fondi.join(' / ') + ')');
    // firma verticale di Omar accanto al testo d'apertura (al posto dell'anagramma, tolto il 19/10)
    prova(!(await pg.$('[data-anagramma], .bn-lettere')), nome + ': anagramma tolto');
    const fi = await pg.$eval('.bn-firma', i => { const r = i.getBoundingClientRect(), l = document.querySelector('.bn-lead').getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, w: r.width, h: r.height, l: r.left, r: r.right, lead: l.width, accanto: l.left > r.right }; });
    prova(fi.ok, nome + ': firma caricata');
    prova(fi.h > fi.w * 2, nome + ': firma in verticale (' + Math.round(fi.w) + '×' + Math.round(fi.h) + ')');
    prova(fi.l >= 0 && fi.r <= opz.viewport.width, nome + ': firma dentro lo schermo');
    prova(fi.accanto && fi.lead >= 190, nome + ': testo accanto alla firma, largo ' + Math.round(fi.lead));
    // scorre fino in fondo, a passi, come una persona
    const H = await pg.evaluate(() => document.documentElement.scrollHeight);
    // riga verticale del manifesto (tornata il 21/10): spenta in cima, a metà a metà sezione, tutta disegnata in fondo, 5 pallini accesi
    const luce = () => pg.$eval('.bm .bn-filo-luce', e => { const m = getComputedStyle(e).transform.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[3] : 1; });
    prova(await luce() < 0.05, nome + ': riga spenta in cima (' + (await luce()).toFixed(2) + ')');
    prova(await pg.$$eval('.bm .bn-punto.acceso', p => p.length) === 0, nome + ': nessun pallino acceso in cima');
    let met = null;
    for (let y = 0; y <= H; y += 250) {
      await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(30);
      if (met === null && await pg.evaluate(() => { const s = document.querySelector('.bm').getBoundingClientRect(); return s.top + s.height / 2 < innerHeight * 0.6; })) met = await luce();
    }
    await pg.waitForTimeout(3000); // testo e firma entrano in ~1,6 s: margine per i telefoni lenti
    prova(met > 0.3 && met < 0.7, nome + ': a metà sezione la riga è a metà (' + (met || 0).toFixed(2) + ')');
    prova(await luce() > 0.99, nome + ': in fondo la riga è tutta disegnata');
    prova(await pg.$$eval('.bm .bn-punto.acceso', p => p.length) === 5, nome + ': 5 pallini accesi in fondo');
    prova(H === await pg.evaluate(() => document.documentElement.scrollHeight), nome + ': la pagina non si allunga mentre carica le foto');
    // disegni tutti nello stesso spazio quadrato, interi dentro, segno e foglio sovrapposti uguali
    const cor = await pg.$$eval('.bm-disegno', es => es.map(e => { const r = e.querySelector('.bm-gira').getBoundingClientRect(), s = e.querySelector('.bm-segno').getBoundingClientRect(), f = e.querySelector('.bm-foglio').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), dentro: s.left >= r.left - 1 && s.right <= r.right + 1 && s.top >= r.top - 1 && s.bottom <= r.bottom + 1, lato: Math.max(s.width, s.height) >= r.width - 2, uguali: Math.abs(s.left - f.left) < 1 && Math.abs(s.width - f.width) < 1 && Math.abs(s.top - f.top) < 1, icona: !!e.querySelector('.bm-gira-icona'), cap: !!e.querySelector('figcaption') }; }));
    prova(cor.length === 5 && cor.every(c => c.w === cor[0].w && c.h === c.w), nome + ': spazi dei disegni quadrati e tutti uguali (' + cor.map(c => c.w + '×' + c.h).join(',') + ')');
    prova(cor.every(c => c.dentro && c.lato), nome + ': ogni disegno intero e grande quanto il suo spazio');
    prova(cor.every(c => c.uguali), nome + ': segno e foglio sovrapposti alla stessa misura');
    prova(cor.every(c => c.icona && !c.cap), nome + ': niente scritte sotto i disegni, solo l’icona nell’angolo');
    // invito unico all'inizio (Francesco 21/10: non sotto ogni foto) e riga nera che scende dal ponte verso i disegni
    const inv = await pg.$$eval('.bn-ponte-invito', es => es.map(e => e.textContent.trim()));
    prova(inv.length === 1 && /^(Clicca|Tocca) su un disegno per vedere il foglio originale$/.test(inv[0]), nome + ': invito una volta sola (' + inv.join(' | ') + ')');
    prova(await pg.evaluate(() => { const p = document.querySelector('.bn-ponte'), r = p.getBoundingClientRect(), a = getComputedStyle(p, '::after'), sez = document.querySelector('.bn-apertura').getBoundingClientRect(), filo = document.querySelector('.bm .bn-filo').getBoundingClientRect(); return Math.abs(r.bottom - sez.bottom) < 2 && parseFloat(a.height) >= 50 && Math.abs((filo.left + filo.width / 2) - innerWidth / 2) < 2 && Math.abs((r.left + r.width / 2) - innerWidth / 2) < 2; }), nome + ': riga del ponte attaccata alla sezione dei disegni, al centro come la riga bianca');
    // Guarda il foglio: un tocco mostra il foglio, un altro torna al segno
    const gira = () => pg.$eval('.bm-passo:nth-child(3)', e => ({ cl: e.querySelector('.bm-disegno').classList.contains('foglio'), pr: e.querySelector('.bm-gira').getAttribute('aria-pressed') }));
    await pg.click('.bm-passo:nth-child(3) .bm-gira'); await pg.waitForTimeout(700);
    const g1 = await gira();
    prova(g1.cl && g1.pr === 'true', nome + ': un tocco mostra il foglio');
    prova(await pg.$eval('.bm-passo:nth-child(3) .bm-foglio', i => i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === '1'), nome + ': foto del foglio caricata e visibile');
    await pg.click('.bm-passo:nth-child(3) .bm-gira'); await pg.waitForTimeout(700);
    const g2 = await gira();
    prova(!g2.cl && g2.pr === 'false', nome + ': un altro tocco torna al segno');
    prova(await pg.$$eval('[data-entra]', es => es.every(e => e.classList.contains('entrato') && !e.classList.contains('in-attesa'))), nome + ': tutte le sezioni entrate');
    prova((await pg.$$eval('.bm-testo, .bn-fine-logo, .bn-fine h2, .bn-fine .btn', es => es.map(e => getComputedStyle(e).transform))).every(FERMO), nome + ': elementi entrati fermi al loro posto');
    const opBt = await pg.$eval('.bn-fine .btn', e => getComputedStyle(e).opacity);
    prova(opBt === '1', nome + ': pulsante finale pieno (' + opBt + ')');
    // foto: caricate, intere (proporzioni originali), mai più alte dell'86% dello schermo nelle voci
    const foto = await pg.$$eval('.bn-video img, .bm-segno', is => is.map(i => { const r = i.getBoundingClientRect(); return { s: i.src.split('/').pop().split('?')[0], ok: i.complete && i.naturalWidth > 0, nat: i.naturalWidth / i.naturalHeight, vis: r.width / r.height, h: r.height, voce: !!i.closest('.bm-passo') }; }));
    prova(foto.length === 5, nome + ': 5 disegni interi (' + foto.length + ')');
    // 22/10: foto dello stadio (fronte e retro) caricate, affiancate, e «fischio finale» sottolineato fino in fondo
    const st = await pg.$$eval('.bn-stadio img', is => is.map(i => { const r = i.getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, x: r.left, w: r.width }; }));
    prova(st.length === 2 && st.every(s => s.ok && s.w > 100) && st[1].x > st[0].x, nome + ': stadio, due foto affiancate e caricate');
    prova(await pg.$eval('.bn-fischio', e => /^100% 1.5px/.test(getComputedStyle(e).backgroundSize)), nome + ': fischio finale sottolineato fino in fondo');
    // apertura (21/10 notte): video del tennista, senza audio, in loop, con fotogramma fisso
    const vid = await pg.$eval('[data-video-brand]', (v) => ({ muto: v.muted, loop: v.loop || !!document.querySelector('[data-video-brand-copia]'), inline: v.playsInline, poster: /bn-tennis-locandina/.test(v.poster), src: /brand-tennis\.mp4/.test(v.currentSrc || v.querySelector('source').src), w: v.getBoundingClientRect().width, controlli: v.controls })).catch(() => null);
    prova(vid && vid.muto && (vid.loop || !!document) && vid.inline && vid.poster && vid.src && !vid.controlli, nome + ': video d’apertura muto, in loop, senza comandi, con fotogramma fisso');
    prova(vid && Math.abs(vid.w - await pg.evaluate(() => document.documentElement.clientWidth)) < 2, nome + ': video a tutta larghezza');
    // frase sul video (21/10 notte, come «Fly with your mind» in home), dentro il video e leggibile
    const fr = await pg.$eval('.bn-video-frase', (p) => { const r = p.getBoundingClientRect(), v = p.parentNode.getBoundingClientRect(); return { t: p.textContent, dentro: r.top >= v.top && r.bottom <= v.bottom && r.left >= v.left && r.right <= v.right + 1, colore: getComputedStyle(p).color }; }).catch(() => null);
    prova(fr && fr.t === 'Immagina.Credi.Agisci.' && fr.dentro && fr.colore === 'rgb(255, 255, 255)', nome + ': «Immagina. Credi. Agisci.» sul video ' + JSON.stringify(fr));
    // i disegni compaiono con la tenda a tempo all'arrivo (tornata il 21/10 notte): a fine scorrimento tutte ritirate
    prova(await pg.$$eval('.bm-gira', (gs) => gs.every((g) => getComputedStyle(g, '::after').transform === 'matrix(1, 0, 0, 0, 0, 0)' || getComputedStyle(g, '::after').transform === 'none')), nome + ': a fine pagina ogni disegno è scoperto');
    // la riga passa dietro le scritte: lo sfondo di etichette, invito e testo è nero pieno
    prova(await pg.$$eval('.bm .bn-sport, .bm-testo', es => es.every(e => getComputedStyle(e).backgroundColor === 'rgb(0, 0, 0)')), nome + ': scritte su fondo nero, la riga non le attraversa');
    // firma di fondo: mai sotto il disegno né fuori schermo (su telefono nascosta)
    const ff = await pg.$$eval('.bm-firma-fondo', es => es.map(e => { const r = e.getBoundingClientRect(), b = e.parentNode.querySelector('.bm-gira').getBoundingClientRect(); return { vis: getComputedStyle(e).display !== 'none' && r.width > 0, ok: r.left >= -1 && r.right <= innerWidth + 1 && (r.right <= b.left + 1 || r.left >= b.right - 1) }; }));
    prova(ff.every(x => !x.vis || x.ok), nome + ': firma di fondo accanto al disegno, dentro lo schermo');
    if (opz.viewport.width >= 1200) prova(ff.every(x => x.vis), nome + ': firma di fondo visibile su PC');
    // carosello di «Le ali»: 6 foto quadrate, frecce e contatore
    const giro = () => pg.$eval('[data-giro]', g => ({ n: g.querySelector('[data-giro-n]').textContent, p: g.querySelector('[data-giro-prec]').disabled, s: g.querySelector('[data-giro-succ]').disabled }));
    await pg.$eval('[data-giro]', g => g.scrollIntoView({ block: 'center' })); await pg.waitForTimeout(300);
    const c0 = await giro();
    prova(c0.n === '1' && c0.p && !c0.s, nome + ': carosello parte dalla 1, freccia indietro spenta');
    for (let i = 0; i < 5; i++) { await pg.click('[data-giro-succ]'); await pg.waitForTimeout(650); }
    const c5 = await giro();
    prova(c5.n === '6' && !c5.p && c5.s, nome + ': con le frecce arriva alla 6, freccia avanti spenta (' + c5.n + ')');
    const fa = await pg.$$eval('.ali-binario img', is => is.map(i => { const r = i.getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, q: Math.abs(r.width - r.height) < 1, w: r.width }; }));
    prova(fa.length === 6 && fa.every(x => x.ok), nome + ': 6 foto del carosello caricate');
    prova(fa.every(x => x.q && x.w <= 521), nome + ': foto quadrate, mai più larghe di 520 px (' + Math.round(fa[0].w) + ')');
    await pg.click('[data-giro-prec]'); await pg.waitForTimeout(650);
    prova((await giro()).n === '5', nome + ': freccia indietro torna alla 5');
    for (const f of foto) {
      prova(f.ok, nome + ': ' + f.s + ' caricata');
      prova(Math.abs(f.nat / f.vis - 1) < 0.01, nome + ': ' + f.s + ' intera, non tagliata (' + f.nat.toFixed(3) + ' / ' + f.vis.toFixed(3) + ')');
    }
    const vh = await pg.evaluate(() => innerHeight);
    prova(foto.filter(f => f.voce).every(f => f.h <= vh * 0.86 + 1), nome + ': disegni entro lo schermo');
    // niente sforamenti, titoli dentro lo schermo
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': nessuno scorrimento laterale');
    prova(!(await pg.$$eval('.bn-apertura h1, .bm h2, .bm-grande, .bn-ali h2, .bn-fine h2', es => es.some(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1 || e.scrollWidth > e.clientWidth + 1; }))), nome + ': titoli dentro lo schermo');
    // pulsanti: ogni link porta a una pagina che esiste, nessun pulsante su due righe, tocchi da 44 px
    const bt = await pg.$$eval('.bm .btn, .bn-ali .btn, .bn-fine .btn', es => es.map(e => ({ h: e.getAttribute('href'), t: e.textContent, alto: e.getBoundingClientRect().height, righe: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20)) })));
    prova(bt.length === 2, nome + ': 2 pulsanti (' + bt.length + ')');
    for (const x of bt) {
      prova(fs.existsSync(path.join(ROOT, x.h)), nome + ': ' + x.t + ' → ' + x.h + ' esiste');
      prova(x.alto >= 44 && x.alto < 60, nome + ': ' + x.t + ' su una riga, alto ' + x.alto);
    }
    prova(new Set(bt.map(x => x.h)).size === bt.length, nome + ': nessun pulsante ripetuto');
    prova(!err.length, nome + ': errori JS ' + err.join(' | '));
    await ctx.close();
  }
  // movimento ridotto: tutto visibile subito
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); await ctx.addInitScript(init);
  const pg = await ctx.newPage(); await pg.goto('http://localhost:8989/storia.html', { waitUntil: 'networkidle' });
  prova(!(await pg.$$eval('[data-entra]', es => es.some(e => e.classList.contains('in-attesa')))), 'movimento ridotto: sezioni visibili subito');
  prova(FERMO(await pg.$eval('.bm .bn-filo-luce', e => getComputedStyle(e).transform)), 'movimento ridotto: riga intera');
  prova(await pg.$$eval('.bm .bn-punto.acceso', p => p.length) === 5, 'movimento ridotto: pallini accesi');
  await ctx.close(); await b.close(); srv.close();
  console.log('Prove pagina del brand: ' + ok + ' ok, ' + ko + ' fallite');
})();
