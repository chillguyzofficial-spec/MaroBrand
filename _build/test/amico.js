// Prove di codici e "Porta un amico" (19/10): popup solo nell'abbigliamento, codice personale monouso,
// pagamento di prova → ordine confermato con il link, amico con il 10% in borsa, codici mai sommati.
// Uso: node _build/test/amico.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8987);
const B = 'http://localhost:8987/';
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const popupVisibile = pg => pg.$eval('#popup', p => !p.hidden && p.classList.contains('visibile'));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz] of [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }]]) {
    const err = [];
    const nuovo = async () => { const ctx = await b.newContext(opz); const pg = await ctx.newPage(); pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); }); return [ctx, pg]; };
    // ---------- chi compra: popup, codice personale, ordine, link ----------
    let [ctx, pg] = await nuovo();
    for (const f of ['index.html', 'storia.html', 'aiuto.html']) {
      await pg.goto(B + f); await pg.waitForTimeout(1800);
      prova(!(await popupVisibile(pg)), nome + ': nessun popup in ' + f);
    }
    await pg.goto(B + 'polo.html'); await pg.waitForTimeout(1600);
    prova(await popupVisibile(pg), nome + ': popup appena entri nell’abbigliamento (polo.html)');
    await pg.fill('#email-popup', 'Prova@Esempio.it'); await pg.click('.popup-form button[type=submit]'); await pg.waitForTimeout(200);
    const cod = await pg.$eval('[data-mio-codice]', e => e.textContent);
    prova(/^MARO-[A-HJ-NP-Z2-9]{4}$/.test(cod), nome + ': codice personale ' + cod);
    await pg.click('[data-popup-ok]'); await pg.waitForTimeout(400);
    await pg.goto(B + 'polo-linee.html'); await pg.waitForTimeout(1600);
    prova(!(await popupVisibile(pg)), nome + ': popup non torna dopo l’iscrizione');
    await pg.evaluate(() => window.MARO_aggiungi('polo-linee', 'M')); await pg.waitForTimeout(300);
    const riga = await pg.$eval('.riepilogo.sconto', e => e.textContent);
    prova(riga.includes('Sconto benvenuto ' + cod) && riga.includes('7,50'), nome + ': in borsa ' + riga.replace(/\s+/g, ' '));
    prova(!(await pg.$('.borsa-codice')), nome + ': con un codice attivo niente campo per un altro');
    prova(await pg.evaluate(() => { const p = document.querySelector('.borsa-pannello'); return p.scrollWidth <= p.clientWidth + 1; }), nome + ': borsa senza sforamenti');
    await Promise.all([pg.waitForURL(/ordine-confermato\.html/), pg.click('[data-paga]')]); await pg.waitForTimeout(400);
    const conf = await pg.$eval('[data-ordine-testo]', e => e.textContent);
    prova(/Ordine MR[A-Z0-9]+/.test(conf) && conf.includes(cod + ' usato'), nome + ': conferma ' + conf.slice(0, 60));
    const link = await pg.$eval('[data-invito-link]', e => e.value);
    prova(/\?amico=AMICO-[A-HJ-NP-Z2-9]{4}$/.test(link) && await pg.$eval('[data-invito]', e => !e.hidden), nome + ': link amico ' + link);
    prova((await pg.$eval('[data-invito-wa]', a => a.href)).startsWith('https://wa.me/?text='), nome + ': link WhatsApp');
    prova(await pg.$eval('.borsa-num', e => e.hidden), nome + ': borsa vuota dopo l’ordine');
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': conferma senza scorrimento laterale');
    // codice già usato: non si riapplica
    await pg.goto(B + 'polo-tricolore.html'); await pg.waitForTimeout(300);
    prova(!(await popupVisibile(pg)), nome + ': chi ha ordinato non vede il popup');
    await pg.evaluate(() => window.MARO_aggiungi('polo-tricolore', 'L')); await pg.waitForTimeout(300);
    await pg.click('.borsa-codice summary'); await pg.fill('#borsa-codice-in', cod.toLowerCase()); await pg.click('.borsa-codice-form button'); await pg.waitForTimeout(200);
    prova(/già stato usato/.test(await pg.$eval('.borsa-codice-esito', e => e.textContent)) && !(await pg.$('.riepilogo.sconto')), nome + ': codice usato rifiutato');
    await pg.fill('#borsa-codice-in', 'MARO-ZZZZ'); await pg.click('.borsa-codice-form button'); await pg.waitForTimeout(200);
    prova(/non valido/.test(await pg.$eval('.borsa-codice-esito', e => e.textContent)), nome + ': codice inventato rifiutato');
    // il proprio link non regala lo sconto a sé stessi
    await pg.goto(link); await pg.waitForTimeout(1200);
    prova(/il tuo link/i.test(await pg.$eval('.maro-avviso', e => e.textContent).catch(() => '')), nome + ': proprio link riconosciuto');
    prova(!(await pg.evaluate(() => location.search.includes('amico'))), nome + ': indirizzo ripulito');
    await pg.goto(B + 'porta-un-amico.html'); await pg.waitForTimeout(300);
    prova(await pg.$eval('[data-invito]', e => !e.hidden) && await pg.$eval('[data-invito-senza]', e => e.hidden), nome + ': Porta un amico mostra il link');
    // account: Registrati (controlli dei campi), poi codice usato con l'ordine, ordine in elenco, link amico
    await pg.goto(B + 'account.html'); await pg.waitForTimeout(300);
    await pg.click('#pan-accedi button[type=submit]'); await pg.waitForTimeout(100);
    prova(/non sembra completa/.test(await pg.$eval('[data-acc-esito]', e => e.textContent)), nome + ': accedi, email vuota rifiutata');
    await pg.fill('#acc-email', 'prova@esempio.it'); await pg.fill('#acc-pw', 'Sbagliata1'); await pg.click('#pan-accedi button[type=submit]'); await pg.waitForTimeout(200);
    prova(/non corretti/.test(await pg.$eval('[data-acc-esito]', e => e.textContent)), nome + ': accedi senza account, messaggio generico');
    await pg.click('[data-acc-dimenticata]'); await pg.waitForTimeout(100);
    prova(/nuova password/.test(await pg.$eval('[data-acc-info]', e => e.textContent)), nome + ': password dimenticata');
    await pg.click('#tab-registrati'); await pg.waitForTimeout(100);
    prova(await pg.$eval('#pan-registrati', e => !e.hidden) && await pg.$eval('#pan-accedi', e => e.hidden), nome + ': scheda Registrati');
    await pg.fill('#reg-nome', 'Luca'); await pg.fill('#reg-email', 'prova@esempio.it'); await pg.fill('#reg-pw', 'corta');
    prova((await pg.$$eval('[data-regola].ok', l => l.length)) === 0, nome + ': requisiti password dal vivo (nessuno)');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(100);
    prova(/non va ancora bene/.test(await pg.$eval('[data-reg-esito]', e => e.textContent)), nome + ': password debole rifiutata');
    await pg.fill('#reg-pw', 'Maro2026x');
    prova((await pg.$$eval('[data-regola].ok', l => l.length)) === 3, nome + ': requisiti password dal vivo (tutti)');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(100);
    prova(/informativa privacy/.test(await pg.$eval('[data-reg-esito]', e => e.textContent)), nome + ': privacy obbligatoria');
    await pg.check('[data-reg-privacy]'); await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(400);
    prova(await pg.$eval('[data-conto-dentro]', e => !e.hidden) && /Ciao, Luca/.test(await pg.$eval('[data-conto-dentro] h1', e => e.textContent)), nome + ': account creato, dentro');
    const contoA = await pg.evaluate(() => ({ usati: document.querySelector('[data-codici-usati]').textContent, ordini: document.querySelectorAll('[data-conto-ordini] li:not(.acc-vuoto)').length, invito: !document.querySelector('.acc [data-invito]').hidden, email: document.querySelector('[data-conto-email]').textContent }));
    prova(contoA.usati.includes(cod) && /Usato/.test(contoA.usati) && /ordine MR/.test(contoA.usati), nome + ': account, codice usato con il suo ordine');
    prova(contoA.ordini === 1 && contoA.invito && contoA.email === 'prova@esempio.it', nome + ': account, ordine e link amico ' + JSON.stringify(contoA));
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': account senza scorrimento laterale');
    await pg.reload(); await pg.waitForTimeout(200);
    prova(await pg.$eval('[data-conto-dentro]', e => !e.hidden), nome + ': account, resta dentro dopo il ricaricamento');
    await pg.click('[data-conto-esci]'); await pg.waitForTimeout(100);
    prova(await pg.$eval('[data-conto-fuori]', e => !e.hidden), nome + ': account, Esci');
    // stessa email di nuovo in Registrati → rimanda ad Accedi; poi accesso con la password giusta
    await pg.click('#tab-registrati'); await pg.fill('#reg-nome', 'Luca'); await pg.fill('#reg-email', 'PROVA@esempio.it'); await pg.fill('#reg-pw', 'Altra2026x'); await pg.check('[data-reg-privacy]');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(200);
    prova(await pg.$eval('#pan-accedi', e => !e.hidden) && /Esiste già/.test(await pg.$eval('[data-acc-esito]', e => e.textContent)), nome + ': email già registrata → Accedi');
    await pg.fill('#acc-pw', 'Maro2026x'); await pg.click('#pan-accedi button[type=submit]'); await pg.waitForTimeout(400);
    prova(await pg.$eval('[data-conto-dentro]', e => !e.hidden), nome + ': accesso con la password giusta');
    prova(!/Maro2026x/.test(await pg.evaluate(() => JSON.stringify(localStorage))), nome + ': password mai salvata in chiaro');
    await ctx.close();
    // ---------- l'amico ----------
    [ctx, pg] = await nuovo();
    await pg.goto(link); await pg.waitForTimeout(1200);
    prova(/regala il 10%/.test(await pg.$eval('.maro-avviso', e => e.textContent).catch(() => '')), nome + ': avviso per l’amico');
    const av = await pg.$eval('.maro-avviso', e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
    prova(av, nome + ': avviso dentro lo schermo');
    await pg.goto(B + 'felpe.html'); await pg.waitForTimeout(1600);
    prova(!(await popupVisibile(pg)), nome + ': l’amico non vede il popup (sconto già attivo)');
    await pg.evaluate(() => window.MARO_aggiungi('felpa-firma', 'M')); await pg.waitForTimeout(300);
    const rA = await pg.$eval('.riepilogo.sconto', e => e.textContent);
    prova(/Sconto amico AMICO-/.test(rA) && rA.includes('13,00'), nome + ': 10% amico in borsa ' + rA.replace(/\s+/g, ' '));
    // non si sommano: iscrizione in home con il codice amico attivo
    await pg.goto(B + 'index.html#iscriviti'); await pg.waitForTimeout(300);
    await pg.fill('.iscriviti-form input', 'amico@esempio.it'); await pg.click('.iscriviti-form button[type=submit]'); await pg.waitForTimeout(200);
    prova(/un codice per ordine/.test(await pg.$eval('.iscriviti-form .esito', e => e.textContent)), nome + ': iscrizione non somma un secondo codice');
    // togli e rimetti il codice dal campo
    await pg.click('[data-apri-borsa]'); await pg.waitForTimeout(200);
    const codA = (rA.match(/AMICO-[A-Z0-9]{4}/) || [''])[0];
    await pg.click('[data-togli-codice]'); await pg.waitForTimeout(200);
    prova(!(await pg.$('.riepilogo.sconto')) && await pg.$eval('.borsa-codice', d => d.open), nome + ': codice tolto, campo aperto');
    await pg.fill('#borsa-codice-in', codA); await pg.click('.borsa-codice-form button'); await pg.waitForTimeout(200);
    prova(/Sconto amico/.test(await pg.$eval('.riepilogo.sconto', e => e.textContent).catch(() => '')), nome + ': codice rimesso dal campo');
    // account dell'amico: il codice è disponibile; tolto dalla borsa, si rimette con "Metti in borsa"
    await pg.goto(B + 'account.html#registrati'); await pg.waitForTimeout(200);
    await pg.fill('#reg-nome', 'Sara'); await pg.fill('#reg-email', 'amico@esempio.it'); await pg.fill('#reg-pw', 'Amico2026x'); await pg.check('[data-reg-privacy]');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(400);
    prova(/Attivo in borsa/.test(await pg.$eval('[data-codici-liberi]', e => e.textContent)), nome + ': account amico, codice attivo in borsa');
    await pg.evaluate(() => localStorage.removeItem('maro-codice')); await pg.reload(); await pg.waitForTimeout(200);
    await pg.click('[data-usa-codice]'); await pg.waitForTimeout(200);
    prova(/Attivo in borsa/.test(await pg.$eval('[data-codici-liberi]', e => e.textContent)) && await pg.evaluate(() => !!localStorage.getItem('maro-codice')), nome + ': account amico, Metti in borsa');
    await pg.goto(B + 'porta-un-amico.html'); await pg.waitForTimeout(300);
    prova(await pg.$eval('[data-invito]', e => e.hidden) && await pg.$eval('[data-invito-senza]', e => !e.hidden), nome + ': senza ordini niente link da condividere');
    prova(await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), nome + ': Porta un amico senza scorrimento laterale');
    await ctx.close();
    // registrazione nuova con newsletter: il codice compare subito tra "I tuoi codici"
    [ctx, pg] = await nuovo();
    await pg.goto(B + 'account.html#registrati'); await pg.waitForTimeout(200);
    await pg.fill('#reg-nome', 'Anna'); await pg.fill('#reg-email', 'anna@esempio.it'); await pg.fill('#reg-pw', 'Anna2026x'); await pg.check('[data-reg-privacy]');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(400);
    prova(/MARO-[A-Z0-9]{4}[\s\S]*Attivo in borsa/.test(await pg.$eval('[data-codici-liberi]', e => e.textContent)), nome + ': registrazione con newsletter, codice subito nell’account');
    await ctx.close();
    prova(!err.length, nome + ': errori JS ' + err.join(' | '));
  }
  await b.close(); srv.close();
  console.log('Prove amico: ' + ok + ' ok, ' + ko + ' fallite');
})();
