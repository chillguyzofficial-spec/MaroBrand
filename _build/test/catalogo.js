// Prove delle pagine dell'abbigliamento (19/10 sera): copertine 4:5, seconda foto al passaggio del mouse,
// pallini dei colori, filtri attivi come pillole, pannello dei filtri dal basso su telefono.
// Uso: node _build/test/catalogo.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8988);
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const init = () => { try { localStorage.setItem('maro-popup', String(Date.now())); localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} };
const visibili = pg => pg.$$eval('.scheda-cella', cs => cs.filter(c => !c.hidden).length);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz, tel] of [['PC', { viewport: { width: 1440, height: 900 } }, false], ['iPhone 13', { ...devices['iPhone 13'] }, true], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, true]]) {
    const ctx = await b.newContext(opz); await ctx.addInitScript(init);
    for (const file of ['shop.html', 'polo.html', 'felpe.html']) {
      const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
      await pg.goto('http://localhost:8988/' + file, { waitUntil: 'networkidle' });
      const n0 = await visibili(pg);
      // copertine: 4:5, caricate, non deformate
      await pg.evaluate(async () => { for (const i of document.querySelectorAll('.scheda-foto img:first-child')) { i.loading = 'eager'; } await new Promise(r => setTimeout(r, 1500)); });
      const cop = await pg.$$eval('.scheda-foto', fs => fs.map(f => { const r = f.getBoundingClientRect(), i = f.querySelector('img'); return { rap: r.width / r.height, ok: i.complete && i.naturalWidth > 0, nat: i.naturalWidth / i.naturalHeight, acc: !!f.closest('[data-tipo="accessori"]'), id: i.src.split('/').pop().split('?')[0] }; }));
      prova(cop.every(c => Math.abs(c.rap - 0.8) < 0.01), nome + ' ' + file + ': schede tutte 4:5');
      prova(cop.every(c => c.ok), nome + ' ' + file + ': copertine caricate');
      prova(cop.filter(c => !c.acc).every(c => Math.abs(c.nat - 0.8) < 0.01), nome + ' ' + file + ': copertine già 4:5, nessun taglio in pagina ' + cop.filter(c => !c.acc && Math.abs(c.nat - 0.8) >= 0.01).map(c => c.id).join(','));
      // seconda foto: compare al passaggio del mouse (PC), assente sul telefono
      const seconda = await pg.$$eval('.scheda-foto-2', is => is.length);
      prova(seconda >= 3, nome + ' ' + file + ': seconde foto presenti (' + seconda + ')');
      if (!tel) {
        await pg.hover('.scheda-cella:first-child .scheda'); await pg.waitForTimeout(500);
        prova(await pg.$eval('.scheda-cella:first-child .scheda-foto-2', i => getComputedStyle(i).opacity === '1'), nome + ' ' + file + ': seconda foto al passaggio del mouse');
      } else {
        // telefono: la seconda foto si scorre col dito, i pallini seguono, la scheda resta 4:5 e la pagina non scorre di lato
        const f0 = '.scheda-cella:first-child .scheda-foto';
        prova(await pg.$eval(f0, f => f.scrollWidth >= f.clientWidth * 2 - 2 && getComputedStyle(f).overflowX === 'auto'), nome + ' ' + file + ': seconda foto scorrevole');
        await pg.$eval(f0, f => f.scrollTo({ left: f.clientWidth, behavior: 'instant' })); await pg.waitForTimeout(1200);
        const st = await pg.$eval('.scheda-cella:first-child', c => { const f = c.querySelector('.scheda-foto'), s = c.querySelector('.scheda-foto-2'), r = s.getBoundingClientRect(), fr = f.getBoundingClientRect(); return { dentro: Math.abs(r.left - fr.left) < 2, ok: s.complete && s.naturalWidth > 0, punto: [...c.querySelectorAll('.scheda-punti i')].map(i => i.classList.contains('acceso')).join() }; });
        prova(st.dentro && st.ok, nome + ' ' + file + ': seconda foto in vista e caricata ' + JSON.stringify(st));
        prova(st.punto === 'false,true', nome + ' ' + file + ': secondo pallino acceso');
        prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ' ' + file + ': nessuno scorrimento laterale della pagina');
        await pg.$eval(f0, f => f.scrollTo({ left: 0, behavior: 'instant' })); await pg.waitForTimeout(200);
      }
      // apre i filtri (sul telefono è il pannello dal basso)
      if (tel) {
        prova(await pg.$eval('[data-catalogo]', c => c.classList.contains('filtri-chiusi')), nome + ' ' + file + ': filtri chiusi all’arrivo');
        await pg.click('[data-filtri-mostra]'); await pg.waitForTimeout(400);
        const f = await pg.evaluate(() => { const a = document.querySelector('.cat-filtri'), r = a.getBoundingClientRect(); return { pos: getComputedStyle(a).position, fondo: Math.round(r.bottom), alto: r.height, vh: innerHeight, velo: !document.querySelector('.cat-velo').hidden, html: getComputedStyle(document.documentElement).overflow, testata: getComputedStyle(document.querySelector('.testata, header')).position }; });
        prova(f.pos === 'fixed' && Math.abs(f.fondo - f.vh) <= 1 && f.alto <= f.vh * 0.87, nome + ' ' + file + ': pannello dal basso ' + JSON.stringify(f));
        prova(f.velo && f.html === 'hidden', nome + ' ' + file + ': velo e pagina ferma (solo html)');
        const btn = await pg.$eval('[data-filtri-mostra-n]', e => { const r = e.getBoundingClientRect(); return { t: e.textContent, in: r.bottom <= innerHeight + 1 && r.top >= 0 }; });
        prova(btn.t === 'Mostra ' + n0 + ' capi' && btn.in, nome + ' ' + file + ': pulsante "' + btn.t + '" visibile');
        prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ' ' + file + ': nessuno scorrimento laterale col pannello aperto');
      }
      // un colore → pillola, conteggio, pulsante del pannello
      await pg.locator('.filtro-colore').first().scrollIntoViewIfNeeded();
      const det = pg.locator('details.filtro', { hasText: 'Colore' }); if (!(await det.getAttribute('open') !== null)) await det.locator('summary').click();
      await pg.locator('.filtro-colore').first().click(); await pg.waitForTimeout(150);
      const n1 = await visibili(pg), colore = await pg.$eval('.filtro-colore input', i => i.getAttribute('data-f-colore'));
      prova(n1 >= 1 && n1 <= n0, nome + ' ' + file + ': filtro colore ' + colore + ' → ' + n1 + ' capi');
      prova(await pg.$eval('[data-cat-conta]', e => e.textContent) === '(' + n1 + ')', nome + ' ' + file + ': conteggio nel titolo');
      if (tel) prova(await pg.$eval('[data-filtri-mostra-n]', e => e.textContent) === 'Mostra ' + n1 + (n1 === 1 ? ' capo' : ' capi'), nome + ' ' + file + ': pulsante aggiornato');
      // una taglia in più → due pillole e "Cancella tutto"
      await pg.locator('[data-f-taglia]').first().click(); await pg.waitForTimeout(150);
      const pil = await pg.$$eval('.cat-pillola', ps => ps.map(p => p.textContent));
      prova(pil.length === 2 && pil.includes(colore), nome + ' ' + file + ': pillole ' + pil.join(' + '));
      prova(!!(await pg.$('.cat-pillola-tutti')), nome + ' ' + file + ': "Cancella tutto" con due filtri');
      // chiude il pannello (telefono) e toglie un filtro dalla pillola
      if (tel) {
        await pg.click('[data-filtri-mostra-n]'); await pg.waitForTimeout(300);
        prova(await pg.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden' && document.querySelector('.cat-velo').hidden), nome + ' ' + file + ': pannello chiuso, pagina libera');
        prova(/Filtri \(2\)/.test(await pg.$eval('[data-filtri-scritta]', e => e.textContent)), nome + ' ' + file + ': pulsante Filtri con il numero dei filtri attivi');
      }
      await pg.locator('.cat-pillola', { hasText: colore }).click(); await pg.waitForTimeout(150);
      prova((await pg.$$eval('.cat-pillola', ps => ps.length)) === 1 && !(await pg.$('.cat-pillola-tutti')), nome + ' ' + file + ': pillola tolta');
      await pg.locator('.cat-pillola').click(); await pg.waitForTimeout(150);
      prova(await visibili(pg) === n0 && await pg.$eval('[data-cat-scelti]', e => e.hidden), nome + ' ' + file + ': tutto come all’inizio');
      if (tel) { // Esc e velo chiudono il pannello
        await pg.click('[data-filtri-mostra]'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
        prova(await pg.$eval('[data-catalogo]', c => c.classList.contains('filtri-chiusi')), nome + ' ' + file + ': Esc chiude');
        await pg.click('[data-filtri-mostra]'); await pg.waitForTimeout(300); await pg.mouse.click(10, 40); await pg.waitForTimeout(200);
        prova(await pg.$eval('[data-catalogo]', c => c.classList.contains('filtri-chiusi')), nome + ' ' + file + ': tocco fuori chiude');
      }
      prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ' ' + file + ': nessuno scorrimento laterale');
      prova(!err.length, nome + ' ' + file + ': errori JS ' + err.join(' | '));
      await pg.close();
    }
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log('Prove catalogo: ' + ok + ' ok, ' + ko + ' fallite');
})();
