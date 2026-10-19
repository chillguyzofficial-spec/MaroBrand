// Prove di codici, pagamento e "Porta un amico" col motore (19/10 sera): il sito parla con un motore finto locale
// (stesso codice del motore vero, database in memoria, Stripe finto che paga subito) → nessun dato vero toccato.
// Popup solo nell'abbigliamento, codice personale monouso, pagamento → ordine confermato con il link, amico col 10%,
// premio a chi invita, codici mai sommati, account con conferma email.
// Uso: node _build/test/amico.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const { avvia } = require('./motore-finto');
const ROOT = 'C:/Users/Claude FK/.claude/projects/MaroBrand';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8987);
const B = 'http://localhost:8987/', PORTA_MOTORE = 8986;
let ok = 0, ko = 0; const prova = (c, n) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n); } };
const popupVisibile = pg => pg.$eval('#popup', p => !p.hidden && p.classList.contains('visibile'));
const testo = (pg, s) => pg.$eval(s, e => e.textContent).catch(() => '');
const aspettaTesto = (pg, s, re, ms = 5000) => pg.waitForFunction(([s, re]) => { const e = document.querySelector(s); return e && new RegExp(re).test(e.textContent); }, [s, re.source], { timeout: ms }).then(() => true, () => false);
const senzaLaterale = pg => pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nome, opz] of [['PC', { viewport: { width: 1440, height: 900 } }], ['iPhone 13', { ...devices['iPhone 13'] }], ['320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }]]) {
    const m = await avvia(PORTA_MOTORE, B.slice(0, -1)); // un motore nuovo (database vuoto) per ogni dispositivo
    const err = [];
    const nuovo = async () => {
      const ctx = await b.newContext(opz);
      await ctx.addInitScript((u) => { window.MARO_MOTORE = u; }, m.url);
      const pg = await ctx.newPage(); pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
      return [ctx, pg];
    };
    // ---------- chi compra: popup, codice personale dal motore, pagamento, ordine, link ----------
    let [ctx, pg] = await nuovo();
    for (const f of ['index.html', 'storia.html', 'aiuto.html']) {
      await pg.goto(B + f); await pg.waitForTimeout(1800);
      prova(!(await popupVisibile(pg)), nome + ': nessun popup in ' + f);
    }
    await pg.goto(B + 'polo.html'); await pg.waitForTimeout(1600);
    prova(await popupVisibile(pg), nome + ': popup appena entri nell’abbigliamento (polo.html)');
    await pg.fill('#email-popup', 'Prova@Esempio.it'); await pg.click('.popup-form button[type=submit]');
    await aspettaTesto(pg, '[data-mio-codice]', /MARO-[A-Z0-9]{4}/);
    const cod = await testo(pg, '[data-mio-codice]');
    prova(/^MARO-[A-HJ-NP-Z2-9]{4}$/.test(cod), nome + ': codice personale dal motore ' + cod);
    prova(m.sql("SELECT newsletter FROM clienti WHERE email = 'prova@esempio.it'")[0]?.newsletter === 1, nome + ': iscrizione salvata nel motore');
    await pg.click('[data-popup-ok]'); await pg.waitForTimeout(400);
    await pg.goto(B + 'polo-linee.html'); await pg.waitForTimeout(1600);
    prova(!(await popupVisibile(pg)), nome + ': popup non torna dopo l’iscrizione');
    await pg.evaluate(() => window.MARO_aggiungi('polo-linee', 'M')); await pg.waitForTimeout(300);
    const riga = await testo(pg, '.riepilogo.sconto');
    prova(riga.includes('Sconto benvenuto ' + cod) && riga.includes('7,50'), nome + ': in borsa ' + riga.replace(/\s+/g, ' '));
    prova(!(await pg.$('.borsa-codice')), nome + ': con un codice attivo niente campo per un altro');
    prova(await pg.evaluate(() => { const p = document.querySelector('.borsa-pannello'); return p.scrollWidth <= p.clientWidth + 1; }), nome + ': borsa senza sforamenti');
    // taglia finita nel frattempo: niente pagamento, messaggio chiaro
    m.sql("INSERT INTO magazzino VALUES ('polo-linee', 'M', 0)");
    await pg.click('[data-paga]');
    prova(await aspettaTesto(pg, '.esito-paga', /esaurita/), nome + ': taglia esaurita, pagamento fermato');
    m.sql("UPDATE magazzino SET pezzi = 5 WHERE prodotto = 'polo-linee'");
    await pg.evaluate(() => window.MARO_ridisegna());
    await Promise.all([pg.waitForURL(/ordine-confermato\.html\?s=cs_test_/), pg.click('[data-paga]')]);
    prova(await aspettaTesto(pg, '[data-ordine-testo]', /Ordine MR-000001/), nome + ': conferma con il numero del motore');
    const conf = await testo(pg, '[data-ordine-testo]');
    prova(conf.includes('73,40') && conf.includes(cod + ' usato'), nome + ': conferma ' + conf.slice(0, 70));
    const o1 = m.sql('SELECT * FROM ordini')[0];
    prova(o1 && o1.totale_cent === 7340 && o1.codice === cod && m.sql("SELECT pezzi FROM magazzino WHERE prodotto = 'polo-linee'")[0].pezzi === 4, nome + ': ordine nel motore, pezzi scalati');
    await aspettaTesto(pg, '[data-invito-link]', /./, 2000);
    const link = await pg.$eval('[data-invito-link]', e => e.value);
    prova(/\?amico=AMICO-[A-HJ-NP-Z2-9]{4}$/.test(link) && await pg.$eval('[data-invito]', e => !e.hidden), nome + ': link amico ' + link);
    prova((await pg.$eval('[data-invito-wa]', a => a.href)).startsWith('https://wa.me/?text='), nome + ': link WhatsApp');
    prova(await pg.$eval('.borsa-num', e => e.hidden), nome + ': borsa vuota dopo l’ordine');
    prova(await senzaLaterale(pg), nome + ': conferma senza scorrimento laterale');
    // pagamento annullato su Stripe: avviso, borsa intatta
    await pg.goto(B + 'shop.html?pagamento=annullato'); await pg.waitForTimeout(800);
    prova(/annullato/.test(await testo(pg, '.maro-avviso')) && !(await pg.evaluate(() => location.search)), nome + ': pagamento annullato, avviso e indirizzo ripulito');
    // codice già usato: non si riapplica
    await pg.goto(B + 'polo-tricolore.html'); await pg.waitForTimeout(300);
    prova(!(await popupVisibile(pg)), nome + ': chi ha ordinato non vede il popup');
    await pg.evaluate(() => window.MARO_aggiungi('polo-tricolore', 'L')); await pg.waitForTimeout(300);
    await pg.click('.borsa-codice summary'); await pg.fill('#borsa-codice-in', cod.toLowerCase()); await pg.click('.borsa-codice-form button');
    prova(await aspettaTesto(pg, '.borsa-codice-esito', /già stato usato/) && !(await pg.$('.riepilogo.sconto')), nome + ': codice usato rifiutato dal motore');
    await pg.fill('#borsa-codice-in', 'MARO-ZZZZ'); await pg.click('.borsa-codice-form button');
    prova(await aspettaTesto(pg, '.borsa-codice-esito', /non valido/), nome + ': codice inventato rifiutato');
    // il proprio link non regala lo sconto a sé stessi
    await pg.goto(link); await pg.waitForTimeout(1200);
    prova(/il tuo link/i.test(await testo(pg, '.maro-avviso')), nome + ': proprio link riconosciuto');
    prova(!(await pg.evaluate(() => location.search.includes('amico'))), nome + ': indirizzo ripulito');
    await pg.goto(B + 'porta-un-amico.html'); await pg.waitForTimeout(300);
    prova(await pg.$eval('[data-invito]', e => !e.hidden) && await pg.$eval('[data-invito-senza]', e => e.hidden), nome + ': Porta un amico mostra il link');
    // account: Registrati (controlli dei campi), conferma email, poi codice usato, ordine e link amico dal motore
    await pg.goto(B + 'account.html'); await pg.waitForTimeout(300);
    await pg.click('#pan-accedi button[type=submit]'); await pg.waitForTimeout(100);
    prova(/non sembra completa/.test(await testo(pg, '[data-acc-esito]')), nome + ': accedi, email vuota rifiutata');
    await pg.fill('#acc-email', 'prova@esempio.it'); await pg.fill('#acc-pw', 'Sbagliata1'); await pg.click('#pan-accedi button[type=submit]');
    prova(await aspettaTesto(pg, '[data-acc-esito]', /non corretti/), nome + ': accedi senza account, messaggio generico');
    await pg.click('[data-acc-dimenticata]');
    prova(await aspettaTesto(pg, '[data-acc-info]', /nuova password/), nome + ': password dimenticata');
    await pg.click('#tab-registrati'); await pg.waitForTimeout(100);
    prova(await pg.$eval('#pan-registrati', e => !e.hidden) && await pg.$eval('#pan-accedi', e => e.hidden), nome + ': scheda Registrati');
    await pg.fill('#reg-nome', 'Luca'); await pg.fill('#reg-email', 'prova@esempio.it'); await pg.fill('#reg-pw', 'corta');
    prova((await pg.$$eval('[data-regola].ok', l => l.length)) === 0, nome + ': requisiti password dal vivo (nessuno)');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(100);
    prova(/non va ancora bene/.test(await testo(pg, '[data-reg-esito]')), nome + ': password debole rifiutata');
    await pg.fill('#reg-pw', 'Maro2026x');
    prova((await pg.$$eval('[data-regola].ok', l => l.length)) === 3, nome + ': requisiti password dal vivo (tutti)');
    await pg.click('#pan-registrati button[type=submit]'); await pg.waitForTimeout(100);
    prova(/informativa privacy/.test(await testo(pg, '[data-reg-esito]')), nome + ': privacy obbligatoria');
    await pg.check('[data-reg-privacy]'); await pg.click('#pan-registrati button[type=submit]');
    prova(await aspettaTesto(pg, '[data-conto-dentro] h1', /Ciao, Luca/) && await pg.$eval('[data-conto-dentro]', e => !e.hidden), nome + ': account creato, dentro');
    prova(await aspettaTesto(pg, '[data-conto-avviso]', /confermare l’indirizzo/), nome + ': prima della conferma email, avviso');
    prova(!(await testo(pg, '[data-codici-usati]')).includes(cod) && (await pg.$$('[data-conto-ordini] li.acc-ordine')).length === 0, nome + ': prima della conferma niente ordini né codici');
    await pg.click('[data-conto-avviso] [data-link-prova]');
    prova(await aspettaTesto(pg, '[data-conto-avviso]', /Email confermata/), nome + ': email confermata col link');
    await aspettaTesto(pg, '[data-codici-usati]', new RegExp(cod));
    const contoA = await pg.evaluate(() => ({ usati: document.querySelector('[data-codici-usati]').textContent, ordini: document.querySelectorAll('[data-conto-ordini] li.acc-ordine').length, invito: !document.querySelector('.acc [data-invito]').hidden, email: document.querySelector('[data-conto-email]').textContent }));
    prova(contoA.usati.includes(cod) && /Usato/.test(contoA.usati) && /ordine MR-000001/.test(contoA.usati), nome + ': account, codice usato con il suo ordine');
    prova(contoA.ordini === 1 && contoA.invito && contoA.email === 'prova@esempio.it', nome + ': account, ordine e link amico ' + JSON.stringify(contoA));
    // ordine nell'account: si apre, tappe, dettaglio, indirizzo; poi Omar lo spedisce con Poste → Traccia il pacco
    await pg.click('.acc-ordine summary');
    const det = await pg.evaluate(() => { const d = document.querySelector('.acc-ordine details'); return { aperto: d.open, tappe: [...d.querySelectorAll('.acc-tappe li.fatta')].length, attuale: (d.querySelector('.acc-tappe li.attuale b') || {}).textContent, righe: d.querySelector('.acc-righe').textContent, consegna: (d.querySelector('.acc-consegna') || {}).textContent || '' }; });
    prova(det.aperto && det.tappe === 2 && det.attuale === 'In preparazione', nome + ': ordine aperto, tappa In preparazione ' + JSON.stringify(det.attuale));
    prova(/Polo Linee · taglia M/.test(det.righe) && /Sconto/.test(det.righe) && /73,40/.test(det.righe) && /Via delle Prove 1/.test(det.consegna) && /Milano/.test(det.consegna), nome + ': dettaglio con capi, sconto, totale e indirizzo');
    m.env.CHIAVE_OMAR = 'chiave_omar_di_prova_1234567890';
    const sped = await fetch(m.url + '/api/omar/spedito', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + m.env.CHIAVE_OMAR }, body: JSON.stringify({ numero: 'MR-000001', corriere: 'poste', tracking: 'RR123456789IT' }) });
    prova(sped.status === 200, nome + ': Omar segna spedito');
    await pg.reload(); await pg.waitForSelector('.acc-ordine summary'); await pg.click('.acc-ordine summary');
    const tr = await pg.evaluate(() => { const d = document.querySelector('.acc-ordine'); const a = d.querySelector('.acc-traccia a'); return { stato: d.querySelector('summary .acc-stato').textContent, attuale: (d.querySelector('.acc-tappe li.attuale b') || {}).textContent, href: a ? a.href : '', num: (d.querySelector('.acc-num') || {}).textContent }; });
    prova(tr.stato === 'Spedito' && tr.attuale === 'Spedito' && tr.num === 'RR123456789IT', nome + ': spedito con numero ' + JSON.stringify(tr));
    prova(tr.href === 'https://www.poste.it/cerca/#/risultati-spedizioni/RR123456789IT', nome + ': Traccia il pacco apre Poste col numero');
    prova(await pg.evaluate(() => { const t = document.querySelector('.acc-traccia'); return t.scrollWidth <= t.clientWidth + 1; }), nome + ': riquadro tracciamento senza sforamenti');
    prova(await senzaLaterale(pg), nome + ': account senza scorrimento laterale');
    await pg.reload(); await aspettaTesto(pg, '[data-conto-email]', /@/);
    prova(await pg.$eval('[data-conto-dentro]', e => !e.hidden), nome + ': account, resta dentro dopo il ricaricamento');
    await pg.click('[data-conto-esci]'); await pg.waitForTimeout(300);
    prova(await pg.$eval('[data-conto-fuori]', e => !e.hidden) && m.sql('SELECT count(*) n FROM sessioni')[0].n === 0, nome + ': account, Esci (accesso chiuso anche nel motore)');
    // stessa email di nuovo in Registrati → rimanda ad Accedi; poi accesso con la password giusta
    await pg.click('#tab-registrati'); await pg.fill('#reg-nome', 'Luca'); await pg.fill('#reg-email', 'PROVA@esempio.it'); await pg.fill('#reg-pw', 'Altra2026x'); await pg.check('[data-reg-privacy]');
    await pg.click('#pan-registrati button[type=submit]');
    prova(await aspettaTesto(pg, '[data-acc-esito]', /Esiste già/) && await pg.$eval('#pan-accedi', e => !e.hidden), nome + ': email già registrata → Accedi');
    await pg.fill('#acc-pw', 'Maro2026x'); await pg.click('#pan-accedi button[type=submit]');
    const dentroOk = await pg.waitForFunction(() => !document.querySelector('[data-conto-dentro]').hidden, null, { timeout: 5000 }).then(() => true, () => false);
    prova(dentroOk, nome + ': accesso con la password giusta ' + (dentroOk ? '' : await testo(pg, '[data-acc-esito]')));
    prova(!/Maro2026x/.test(await pg.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))), nome + ': password mai salvata nel browser');
    await ctx.close();
    // ---------- l'amico ----------
    [ctx, pg] = await nuovo();
    await pg.goto(link); await pg.waitForTimeout(1200);
    prova(/regala il 10%/.test(await testo(pg, '.maro-avviso')), nome + ': avviso per l’amico');
    const av = await pg.$eval('.maro-avviso', e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }).catch(() => false);
    prova(av, nome + ': avviso dentro lo schermo');
    await pg.goto(B + 'felpe.html'); await pg.waitForTimeout(1600);
    prova(!(await popupVisibile(pg)), nome + ': l’amico non vede il popup (sconto già attivo)');
    await pg.evaluate(() => window.MARO_aggiungi('felpa-firma', 'M')); await pg.waitForTimeout(300);
    const rA = await testo(pg, '.riepilogo.sconto');
    prova(/Sconto amico AMICO-/.test(rA) && rA.includes('13,00'), nome + ': 10% amico in borsa ' + rA.replace(/\s+/g, ' '));
    // non si sommano: iscrizione in home con il codice amico attivo
    await pg.goto(B + 'index.html#iscriviti'); await pg.waitForTimeout(300);
    await pg.fill('.iscriviti-form input', 'amico@esempio.it'); await pg.click('.iscriviti-form button[type=submit]');
    prova(await aspettaTesto(pg, '.iscriviti-form .esito', /un codice per ordine/), nome + ': iscrizione non somma un secondo codice');
    // togli e rimetti il codice dal campo
    await pg.click('[data-apri-borsa]'); await pg.waitForTimeout(200);
    const codA = (rA.match(/AMICO-[A-Z0-9]{4}/) || [''])[0];
    await pg.click('[data-togli-codice]'); await pg.waitForTimeout(200);
    prova(!(await pg.$('.riepilogo.sconto')) && await pg.$eval('.borsa-codice', d => d.open), nome + ': codice tolto, campo aperto');
    await pg.fill('#borsa-codice-in', codA); await pg.click('.borsa-codice-form button');
    prova(await aspettaTesto(pg, '.riepilogo.sconto', /Sconto amico/), nome + ': codice rimesso dal campo');
    // l'amico paga: riceve il suo codice AMICO usato nell'ordine, a chi invita il premio in attesa dei 14 giorni
    m.stato.email = 'amico@esempio.it'; // l'email che l'amico scrive nella pagina di Stripe
    await Promise.all([pg.waitForURL(/ordine-confermato/), pg.click('[data-paga]')]);
    prova(await aspettaTesto(pg, '[data-ordine-testo]', /Ordine MR-000002 · totale 122,90/), nome + ': ordine dell’amico (130 − 13 + 5,90 di spedizione)');
    const premio = m.sql('SELECT * FROM premi')[0];
    prova(premio && premio.stato === 'in_attesa' && link.endsWith(premio.invito), nome + ': premio a chi invita, in attesa dei 14 giorni');
    // account dell'amico (newsletter spuntata): dopo la conferma il codice di benvenuto c'è, "Metti in borsa"
    await pg.goto(B + 'account.html#registrati'); await pg.waitForTimeout(200);
    await pg.fill('#reg-nome', 'Sara'); await pg.fill('#reg-email', 'amico@esempio.it'); await pg.fill('#reg-pw', 'Amico2026x'); await pg.check('[data-reg-privacy]');
    await pg.click('#pan-registrati button[type=submit]');
    await aspettaTesto(pg, '[data-conto-avviso]', /confermare/);
    await pg.click('[data-conto-avviso] [data-link-prova]');
    prova(await aspettaTesto(pg, '[data-codici-liberi]', /MARO-[A-Z0-9]{4}[\s\S]*Attivo in borsa/), nome + ': account amico, codice di benvenuto attivo in borsa');
    prova(/AMICO-[A-Z0-9]{4}[\s\S]*Usato/.test(await testo(pg, '[data-codici-usati]')), nome + ': account amico, il suo codice amico risulta usato');
    await pg.evaluate(() => localStorage.removeItem('maro-codice')); await pg.reload();
    await pg.waitForSelector('[data-usa-codice]', { timeout: 5000 }).catch(() => {});
    await pg.click('[data-usa-codice]');
    prova(await aspettaTesto(pg, '[data-codici-liberi]', /Attivo in borsa/) && await pg.evaluate(() => !!localStorage.getItem('maro-codice')), nome + ': account amico, Metti in borsa');
    prova(await senzaLaterale(pg), nome + ': account amico senza scorrimento laterale');
    await ctx.close();
    // senza ordini niente link da condividere
    [ctx, pg] = await nuovo();
    await pg.goto(B + 'porta-un-amico.html'); await pg.waitForTimeout(300);
    prova(await pg.$eval('[data-invito]', e => e.hidden) && await pg.$eval('[data-invito-senza]', e => !e.hidden), nome + ': senza ordini niente link da condividere');
    prova(await senzaLaterale(pg), nome + ': Porta un amico senza scorrimento laterale');
    // password dimenticata: link → nuova password → dentro, vecchia password non vale più
    await pg.goto(B + 'account.html'); await pg.fill('#acc-email', 'prova@esempio.it'); await pg.click('[data-acc-dimenticata]');
    await aspettaTesto(pg, '[data-acc-info]', /nuova password/);
    await pg.click('[data-acc-info] [data-link-prova]');
    await pg.waitForSelector('#np-pw'); await pg.fill('#np-pw', 'nuova'); await pg.click('[data-acc-nuova] button');
    prova(/non va ancora bene/.test(await testo(pg, '[data-acc-nuova] .acc-esito')), nome + ': nuova password debole rifiutata');
    await pg.fill('#np-pw', 'Nuova2026x'); await pg.click('[data-acc-nuova] button');
    prova(await aspettaTesto(pg, '[data-conto-avviso]', /Password cambiata/) && await pg.$eval('[data-conto-dentro]', e => !e.hidden), nome + ': password cambiata, dentro');
    await pg.click('[data-conto-esci]'); await pg.fill('#acc-email', 'prova@esempio.it'); await pg.fill('#acc-pw', 'Maro2026x'); await pg.click('#pan-accedi button[type=submit]');
    prova(await aspettaTesto(pg, '[data-acc-esito]', /non corretti/), nome + ': la vecchia password non vale più');
    // elimina l'account: password sbagliata no, giusta sì → fuori, e non si rientra
    await pg.fill('#acc-pw', 'Nuova2026x'); await pg.click('#pan-accedi button[type=submit]');
    await pg.waitForFunction(() => !document.querySelector('[data-conto-dentro]').hidden, null, { timeout: 5000 }).catch(() => {});
    await pg.click('.acc-elimina summary'); await pg.fill('#el-pw', 'Sbagliata9'); await pg.click('[data-acc-elimina] button');
    prova(await aspettaTesto(pg, '[data-el-esito]', /non corretta/), nome + ': elimina account con password sbagliata rifiutato');
    await pg.fill('#el-pw', 'Nuova2026x'); await pg.click('[data-acc-elimina] button');
    prova(await aspettaTesto(pg, '[data-acc-info]', /Account eliminato/) && await pg.$eval('[data-conto-fuori]', e => !e.hidden), nome + ': account eliminato, fuori');
    prova(m.sql("SELECT count(*) n FROM clienti WHERE email = 'prova@esempio.it'")[0].n === 0 && m.sql('SELECT count(*) n FROM ordini')[0].n === 2, nome + ': email cancellata, ordini tenuti');
    await pg.fill('#acc-email', 'prova@esempio.it'); await pg.fill('#acc-pw', 'Nuova2026x'); await pg.click('#pan-accedi button[type=submit]');
    prova(await aspettaTesto(pg, '[data-acc-esito]', /non corretti/), nome + ': dopo l’eliminazione non si rientra');
    // motore spento: messaggio chiaro, niente pagine rotte
    await ctx.close(); await m.chiudi();
    [ctx, pg] = await nuovo();
    await pg.goto(B + 'polo-linee.html'); await pg.evaluate(() => window.MARO_aggiungi('polo-linee', 'S')); await pg.waitForTimeout(200);
    await pg.click('[data-paga]');
    prova(await aspettaTesto(pg, '.esito-paga', /non risponde/), nome + ': motore spento, messaggio chiaro');
    await ctx.close();
    const veri = err.filter(e => !/Failed to load resource|ERR_CONNECTION_REFUSED|net::/.test(e)); // gli errori di rete del motore spento sono voluti
    prova(!veri.length, nome + ': errori JS ' + veri.join(' | '));
  }
  await b.close(); srv.close();
  console.log('Prove amico: ' + ok + ' ok, ' + ko + ' fallite');
})();
