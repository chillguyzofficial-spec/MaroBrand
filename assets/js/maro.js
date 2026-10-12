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
    $$('.drop .scheda').forEach(function (s) { s.hidden = f !== 'tutto' && s.getAttribute('data-tipo') !== f; });
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
    fondo.innerHTML = '<div class="totale"><span>Totale</span><span>' + euro(tot) + '</span></div>' +
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
    });
    v.addEventListener('pointercancel', function () { x0 = null; });
    v.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') vai(i + 1); if (e.key === 'ArrowLeft') vai(i - 1); });
  });

  /* ---------- scheda prodotto: aggiungi alla borsa ---------- */
  var prod = $('.prodotto');
  if (prod) {
    var fs = $('.taglie', prod), err = $('.taglie-errore', prod);
    $$('input[name="taglia"]', prod).forEach(function (r) { r.addEventListener('change', function () { fs.classList.remove('manca'); err.hidden = true; }); });
    $('[data-aggiungi]', prod).addEventListener('click', function () {
      var scelta = $('input[name="taglia"]:checked', prod);
      if (!scelta) { fs.classList.add('manca'); err.hidden = false; $('input[name="taglia"]', prod).focus(); return; }
      var id = prod.getAttribute('data-id'), t = scelta.value;
      var r = righe.filter(function (x) { return x.id === id && x.t === t; })[0];
      if (r) r.q = Math.min(9, r.q + 1); else righe.push({ id: id, t: t, q: 1 });
      salva(righe); disegna(); apri();
    });
  }

  /* ---------- lookbook a scorrimento (frecce + dito) ---------- */
  var lbV = $('.lb-vetrina');
  if (lbV) {
    var lbB = $('.lb-binario', lbV), lbF = $$('figure', lbB), lbI = 0, lbConta = $('.lb-conta'), lbFrecce = $$('[data-lb]');
    var perVista = function () { return Math.max(1, Math.round(lbV.clientWidth / lbF[0].getBoundingClientRect().width)); };
    var lbVai = function (k) {
      var max = Math.max(0, lbF.length - perVista());
      lbI = Math.min(max, Math.max(0, k));
      lbB.style.transform = 'translateX(' + (lbF[0].offsetLeft - lbF[lbI].offsetLeft) + 'px)';
      if (lbConta) lbConta.textContent = (lbI + 1) + '–' + (lbI + perVista()) + ' / ' + lbF.length;
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
      esito.className = 'esito'; esito.textContent = 'Sei dentro: ti scriviamo prima del prossimo drop. (Anteprima: nessuna email inviata.)';
      input.value = '';
    });
  }
})();
