/* MARO — Drop 001 */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var CAT = window.MARO_CATALOGO || [];
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

  /* ---------- borsa (salvata solo in questo browser) ---------- */
  // memoria locale protetta (navigazione privata o blocchi: il sito funziona lo stesso)
  var mem = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var haSconto = function () { return mem.get('maro-sconto') === '1'; };
  var attivaSconto = function () { mem.set('maro-sconto', '1'); mem.set('maro-iscritto', '1'); if (window.MARO_ridisegna) window.MARO_ridisegna(); };
  var CHIAVE = 'maro-borsa-1';
  function leggi() { try { return JSON.parse(localStorage.getItem(CHIAVE)) || []; } catch (e) { return []; } }
  function salva(r) { try { localStorage.setItem(CHIAVE, JSON.stringify(r)); } catch (e) {} }
  var righe = leggi().filter(function (r) { return CAT.some(function (p) { return p.id === r.id; }); });
  var borsa = $('#borsa'), ultimoFocus = null;

  function conta() { return righe.reduce(function (s, r) { return s + r.q; }, 0); }
  function disegna() {
    var n = conta(), num = $('.borsa-num'), btn = $('[data-apri-borsa]');
    num.textContent = n; num.hidden = !n;
    btn.setAttribute('aria-label', 'Borsa, ' + n + (n === 1 ? ' articolo' : ' articoli'));
    var box = $('#borsa-righe'), fondo = $('#borsa-fondo');
    if (!righe.length) {
      box.innerHTML = '<p class="borsa-vuota">La borsa è vuota. Il Drop 001 ti aspetta.</p>';
      fondo.hidden = true; return;
    }
    var tot = 0;
    box.innerHTML = righe.map(function (r, k) {
      var p = CAT.filter(function (x) { return x.id === r.id; })[0];
      tot += p.prezzo * r.q;
      return '<div class="riga"><a href="' + p.id + '.html"><img src="' + p.src + '" alt="" width="88" height="110"></a>' +
        '<div><h3>' + p.nome + '</h3><p>' + p.colore + '</p><p>Taglia ' + r.t + ' · ' + euro(p.prezzo) + '</p>' +
        '<div class="riga-azioni"><button type="button" data-meno="' + k + '" aria-label="Togli uno">−</button><span aria-live="polite">' + r.q + '</span>' +
        '<button type="button" data-piu="' + k + '" aria-label="Aggiungi uno">+</button><button type="button" class="togli" data-togli="' + k + '">Rimuovi</button></div></div></div>';
    }).join('');
    fondo.hidden = false;
    // spedizione: 5,90 €, gratuita sopra la soglia (valori di esempio)
    var SOGLIA = 150, SPED = 5.9, manca = SOGLIA - tot, gratis = manca <= 0;
    var barra = '<div class="soglia"><p>' + (gratis ? '<strong>Spedizione gratuita.</strong>' : 'Ti mancano <strong>' + euro(manca) + '</strong> per la spedizione gratuita.') + '</p>' +
      '<div class="soglia-barra"><i style="width:' + Math.min(100, Math.round(tot / SOGLIA * 100)) + '%"></i></div></div>';
    // sconto benvenuto 10% (iscrizione): sul subtotale, la soglia di spedizione resta sul subtotale pieno
    var sconto = haSconto() ? Math.round(tot * 10) / 100 : 0;
    fondo.innerHTML = barra +
      '<div class="riepilogo"><span>Subtotale</span><span>' + euro(tot) + '</span></div>' +
      (sconto ? '<div class="riepilogo sconto"><span>Sconto benvenuto MARO10</span><span>−' + euro(sconto) + '</span></div>' : '') +
      '<div class="riepilogo"><span>Spedizione</span><span>' + (gratis ? 'Gratuita' : euro(SPED)) + '</span></div>' +
      '<div class="totale"><span>Totale</span><span>' + euro(tot - sconto + (gratis ? 0 : SPED)) + '</span></div>' +
      '<button type="button" class="btn btn-nero btn-largo" data-paga>Vai al pagamento</button><p class="piccolo esito-paga" role="status"></p>';
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
      else if (t.hasAttribute('data-paga')) { $('.esito-paga', borsa).textContent = 'Anteprima: il pagamento arriverà con il negozio vero.'; return; }
      else return;
      salva(righe); disegna();
      if (!righe.length) $('.borsa-testa button', borsa).focus();
    });
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) { es.className = 'avvisami-esito errore'; es.textContent = 'Controlla l’indirizzo email.'; inp.focus(); return; }
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
    var puo = !mem.get('maro-iscritto') && Date.now() - no > GIORNI7;
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
    if (puo) {
      setTimeout(mostra, 8000);
      var suScroll = function () {
        if (window.scrollY > (document.documentElement.scrollHeight - innerHeight) / 3) { window.removeEventListener('scroll', suScroll); setTimeout(mostra, 600); }
      };
      window.addEventListener('scroll', suScroll, { passive: true });
    }
    $$('[data-popup-no]', pop).forEach(function (b) { b.addEventListener('click', function () { chiudiPop(true); }); });
    $('[data-popup-ok]', pop).addEventListener('click', function () { chiudiPop(false); });
    $('.popup-form', pop).addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input', this), er = $('.popup-errore', pop);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) { er.textContent = 'Controlla l’indirizzo email.'; inp.focus(); return; }
      er.textContent = '';
      attivaSconto();
      $('[data-passo="1"]', pop).hidden = true; $('[data-passo="2"]', pop).hidden = false;
      $('[data-popup-ok]', pop).focus();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) chiudiPop(true); });
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

  /* ---------- iscrizione (anteprima: nessun invio) ---------- */
  var form = $('.iscriviti-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input', form), esito = $('.esito', form), v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        esito.className = 'esito errore'; esito.textContent = 'Controlla l’indirizzo email.'; input.focus(); return;
      }
      esito.className = 'esito'; esito.textContent = 'Sei dentro: ti scriviamo prima del prossimo drop, e il 10% sul primo ordine è già nella tua borsa. (Anteprima: nessuna email inviata.)';
      attivaSconto();
      input.value = '';
    });
  }
})();
