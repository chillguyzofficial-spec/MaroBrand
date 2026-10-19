/* MARO — Drop 001 */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var CAT = window.MARO_CATALOGO || [];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var euro = function (n) { return n.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' €'; };

  // blocco dello scorrimento: solo su <html> (sul body rompe la testata sticky)
  var blocchi = 0;
  function blocca(si) {
    blocchi = Math.max(0, blocchi + (si ? 1 : -1));
    document.documentElement.style.overflow = blocchi ? 'hidden' : '';
  }

  /* ---------- video d'apertura: loop senza stacco (due copie in dissolvenza incrociata) ---------- */
  var video = $('.apertura-video:not([data-copia])'), copia = $('.apertura-video[data-copia]');
  if (video) {
    var SFUMA = 1; // secondi di dissolvenza a fine giro
    var attivo = video, altro = copia, inCambio = false;
    video.loop = false;
    var parti = function (v) { if (v.paused) v.play().catch(function () {}); };
    var cambia = function () {
      inCambio = true;
      altro.currentTime = 0; parti(altro);
      altro.style.zIndex = 1; altro.style.opacity = 1;
      setTimeout(function () {
        // il vecchio sparisce sotto quello nuovo, senza dissolvenza
        attivo.pause(); attivo.style.transition = 'none'; attivo.style.zIndex = 0; attivo.style.opacity = 0;
        void attivo.offsetWidth; attivo.style.transition = '';
        var t = attivo; attivo = altro; altro = t; inCambio = false;
      }, SFUMA * 1000 + 60);
    };
    var controlla = function () {
      if (!document.hidden) {
        if (!copia) { parti(attivo); }
        // la copia si prepara solo poco prima del primo giro (stesso file: arriva dalla cache)
        if (copia.preload === 'none' && attivo.duration && attivo.currentTime >= attivo.duration - SFUMA - 2.5) { copia.preload = 'auto'; copia.load(); }
        else if (!inCambio && attivo.duration && attivo.currentTime >= attivo.duration - SFUMA) cambia();
        else if (!inCambio) parti(attivo); // se il browser lo ferma, riparte
      }
      requestAnimationFrame(controlla);
    };
    if (!copia) video.loop = true;
    requestAnimationFrame(controlla);
  }

  /* ---------- menu su telefono ---------- */
  var menu = $('#menu'), menuBtn = $('.menu-apri');
  function chiudiMenu() {
    if (!menu.classList.contains('aperto')) return;
    menu.classList.remove('aperto'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; blocca(false);
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (menu.classList.contains('aperto')) { chiudiMenu(); return; }
      // il pannello parte sotto la testata, ovunque sia (in cima c'è la barra nera sopra)
      menu.style.top = Math.max(0, Math.round(document.querySelector('.testata').getBoundingClientRect().bottom)) + 'px';
      menu.classList.add('aperto'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.textContent = 'Chiudi'; blocca(true);
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', chiudiMenu); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) chiudiMenu(); });
  }

  /* ---------- filtri del drop (anche da #polo / #felpe) ---------- */
  var filtri = $$('[data-filtro]');
  function filtra(f) {
    filtri.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filtro') === f ? 'true' : 'false'); });
    $$('.drop .scheda').forEach(function (s) { s.hidden = f !== 'tutto' && s.getAttribute('data-tipo') !== f; s.parentNode.hidden = s.hidden; });
  }
  filtri.forEach(function (b) { b.addEventListener('click', function () { filtra(b.getAttribute('data-filtro')); }); });
  function daHash() {
    if (!filtri.length) return;
    if (location.hash === '#polo') filtra('polo');
    else if (location.hash === '#felpe') filtra('felpa');
    else if (location.hash === '#drop') filtra('tutto');
  }
  window.addEventListener('hashchange', daHash); daHash();

  /* ---------- schede su telefono: pallino acceso sulla foto visibile mentre si scorre la seconda foto ---------- */
  $$('.scheda-punti').forEach(function (pt) {
    var foto = pt.parentNode.querySelector('.scheda-foto'), punti = $$('i', pt);
    if (!foto) return;
    foto.addEventListener('scroll', function () {
      var k = Math.round(foto.scrollLeft / Math.max(1, foto.clientWidth));
      punti.forEach(function (p, i) { p.classList.toggle('acceso', i === k); });
      if (k > 0) { var s = foto.querySelector('.scheda-foto-2'); if (s && s.loading === 'lazy') s.loading = 'eager'; }
    }, { passive: true });
    // la seconda foto sta fuori vista a destra: la si carica appena la scheda si avvicina, così non è vuota al primo scorrimento
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { var s = foto.querySelector('.scheda-foto-2'); if (s) s.loading = 'eager'; o.disconnect(); } }, { rootMargin: '400px 0px' });
      o.observe(foto);
    }
  });

  /* ---------- pagine delle categorie (19/10): filtri taglia/colore/prezzo, ordine, nascondi filtri ---------- */
  var cat = $('[data-catalogo]');
  if (cat && $('.griglia', cat)) {
    var celle = $$('.scheda-cella', cat), griglia = $('.griglia', cat);
    var btnFiltri = $('[data-filtri-mostra]', cat), scritta = $('[data-filtri-scritta]', cat), velo = $('.cat-velo', cat);
    var telefono = function () { return window.innerWidth < 960; };
    var ultimoFuoco = null;
    // PC: colonna a sinistra che si nasconde · telefono: pannello che sale dal basso, sopra la pagina (scroll bloccato solo su html)
    function mostraFiltri(si) {
      cat.classList.toggle('filtri-chiusi', !si);
      btnFiltri.setAttribute('aria-expanded', si ? 'true' : 'false');
      aggiornaScritta();
      var foglio = si && telefono();
      velo.hidden = !foglio;
      document.documentElement.classList.toggle('foglio-aperto', foglio);
      if (foglio) { ultimoFuoco = document.activeElement; var x = $('[data-filtri-chiudi]', cat); if (x) x.focus(); }
      else if (ultimoFuoco && telefono()) { ultimoFuoco.focus(); ultimoFuoco = null; }
    }
    // "Filtri (2)": quanti filtri sono attivi, visibile anche a pannello chiuso
    function aggiornaScritta() {
      var nf = $$('[data-f-taglia][aria-pressed="true"], [data-f-colore]:checked, [data-f-prezzo]:checked', cat).length;
      scritta.textContent = !cat.classList.contains('filtri-chiusi') ? 'Nascondi filtri' : (telefono() ? 'Filtri' : 'Mostra filtri') + (nf ? ' (' + nf + ')' : '');
    }
    btnFiltri.addEventListener('click', function () { mostraFiltri(cat.classList.contains('filtri-chiusi')); });
    $$('[data-filtri-chiudi]', cat).forEach(function (b) { b.addEventListener('click', function () { mostraFiltri(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && telefono() && !cat.classList.contains('filtri-chiusi')) mostraFiltri(false); });
    var eraTelefono = telefono();
    window.addEventListener('resize', function () { if (telefono() !== eraTelefono) { eraTelefono = telefono(); mostraFiltri(!eraTelefono); } });
    mostraFiltri(!telefono()); // sul telefono si parte con i filtri chiusi
    function scelti(sel, attr) { return $$(sel, cat).filter(function (e) { return e.checked || e.getAttribute('aria-pressed') === 'true'; }).map(function (e) { return e.getAttribute(attr); }); }
    // filtri attivi come pillole sopra la griglia: un tocco sulla ✕ toglie quel filtro
    var boxScelti = $('[data-cat-scelti]', cat);
    function pillole() {
      var voci = [];
      $$('[data-f-taglia][aria-pressed="true"]', cat).forEach(function (b) { voci.push(['Taglia ' + b.getAttribute('data-f-taglia'), function () { b.setAttribute('aria-pressed', 'false'); }]); });
      $$('[data-f-colore]', cat).forEach(function (i) { if (i.checked) voci.push([i.getAttribute('data-f-colore'), function () { i.checked = false; }]); });
      $$('[data-f-prezzo]', cat).forEach(function (i) { if (i.checked) voci.push([i.getAttribute('data-f-nome'), function () { i.checked = false; }]); });
      boxScelti.innerHTML = '';
      voci.forEach(function (v) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'cat-pillola';
        b.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chiudi"/></svg>';
        b.firstChild.textContent = v[0]; b.setAttribute('aria-label', 'Togli il filtro ' + v[0]);
        b.addEventListener('click', function () { v[1](); applica(); });
        boxScelti.appendChild(b);
      });
      if (voci.length > 1) {
        var tutti = document.createElement('button'); tutti.type = 'button'; tutti.className = 'cat-pillola-tutti'; tutti.textContent = 'Cancella tutto';
        tutti.addEventListener('click', azzera); boxScelti.appendChild(tutti);
      }
      boxScelti.hidden = !voci.length;
    }
    function applica() {
      var tg = scelti('[data-f-taglia]', 'data-f-taglia'), col = scelti('[data-f-colore]', 'data-f-colore'), pr = scelti('[data-f-prezzo]', 'data-f-prezzo');
      var n = 0;
      celle.forEach(function (c) {
        var taglie = c.getAttribute('data-taglie').split(' '), prezzo = +c.getAttribute('data-prezzo');
        var ok = (!tg.length || tg.some(function (t) { return taglie.indexOf(t) > -1; })) &&
          (!col.length || col.indexOf(c.getAttribute('data-colore')) > -1) &&
          (!pr.length || pr.some(function (f) { var d = f.split('-'); return prezzo >= +d[0] && prezzo <= +d[1]; }));
        c.hidden = !ok; if (ok) n++;
      });
      $('[data-cat-conta]', cat).textContent = '(' + n + ')';
      $('[data-cat-nessuno]', cat).hidden = n > 0;
      var mostraN = $('[data-filtri-mostra-n]', cat);
      if (mostraN) mostraN.textContent = n ? 'Mostra ' + n + (n === 1 ? ' capo' : ' capi') : 'Nessun capo';
      aggiornaScritta();
      pillole();
      var o = $('[data-ordina]', cat).value;
      celle.slice().sort(function (a, b) {
        if (o === 'prezzo-su') return a.getAttribute('data-prezzo') - b.getAttribute('data-prezzo');
        if (o === 'prezzo-giu') return b.getAttribute('data-prezzo') - a.getAttribute('data-prezzo');
        return a.getAttribute('data-ordine') - b.getAttribute('data-ordine');
      }).forEach(function (c) { griglia.appendChild(c); });
    }
    $$('[data-f-taglia]', cat).forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); applica(); }); });
    $$('[data-f-colore], [data-f-prezzo]', cat).forEach(function (i) { i.addEventListener('change', applica); });
    $('[data-ordina]', cat).addEventListener('change', applica);
    function azzera() {
      $$('[data-f-taglia]', cat).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      $$('[data-f-colore], [data-f-prezzo]', cat).forEach(function (i) { i.checked = false; });
      applica();
    }
    $$('[data-filtri-azzera]', cat).forEach(function (b) { b.addEventListener('click', azzera); });
  }

  /* ---------- borsa (salvata solo in questo browser) ---------- */
  // memoria locale protetta (navigazione privata o blocchi: il sito funziona lo stesso)
  var mem = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  /* ---------- motore (Cloudflare Worker, 19/10 sera): codici, pagamento Stripe, ordini, account ----------
     Il motore decide prezzi, codici e ordini; nel browser restano solo comodità (borsa, codice attivo, token di accesso).
     Nelle prove automatiche window.MARO_MOTORE punta a un motore finto locale. */
  var MOTORE = window.MARO_MOTORE || 'https://maro-motore.chillguyzofficial.workers.dev';
  var api = function (percorso, corpo, token) {
    var h = { 'content-type': 'application/json' };
    if (token) h.authorization = 'Bearer ' + token;
    return fetch(MOTORE + percorso, { method: corpo === undefined ? 'GET' : 'POST', headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d.stato = r.status; d.ok = r.ok; return d; }); },
        function () { return { ok: false, stato: 0, errore: 'Il negozio non risponde: controlla la connessione e riprova tra un minuto.' }; });
  };
  /* ---------- codici sconto: uno per persona, monouso, mai sommati (li crea e li segna come usati il motore) ----------
     maro-codice  = codice attivo in borsa {tipo: benvenuto|amico|buono, codice, pct|euro}
     maro-emessi  = codici visti da questo browser · maro-usati = codici usati negli ordini fatti da qui
     maro-ordini  = ordini fatti da qui (numero e totale) · maro-mio-invito = il proprio codice "Porta un amico" (dopo il primo ordine)
     maro-token   = accesso a "Il mio account" (del token il motore salva solo l'impronta) */
  var leggiJ = function (k, d) { try { return JSON.parse(mem.get(k)) || d; } catch (e) { return d; } };
  var scriviJ = function (k, v) { mem.set(k, JSON.stringify(v)); };
  var togliK = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  var AMICO_PCT = 10; // come nel motore (valori di esempio da confermare con Omar)
  var codiceAttivo = function () { return leggiJ('maro-codice', null); };
  var haOrdinato = function () { return leggiJ('maro-ordini', []).length > 0; };
  var emetti = function (c) { var e = leggiJ('maro-emessi', []); if (!e.some(function (x) { return x.codice === c.codice; })) { e.push(c); scriviJ('maro-emessi', e); } };
  // codici della dimostrazione (creati nel browser, il motore non li conosce): via, sia attivo sia nell'elenco
  togliK('maro-sconto');
  if (mem.get('maro-motore') !== '1') { togliK('maro-codice'); togliK('maro-emessi'); togliK('maro-usati'); togliK('maro-ordini'); togliK('maro-mio-invito'); togliK('maro-account'); togliK('maro-utente'); mem.set('maro-motore', '1'); }
  // iscrizione: una email = un codice (stessa email, stesso codice, lo decide il motore); se in borsa c'è già un codice resta quello
  // → Promise di {tipo, codice, pct} | {usato: true} | {errore}
  var attivaSconto = function (email) {
    return api('/api/iscrizione', { email: String(email || '').trim() }).then(function (d) {
      if (!d.ok) return { errore: d.errore || 'Non riusciamo a iscriverti adesso: riprova tra un minuto.' };
      mem.set('maro-iscritto', '1');
      if (d.usato) return { usato: true };
      var c = { tipo: 'benvenuto', codice: d.codice, pct: d.pct }, att = codiceAttivo();
      emetti(c);
      if (att) return att;
      scriviJ('maro-codice', c);
      if (window.MARO_ridisegna) window.MARO_ridisegna();
      return c;
    });
  };
  // avviso breve in basso (link amico, codice già usato…)
  var avvisa = function (testo) {
    var a = document.createElement('div'); a.className = 'maro-avviso'; a.setAttribute('role', 'status'); a.textContent = testo;
    document.body.appendChild(a);
    requestAnimationFrame(function () { a.classList.add('visibile'); });
    setTimeout(function () { a.classList.remove('visibile'); setTimeout(function () { a.remove(); }, 400); }, 6500);
  };
  // arrivo da un link "Porta un amico" (?amico=CODICE): 10% sul primo ordine, già in borsa
  (function () {
    var m = /[?&]amico=([A-Za-z0-9-]{4,20})/.exec(location.search);
    if (!m) return;
    var ref = m[1].toUpperCase();
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    var avvisoAmico = function (t) { setTimeout(function () { avvisa(t); }, 400); };
    if (ref === mem.get('maro-mio-invito')) return avvisoAmico('Questo è il tuo link: mandalo a un amico, lo sconto è per lui.');
    if (haOrdinato()) return avvisoAmico('Lo sconto amico vale sul primo ordine, e tu hai già ordinato su MARO.');
    var att = codiceAttivo();
    if (att && att.tipo !== 'amico') return avvisoAmico('Hai già il tuo ' + (att.pct || 10) + '% attivo in borsa: un codice per ordine.');
    // il codice dell'invito (AMICO-XXXX di chi invita) va in borsa; il motore lo controlla e al pagamento dà all'amico il suo
    api('/api/codice', { codice: ref }).then(function (d) {
      if (!d.ok) return avvisoAmico(d.stato === 0 ? d.errore : 'Questo link amico non è valido. Puoi sempre iscriverti per il 10% sul primo ordine.');
      if (!codiceAttivo()) { var c = { tipo: 'amico', codice: d.codice, pct: d.pct || AMICO_PCT }; scriviJ('maro-codice', c); emetti(c); if (window.MARO_ridisegna) window.MARO_ridisegna(); }
      mem.set('maro-iscritto', '1'); // niente popup: lo sconto c'è già
      avvisoAmico('Un amico ti regala il ' + AMICO_PCT + '% sul primo ordine. È già nella tua borsa.');
    });
  })();
  var CHIAVE = 'maro-borsa-1';
  function leggi() { try { return JSON.parse(localStorage.getItem(CHIAVE)) || []; } catch (e) { return []; } }
  function salva(r) { try { localStorage.setItem(CHIAVE, JSON.stringify(r)); } catch (e) {} }
  var CARTA = 'carta-regalo'; // la carta regalo sta nella borsa come le altre righe: t = importo, più i dati per l’email
  var righe = leggi().filter(function (r) { return r.id === CARTA ? r.t > 0 : CAT.some(function (p) { return p.id === r.id; }); });
  var borsa = $('#borsa'), ultimoFocus = null;

  function conta() { return righe.reduce(function (s, r) { return s + r.q; }, 0); }
  function disegna() {
    var n = conta(), num = $('.borsa-num'), btn = $('[data-apri-borsa]');
    num.textContent = n; num.hidden = !n;
    btn.setAttribute('aria-label', 'Borsa, ' + n + (n === 1 ? ' articolo' : ' articoli'));
    var box = $('#borsa-righe'), fondo = $('#borsa-fondo');
    if (!righe.length) {
      box.innerHTML = '<p class="borsa-vuota">La borsa è vuota. Il Drop 001 è ancora disponibile, ma non tutte le taglie.</p>';
      fondo.hidden = true; return;
    }
    var tot = 0, carte = 0;
    box.innerHTML = righe.map(function (r, k) {
      if (r.id === CARTA) {
        carte += r.t * r.q;
        return '<div class="riga"><a href="carta-regalo.html"><img src="assets/carta-regalo.svg" alt="" width="88" height="110"></a>' +
          '<div><h3>Carta regalo</h3><p>' + (r.per ? 'Per ' + esc(r.per) + ' · ' : '') + 'via email ' + (r.quando ? 'il ' + r.quando.split('-').reverse().join('/') : 'subito') + '</p><p>' + euro(r.t) + '</p>' +
          '<div class="riga-azioni"><button type="button" class="togli" data-togli="' + k + '">Rimuovi</button></div></div></div>';
      }
      var p = CAT.filter(function (x) { return x.id === r.id; })[0];
      tot += p.prezzo * r.q;
      return '<div class="riga"><a href="' + p.id + '.html"><img src="' + p.src + '" alt="" width="88" height="110"></a>' +
        '<div><h3>' + p.nome + '</h3><p>' + p.colore + '</p><p>Taglia ' + r.t + ' · ' + euro(p.prezzo) + '</p>' +
        '<div class="riga-azioni"><button type="button" data-meno="' + k + '" aria-label="Togli uno">−</button><span aria-live="polite">' + r.q + '</span>' +
        '<button type="button" data-piu="' + k + '" aria-label="Aggiungi uno">+</button><button type="button" class="togli" data-togli="' + k + '">Rimuovi</button></div></div></div>';
    }).join('');
    fondo.hidden = false;
    // spedizione: 5,90 €, gratuita sopra la soglia (valori di esempio)
    // la carta regalo arriva via email: niente spedizione, non conta per la soglia e non prende lo sconto
    var SOGLIA = 150, SPED = 5.9, manca = SOGLIA - tot, gratis = manca <= 0 || tot === 0;
    var barra = !tot ? '' : '<div class="soglia"><p>' + (gratis ? '<strong>Spedizione gratuita.</strong>' : 'Ti mancano <strong>' + euro(manca) + '</strong> per la spedizione gratuita.') + '</p>' +
      '<div class="soglia-barra"><i style="width:' + Math.min(100, Math.round(tot / SOGLIA * 100)) + '%"></i></div></div>';
    // un solo codice per ordine, sui capi (non sulle carte regalo); la soglia di spedizione resta sul subtotale pieno
    var c = codiceAttivo(), sconto = 0, nomeSc = '';
    if (c && tot) {
      sconto = c.pct ? Math.round(tot * c.pct) / 100 : Math.min(c.euro, tot);
      nomeSc = (c.tipo === 'amico' ? 'Sconto amico ' : c.tipo === 'buono' ? 'Buono ' : 'Sconto benvenuto ') + c.codice;
    }
    totaleUltimo = { capi: tot, carte: carte, sconto: sconto, sped: gratis ? 0 : SPED, totale: tot + carte - sconto + (gratis ? 0 : SPED) };
    fondo.innerHTML = barra +
      '<div class="riepilogo"><span>Subtotale</span><span>' + euro(tot + carte) + '</span></div>' +
      (sconto ? '<div class="riepilogo sconto"><span>' + esc(nomeSc) + ' <button type="button" class="sconto-togli" data-togli-codice aria-label="Togli il codice ' + esc(c.codice) + '">Togli</button></span><span>−' + euro(sconto) + '</span></div>' : '') +
      '<div class="riepilogo"><span>Spedizione</span><span>' + (!tot ? 'Via email' : gratis ? 'Gratuita' : euro(SPED)) + '</span></div>' +
      '<div class="totale"><span>Totale</span><span>' + euro(totaleUltimo.totale) + '</span></div>' +
      (sconto ? '' : '<details class="borsa-codice"' + (codiceAperto ? ' open' : '') + '><summary>Hai un codice sconto?</summary><form class="borsa-codice-form" novalidate><label for="borsa-codice-in" class="sr">Codice sconto</label><input id="borsa-codice-in" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Es. MARO-7K2Q" maxlength="20"><button type="submit" class="btn btn-contorno-nero">Applica</button></form><p class="borsa-codice-esito" role="alert">' + esc(esitoCodice) + '</p></details>') +
      '<button type="button" class="btn btn-nero btn-largo" data-paga>Vai al pagamento</button><p class="piccolo esito-paga" role="status"></p>';
    esitoCodice = '';
  }
  var totaleUltimo = null, codiceAperto = false, esitoCodice = '';
  // campo "Hai un codice?": lo controlla il motore (esiste, non è usato, non è annullato)
  function provaCodice(testo) {
    var t = String(testo || '').trim().toUpperCase().replace(/\s+/g, '');
    codiceAperto = true;
    if (!t) { esitoCodice = 'Scrivi il codice che trovi nell’email.'; return disegna(); }
    if (codiceAttivo()) { esitoCodice = 'Un codice per ordine: togli quello attivo per usare questo.'; return disegna(); }
    esitoCodice = 'Controllo il codice…'; disegna();
    api('/api/codice', { codice: t }).then(function (d) {
      codiceAperto = true;
      if (!d.ok) { esitoCodice = d.errore || 'Codice non valido.'; return disegna(); }
      var c = { tipo: d.tipo, codice: d.codice, pct: d.pct || undefined, euro: d.euro || undefined };
      scriviJ('maro-codice', c); emetti(c); codiceAperto = false; disegna();
    });
  }
  // pagamento: il motore prezza la borsa e apre Stripe Checkout, che al termine torna su ordine-confermato.html?s=…
  function paga(btn) {
    var c = codiceAttivo(), esito = function (t) { var e = $('.esito-paga', borsa); if (e) e.textContent = t; };
    if (righe.some(function (r) { return r.id === CARTA; })) return esito('La carta regalo arriva presto nel pagamento online: per ora toglila dalla borsa.');
    btn.disabled = true; btn.textContent = 'Apro il pagamento sicuro…'; esito('');
    api('/api/checkout', { righe: righe.map(function (r) { return { id: r.id, t: r.t, q: r.q }; }), codice: c ? c.codice : undefined }).then(function (d) {
      if (d.ok && d.url) { location.href = d.url; return; }
      // codice nel frattempo usato o non più valido: si toglie dalla borsa, così il cliente può pagare senza
      if (d.stato === 409 && c && /codice/i.test(d.errore || '')) { togliK('maro-codice'); disegna(); }
      else { btn.disabled = false; btn.textContent = 'Vai al pagamento'; }
      esito(d.errore || 'Il pagamento non è partito: riprova tra un minuto.');
    });
  }
  function apri() {
    ultimoFocus = document.activeElement;
    borsa.hidden = false; blocca(true);
    $('.borsa-testa button', borsa).focus();
  }
  function chiudi() {
    if (borsa.hidden) return;
    borsa.hidden = true; blocca(false);
    if (ultimoFocus && ultimoFocus.focus) ultimoFocus.focus({ preventScroll: true });
  }
  if (borsa) {
    window.MARO_ridisegna = disegna;
    window.MARO_aggiungi = function (id, t) {
      var r = righe.filter(function (x) { return x.id === id && x.t === t; })[0];
      if (r) r.q = Math.min(9, r.q + 1); else righe.push({ id: id, t: t, q: 1 });
      salva(righe); disegna(); apri();
    };
    window.MARO_aggiungiCarta = function (dati) { dati.id = CARTA; dati.q = 1; righe.push(dati); salva(righe); disegna(); apri(); };
    disegna();
    $$('[data-apri-borsa]').forEach(function (b) { b.addEventListener('click', apri); });
    borsa.addEventListener('click', function (e) {
      var t = e.target.closest('button, .borsa-velo');
      if (!t) return;
      if (t.hasAttribute('data-chiudi-borsa')) return chiudi();
      var k;
      if ((k = t.getAttribute('data-piu')) !== null) righe[k].q = Math.min(9, righe[k].q + 1);
      else if ((k = t.getAttribute('data-meno')) !== null) { righe[k].q--; if (righe[k].q < 1) righe.splice(k, 1); }
      else if ((k = t.getAttribute('data-togli')) !== null) righe.splice(k, 1);
      else if (t.hasAttribute('data-paga')) return paga(t);
      else if (t.hasAttribute('data-togli-codice')) { togliK('maro-codice'); codiceAperto = true; disegna(); var ic = $('#borsa-codice-in'); if (ic) ic.focus(); return; }
      else return;
      salva(righe); disegna();
      if (!righe.length) $('.borsa-testa button', borsa).focus();
    });
    borsa.addEventListener('submit', function (e) {
      if (!e.target.classList.contains('borsa-codice-form')) return;
      e.preventDefault(); provaCodice($('input', e.target).value);
      var ic = $('#borsa-codice-in'); if (ic) ic.focus();
    });
    borsa.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('borsa-codice')) codiceAperto = e.target.open; }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { chiudi(); chiudiMenu && menu && chiudiMenu(); } });
  }

  /* ---------- scheda prodotto: vetrina a scorrimento (frecce, miniature, dito) ---------- */
  $$('.vetrina').forEach(function (v) {
    var binario = $('.vetrina-binario', v), figure = $$('figure', v), n = figure.length, i = 0;
    var conta = $('.vetrina-conta', v), mini = $$('.miniature button', v.parentNode);
    if (n < 2) return;
    function vai(k) {
      i = (k + n) % n;
      binario.style.transform = 'translateX(' + (-100 * i) + '%)';
      figure.forEach(function (f, x) { if (x === i) f.removeAttribute('aria-hidden'); else f.setAttribute('aria-hidden', 'true'); });
      mini.forEach(function (b, x) { if (x === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      if (conta) conta.textContent = (i + 1) + ' / ' + n;
    }
    $$('[data-vai]', v).forEach(function (b) { b.addEventListener('click', function () { vai(i + Number(b.getAttribute('data-vai'))); }); });
    mini.forEach(function (b) { b.addEventListener('click', function () { vai(Number(b.getAttribute('data-foto'))); }); });
    var x0 = null, y0 = 0;
    v.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
    v.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) vai(i + (dx < 0 ? 1 : -1));
      v.dataset.tocco = Math.abs(dx) < 8 && Math.abs(dy) < 8 ? '1' : '';
    });
    v.addEventListener('click', function (e) {
      if (e.target.closest('button') || v.dataset.tocco !== '1' || !window.MARO_zoom) return;
      window.MARO_zoom(figure[i].querySelector('img'));
    });
    v.addEventListener('pointercancel', function () { x0 = null; });
    v.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') vai(i + 1); if (e.key === 'ArrowLeft') vai(i - 1); });
  });

  /* ---------- scheda prodotto: aggiungi alla borsa ---------- */
  var prod = $('.prodotto');
  if (prod) {
    var fs = $('.taglie', prod), err = $('.taglie-errore', prod);
    var btnAgg = $('[data-aggiungi]', prod), avv = $('.avvisami', prod);
    // taglia esaurita: al posto di "Aggiungi alla borsa" compare "Avvisami"
    var aggiornaEsaurita = function () {
      var r = $('input[name="taglia"]:checked', prod), fin = !!(r && r.hasAttribute('data-esaurita'));
      btnAgg.hidden = fin; avv.hidden = !fin;
      if (fin) { $('[data-taglia-esaurita]', avv).textContent = r.value; $('.avvisami-esito', avv).textContent = ''; }
    };
    $$('input[name="taglia"]', prod).forEach(function (r) { r.addEventListener('change', function () { fs.classList.remove('manca'); err.hidden = true; aggiornaEsaurita(); }); });
    avv.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input', avv), es = $('.avvisami-esito', avv);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) { es.className = 'avvisami-esito errore'; es.textContent = 'Questa email non sembra completa: controlla la @ e il punto.'; inp.focus(); return; }
      es.className = 'avvisami-esito'; es.textContent = 'Fatto: ti scriviamo appena torna. (Anteprima: nessuna email inviata.)'; inp.value = '';
    });

    // trova la tua taglia: tre domande a un tocco
    var trova = $('.trova', prod), trovaBtn = $('.trova-apri', prod);
    if (trova) {
      var risposte = {}, taglie = trova.getAttribute('data-taglie').split(',');
      trovaBtn.addEventListener('click', function () {
        trova.hidden = !trova.hidden; trovaBtn.setAttribute('aria-expanded', String(!trova.hidden));
      });
      $$('.trova-domanda', trova).forEach(function (d) {
        $$('button', d).forEach(function (b) {
          b.addEventListener('click', function () {
            $$('button', d).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            risposte[d.getAttribute('data-chiave')] = Number(b.getAttribute('data-v'));
            if (!('altezza' in risposte && 'corpo' in risposte && 'fit' in risposte)) return;
            // indice sulla scala XS..XXL: 1=S, 2=M, 3=L, 4=XL
            var scala = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
            var k = 1 + risposte.altezza + risposte.corpo + risposte.fit;
            k = Math.max(0, Math.min(scala.length - 1, k));
            var t = scala[k];
            if (taglie.indexOf(t) < 0) t = k < 2 ? taglie[0] : taglie[taglie.length - 1];
            var es = $('.trova-esito', trova);
            es.innerHTML = 'Ti consigliamo la <strong>' + t + '</strong>. <button type="button" class="link" data-usa="' + t + '">Seleziona ' + t + '</button>';
          });
        });
      });
      trova.addEventListener('click', function (e) {
        var u = e.target.closest('[data-usa]'); if (!u) return;
        var r = $('input[name="taglia"][value="' + u.getAttribute('data-usa') + '"]', prod);
        r.checked = true; r.dispatchEvent(new Event('change')); r.focus({ preventScroll: true });
        trova.hidden = true; trovaBtn.setAttribute('aria-expanded', 'false');
      });
    }

    btnAgg.addEventListener('click', function () {
      var scelta = $('input[name="taglia"]:checked', prod);
      if (!scelta) { fs.classList.add('manca'); err.hidden = false; $('input[name="taglia"]', prod).focus(); return; }
      var id = prod.getAttribute('data-id'), t = scelta.value;
      var r = righe.filter(function (x) { return x.id === id && x.t === t; })[0];
      if (r) r.q = Math.min(9, r.q + 1); else righe.push({ id: id, t: t, q: 1 });
      salva(righe); disegna(); apri();
    });
  }

  /* ---------- aggiunta rapida dalla griglia (+ → taglie → borsa) ---------- */
  var chiudiRapidi = function (tranne) {
    $$('.rapido').forEach(function (r) {
      if (r === tranne) return;
      $('.rapido-taglie', r).hidden = true; $('.rapido-apri', r).setAttribute('aria-expanded', 'false'); $('.rapido-apri', r).textContent = '+';
    });
  };
  document.addEventListener('click', function (e) {
    var ap = e.target.closest('.rapido-apri'), tg = e.target.closest('[data-rapido]');
    if (ap) {
      var r = ap.parentNode, pan = $('.rapido-taglie', r), aperto = pan.hidden;
      chiudiRapidi(r);
      pan.hidden = !aperto; ap.setAttribute('aria-expanded', String(aperto)); ap.textContent = aperto ? '×' : '+';
      if (aperto) { var primo = $('button:not([disabled])', pan); if (primo) primo.focus({ preventScroll: true }); }
      return;
    }
    if (tg) {
      var v = tg.getAttribute('data-rapido').split('|');
      chiudiRapidi(null);
      if (window.MARO_aggiungi) window.MARO_aggiungi(v[0], v[1]);
      return;
    }
    if (!e.target.closest('.rapido')) chiudiRapidi(null);
  });

  /* ---------- zoom delle foto prodotto (tocco = ingrandisci nel punto) ---------- */
  var zoom = $('#zoom');
  if (zoom) {
    var zArea = $('.zoom-area', zoom), zImg = document.createElement('img'), zDa = null;
    zArea.appendChild(zImg);
    var zChiudi = function () { if (zoom.hidden) return; zoom.hidden = true; zArea.classList.remove('dentro'); blocca(false); if (zDa) zDa.focus({ preventScroll: true }); };
    window.MARO_zoom = function (img) {
      zDa = document.activeElement;
      zImg.src = img.currentSrc || img.src; zImg.alt = img.alt;
      zArea.classList.remove('dentro'); zoom.hidden = false; blocca(true);
      $('.zoom-chiudi', zoom).focus();
    };
    zArea.addEventListener('click', function (e) {
      var q = zImg.getBoundingClientRect();
      zImg.style.transformOrigin = ((e.clientX - q.left) / q.width * 100) + '% ' + ((e.clientY - q.top) / q.height * 100) + '%';
      zArea.classList.toggle('dentro');
    });
    $('.zoom-chiudi', zoom).addEventListener('click', zChiudi);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zChiudi(); });
  }

  /* ---------- visti di recente (scheda prodotto) ---------- */
  var visti = $('.visti');
  if (prod && visti) {
    var qui = prod.getAttribute('data-id'), lista = [];
    try { lista = JSON.parse(mem.get('maro-visti')) || []; } catch (e) {}
    var altri = lista.filter(function (id) { return id !== qui; }).map(function (id) { return CAT.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean).slice(0, 4);
    if (altri.length) {
      $('.visti-lista', visti).innerHTML = altri.map(function (p) {
        return '<a class="visto" href="' + p.id + '.html"><img src="' + p.src + '" alt="" width="160" height="200" loading="lazy"><span>' + p.nome + '</span><span class="prezzo">' + euro(p.prezzo) + '</span></a>';
      }).join('');
      visti.hidden = false;
    }
    mem.set('maro-visti', JSON.stringify([qui].concat(lista.filter(function (id) { return id !== qui; })).slice(0, 8)));
  }

  /* ---------- popup 10% sul primo ordine ---------- */
  var pop = $('#popup');
  if (pop) {
    var GIORNI7 = 7 * 864e5, no = Number(mem.get('maro-popup-no') || 0);
    // compare solo nell'abbigliamento (body[data-popup]: pagine categoria e schede), se non c'è già un codice e non si è detto "No grazie" negli ultimi 7 giorni
    var puo = document.body.hasAttribute('data-popup') && !mem.get('maro-iscritto') && !codiceAttivo() && !haOrdinato() && Date.now() - no > GIORNI7;
    var chiudiPop = function (rifiuto) {
      pop.classList.remove('visibile');
      setTimeout(function () { pop.hidden = true; }, 300);
      if (rifiuto) mem.set('maro-popup-no', String(Date.now()));
    };
    var mostra = function () {
      if (!puo || !pop.hidden) return;
      // mai sopra menu, borsa o zoom aperti: riprova più tardi
      var occupato = !$('#borsa').hidden || ($('#menu') && $('#menu').classList.contains('aperto')) || (zoom && !zoom.hidden);
      if (occupato) { setTimeout(mostra, 4000); return; }
      puo = false; pop.hidden = false;
      requestAnimationFrame(function () { pop.classList.add('visibile'); });
    };
    // appena si entra nell'abbigliamento (scelta di Francesco/Omar 19/10): il tempo di vedere la pagina, poi il popup
    if (puo) setTimeout(mostra, 900);
    $$('[data-popup-no]', pop).forEach(function (b) { b.addEventListener('click', function () { chiudiPop(true); }); });
    $('[data-popup-ok]', pop).addEventListener('click', function () { chiudiPop(false); });
    $('.popup-form', pop).addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input', this), er = $('.popup-errore', pop);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) { er.textContent = 'Questa email non sembra completa: controlla la @ e il punto.'; inp.focus(); return; }
      er.textContent = '';
      var btn = $('button[type=submit]', this); btn.disabled = true;
      attivaSconto(inp.value).then(function (c) {
        btn.disabled = false;
        if (c.errore) { er.textContent = c.errore; return; }
        if (c.usato) { er.textContent = 'Con questa email il codice è già stato usato: vale una volta sola.'; return; }
        $('[data-mio-codice]', pop).textContent = c.codice;
        $('[data-passo="1"]', pop).hidden = true; $('[data-passo="2"]', pop).hidden = false;
        $('[data-popup-ok]', pop).focus();
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) chiudiPop(true); });
  }

  /* ---------- preferiti (cuore) ---------- */
  var leggiPref = function () { try { return JSON.parse(mem.get('maro-preferiti')) || []; } catch (e) { return []; } };
  var pref = leggiPref().filter(function (id) { return CAT.some(function (p) { return p.id === id; }); });
  var disegnaPref = function () {
    var n = $('.pref-num'); if (n) { n.textContent = pref.length; n.hidden = !pref.length; }
    var ap = $('.pref-apri'); if (ap) ap.setAttribute('aria-label', 'Preferiti, ' + pref.length);
    $$('[data-cuore]').forEach(function (b) {
      var id = b.getAttribute('data-cuore'), si = pref.indexOf(id) >= 0, p = CAT.filter(function (x) { return x.id === id; })[0];
      b.setAttribute('aria-pressed', String(si));
      var t = $('span', b);
      if (t) { t.textContent = si ? 'Salvato' : 'Salva'; b.setAttribute('aria-label', si ? 'Salvato nei preferiti' : 'Salva nei preferiti'); }
      else if (p) b.setAttribute('aria-label', (si ? 'Togli ' : 'Aggiungi ') + p.nome + (si ? ' dai preferiti' : ' ai preferiti'));
    });
    var lista = $('.pref-lista');
    if (lista) {
      lista.innerHTML = pref.map(function (id) {
        var p = CAT.filter(function (x) { return x.id === id; })[0];
        return '<div class="scheda-cella"><button class="cuore" type="button" data-cuore="' + p.id + '" aria-pressed="true" aria-label="Togli ' + p.nome + ' dai preferiti"><svg viewBox="0 0 24 24"><use href="#i-cuore"/></svg></button>' +
          '<a class="scheda" href="' + p.id + '.html"><div class="scheda-foto"><img src="' + p.src + '" alt="' + p.nome + '" width="640" height="800" loading="lazy"></div>' +
          '<div class="scheda-testo"><h3>' + p.nome + '</h3><p>' + p.colore + '</p><p class="prezzo">' + euro(p.prezzo) + '</p></div></a></div>';
      }).join('');
      $('.pref-vuoto').hidden = pref.length > 0;
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cuore]'); if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-cuore'), i = pref.indexOf(id);
    if (i >= 0) pref.splice(i, 1); else pref.unshift(id);
    mem.set('maro-preferiti', JSON.stringify(pref));
    disegnaPref();
  });
  disegnaPref();

  /* ---------- condividi il prodotto ---------- */
  var cond = $('[data-condividi]');
  if (cond) {
    cond.addEventListener('click', function () {
      var dati = { title: document.title, text: 'Guarda questo capo del Drop 001 MARO', url: location.href.split('#')[0] };
      var esito = $('.condividi-esito');
      if (navigator.share) { navigator.share(dati).catch(function () {}); return; }
      var fatto = function () { esito.textContent = 'Link copiato: incollalo dove vuoi.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(dati.url).then(fatto, function () { esito.textContent = dati.url; });
      else esito.textContent = dati.url;
    });
  }

  /* ---------- conto alla rovescia del prossimo drop ---------- */
  var conto = $('.conto');
  if (conto) {
    var arrivo = new Date(conto.getAttribute('data-drop')).getTime();
    var due = function (n) { return n < 10 ? '0' + n : String(n); };
    var tic = function () {
      var d = Math.max(0, Math.floor((arrivo - Date.now()) / 1000));
      if (!d) { $('.conto-cifre', conto).hidden = true; $('.conto-titolo', conto).textContent = 'Drop 002 disponibile ora'; return; }
      var v = { g: Math.floor(d / 86400), o: Math.floor(d % 86400 / 3600), m: Math.floor(d % 3600 / 60), s: d % 60 };
      Object.keys(v).forEach(function (u) { $('[data-u="' + u + '"]', conto).textContent = u === 'g' ? v[u] : due(v[u]); });
      setTimeout(tic, 1000 - Date.now() % 1000);
    };
    tic();
  }

  /* ---------- lookbook a scorrimento (frecce + dito) ---------- */
  var lbV = $('.lb-vetrina');
  // le foto del lookbook si caricano tutte solo quando la sezione si avvicina
  if (lbV && 'IntersectionObserver' in window) {
    var lbIO = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { lbIO.disconnect(); Array.prototype.forEach.call(lbV.querySelectorAll('img'), function (i) { i.loading = 'eager'; }); } }, { rootMargin: '600px 0px' });
    lbIO.observe(lbV);
  }
  if (lbV) {
    var lbB = $('.lb-binario', lbV), lbF = $$('figure', lbB), lbI = 0, lbConta = $('.lb-conta'), lbFrecce = $$('[data-lb]');
    // ultima posizione utile: quando le foto rimaste entrano tutte nella vetrina
    var ultima = function () {
      var W = lbV.clientWidth, x0 = lbF[0].offsetLeft, fine = lbF[lbF.length - 1].offsetLeft + lbF[lbF.length - 1].offsetWidth;
      for (var i = 0; i < lbF.length; i++) if (fine - lbF[i].offsetLeft <= W + 1) return i;
      return lbF.length - 1;
    };
    var lbVai = function (k) {
      var max = ultima();
      lbI = Math.min(max, Math.max(0, k));
      lbB.style.transform = 'translateX(' + (lbF[0].offsetLeft - lbF[lbI].offsetLeft) + 'px)';
      // telefono (una foto per volta): la vetrina prende l'altezza della foto mostrata
      lbV.style.height = lbF[0].offsetWidth >= lbV.clientWidth - 1 ? lbF[lbI].offsetHeight + 'px' : '';
      if (lbConta) lbConta.textContent = (lbI + 1) + ' / ' + lbF.length;
      lbFrecce[0].disabled = lbI === 0; lbFrecce[1].disabled = lbI === max;
    };
    lbFrecce.forEach(function (b) { b.addEventListener('click', function () { lbVai(lbI + Number(b.getAttribute('data-lb'))); }); });
    var lx = null, ly = 0;
    lbV.addEventListener('pointerdown', function (e) { lx = e.clientX; ly = e.clientY; });
    lbV.addEventListener('pointerup', function (e) { if (lx === null) return; var dx = e.clientX - lx, dy = e.clientY - ly; lx = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) lbVai(lbI + (dx < 0 ? 1 : -1)); });
    lbV.addEventListener('pointercancel', function () { lx = null; });
    window.addEventListener('resize', function () { lbVai(lbI); });
    lbVai(0);
  }

  /* ---------- pagina aiuto: tabella taglie polo / felpe ---------- */
  var schede = $$('[data-tabella]');
  schede.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tabella');
      schede.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('[data-tabella-di]').forEach(function (d) { d.hidden = d.getAttribute('data-tabella-di') !== t; });
    });
  });

  /* ---------- iscrizione (il motore salva l'email e crea il codice; le email partiranno con Resend) ---------- */
  var form = $('.iscriviti-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input', form), esito = $('.esito', form), v = input.value.trim(), btn = $('button[type=submit]', form);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        esito.className = 'esito errore'; esito.textContent = 'Questa email non sembra completa: controlla la @ e il punto.'; input.focus(); return;
      }
      btn.disabled = true; esito.className = 'esito'; esito.textContent = 'Un attimo…';
      attivaSconto(v).then(function (c) {
        btn.disabled = false;
        if (c.errore) { esito.className = 'esito errore'; esito.textContent = c.errore; return; }
        esito.textContent = c.usato ? 'Sei dentro: ti scriviamo prima del prossimo drop. Il codice di benvenuto di questa email è già stato usato.'
          : c.tipo === 'benvenuto' ? 'Sei dentro: il tuo codice ' + c.codice + ' (10% sul primo ordine, una volta sola) è già nella tua borsa. Ti scriviamo prima del prossimo drop. (Anteprima: nessuna email inviata.)'
          : 'Sei dentro: ti scriviamo prima del prossimo drop. In borsa hai già un codice attivo (' + c.codice + '): un codice per ordine.';
        input.value = '';
      });
    });
  }

  var calma = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Dietro il segno: la seconda foto sta sotto un ritaglio, il caricamento "lazy" non la vede mai → la carichiamo a 800 px dalla sezione ---------- */
  var scena2 = $('.segno-scena-2 img');
  if (scena2) {
    if ('IntersectionObserver' in window) {
      var oss2 = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { scena2.loading = 'eager'; oss2.disconnect(); } }, { rootMargin: '800px 0px' });
      oss2.observe($('.segno'));
    } else scena2.loading = 'eager';
  }

  /* ---------- pagina del brand: il banner e il finale entrano quando ci arrivi ---------- */
  var daEntrare = $$('[data-entra]');
  if (daEntrare.length && !calma && 'IntersectionObserver' in window) {
    var osservaEntra = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.remove('in-attesa'); v.target.classList.add('entrato'); osservaEntra.unobserve(v.target); } });
    }, { threshold: 0.35 });
    daEntrare.forEach(function (el) { el.classList.add('in-attesa'); osservaEntra.observe(el); });
  }

  /* ---------- pagina del brand v4: la linea verticale si disegna mentre scorri, i punti si accendono quando la raggiungi ---------- */
  var filo = $('.bn-filo');
  if (filo) {
    var luce = $('.bn-filo-luce', filo), sezFilo = filo.parentNode, punti = $$('.bn-punto', sezFilo), giroFilo = 0;
    var disegna = function () {
      giroFilo = 0;
      var r = sezFilo.getBoundingClientRect(), meta = window.innerHeight * 0.6;
      var p = Math.max(0, Math.min(1, (meta - r.top) / r.height));
      luce.style.transform = 'scaleY(' + p + ')';
      punti.forEach(function (pt) { pt.classList.toggle('acceso', pt.getBoundingClientRect().top < meta); });
    };
    if (calma) { luce.style.transform = 'none'; punti.forEach(function (pt) { pt.classList.add('acceso'); }); }
    else {
      var chiedi = function () { if (!giroFilo) giroFilo = requestAnimationFrame(disegna); };
      window.addEventListener('scroll', chiedi, { passive: true });
      window.addEventListener('resize', chiedi);
      disegna();
    }
  }

  /* ---------- pagina del brand: "Vedi il segno" ingrandisce la foto sul segno ---------- */
  $$('.br-zoom-btn').forEach(function (bt) {
    bt.addEventListener('click', function () {
      var fig = bt.parentNode, acceso = !fig.classList.contains('acceso');
      fig.classList.toggle('acceso', acceso);
      bt.setAttribute('aria-pressed', String(acceso));
      bt.textContent = acceso ? 'Foto intera' : 'Vedi il segno';
    });
  });

  /* ---------- conto alla rovescia breve, in una frase (pagina del brand) ---------- */
  $$('[data-conto-breve]').forEach(function (el) {
    var quando = new Date(el.getAttribute('data-conto-breve')).getTime();
    var parola = function (n, uno, tanti) { return n + ' ' + (n === 1 ? uno : tanti); };
    var aggiorna = function () {
      var min = Math.floor((quando - Date.now()) / 60000);
      if (min <= 0) { el.textContent = ' — è già uscito'; return; }
      var g = Math.floor(min / 1440), o = Math.floor(min % 1440 / 60), m = min % 60;
      el.textContent = ' — mancano ' + (g ? parola(g, 'giorno', 'giorni') + ' e ' + parola(o, 'ora', 'ore') : o ? parola(o, 'ora', 'ore') + ' e ' + parola(m, 'minuto', 'minuti') : parola(m, 'minuto', 'minuti'));
      setTimeout(aggiorna, 30000);
    };
    aggiorna();
  });

  /* ---------- scheda: data di consegna dal vivo (ordini entro le 13 dei giorni lavorativi partono subito; arrivo in 2–4 giorni lavorativi) ---------- */
  var FESTE = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'];
  var pasquetta = function (a) { // lunedì dopo Pasqua (calcolo di Meeus)
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3),
      k = (19 * b + c - e - h + 15) % 30, l = (32 + 2 * f + 2 * Math.floor(d / 4) - k - d % 4) % 7, m = Math.floor((b + 11 * k + 22 * l) / 451),
      mese = Math.floor((k + l - 7 * m + 114) / 31), giorno = (k + l - 7 * m + 114) % 31 + 1;
    return new Date(a, mese - 1, giorno + 1);
  };
  var due = function (n) { return (n < 10 ? '0' : '') + n; };
  var lavorativo = function (x) {
    var g = x.getDay(), p = pasquetta(x.getFullYear());
    return g !== 0 && g !== 6 && FESTE.indexOf(due(x.getMonth() + 1) + '-' + due(x.getDate())) < 0 && !(x.getMonth() === p.getMonth() && x.getDate() === p.getDate());
  };
  var avanti = function (x, n) { var y = new Date(x.getFullYear(), x.getMonth(), x.getDate()); while (n > 0) { y.setDate(y.getDate() + 1); if (lavorativo(y)) n--; } return y; };
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var giornoTesto = function (x, mese) { return GIORNI[x.getDay()] + ' ' + x.getDate() + (mese ? ' ' + MESI[x.getMonth()] : ''); };
  $$('[data-consegna]').forEach(function (el) {
    var aggiorna = function () {
      var ora = new Date(), oggi = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate());
      var limite = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate(), 13), subito = lavorativo(oggi) && ora < limite;
      var parte = subito ? oggi : avanti(oggi, 1), da = avanti(parte, 2), a = avanti(parte, 4);
      // detto dal punto di vista di chi compra: quando arriva, non quando parte
      var arrivo = 'arriva tra <strong>' + giornoTesto(da, da.getMonth() !== a.getMonth()) + ' e ' + giornoTesto(a, true) + '</strong>.';
      if (subito) {
        var min = Math.ceil((limite - ora) / 60000), h = Math.floor(min / 60), m = min % 60;
        el.innerHTML = 'Se ordini entro ' + [h ? h + ' h' : '', m || !h ? m + ' min' : ''].filter(Boolean).join(' ') + ', ' + arrivo;
      } else el.innerHTML = 'Se ordini oggi, ' + arrivo;
      setTimeout(aggiorna, 30000);
    };
    aggiorna();
  });

  /* ---------- carta regalo: anteprima dal vivo, importo, controllo dei campi, aggiunta alla borsa ---------- */
  var cr = $('[data-carta]');
  if (cr) {
    var campo = function (n) { return $('[name="' + n + '"]', cr); };
    var importo = 100;
    var oggiISO = function () { var x = new Date(); return x.getFullYear() + '-' + due(x.getMonth() + 1) + '-' + due(x.getDate()); };
    // quando inviarla: Oggi / Domani / Un altro giorno (calendario nostro: quello del browser non si adatta al sito)
    var iso = function (x) { return x.getFullYear() + '-' + due(x.getMonth() + 1) + '-' + due(x.getDate()); };
    var oggiD = function () { var x = new Date(); return new Date(x.getFullYear(), x.getMonth(), x.getDate()); };
    var cal = $('#cr-cal', cr), griglia = $('.cr-cal-griglia', cr), vista = oggiD(), scelto = oggiD();
    vista.setDate(1);
    var limiteMax = function () { var x = oggiD(); x.setFullYear(x.getFullYear() + 1); return x; };
    var bottoni = $$('[data-quando]', cr);
    var segna = function (tipo) { bottoni.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-quando') === tipo)); }); };
    var scegli = function (x, tipo) {
      scelto = x; campo('quando').value = iso(x); segna(tipo);
      // se la data è in un altro anno, l'anno si scrive sempre (14 gennaio 2027, non "14 gennaio")
      var altroAnno = x.getFullYear() !== oggiD().getFullYear();
      $('.cr-quando-scelto', cr).textContent = 'Arriva via email ' + (tipo === 'oggi' ? 'oggi, ' : tipo === 'domani' ? 'domani, ' : '') + GIORNI[x.getDay()] + ' ' + x.getDate() + ' ' + MESI[x.getMonth()] + (altroAnno ? ' ' + x.getFullYear() : '') + '.';
      $('[data-quando="altro"]', cr).textContent = tipo === 'altro' ? x.getDate() + '/' + due(x.getMonth() + 1) + (altroAnno ? '/' + String(x.getFullYear()).slice(2) : '') : 'Altra data';
    };
    var disegnaCal = function () {
      $('.cr-cal-testa p', cr).textContent = MESI[vista.getMonth()] + ' ' + vista.getFullYear();
      var primo = (vista.getDay() + 6) % 7, giorni = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate(), oggi = oggiD(), max = limiteMax(), h = '';
      for (var v = 0; v < primo; v++) h += '<span></span>';
      for (var g = 1; g <= giorni; g++) {
        var x = new Date(vista.getFullYear(), vista.getMonth(), g), no = x < oggi || x > max;
        h += '<button type="button" data-giorno="' + iso(x) + '"' + (no ? ' disabled' : '') + (iso(x) === iso(scelto) ? ' aria-pressed="true"' : '') + (iso(x) === iso(oggi) ? ' class="oggi"' : '') + ' aria-label="' + GIORNI[x.getDay()] + ' ' + g + ' ' + MESI[x.getMonth()] + '">' + g + '</button>';
      }
      griglia.innerHTML = h;
      var precMese = new Date(vista.getFullYear(), vista.getMonth(), 0);
      $('[data-mese="-1"]', cr).disabled = precMese < oggi;
      $('[data-mese="1"]', cr).disabled = new Date(vista.getFullYear(), vista.getMonth() + 1, 1) > max;
    };
    bottoni.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-quando');
        if (t === 'altro') { var aperto = cal.hidden; cal.hidden = !aperto; b.setAttribute('aria-expanded', String(aperto)); if (aperto) { vista = new Date(scelto.getFullYear(), scelto.getMonth(), 1); disegnaCal(); } return; }
        var x = oggiD(); if (t === 'domani') x.setDate(x.getDate() + 1);
        cal.hidden = true; $('[data-quando="altro"]', cr).setAttribute('aria-expanded', 'false'); scegli(x, t);
      });
    });
    $$('[data-mese]', cr).forEach(function (b) { b.addEventListener('click', function () { vista.setMonth(vista.getMonth() + Number(b.getAttribute('data-mese'))); disegnaCal(); }); });
    griglia.addEventListener('click', function (e) {
      var b = e.target.closest('[data-giorno]'); if (!b || b.disabled) return;
      var p = b.getAttribute('data-giorno').split('-'), x = new Date(+p[0], p[1] - 1, +p[2]);
      scegli(x, 'altro'); cal.hidden = true; $('[data-quando="altro"]', cr).setAttribute('aria-expanded', 'false'); $('[data-quando="altro"]', cr).focus();
    });
    scegli(oggiD(), 'oggi');
    var anteprima = function () {
      var imp = $('[data-cr-importo]');
      if (imp.textContent !== importo + ' €' && imp.animate) imp.animate([{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      imp.textContent = importo + ' €';
      $('[data-cr-per]').textContent = campo('per').value.trim() ? 'Per ' + campo('per').value.trim() : 'Per te';
      $('[data-cr-msg]').textContent = campo('msg').value.trim() || 'Il tuo messaggio comparirà qui.';
      $('[data-cr-da]').textContent = campo('da').value.trim() ? 'Da ' + campo('da').value.trim() : '';
      $('[data-cr-conta]').textContent = campo('msg').value.length + '/120';
    };
    $$('[data-importo]', cr).forEach(function (b) {
      b.addEventListener('click', function () {
        importo = Number(b.getAttribute('data-importo'));
        $$('[data-importo]', cr).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        anteprima();
      });
    });
    ['per', 'da', 'msg'].forEach(function (n) { campo(n).addEventListener('input', anteprima); });
    cr.addEventListener('submit', function (e) {
      e.preventDefault();
      var errore = '', email = campo('email').value.trim();
      if (!campo('per').value.trim()) errore = 'Scrivi il nome di chi riceve la carta.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errore = 'Controlla l’email di chi riceve la carta: sembra incompleta.';
      else if (!campo('quando').value || campo('quando').value < oggiISO()) errore = 'Scegli un giorno da oggi in poi.';
      $('.cr-esito', cr).textContent = errore;
      if (errore) return;
      if (window.MARO_aggiungiCarta) window.MARO_aggiungiCarta({ t: importo, per: campo('per').value.trim(), da: campo('da').value.trim(), email: email, quando: campo('quando').value, msg: campo('msg').value.trim() });
    });
    anteprima();
  }

  /* ---------- home › Tiratura limitata: fila a scorrimento, si accende il capo al centro ---------- */
  $$('[data-giostra]').forEach(function (g) {
    // voci = solo i capi (figli diretti), non le righe dei dettagli dentro ogni capo
    var binario = $('.tir-binario', g), voci = Array.prototype.slice.call(binario.children), conta = $('.tir-conta', g), frecce = $$('[data-giostra-vai]', g), att = 0;
    var piano = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    var accendi = function (k) {
      att = k;
      voci.forEach(function (v, x) { v.classList.toggle('attiva', x === k); });
      conta.textContent = (k + 1) + ' / ' + voci.length;
      frecce.at(0).disabled = k === 0; frecce.at(1).disabled = k === voci.length - 1;
    };
    var vai = function (k) {
      k = Math.max(0, Math.min(voci.length - 1, k));
      var v = voci.at(k), dx = v.offsetLeft - (binario.clientWidth - v.offsetWidth) / 2;
      binario.scrollTo({ left: dx, behavior: piano });
      accendi(k);
    };
    if ('IntersectionObserver' in window) {
      var oss = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) accendi(voci.indexOf(e.target)); });
      }, { root: binario, rootMargin: '0px -45% 0px -45%', threshold: 0 });
      voci.forEach(function (v) { oss.observe(v); });
    }
    frecce.forEach(function (f) { f.addEventListener('click', function () { vai(att + Number(f.getAttribute('data-giostra-vai'))); }); });
    voci.forEach(function (v, k) {
      $('a', v).addEventListener('click', function (e) { if (k !== att) { e.preventDefault(); vai(k); } });
    });
    accendi(0);
  });

  /* ---------- Porta un amico: il proprio link (dopo il primo ordine), copia / WhatsApp / condividi ---------- */
  // si ridisegna anche dopo: quando la conferma d'ordine o l'account ricevono il link dal motore
  var disegnaInviti = function (codice) {
    var mio = codice || (haOrdinato() && mem.get('maro-mio-invito'));
    $$('[data-invito]').forEach(function (box) {
      var senza = box.parentNode.querySelector('[data-invito-senza]');
      if (!mio) return;
      var base = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
      var link = base + '?amico=' + mio, testo = 'Ti regalo il ' + AMICO_PCT + '% sul primo ordine MARO: ';
      box.hidden = false; if (senza) senza.hidden = true;
      $('[data-invito-link]', box).value = link;
      $('[data-invito-wa]', box).href = 'https://wa.me/?text=' + encodeURIComponent(testo + link);
      box.dataset.link = link; box.dataset.testo = testo;
      if (box.dataset.pronto) return;
      box.dataset.pronto = '1';
      var campo = $('[data-invito-link]', box), esito = $('.invito-esito', box);
      $('[data-invito-copia]', box).addEventListener('click', function () {
        var ok = function () { esito.textContent = 'Link copiato. Incollalo dove vuoi.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.dataset.link).then(ok, function () { campo.select(); ok(); });
        else { campo.select(); try { document.execCommand('copy'); } catch (e) {} ok(); }
      });
      var cond = $('[data-invito-condividi]', box);
      if (navigator.share) {
        cond.hidden = false;
        cond.addEventListener('click', function () { navigator.share({ title: 'MARO', text: box.dataset.testo, url: box.dataset.link }).catch(function () {}); });
      }
    });
  };
  disegnaInviti();
  // tornati da Stripe senza pagare: la borsa è ancora lì
  if (/[?&]pagamento=annullato/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    setTimeout(function () { avvisa('Pagamento annullato: nessun addebito. La tua borsa è ancora qui.'); }, 400);
  }

  /* ---------- Il mio account (motore): accesso, conferma email, codici disponibili/usati, ordini, link amico ---------- */
  var contoFuori = $('[data-conto-fuori]');
  if (contoFuori) {
    var dentro = $('[data-conto-dentro]'), avvisoConto = $('[data-conto-avviso]');
    var dataIt = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); };
    var descr = function (c) { return c.tipo === 'amico' ? AMICO_PCT + '% · invito di un amico' : c.tipo === 'buono' ? euro(c.euro) + ' · premio Porta un amico' : (c.pct || 10) + '% · iscrizione alla newsletter'; };
    var tokenConto = function () { return mem.get('maro-token'); };
    // finché le email non partono (Resend), in prova il motore restituisce il link: lo mostriamo per poterlo provare
    var linkProva = function (testo, link) {
      return esc(testo) + (link ? ' <a class="link" href="' + esc(link) + '" data-link-prova>(Anteprima, le email non partono ancora: apri il link da qui)</a>' : '');
    };
    var mostraAvviso = function (html) { if (!avvisoConto) return; avvisoConto.innerHTML = html || ''; avvisoConto.hidden = !html; };
    var codiciConto = [];
    var fuori = function () { contoFuori.hidden = false; dentro.hidden = true; };
    // pagina di tracciamento dei corrieri: solo Poste pubblica la pagina dei risultati col numero; per gli altri la pagina
    // ufficiale di ricerca + "Copia numero" (da verificare con un numero vero quando Omar dice quale corriere usa)
    var CORRIERI = {
      poste: ['Poste Italiane', 'https://www.poste.it/cerca/#/risultati-spedizioni/', true], brt: ['BRT', 'https://www.brt.it/'],
      gls: ['GLS', 'https://www.gls-italy.com/'], sda: ['SDA', 'https://www.sda.it/'], inpost: ['InPost', 'https://inpost.it/'],
      dhl: ['DHL', 'https://www.dhl.com/it-it/home/tracciamento.html'], ups: ['UPS', 'https://www.ups.com/track?loc=it_IT'], altro: ['Corriere', '']
    };
    var disegnaOrdine = function (o) {
      var pezzi = (o.righe || []).reduce(function (s, r) { return s + r.quantita; }, 0);
      var chiuso = o.stato === 'reso' || o.stato === 'annullato';
      var tappe = [['Pagato', o.pagato_il], ['In preparazione', o.pagato_il], ['Spedito', o.spedito_il], ['Consegnato', o.consegnato_il]];
      var arrivato = o.consegnato_il ? 3 : o.spedito_il ? 2 : 1; // indice dell'ultima tappa raggiunta
      var etichetta = chiuso ? (o.stato === 'reso' ? 'Reso' : 'Annullato') : tappe[arrivato][0];
      var cor = CORRIERI[o.corriere] || CORRIERI.altro;
      var traccia = o.tracking ? '<div class="acc-traccia"><p><b>' + esc(cor[0]) + '</b> · numero di spedizione <span class="acc-num">' + esc(o.tracking) + '</span></p><div class="acc-traccia-azioni">' +
        (cor[1] ? '<a class="btn btn-nero" target="_blank" rel="noopener" href="' + esc(cor[1] + (cor[2] ? encodeURIComponent(o.tracking) : '')) + '">Traccia il pacco</a>' : '') +
        '<button type="button" class="btn btn-contorno-nero" data-copia-num="' + esc(o.tracking) + '">Copia numero</button></div><p class="acc-sotto piccolo" role="status"></p></div>' : '';
      var c = o.consegna, indirizzo = c ? [c.nome, c.riga1, c.riga2, [c.cap, c.citta, c.provincia].filter(Boolean).join(' ')].filter(Boolean).map(esc).join('<br>') : '';
      return '<li class="acc-ordine"><details><summary><div><b>Ordine ' + esc(o.numero) + '</b><span>' + dataIt(o.pagato_il) + ' · ' + pezzi + (pezzi === 1 ? ' articolo' : ' articoli') + '</span></div>' +
        '<span class="acc-stato' + (chiuso ? ' usato' : arrivato === 3 ? ' attivo' : '') + '">' + etichetta + '</span><em>' + euro(o.totale) + '</em></summary><div class="acc-ordine-dentro">' +
        (chiuso ? '' : '<ol class="acc-tappe">' + tappe.map(function (t, k) {
          return '<li class="' + (k < arrivato ? 'fatta' : k === arrivato ? 'fatta attuale' : '') + '"><b>' + t[0] + '</b>' + (k !== 1 && t[1] && k <= arrivato ? '<span>' + dataIt(t[1]) + '</span>' : k === 1 && arrivato === 1 ? '<span>di solito parte entro 48 ore</span>' : '') + '</li>';
        }).join('') + '</ol>') + traccia +
        '<table class="acc-righe"><tbody>' + (o.righe || []).map(function (r) {
          return '<tr><td>' + esc(r.nome) + ' · taglia ' + esc(r.taglia) + (r.quantita > 1 ? ' × ' + r.quantita : '') + '</td><td>' + euro(r.prezzo_cent * r.quantita / 100) + '</td></tr>';
        }).join('') +
        (o.sconto ? '<tr><td>Sconto' + (o.codice ? ' ' + esc(o.codice) : '') + '</td><td>−' + euro(o.sconto) + '</td></tr>' : '') +
        '<tr><td>Spedizione</td><td>' + (o.spedizione ? euro(o.spedizione) : 'Gratuita') + '</td></tr><tr class="tot"><td>Totale</td><td>' + euro(o.totale) + '</td></tr></tbody></table>' +
        (indirizzo ? '<p class="acc-consegna"><b>Consegna a</b><br>' + indirizzo + '</p>' : '') +
        '</div></details></li>';
    };
    dentro.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copia-num]'); if (!b) return;
      var n = b.getAttribute('data-copia-num'), es = b.parentNode.nextElementSibling;
      var ok = function () { es.textContent = 'Numero copiato: incollalo nella pagina del corriere.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(ok, function () { es.textContent = n; }); else es.textContent = n;
    });
    var disegnaConto = function () {
      var tk = tokenConto();
      if (!tk || $('[data-acc-nuova]')) return fuori(); // mentre si sceglie una nuova password si resta su quel modulo
      api('/api/io', undefined, tk).then(function (d) {
        if (d.stato === 401) { togliK('maro-token'); return fuori(); }
        contoFuori.hidden = true; dentro.hidden = false;
        if (!d.ok) { mostraAvviso(esc(d.errore)); return; }
        $('[data-conto-email]').textContent = d.email;
        $('[data-conto-nome]').textContent = d.nome ? ', ' + d.nome : '';
        if (!d.email_verificata) {
          var l = null; try { l = sessionStorage.getItem('maro-link-conferma'); } catch (e) {}
          mostraAvviso(linkProva('Ti abbiamo mandato un’email per confermare l’indirizzo: dopo la conferma qui compaiono i tuoi codici e i tuoi ordini.', l));
        } else if (avvisoConto && !avvisoConto.dataset.fisso) mostraAvviso('');
        codiciConto = d.codici || [];
        var att = codiceAttivo();
        var liberi = codiciConto.filter(function (c) { return c.stato === 'disponibile'; }), spesi = codiciConto.filter(function (c) { return c.stato === 'usato'; });
        $('[data-codici-liberi]').innerHTML = liberi.length ? liberi.map(function (c) {
          var inBorsa = att && att.codice === c.codice;
          return '<li><div><b>' + esc(c.codice) + '</b><span>' + esc(descr(c)) + '</span></div>' +
            (inBorsa ? '<em class="acc-stato attivo">Attivo in borsa</em>' : att ? '<em class="acc-stato">Disponibile</em>' : '<button type="button" class="btn btn-contorno-nero" data-usa-codice="' + esc(c.codice) + '">Metti in borsa</button>') + '</li>';
        }).join('') : '<li class="acc-vuoto">Nessun codice disponibile. <a class="link" href="index.html#iscriviti">Iscriviti</a> per il 10% sul primo ordine.</li>';
        $('[data-codici-usati]').innerHTML = spesi.length ? spesi.map(function (c) {
          return '<li><div><b>' + esc(c.codice) + '</b><span>' + esc(descr(c)) + (c.usato_il ? ' · usato il ' + dataIt(c.usato_il) : '') + (c.ordine ? ', ordine ' + esc(c.ordine) : '') + '</span></div><em class="acc-stato usato">Usato</em></li>';
        }).join('') : '<li class="acc-vuoto">Nessuno, per ora.</li>';
        var ordini = d.ordini || [];
        $('[data-conto-ordini]').innerHTML = ordini.length ? ordini.map(disegnaOrdine).join('') : '<li class="acc-vuoto">Nessun ordine, per ora.</li>';
        if (d.invito && ordini.length) { mem.set('maro-mio-invito', d.invito); disegnaInviti(d.invito); }
      });
    };
    // ---- Accedi / Registrati ----
    var EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var regolePw = { lung: function (p) { return p.length >= 8; }, num: function (p) { return /\d/.test(p); }, maiu: function (p) { return /[A-Z]/.test(p); } };
    var formA = $('[data-acc-accedi]'), formR = $('[data-acc-registrati]'), schede = $$('[data-acc-scheda]');
    var vaiScheda = function (nome, fuoco) {
      schede.forEach(function (s) { var si = s.getAttribute('data-acc-scheda') === nome; s.setAttribute('aria-selected', si ? 'true' : 'false'); s.tabIndex = si ? 0 : -1; if (si && fuoco) s.focus(); });
      formA.hidden = nome !== 'accedi'; formR.hidden = nome !== 'registrati';
    };
    schede.forEach(function (s, i) {
      s.addEventListener('click', function () { vaiScheda(s.getAttribute('data-acc-scheda')); });
      s.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); vaiScheda(schede[(i + 1) % 2].getAttribute('data-acc-scheda'), true); } });
    });
    if (/registrati/.test(location.hash)) vaiScheda('registrati');
    var entra = function (token) { mem.set('maro-token', token); disegnaConto(); window.scrollTo(0, 0); };
    var occupato = function (form, si) { var b = $('button[type=submit]', form); if (b) b.disabled = si; };
    formA.addEventListener('submit', function (e) {
      e.preventDefault();
      var es = $('[data-acc-esito]', formA), email = $('#acc-email').value.trim().toLowerCase(), pw = $('#acc-pw').value;
      $('[data-acc-info]').textContent = '';
      if (!EMAIL_OK.test(email)) { es.textContent = 'Questa email non sembra completa: controlla la @ e il punto.'; $('#acc-email').focus(); return; }
      if (!pw) { es.textContent = 'Scrivi la password.'; $('#acc-pw').focus(); return; }
      occupato(formA, true); es.textContent = '';
      api('/api/accedi', { email: email, password: pw }).then(function (d) {
        occupato(formA, false);
        // stesso messaggio se l'email non esiste o la password è sbagliata: non si rivela chi è registrato
        if (!d.ok) { es.textContent = d.stato === 401 ? 'Email o password non corretti. Non hai un account? Passa a «Registrati».' : d.errore; return; }
        $('#acc-pw').value = ''; entra(d.token);
      });
    });
    $('[data-acc-dimenticata]').addEventListener('click', function () {
      var email = $('#acc-email').value.trim(), info = $('[data-acc-info]');
      if (!EMAIL_OK.test(email)) { $('[data-acc-esito]').textContent = 'Scrivi prima la tua email, poi tocca «Password dimenticata?».'; $('#acc-email').focus(); return; }
      $('[data-acc-esito]').textContent = '';
      api('/api/password-dimenticata', { email: email }).then(function (d) {
        if (!d.ok) { info.textContent = d.errore; return; }
        info.innerHTML = linkProva('Se esiste un account con questa email, ti abbiamo mandato un link per scegliere una nuova password.', d.anteprima_link);
      });
    });
    var pwR = $('#reg-pw');
    pwR.addEventListener('input', function () {
      $$('[data-regola]').forEach(function (li) { li.classList.toggle('ok', regolePw[li.getAttribute('data-regola')](pwR.value)); });
    });
    formR.addEventListener('submit', function (e) {
      e.preventDefault();
      var es = $('[data-reg-esito]'), nome = $('#reg-nome').value.trim(), email = $('#reg-email').value.trim().toLowerCase(), pw = pwR.value;
      var errore = function (t, el) { es.textContent = t; if (el) el.focus(); };
      if (!nome) return errore('Scrivi il tuo nome.', $('#reg-nome'));
      if (!EMAIL_OK.test(email)) return errore('Questa email non sembra completa: controlla la @ e il punto.', $('#reg-email'));
      var manca = Object.keys(regolePw).filter(function (k) { return !regolePw[k](pw); });
      if (manca.length) { pwR.dispatchEvent(new Event('input')); return errore('La password non va ancora bene: guarda i punti sotto il campo.', pwR); }
      if (!$('[data-reg-privacy]').checked) return errore('Per creare l’account serve la conferma dell’informativa privacy.', $('[data-reg-privacy]'));
      var news = $('[data-reg-newsletter]').checked;
      occupato(formR, true); es.textContent = '';
      api('/api/registrati', { nome: nome.slice(0, 40), email: email, password: pw, privacy: true, newsletter: news }).then(function (d) {
        occupato(formR, false);
        if (d.stato === 409) { vaiScheda('accedi'); $('#acc-email').value = email; $('[data-acc-esito]').textContent = 'Esiste già un account con questa email: accedi con la tua password.'; $('#acc-pw').focus(); return; }
        if (!d.ok) return errore(d.errore);
        pwR.value = '';
        try { if (d.anteprima_link) sessionStorage.setItem('maro-link-conferma', d.anteprima_link); } catch (x) {}
        // con la newsletter il codice va subito in borsa (nell'elenco dell'account compare dopo la conferma dell'email)
        (news ? attivaSconto(email) : Promise.resolve(null)).then(function (c) {
          entra(d.token);
          if (c && c.codice && c.tipo === 'benvenuto') avvisa('Benvenuto! Il tuo codice ' + c.codice + ' è già in borsa.');
          else avvisa('Account creato. Benvenuto in MARO.');
        });
      });
    });
    $('[data-conto-esci]').addEventListener('click', function () {
      var tk = tokenConto(); togliK('maro-token'); fuori();
      if (tk) api('/api/esci', {}, tk);
    });
    var formEl = $('[data-acc-elimina]');
    if (formEl) formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = $('#el-pw').value, es = $('[data-el-esito]');
      if (!pw) { es.textContent = 'Scrivi la tua password per confermare.'; $('#el-pw').focus(); return; }
      occupato(formEl, true);
      api('/api/elimina-account', { password: pw }, tokenConto()).then(function (d) {
        occupato(formEl, false);
        if (!d.ok) { es.textContent = d.errore; return; }
        $('#el-pw').value = ''; formEl.parentNode.open = false;
        // nel browser restano solo comodità: via anche codice in borsa e link amico di questa persona
        ['maro-token', 'maro-codice', 'maro-emessi', 'maro-mio-invito', 'maro-iscritto'].forEach(togliK);
        fuori(); $('[data-acc-info]').textContent = 'Account eliminato. Ci dispiace vederti andare: se torni, ti aspettiamo.';
        window.scrollTo(0, 0);
      });
    });
    dentro.addEventListener('click', function (e) {
      var b = e.target.closest('[data-usa-codice]'); if (!b) return;
      var c = codiciConto.filter(function (x) { return x.codice === b.getAttribute('data-usa-codice'); })[0];
      if (c && !codiceAttivo()) {
        var att = { tipo: c.tipo, codice: c.codice, pct: c.pct, euro: c.euro };
        scriviJ('maro-codice', att); emetti(att);
        if (window.MARO_ridisegna) window.MARO_ridisegna(); disegnaConto(); avvisa('Codice ' + c.codice + ' attivo nella tua borsa.');
      }
    });
    // link dalle email: #conferma=… (conferma l'indirizzo) · #nuova-password=… (scegli la password)
    var puliscIndirizzo = function () { try { history.replaceState(null, '', location.pathname); } catch (e) {} };
    var usaLinkIndirizzo = function () {
    var mLink = /#(conferma|nuova-password)=([A-Za-z0-9_-]{20,})/.exec(location.hash);
    if (!mLink) return;
    if (mLink[1] === 'conferma') {
      puliscIndirizzo();
      api('/api/conferma', { token: mLink[2] }).then(function (d) {
        try { sessionStorage.removeItem('maro-link-conferma'); } catch (e) {}
        if (avvisoConto) avvisoConto.dataset.fisso = '1';
        mostraAvviso(esc(d.ok ? 'Email confermata. Ora qui trovi i tuoi codici e i tuoi ordini.' : d.errore));
        if (!tokenConto()) { $('[data-acc-info]').textContent = d.ok ? 'Email confermata: accedi per vedere codici e ordini.' : d.errore; }
        disegnaConto();
      });
    } else {
      puliscIndirizzo();
      var vecchio = $('[data-acc-nuova]'); if (vecchio) vecchio.remove();
      var np = document.createElement('form');
      np.className = 'acc-pannello'; np.noValidate = true; np.setAttribute('data-acc-nuova', '');
      np.innerHTML = '<h2>Scegli una nuova password</h2><div class="acc-campo"><label for="np-pw">Nuova password</label><input id="np-pw" type="password" autocomplete="new-password" required></div>' +
        '<p class="acc-sotto">Almeno 8 caratteri, un numero e una lettera maiuscola.</p><p class="acc-esito" role="alert"></p><button type="submit" class="btn btn-nero btn-largo">Salva la password</button>';
      formA.parentNode.insertBefore(np, formA);
      fuori(); formA.hidden = true; formR.hidden = true; schede.forEach(function (s) { s.parentNode.hidden = true; });
      np.addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = $('#np-pw').value, es = $('.acc-esito', np);
        if (!Object.keys(regolePw).every(function (k) { return regolePw[k](pw); })) { es.textContent = 'La password non va ancora bene: almeno 8 caratteri, un numero e una maiuscola.'; $('#np-pw').focus(); return; }
        occupato(np, true);
        api('/api/conferma', { token: mLink[2], password: pw }).then(function (d) {
          occupato(np, false);
          if (!d.ok) { es.textContent = d.errore; return; }
          np.remove(); schede.forEach(function (s) { s.parentNode.hidden = false; }); vaiScheda('accedi');
          if (avvisoConto) avvisoConto.dataset.fisso = '1';
          mostraAvviso('Password cambiata. Per sicurezza abbiamo chiuso gli accessi dagli altri dispositivi.');
          entra(d.token);
        });
      });
      $('#np-pw').focus();
    }
    };
    // il link si usa all'apertura della pagina e anche se si apre mentre si è già qui (cambia solo il #)
    window.addEventListener('hashchange', usaLinkIndirizzo);
    usaLinkIndirizzo();
    disegnaConto();
  }

  /* ---------- conferma d'ordine: il motore dice numero, totale e link amico (la conferma di Stripe arriva in pochi secondi) ---------- */
  var testoOrdine = $('[data-ordine-testo]');
  var sessione = (/[?&]s=(cs_[A-Za-z0-9_]+)/.exec(location.search) || [])[1];
  if (testoOrdine && sessione) {
    var DOPO = ' Ti abbiamo mandato la conferma via email e ti scriviamo di nuovo quando il pacco parte, di solito entro 48 ore.';
    testoOrdine.textContent = 'Stiamo registrando il tuo ordine…';
    var tentativi = 0;
    var chiediOrdine = function () {
      api('/api/ordine?s=' + encodeURIComponent(sessione)).then(function (d) {
        if (d.ok && d.numero) {
          testoOrdine.textContent = 'Ordine ' + d.numero + ' · totale ' + euro(d.totale) + (d.codice ? ' · codice ' + d.codice + ' usato' : '') + '.' + DOPO;
          // ordine registrato: borsa vuota, codice usato tolto, link "Porta un amico" pronto
          righe = []; salva(righe); if (borsa) disegna();
          togliK('maro-codice');
          var o = leggiJ('maro-ordini', []);
          if (!o.some(function (x) { return x.id === d.numero; })) { o.push({ id: d.numero, data: new Date().toISOString(), codice: d.codice, conti: { totale: d.totale } }); scriviJ('maro-ordini', o); }
          if (d.codice) { var u = leggiJ('maro-usati', []); if (u.indexOf(d.codice) < 0) { u.push(d.codice); scriviJ('maro-usati', u); } }
          if (d.invito) { mem.set('maro-mio-invito', d.invito); disegnaInviti(d.invito); }
          return;
        }
        if (++tentativi < 15 && (d.in_attesa || d.stato === 0)) return setTimeout(chiediOrdine, 1500);
        testoOrdine.textContent = 'Il pagamento è andato a buon fine: l’ordine sta arrivando nel nostro sistema.' + DOPO;
      });
    };
    chiediOrdine();
  }
})();
