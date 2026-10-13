// Prove dei particolari dinamici della pagina del brand (anagramma, zoom sui segni, conto breve, movimento ridotto)
// Uso: node _build/test/brand.js   (13/10/2026)
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8989);
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const init = () => { try { localStorage.setItem('maro-popup', String(Date.now())); localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} };
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz] of [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['iPhone SE', { ...devices['iPhone SE'] }]]) {
    const ctx = await b.newContext(opz); await ctx.addInitScript(init);
    const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
    await pg.goto('http://localhost:8989/storia.html', { waitUntil: 'networkidle' });
    prova(await pg.$$eval('[data-entra]', es => es.every(e => e.classList.contains('in-attesa'))), nome + ': banner e finale in attesa prima di arrivarci');
    const ordine = () => pg.$$eval('.br-lettere b', bs => bs.map(x => x.textContent).join(''));
    prova(await ordine() === 'OMAR', nome + ': prima di arrivarci le lettere sono OMAR (' + await ordine() + ')');
    await pg.locator('.br-intro').scrollIntoViewIfNeeded(); await pg.waitForTimeout(3600);
    prova(await ordine() === 'MARO', nome + ': dopo, MARO (' + await ordine() + ')');
    const fermo = await pg.$$eval('.br-lettere b', bs => bs.every(x => !x.style.transform || x.style.transform === 'none' || x.style.transform === ''));
    prova(fermo, nome + ': lettere ferme al loro posto');
    const fuori = await pg.evaluate(() => { const r = document.querySelector('.br-lettere').getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
    prova(!fuori, nome + ': parola MARO dentro lo schermo');
    // zoom
    for (let i = 0; i < 3; i++) {
      const bt = pg.locator('.br-zoom-btn').nth(i); await bt.scrollIntoViewIfNeeded(); await bt.click(); await pg.waitForTimeout(1100);
      const st = await pg.evaluate(k => { const f = document.querySelectorAll('.br-zoom')[k]; return { on: f.classList.contains('acceso'), t: getComputedStyle(f.querySelector('img')).transform, l: f.querySelector('button').textContent, p: f.querySelector('button').getAttribute('aria-pressed') }; }, i);
      prova(st.on && /matrix\(2\.2/.test(st.t) && st.l === 'Foto intera' && st.p === 'true', nome + ': zoom ' + (i + 1) + ' acceso ' + JSON.stringify(st));
      const bb = await bt.boundingBox(), fb = await pg.locator('.br-zoom').nth(i).boundingBox();
      prova(bb.x >= fb.x && bb.x + bb.width <= fb.x + fb.width + 0.5, nome + ': pulsante zoom ' + (i + 1) + ' dentro la foto');
    }
    
    for (let i = 0; i < 3; i++) { await pg.locator('.br-zoom-btn').nth(i).click(); }
    await pg.waitForTimeout(700);
    prova(await pg.$$eval('.br-zoom', fs => fs.every(f => !f.classList.contains('acceso'))), nome + ': zoom spenti al secondo tocco');
    // entrate: apertura, banner, ali del finale
    const tr = sel => pg.$$eval(sel, es => es.map(e => getComputedStyle(e).transform));
    prova((await tr('.st-hero h1 .st-riga > span')).every(x => x === 'none' || x === 'matrix(1, 0, 0, 1, 0, 0)'), nome + ': titolo dell’apertura al suo posto');
    for (const [sel, n] of [['.br-banner', 'banner'], ['.st-fine', 'finale']]) {
      await pg.locator(sel).scrollIntoViewIfNeeded(); await pg.waitForTimeout(3300);
      prova(await pg.$eval(sel, e => e.classList.contains('entrato')), nome + ': ' + n + ' entrato');
    }
    prova((await tr('.br-banner .st-riga > span, .br-banner img')).every(x => x === 'none' || x === 'matrix(1, 0, 0, 1, 0, 0)'), nome + ': parole e foto del banner ferme al loro posto');
    prova((await tr('.st-fine-simbolo .ala-sx, .st-fine-simbolo .ala-dx')).every(x => x === 'none' || x === 'matrix(1, 0, 0, 1, 0, 0)'), nome + ': ali aperte ' + (await tr('.st-fine-simbolo path')).join(' | '));
    const fuoriP = await pg.evaluate(() => [...document.querySelectorAll('.br-banner h2, .st-fine h2, .st-hero h1')].some(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }));
    prova(!fuoriP, nome + ': titoli animati dentro lo schermo');
    // conto breve
    const conto = await pg.$eval('[data-conto-breve]', e => e.textContent);
    prova(/^ — mancano \d+ giorn/.test(conto), nome + ': conto alla rovescia "' + conto + '"');
    prova(!err.length, nome + ': errori JS ' + err.join(' | '));
    await ctx.close();
  }
  // movimento ridotto: MARO subito, nessuna animazione
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); await ctx.addInitScript(init);
  const pg = await ctx.newPage(); await pg.goto('http://localhost:8989/storia.html', { waitUntil: 'networkidle' });
  prova(await pg.$$eval('.br-lettere b', bs => bs.map(x => x.textContent).join('')) === 'MARO', 'movimento ridotto: MARO subito');
  prova(!(await pg.$$eval('[data-entra]', es => es.some(e => e.classList.contains('in-attesa')))), 'movimento ridotto: banner e finale visibili subito');
  prova(await pg.$eval('.st-hero h1 .st-riga > span', e => getComputedStyle(e).animationName === 'none'), 'movimento ridotto: apertura senza animazione');
  await ctx.close(); await b.close(); srv.close();
  console.log('Prove dinamici: ' + ok + ' ok, ' + ko + ' fallite');
})();
