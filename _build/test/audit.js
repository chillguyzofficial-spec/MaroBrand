// Controllo completo del sito (21/10, bug hunt): ogni pagina su 5 dispositivi, da ospite e da collegato,
// menu in cima/metà/fondo, borsa con un capo su schermo basso. Motore finto locale: nessun dato vero toccato.
// Uso: node _build/test/audit.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const { avvia } = require('./motore-finto');
const ROOT = require('path').resolve(__dirname, '../..'); // la cartella del sito in cui si trova la prova (vale anche per la copia del negozio)
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
// il server locale rimappa /MaroBrand/… : 404.html usa indirizzi assoluti apposta (GitHub la serve da qualunque percorso)
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]).replace(/^\/MaroBrand\//, '/'); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8977);
const B = 'http://localhost:8977/';
const PAGINE = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const DISP = [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['iPhone SE', { ...devices['iPhone SE'] }], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }], ['iPad', { ...devices['iPad (gen 7)'] }]];

(async () => {
  const m = await avvia(8978, B.slice(0, -1));
  const reg = await fetch(m.url + '/api/registrati', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nome: 'Francesco', email: 'f@esempio.it', password: 'Prova2026x', privacy: true }) }).then((r) => r.json());
  const b = await chromium.launch({ channel: 'msedge' });
  // vetrina (21/10): niente account né borsa → solo da ospite
  const VETRINA = !fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('data-apri-borsa');
  for (const collegato of VETRINA ? [false] : [false, true]) for (const [nome, opz] of DISP) {
    const etich = nome + (collegato ? ' collegato' : ' ospite');
    const ctx = await b.newContext(opz);
    await ctx.addInitScript(([u, tk]) => {
      window.MARO_MOTORE = u;
      try { localStorage.setItem('maro-popup', String(Date.now())); localStorage.setItem('maro-popup-no', String(Date.now())); if (tk) { localStorage.setItem('maro-token', tk); localStorage.setItem('maro-chi', JSON.stringify({ nome: 'Francesco', email: 'f@esempio.it' })); } } catch (e) {}
    }, [m.url, collegato ? reg.token : null]);
    const pg = await ctx.newPage();
    const err = [];
    pg.on('pageerror', (e) => err.push('JS ' + e.message));
    pg.on('console', (c) => { if (c.type() === 'error') err.push('console ' + c.text()); });
    pg.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url()) && !/\.mp4/.test(r.url())) err.push('fallita ' + r.url()); });
    pg.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(B)) err.push(r.status() + ' ' + r.url()); });
    for (const f of PAGINE) {
      err.length = 0;
      await pg.goto(B + f, { waitUntil: 'load' }).catch((e) => err.push('goto ' + e.message));
      // scorre tutta la pagina come una persona, così le foto lazy si caricano
      const H = await pg.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= H; y += 600) { await pg.evaluate((y) => scrollTo(0, y), y); await pg.waitForTimeout(40); }
      await pg.waitForTimeout(500);
      const r = await pg.evaluate((collegato) => {
        const vis = (e) => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && q.width > 0 && q.height > 0; };
        const imgs = [...document.images].filter((i) => vis(i) && i.getAttribute('src') && i.loading !== 'lazy' || (vis(i) && i.complete));
        const rotte = [...document.images].filter((i) => vis(i) && i.complete && i.getAttribute('src') && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
        const senzaAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src'));
        const ids = {}; [...document.querySelectorAll('[id]')].forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
        const doppi = Object.keys(ids).filter((k) => ids[k] > 1);
        const ancore = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !/^#(nuova-password|email-inviata|conferma)/.test(h) && !document.getElementById(h.slice(1)));
        const vuoti = [...document.querySelectorAll('a')].filter((a) => vis(a) && (!a.getAttribute('href') || a.getAttribute('href') === '#')).map((a) => a.textContent.trim().slice(0, 30));
        const a = document.querySelector('.acc-apri');
        return {
          lato: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? document.documentElement.scrollWidth : 0,
          rotte, senzaAlt, doppi, ancore, vuoti,
          testata: collegato ? !!(a && a.querySelector('.acc-iniziale')) : (!a || !!a.querySelector('svg')),
          bloccata: getComputedStyle(document.documentElement).overflow === 'hidden',
          link: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /^[a-z0-9-]+\.html/.test(h)).map((h) => h.split(/[?#]/)[0]),
        };
      }, collegato);
      const mancanti = [...new Set(r.link)].filter((h) => !fs.existsSync(path.join(ROOT, h)));
      prova(!r.lato, etich + ' ' + f + ': scorrimento laterale ' + r.lato);
      prova(!r.rotte.length, etich + ' ' + f + ': foto rotte ' + r.rotte.join(', '));
      prova(!r.senzaAlt.length, etich + ' ' + f + ': immagini senza alt ' + r.senzaAlt.join(', '));
      prova(!r.doppi.length, etich + ' ' + f + ': id doppi ' + r.doppi.join(', '));
      prova(!r.ancore.length, etich + ' ' + f + ': link # senza destinazione ' + r.ancore.join(', '));
      prova(!r.vuoti.length, etich + ' ' + f + ': link vuoti ' + r.vuoti.join(' | '));
      prova(!mancanti.length, etich + ' ' + f + ': link a pagine inesistenti ' + mancanti.join(', '));
      prova(r.testata, etich + ' ' + f + ': testata ' + (collegato ? 'con l’iniziale' : 'con l’icona'));
      prova(!r.bloccata, etich + ' ' + f + ': scorrimento bloccato senza motivo');
      prova(!err.length, etich + ' ' + f + ': errori ' + [...new Set(err)].join(' | '));
      // menu del telefono in cima, a metà, in fondo: si apre, si chiude, lo scorrimento torna
      if (opz.viewport.width < 960 && f !== '404.html') {
        for (const dove of [0, 0.5, 1]) {
          await pg.evaluate((d) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * d), dove); await pg.waitForTimeout(150);
          const prima = await pg.evaluate(() => scrollY);
          await pg.evaluate(() => document.querySelector('.menu-apri').click()); await pg.waitForTimeout(350);
          const aperto = await pg.evaluate(() => { const m = document.getElementById('menu'), r = m.getBoundingClientRect(); return document.querySelector('.menu-apri').getAttribute('aria-expanded') === 'true' && r.height > 100 && r.top < innerHeight && getComputedStyle(m).visibility !== 'hidden'; });
          await pg.evaluate(() => document.querySelector('.menu-apri').click()); await pg.waitForTimeout(350);
          const dopo = await pg.evaluate(() => ({ y: scrollY, bloc: getComputedStyle(document.documentElement).overflow === 'hidden', esp: document.querySelector('.menu-apri').getAttribute('aria-expanded') }));
          prova(aperto && dopo.esp === 'false' && !dopo.bloc && Math.abs(dopo.y - prima) < 3, etich + ' ' + f + ': menu al ' + dove * 100 + '% (aperto ' + aperto + ', scorrimento ' + prima + '→' + dopo.y + ')');
        }
      }
    }
    // borsa con un capo, sullo schermo più basso: il pulsante di pagamento si raggiunge e l'avviso di prova c'è
    if (!VETRINA && (nome === 'iPhone SE' || nome === 'PC')) {
      await pg.goto(B + 'polo-linee.html'); await pg.waitForTimeout(400);
      await pg.evaluate(() => { const i = [...document.querySelectorAll('input[name=taglia]')].find((x) => !x.disabled); if (i) i.closest('label').click(); });
      await pg.evaluate(() => document.querySelector('[data-aggiungi]').click());
      await pg.waitForTimeout(600);
      if (!(await pg.isVisible('#borsa'))) { await pg.click('[data-apri-borsa]').catch(() => {}); await pg.waitForTimeout(500); }
      const bo = await pg.evaluate(() => { const p = document.querySelector('[data-paga]'); if (!p) return null; p.scrollIntoView({ block: 'center' }); const r = p.getBoundingClientRect(); return { dentro: r.top >= 0 && r.bottom <= innerHeight, prova: !!document.querySelector('.prova-borsa'), righe: document.querySelectorAll('#borsa-righe > *').length }; });
      prova(bo && bo.righe > 0, etich + ': un capo entra in borsa');
      prova(bo && bo.dentro, etich + ': «Vai al pagamento» raggiungibile nella borsa');
      prova(bo && bo.prova, etich + ': avviso della carta di prova in borsa');
    }
    await ctx.close();
  }
  await b.close(); await m.chiudi(); srv.close();
  console.log('Controllo completo: ' + ok + ' ok, ' + ko + ' fallite');
})();
