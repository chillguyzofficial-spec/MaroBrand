// Prove di «Password dimenticata» (21/10): schermata propria → «Controlla la tua email» → link → «Scegli una nuova password».
// Il sito parla con il motore finto (stesso codice del vero, database in memoria): in prova il link compare a schermo.
// Uso: node _build/test/password.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const { avvia } = require('./motore-finto');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8997);
const B = 'http://localhost:8997/', PORTA_MOTORE = 8998;
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const vistaAperta = (pg) => pg.$$eval('[data-acc-vista]', vs => (vs.find(v => !v.hidden) || {}).dataset?.accVista || '');
const testo = (pg, s) => pg.$eval(s, e => e.textContent.trim()).catch(() => '');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz] of [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }]]) {
    const m = await avvia(PORTA_MOTORE, B.slice(0, -1));
    // un account esistente, creato dal motore come farebbe il sito
    const reg = await fetch(m.url + '/api/registrati', { method: 'POST', headers: { 'content-type': 'application/json', origin: B.slice(0, -1) }, body: JSON.stringify({ nome: 'Luca', email: 'luca@esempio.it', password: 'Vecchia123', privacy: true }) });
    prova(reg.status === 200, nome + ': account di prova creato');
    const ctx = await b.newContext(opz);
    await ctx.addInitScript((u) => { window.MARO_MOTORE = u; try { localStorage.setItem('maro-popup', String(Date.now())); localStorage.setItem('maro-popup-no', String(Date.now())); } catch (e) {} }, m.url);
    const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message)); pg.on('console', c => { if (c.type() === 'error' && !/status of 410/.test(c.text())) err.push(c.text()); }); // 410 = link già usato, voluto dalla prova
    await pg.goto(B + 'account.html'); await pg.waitForTimeout(500);
    prova(await vistaAperta(pg) === 'accedi', nome + ': si parte da Accedi');
    // 1. «Password dimenticata?» apre una schermata propria, con l'email già scritta
    await pg.fill('#acc-email', 'luca@esempio.it');
    await pg.click('[data-acc-dimenticata]'); await pg.waitForTimeout(300);
    prova(await vistaAperta(pg) === 'recupero' && /#password-dimenticata$/.test(pg.url()), nome + ': schermata «Hai dimenticato la password?» (' + await vistaAperta(pg) + ')');
    prova(await testo(pg, '[data-acc-vista="recupero"] h1') === 'Hai dimenticato la password?', nome + ': titolo chiaro');
    prova(await pg.inputValue('#rec-email') === 'luca@esempio.it', nome + ': email già compilata');
    prova(!(await pg.isVisible('#pan-accedi')) && !(await pg.isVisible('.acc-schede')), nome + ': Accedi e Registrati nascosti');
    // email sbagliata
    await pg.fill('#rec-email', 'luca@'); await pg.click('[data-acc-recupero] button[type=submit]'); await pg.waitForTimeout(200);
    prova(/non sembra completa/.test(await testo(pg, '[data-rec-esito]')), nome + ': email incompleta segnalata');
    // 2. invio → «Controlla la tua email»
    await pg.fill('#rec-email', 'luca@esempio.it'); await pg.click('[data-acc-recupero] button[type=submit]');
    await pg.waitForFunction(() => location.hash === '#email-inviata', null, { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(300);
    prova(await vistaAperta(pg) === 'inviata', nome + ': schermata «Controlla la tua email»');
    prova(await testo(pg, '[data-rec-dove]') === 'luca@esempio.it', nome + ': dice a quale email è partito');
    const anc = await pg.$eval('[data-rec-ancora]', b => ({ dis: b.disabled, t: b.textContent }));
    prova(anc.dis && /tra \d+ s/.test(anc.t), nome + ': «Invia di nuovo» in attesa (' + anc.t + ')');
    // la stessa risposta anche per un'email che non esiste (non si rivela chi è registrato)
    const fantasma = await (await fetch(m.url + '/api/password-dimenticata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nessuno@esempio.it' }) })).json();
    prova(fantasma.ok === true && !fantasma.anteprima_link, nome + ': email sconosciuta, stessa risposta e nessun link');
    // Indietro del browser torna alla schermata dell'email, Avanti di nuovo alla conferma
    await pg.goBack(); await pg.waitForTimeout(250);
    prova(await vistaAperta(pg) === 'recupero', nome + ': «Indietro» torna alla schermata email');
    await pg.goForward(); await pg.waitForTimeout(250);
    prova(await vistaAperta(pg) === 'inviata', nome + ': «Avanti» torna a «Controlla la tua email»');
    // 3. il link dell'email (in prova compare a schermo) → «Scegli una nuova password»
    const link = await pg.$eval('[data-rec-prova] a', a => a.href).catch(() => '');
    prova(/account\.html#nuova-password=[A-Za-z0-9_-]{20,}$/.test(link), nome + ': link di prova a schermo');
    await pg.goto(link); await pg.waitForTimeout(500);
    prova(await vistaAperta(pg) === 'nuova', nome + ': il link apre «Scegli una nuova password»');
    prova(pg.url().endsWith('account.html#nuova-password'), nome + ': il codice segreto esce dalla barra dell’indirizzo');
    // Mostra / Nascondi, regole dal vivo
    await pg.click('[data-acc-mostra="np-pw"]');
    prova(await pg.$eval('#np-pw', i => i.type) === 'text' && await testo(pg, '[data-acc-mostra="np-pw"]') === 'Nascondi', nome + ': «Mostra» fa vedere la password');
    await pg.click('[data-acc-mostra="np-pw"]');
    await pg.fill('#np-pw', 'corta');
    prova((await pg.$$eval('[data-pw-regole-nuova] li.ok', l => l.length)) === 0, nome + ': regole non spuntate con una password debole');
    await pg.click('[data-acc-nuova] button[type=submit]'); await pg.waitForTimeout(200);
    prova(/non va ancora bene/.test(await testo(pg, '[data-np-esito]')), nome + ': password debole fermata');
    await pg.fill('#np-pw', 'Nuova2026x');
    prova((await pg.$$eval('[data-pw-regole-nuova] li.ok', l => l.length)) === 3, nome + ': tre regole spuntate');
    await pg.click('[data-acc-nuova] button[type=submit]');
    await pg.waitForSelector('[data-conto-dentro]:not([hidden])', { timeout: 5000 }).catch(() => {});
    prova(await pg.isVisible('[data-conto-dentro]'), nome + ': dopo il salvataggio si entra nell’account');
    prova(/Password cambiata/.test(await testo(pg, '[data-conto-avviso]')), nome + ': avviso «Password cambiata»');
    prova(!/nuova-password/.test(pg.url()), nome + ': indirizzo pulito dopo il cambio');
    // 4. stesso link una seconda volta → scaduto/usato, con «Chiedi un nuovo link»
    await pg.click('[data-conto-esci]'); await pg.waitForTimeout(300);
    await pg.goto(link); await pg.waitForTimeout(400);
    await pg.fill('#np-pw', 'Altra2026x'); await pg.click('[data-acc-nuova] button[type=submit]'); await pg.waitForTimeout(600);
    prova(/scaduto o è già stato usato/.test(await testo(pg, '[data-np-esito]')) && await pg.isVisible('[data-np-nuovo]'), nome + ': link già usato → «Chiedi un nuovo link»');
    await pg.click('[data-np-nuovo]'); await pg.waitForTimeout(300);
    prova(await vistaAperta(pg) === 'recupero', nome + ': «Chiedi un nuovo link» riporta alla schermata email');
    // 5. «Torna all’accesso» e accesso con la password nuova
    await pg.click('[data-acc-vista="recupero"] .acc-indietro'); await pg.waitForTimeout(300);
    prova(await vistaAperta(pg) === 'accedi' && await pg.isVisible('#pan-accedi'), nome + ': «Torna all’accesso»');
    await pg.fill('#acc-email', 'luca@esempio.it'); await pg.fill('#acc-pw', 'Nuova2026x'); await pg.click('#pan-accedi button[type=submit]');
    await pg.waitForSelector('[data-conto-dentro]:not([hidden])', { timeout: 5000 }).catch(() => {});
    prova(await pg.isVisible('[data-conto-dentro]'), nome + ': si entra con la password nuova');
    // la testata dice chi è collegato anche sulle altre pagine (21/10, come Nike)
    await pg.waitForTimeout(300);
    for (const f of ['polo.html', 'index.html']) {
      await pg.goto(B + f); await pg.waitForTimeout(500);
      const t = await pg.evaluate(() => { const a = document.querySelector('.acc-apri'), i = a && a.querySelector('.acc-iniziale'), c = a && a.querySelector('.acc-ciao'); const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; return { iniz: i ? i.textContent : '', inizVis: vis(i), ciao: c ? c.textContent : '', ciaoVis: vis(c), label: a ? a.getAttribute('aria-label') : '', voce: (document.querySelector('.menu .solo-tel[href="account.html"]') || {}).textContent, lato: document.documentElement.scrollWidth <= document.documentElement.clientWidth, alto: a ? a.getBoundingClientRect().height : 0 }; });
      prova(t.iniz === 'L' && t.inizVis, nome + ': ' + f + ' iniziale «L» in testata');
      prova(opz.viewport.width >= 960 ? (t.ciao === 'Ciao, Luca' && t.ciaoVis) : !t.ciaoVis, nome + ': ' + f + (opz.viewport.width >= 960 ? ' «Ciao, Luca» su PC' : ' solo l’iniziale su telefono'));
      prova(t.label === 'Il mio account, collegato come Luca' && t.voce === 'Ciao, Luca · Il mio account', nome + ': ' + f + ' etichetta e voce del menu');
      prova(t.lato && t.alto >= 44, nome + ': ' + f + ' testata senza scorrimento laterale, tocco da 44 px');
    }
    await pg.goto(B + 'account.html'); await pg.waitForSelector('[data-conto-dentro]:not([hidden])', { timeout: 5000 }).catch(() => {});
    await pg.click('[data-conto-esci]'); await pg.waitForTimeout(300);
    await pg.goto(B + 'polo.html'); await pg.waitForTimeout(400);
    prova(await pg.evaluate(() => !document.querySelector('.acc-apri .acc-iniziale') && document.querySelector('.acc-apri').getAttribute('aria-label') === 'Il mio account' && !document.documentElement.classList.contains('collegato')), nome + ': dopo «Esci» torna l’icona normale');
    // di nuovo dentro per le prove che seguono
    await pg.goto(B + 'account.html'); await pg.fill('#acc-email', 'luca@esempio.it'); await pg.fill('#acc-pw', 'Nuova2026x'); await pg.click('#pan-accedi button[type=submit]');
    await pg.waitForSelector('[data-conto-dentro]:not([hidden])', { timeout: 5000 }).catch(() => {});
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': nessuno scorrimento laterale');
    const tocchi = await pg.goto(B + 'account.html#password-dimenticata').then(() => pg.waitForTimeout(300)).then(() => pg.$$eval('[data-acc-vista]:not([hidden]) a, [data-acc-vista]:not([hidden]) button', es => es.filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))));
    prova(tocchi.every(h => h >= 44), nome + ': pulsanti e link da almeno 44 px (' + tocchi.join(',') + ')');
    prova(!err.length, nome + ': errori JS ' + err.join(' | '));
    await ctx.close(); await m.chiudi();
  }
  await b.close(); srv.close();
  console.log('Prove password: ' + ok + ' ok, ' + ko + ' fallite');
})();
