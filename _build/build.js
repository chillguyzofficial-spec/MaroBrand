// Genera index.html + una pagina per capo.  Uso: node _build/build.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CATALOGO = require('./catalogo');
const MISURE = require('./foto-misure.json');
const V = '78'; // versione di css/js: aumentarla a ogni modifica pubblicata

// controllo: ogni foto in un solo punto del sito (le foto dei capi appartengono al loro capo)
const usate = new Map();
const usa = (id, dove) => {
  if (!MISURE[id]) throw new Error('Foto mancante: ' + id);
  if (usate.has(id) && usate.get(id) !== dove) throw new Error(`Foto "${id}" usata in "${usate.get(id)}" e in "${dove}"`);
  usate.set(id, dove);
};

// impronta del file nel link: quando una foto cambia, il browser la riscarica (niente copie vecchie in cache)
const impronta = file => require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 8);
const urlFoto = id => 'assets/foto/' + id + '.webp?v=' + impronta('assets/foto/' + id + '.webp');
const urlPiccola = id => { const f = 'assets/foto/' + id + '-640.webp'; return fs.existsSync(path.join(ROOT, f)) ? f + '?v=' + impronta(f) : null; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const euro = n => n.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' €';

// ripeti: foto già usata altrove e mostrata di nuovo apposta (es. il manichino che compare al passaggio del mouse sulla scheda)
function img(id, alt, { cls = '', lazy = true, dove, sizes = '100vw', ripeti = false } = {}) {
  if (ripeti) { if (!MISURE[id]) throw new Error('Foto mancante: ' + id); } else usa(id, dove);
  const [w, h] = MISURE[id];
  const pic = urlPiccola(id);
  const srcset = pic ? ` srcset="${pic} 640w, ${urlFoto(id)} ${w}w"` : '';
  return `<img src="${urlFoto(id)}"${srcset} width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : (dove === 'home lookbook' ? ' decoding="async"' : ' fetchpriority="high"')} sizes="${sizes}">`;
}

// ---------- barra in alto: messaggi che scorrono in loop (come Nike); due copie identiche per il giro senza stacco ----------
const AVVISI = [
  ['Drop 002 il 14 novembre · accesso anticipato', 'index.html#iscriviti'],
  ['Spedizione gratuita sopra i 150 €', 'aiuto.html#spedizioni'],
  ['Reso entro 14 giorni, per qualsiasi motivo', 'aiuto.html#resi'],
  ['-10% sul primo ordine con l’iscrizione', 'index.html#iscriviti'],
  ['Carta regalo da 50 €, via email', 'carta-regalo.html'],
];
// Dietro il segno (home): le due scene che si alternano "cucite". Dal 19/10 notte UNA sola (la scena col telaio nero aveva
// le mani tatuate, Omar non vuole tatuaggi) → con una foto nuova al posto di segno-scena-1 rimettere true
const SEGNO_DUE_SCENE = true; // 19/10 notte: arrivata la scena col telaio nero senza tatuaggi
// 19/10 notte (Francesco): niente cucitura automatica, la riga al centro la sposta chi guarda (trascina o clicca) → false = di nuovo automatica
const SEGNO_A_MANO = true;
// IN PAUSA dal 19/10 notte: a Omar piace la barra ma non le scritte, le cambierà più avanti → per riaccenderla: true
const AVVISI_ACCESI = false;
// SOLO ramo motore-collegato (21/10): versione di prova pubblicata a parte. Fascia gialla su ogni pagina: chi la apre
// deve sapere che non paga davvero e quale carta usare. Prima del negozio vero: false (e togliere la riga in borsa in maro.js)
const NEGOZIO_PROVA = true;
const fasciaProva = () => NEGOZIO_PROVA ? `<div class="prova-fascia" role="note"><strong>Negozio di prova</strong><span> · nessun pagamento vero</span> · carta 4242 4242 4242 4242<span class="prova-dettaglio">, una data futura e un CVC qualsiasi</span></div>` : '';
function avviso() {
  if (!AVVISI_ACCESI) return '';
  const giro = nascosta => [0, 1].map(() => AVVISI.map(([t, h]) => `<a href="${h}"${nascosta ? ' tabindex="-1"' : ''}>${esc(t)}</a><svg class="avviso-segno" viewBox="${LOGO_VB}" aria-hidden="true"><use href="#maro-simbolo"/></svg>`).join('')).join('');
  return `<div class="avviso" aria-label="Avvisi"><div class="avviso-nastro"><div class="avviso-giro">${giro(false)}</div><div class="avviso-giro" aria-hidden="true">${giro(true)}</div></div></div>`;
}

// ---------- fasce grandi a scorrimento in mezzo alle pagine (decorative: nascoste agli screen reader) ----------
// voci: [testo, contorno?]; ogni giro si ripete finché supera i 2600 px, due giri identici per il loop senza stacco
function fascia(voci, cls, volte) {
  const giro = Array.from({ length: volte }, () => voci.map(([t, vuota]) => `<span class="fascia-voce${vuota ? ' fascia-vuota' : ''}">${esc(t)}</span><svg class="fascia-segno" viewBox="${LOGO_VB}"><use href="#maro-simbolo"/></svg>`).join('')).join('');
  return `<div class="fascia ${cls}" aria-hidden="true"><div class="fascia-nastro"><div class="fascia-giro">${giro}</div><div class="fascia-giro">${giro}</div></div></div>`;
}

// logo di Omar (19/10), dentro ogni pagina (un SVG esterno con <use> non si vede aprendo i file da disco)
const LOGO_FILE = fs.readFileSync(path.join(ROOT, 'assets/img/logo-maro.svg'), 'utf8');
const LOGO_SIMBOLO = LOGO_FILE.match(/<symbol[\s\S]*?<\/symbol>/)[0].replace('id="logo"', 'id="logo-maro"');
const LOGO_VB = LOGO_FILE.match(/viewBox="([^"]+)"/)[1];
// logo di Omar (19/10 sera): M con le ali e i riccioli (design-source/logo-omar-m-alata-2026-10-19); il vecchio (ali + MARO verticale) è tolto ovunque
const SIMBOLO = `<svg class="simbolo" viewBox="${LOGO_VB}" aria-hidden="true"><use href="#maro-simbolo"/></svg>`;
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${LOGO_SIMBOLO}
${LOGO_SIMBOLO.replace('id="logo-maro"', 'id="maro-simbolo"')}
<symbol id="maro-firma" viewBox="0 0 200 560"><g fill="currentColor"><path d="M96 8C110 20 150 22 150 54C140 34 108 32 96 8Z"/><path d="M52 58Q6 100 52 142Q28 100 52 58Z"/><path d="M148 178Q194 220 148 262Q172 220 148 178Z"/><path d="M52 298Q6 340 52 382Q28 340 52 298Z"/><path d="M148 418Q194 460 148 502Q172 460 148 418Z"/><path d="M104 552C90 540 50 538 50 506C60 526 92 528 104 552Z"/><text x="100" y="146" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">M</text><text x="100" y="266" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">A</text><text x="100" y="386" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">R</text><text x="100" y="506" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">O</text></g></symbol>
<symbol id="i-cuore" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="var(--riempi, none)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="i-condividi" viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-utente" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-borsa" viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6L5 8zm4 0V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
<symbol id="i-chiudi" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8"/></symbol>
</defs></svg>`;

// popup del 10%: solo quando si entra nell'abbigliamento (pagine categoria e schede), richiesta di Omar alla call del 18/10
const conPopup = f => CATEGORIE.some(c => c.file === f) || CATALOGO.some(p => p.id + '.html' === f);

function pagina({ titolo, descrizione, corpo, file }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descrizione)}">
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MARO">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descrizione)}">
<meta property="og:image" content="https://chillguyzofficial-spec.github.io/MaroBrand/assets/img/condivisione.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="apple-touch-icon" href="assets/img/icona-180.png">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/css/maro.css?v=${V}">
<script defer src="assets/js/maro.js?v=${V}"></script>
<script>/* 21/10: prima che la pagina si disegni, chi è collegato (niente lampo del modulo d'accesso né dell'icona vuota) */(function(){try{var t=localStorage.getItem('maro-token'),c=JSON.parse(localStorage.getItem('maro-chi')||'null'),h=document.documentElement;if(!t)return;h.classList.add('ha-token');var n=c&&String(c.nome||String(c.email||'').split('@')[0]||'').trim().split(/\s+/)[0].slice(0,14);if(n){h.classList.add('collegato');window.MARO_NOME=n;}}catch(e){}})();</script>
</head>
<body${file === 'index.html' ? ' class="home"' : ''}${conPopup(file) ? ' data-popup' : ''}>
${SPRITE}
<a class="salta" href="#contenuto">Vai al contenuto</a>
${fasciaProva()}
${avviso()}
<header class="testata">
  <a class="logo" href="index.html" aria-label="MARO, home"><svg class="logo-maro" viewBox="${LOGO_VB}" aria-hidden="true"><use href="#logo-maro"/></svg></a>
  <nav class="menu" id="menu" aria-label="Menu principale">
    <div class="menu-sx"><a href="polo.html">Polo</a><a href="felpe.html">Felpe</a><a href="pantaloni.html">Pantaloni</a></div>
    <div class="menu-dx"><a href="accessori.html">Accessori</a><a href="storia.html">Il brand</a><a href="carta-regalo.html">Carta regalo</a><a class="solo-tel" href="account.html">Il mio account</a></div>
  </nav>
  <div class="azioni">
    <a class="acc-apri" href="account.html" aria-label="Il mio account"><svg viewBox="0 0 24 24"><use href="#i-utente"/></svg></a><script>(function(n,a){if(!n||!a)return;a.innerHTML='<span class="acc-iniziale" aria-hidden="true"></span><span class="acc-ciao" aria-hidden="true"></span>';a.firstChild.textContent=n.charAt(0).toUpperCase();a.lastChild.textContent='Ciao, '+n;a.setAttribute('aria-label','Il mio account, collegato come '+n);})(window.MARO_NOME,document.querySelector('.acc-apri'));</script>
    <a class="pref-apri" href="preferiti.html" aria-label="Preferiti"><svg viewBox="0 0 24 24"><use href="#i-cuore"/></svg><span class="pref-num" hidden>0</span></a>
    <button class="borsa-apri" type="button" aria-label="Borsa, 0 articoli" data-apri-borsa><svg viewBox="0 0 24 24"><use href="#i-borsa"/></svg><span class="borsa-num" hidden>0</span></button>
    <button class="menu-apri" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
</header>
<main id="contenuto">
${corpo}
</main>
<footer class="piede">
  <div class="piede-alto">
    <div class="piede-marchio">
      <p>Streetwear da Milano.<br>Fly with your mind.</p>
    </div>
    <nav aria-label="Shop"><h2>Shop</h2><a href="shop.html">Tutti i capi</a><a href="polo.html">Polo</a><a href="felpe.html">Felpe</a><a href="pantaloni.html">Pantaloni</a><a href="accessori.html">Accessori</a></nav>
    <nav aria-label="MARO"><h2>MARO</h2><a href="storia.html">Il brand</a><a href="carta-regalo.html">Carta regalo</a><a href="account.html">Il mio account</a><a href="porta-un-amico.html">Porta un amico</a><a href="index.html#iscriviti">Accesso anticipato</a></nav>
    <nav aria-label="Aiuto"><h2>Aiuto</h2><a href="aiuto.html#spedizioni">Spedizioni</a><a href="aiuto.html#resi">Resi</a><a href="aiuto.html#taglie">Guida alle taglie</a><a href="aiuto.html#contatti">Contatti</a></nav>
    <div><h2>Social</h2><p>Instagram e TikTok in arrivo</p></div>
  </div>
  <div class="piede-basso">
    <span>© 2026 MARO · Milano</span>
    <span class="nota">Anteprima di presentazione: prezzi, materiali e testi sono di esempio.</span>
    <span class="piede-paese">Italia · EUR €</span>
    <a class="piede-su" href="#contenuto">Torna su ↑</a>
  </div>
</footer>
<div class="popup" id="popup" role="dialog" aria-labelledby="popup-titolo" hidden>
  <button class="popup-chiudi" type="button" aria-label="Chiudi" data-popup-no><svg viewBox="0 0 24 24"><use href="#i-chiudi"/></svg></button>
  <div class="popup-passo" data-passo="1">
    <p class="popup-occhiello">Prima volta qui?</p>
    <h2 id="popup-titolo">10% sul tuo<br>primo ordine</h2>
    <p>Lasciaci la tua email: un codice tutto tuo con il 10% sul primo ordine, e i prossimi drop il giorno prima di tutti.</p>
    <form class="popup-form" novalidate>
      <label for="email-popup" class="sr">La tua email</label>
      <input id="email-popup" type="email" autocomplete="email" placeholder="La tua email" required>
      <button class="btn btn-nero" type="submit">Voglio lo sconto</button>
      <p class="popup-errore" role="alert"></p>
    </form>
    <button class="popup-no" type="button" data-popup-no>No grazie</button>
  </div>
  <div class="popup-passo" data-passo="2" hidden>
    <p class="popup-occhiello">Sei dentro</p>
    <h2>Il tuo codice: <span class="popup-codice" data-mio-codice>MARO-····</span></h2>
    <p>È già attivo nella tua borsa e vale una volta sola: non devi copiare niente. Te lo mandiamo via email e lo trovi sempre nel tuo <a class="link" href="account.html">account</a>.</p>
    <button class="btn btn-nero" type="button" data-popup-ok>Continua a guardare</button>
  </div>
</div>
<div class="zoom" id="zoom" role="dialog" aria-modal="true" aria-label="Foto ingrandita" hidden>
  <button class="zoom-chiudi" type="button" aria-label="Chiudi la foto"><svg viewBox="0 0 24 24"><use href="#i-chiudi"/></svg></button>
  <div class="zoom-area"></div>
  <p class="zoom-aiuto">Tocca la foto per ingrandire</p>
</div>
<div class="borsa" id="borsa" role="dialog" aria-modal="true" aria-labelledby="borsa-titolo" hidden>
  <div class="borsa-velo" data-chiudi-borsa></div>
  <div class="borsa-pannello">
    <div class="borsa-testa"><h2 id="borsa-titolo">Borsa</h2><button type="button" data-chiudi-borsa aria-label="Chiudi la borsa"><svg viewBox="0 0 24 24"><use href="#i-chiudi"/></svg></button></div>
    <div class="borsa-righe" id="borsa-righe"></div>
    <div class="borsa-fondo" id="borsa-fondo"></div>
  </div>
</div>
<script>window.MARO_CATALOGO=${JSON.stringify(CATALOGO.map(p => ({ id: p.id, tipo: p.tipo, nome: p.nome, colore: p.colore, prezzo: p.prezzo, foto: p.copertina[0], src: urlPiccola(p.copertina[0]) || urlFoto(p.copertina[0]), colorePallino: p.pallini[0] })))};</script>
</body>
</html>
`;
}

function scheda(p, dove) {
  const [fid, alt] = p.copertina;
  // seconda foto al passaggio del mouse: la foto sportiva della campagna (p.seconda) oppure il capo da solo (manichino o prodotto)
  const seconda = p.seconda || (p.foto || []).map(f => f[0]).find(id => id !== fid && MISURE[id]);
  const rapido = `<div class="rapido">
  <button class="rapido-apri" type="button" aria-expanded="false" aria-label="Aggiunta rapida: ${esc(p.nome)}">+</button>
  <div class="rapido-taglie" role="group" aria-label="Scegli la taglia di ${esc(p.nome)}" hidden>
${p.taglie.map(t => { const fin = (p.esaurite || []).includes(t); return `    <button type="button" data-rapido="${p.id}|${t}"${fin ? ' disabled aria-label="' + t + ', esaurita"' : ''}>${t}</button>`; }).join('\n')}
  </div>
</div>`;
  const cuore = `<button class="cuore" type="button" data-cuore="${p.id}" aria-pressed="false" aria-label="Aggiungi ${esc(p.nome)} ai preferiti"><svg viewBox="0 0 24 24"><use href="#i-cuore"/></svg></button>`;
  return `<div class="scheda-cella" data-tipo="${p.tipo}">${cuore}<a class="scheda" href="${p.id}.html" data-tipo="${p.tipo}">
  <div class="scheda-foto">${img(fid, alt, { dove, sizes: '(min-width: 960px) 32vw, 50vw' })}${seconda ? img(seconda, '', { ripeti: true, cls: 'scheda-foto-2', sizes: '(min-width: 960px) 32vw, 50vw' }) : ''}</div>${seconda ? '<span class="scheda-punti" aria-hidden="true"><i class="acceso"></i><i></i></span>' : ''}
  <div class="scheda-testo">
    <span class="scheda-etichetta">Drop 001</span>
    <span class="pallini">${p.pallini.map(c => `<i style="background:${c}"></i>`).join('')}</span>
    <h3>${esc(p.nome)}</h3>
    <p>${esc(p.colore)}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
  </div>
</a>${rapido}</div>`;
}

// ---------- IL LOOK COMPLETO (home): compare solo quando ci sono le due foto in assets/foto ----------
const LOOK = [
  { foto: 'look-polo-linee', alt: 'Ragazzo a figura intera con la Polo Linee MARO nera, jeans larghi chiari e sneakers bianche, in una strada di Milano', capo: 'polo-linee', con: 'felpa-verticale', nota: 'Con jeans larghi chiari e sneakers bianche.' },
  { foto: 'look-felpa-firma', alt: 'Ragazza di tre quarti di spalle con la Felpa Firma MARO blu notte, cargo neri e sneakers scure, a una fermata del tram a Milano', capo: 'felpa-firma', con: 'polo-jacquard', nota: 'Con cargo neri e sneakers scure.' },
];
function lookCompleto() {
  // LOOK_PROVA=1 node _build/build.js → anteprima con due foto esistenti, solo per controllare l'impaginazione (mai da pubblicare)
  const prova = process.env.LOOK_PROVA === '1', foto = (l, k) => prova ? ['campagna-due-ragazzi', 'segno-ali'].at(k) : l.foto;
  const mancano = prova ? [] : LOOK.filter(l => !MISURE[l.foto]);
  if (mancano.length) { console.log('Il look completo: nascosto, mancano le foto ' + mancano.map(l => l.foto).join(', ')); return ''; }
  const cap = id => CATALOGO.find(p => p.id === id);
  return `<section class="look" aria-labelledby="look-titolo">
  <div class="look-testa"><h2 id="look-titolo" class="titolo">Il look completo</h2><p>Due modi di portare il Drop 001, con i capi che trovi qui.</p></div>
  <div class="look-griglia">
${LOOK.map((l, k) => { const p = cap(l.capo), c = cap(l.con); return `    <article class="look-carta">
      <figure>${img(foto(l, k), l.alt, { dove: 'home look ' + (k + 1), sizes: '(min-width: 960px) 45vw, 100vw' })}</figure>
      <p class="look-num">Look 0${k + 1}</p>
      <h3><a href="${p.id}.html">${esc(p.nome)}</a> <span>${euro(p.prezzo)}</span></h3>
      <p class="look-nota">${esc(l.nota)}</p>
      <a class="btn btn-nero" href="${p.id}.html">Scegli la taglia</a>
      <p class="look-con">Completa con <a class="link" href="${c.id}.html">${esc(c.nome)}</a> · ${euro(c.prezzo)}</p>
    </article>`; }).join('\n')}
  </div>
</section>`;
}

// Pagine delle categorie stile Nike (dal 19/10): una pagina per categoria, staccata dal Drop 001.
// Titolo con il numero di capi, colonna dei filtri (categorie, Taglia, Colore, Prezzo), Nascondi filtri, Ordina per.
const CATEGORIE = [
  { file: 'shop.html', nome: 'Tutti i capi', tipo: null, descrizione: 'Tutti i capi MARO: polo e felpe ricamate e stampate.' },
  { file: 'polo.html', nome: 'Polo', tipo: 'polo', descrizione: 'Le polo MARO: piqué di cotone, firme ricamate e grafiche sul retro.' },
  { file: 'felpe.html', nome: 'Felpe', tipo: 'felpa', descrizione: 'Le felpe MARO: cotone garzato, grafiche grandi sulla schiena.' },
  { file: 'pantaloni.html', nome: 'Pantaloni', tipo: 'pantaloni', descrizione: 'I pantaloni MARO sono in arrivo.' },
  { file: 'accessori.html', nome: 'Accessori', tipo: 'accessori', descrizione: 'Gli accessori MARO sono in arrivo.' },
];
const TAGLIE_ORDINE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unica'];
const coloreBase = p => p.colore.split(/[ ,]/)[0];
const FASCE_PREZZO = [
  { id: 'sotto-100', nome: 'Sotto i 100 €', da: 0, a: 99.99 },
  { id: '100-150', nome: '100–150 €', da: 100, a: 150 },
];
const freccia = '<svg class="filtro-freccia" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

function categoriaPagina(cat) {
  const capi = CATALOGO.filter(p => !cat.tipo || p.tipo === cat.tipo);
  const taglie = TAGLIE_ORDINE.filter(t => capi.some(p => p.taglie.includes(t)));
  const colori = [...new Map(capi.map(p => [coloreBase(p), p.pallini[0]]))]; // [nome, pallino]
  const fasce = FASCE_PREZZO.filter(f => capi.some(p => p.prezzo >= f.da && p.prezzo <= f.a));
  const menuCat = CATEGORIE.map(c => `<a href="${c.file}"${c.file === cat.file ? ' aria-current="page"' : ''}>${c.nome}</a>`).join('');
  const vuota = !capi.length;
  const corpo = `
<section class="catalogo${vuota ? ' catalogo-vuoto' : ''}" data-catalogo aria-labelledby="cat-titolo">
  <div class="cat-testa">
    <h1 id="cat-titolo">${cat.nome}${vuota ? '' : ` <span data-cat-conta>(${capi.length})</span>`}</h1>
${vuota ? '' : `    <div class="cat-comandi">
      <button type="button" class="cat-btn" data-filtri-mostra aria-expanded="true" aria-controls="cat-filtri"><span data-filtri-scritta>Nascondi filtri</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
      <label class="cat-ordina">Ordina per <select data-ordina><option value="evidenza">In evidenza</option><option value="prezzo-su">Prezzo: dal più basso</option><option value="prezzo-giu">Prezzo: dal più alto</option></select></label>
    </div>`}
  </div>
  <div class="cat-corpo">
    <aside class="cat-filtri" id="cat-filtri" aria-label="Filtri">
${vuota ? '' : `      <div class="cat-foglio-testa"><h2>Filtri</h2><button type="button" data-filtri-chiudi aria-label="Chiudi i filtri"><svg viewBox="0 0 24 24"><use href="#i-chiudi"/></svg></button></div>`}
      <nav class="cat-lista" aria-label="Categorie">${menuCat}</nav>
${vuota ? '' : `      <details class="filtro" open><summary>Taglia${freccia}</summary>
        <div class="filtro-taglie">${taglie.map(t => `<button type="button" data-f-taglia="${t}" aria-pressed="false">${t}</button>`).join('')}</div>
        <p class="filtro-nota">Mostra solo i capi con la taglia disponibile.</p>
      </details>
      <details class="filtro"><summary>Colore${freccia}</summary>
        <div class="filtro-colori">${colori.map(([c, hex]) => `<label class="filtro-colore"><input type="checkbox" data-f-colore="${c}"><i style="background:${hex}"></i><span>${c}</span></label>`).join('')}</div>
      </details>
      <details class="filtro"><summary>Prezzo${freccia}</summary>
        ${fasce.map(f => `<label class="filtro-voce"><input type="checkbox" data-f-prezzo="${f.da}-${f.a}" data-f-nome="${f.nome}"> ${f.nome}</label>`).join('\n        ')}
      </details>
      <div class="cat-foglio-fondo"><button type="button" class="btn btn-contorno-nero" data-filtri-azzera>Cancella tutto</button><button type="button" class="btn btn-nero" data-filtri-chiudi data-filtri-mostra-n>Mostra ${capi.length} capi</button></div>`}
    </aside>
${vuota ? '' : `    <div class="cat-velo" data-filtri-chiudi hidden></div>`}
    <div class="cat-risultati">
${vuota ? `      <div class="cat-arrivo">
        <p class="cat-arrivo-titolo">In arrivo</p>
        <p>${cat.nome} MARO non sono ancora in vendita. Iscriviti: lo sai per primo quando escono, e hai il 10% sul primo ordine.</p>
        <a class="btn btn-nero" href="index.html#iscriviti">Avvisami</a>
      </div>` : `      <div class="cat-scelti" data-cat-scelti hidden aria-live="polite"></div>
      <div class="griglia">
${capi.map((p, i) => scheda(p, 'scheda ' + p.id).replace('<div class="scheda-cella"', `<div class="scheda-cella" data-ordine="${i}" data-prezzo="${p.prezzo}" data-colore="${esc(coloreBase(p))}" data-taglie="${p.taglie.filter(t => !(p.esaurite || []).includes(t)).join(' ')}"`)).join('\n')}
      </div>
      <div class="cat-nessuno" data-cat-nessuno hidden><p>Nessun capo con questi filtri.</p><button type="button" class="btn btn-nero" data-filtri-azzera>Azzera i filtri</button></div>`}
    </div>
  </div>
</section>`;
  return pagina({ titolo: `${cat.nome} — MARO`, descrizione: cat.descrizione, corpo, file: cat.file });
}

// sezione provvisoria al posto del look, finché non arrivano le sue foto (14/10)
function tiratura() {
  const TIR = [
    { foto: 'tir-jacquard', capo: 'polo-jacquard', dove: 'Firenze', alt: 'Polo Jacquard MARO grigio perla appesa a un balcone di Firenze, con il Duomo sullo sfondo' },
    { foto: 'tir-tricolore', capo: 'polo-tricolore', dove: 'Duomo di Milano', alt: 'Polo Tricolore MARO vista dal retro, con le ali rosse e verdi, appesa sulle terrazze del Duomo di Milano' },
    { foto: 'tir-verticale', capo: 'felpa-verticale', dove: 'Piazza del Duomo, Milano', alt: 'Felpa Verticale MARO verde vista dal retro, con la firma verticale, appesa su una terrazza davanti al Duomo di Milano' },
  ];
  const cap = id => CATALOGO.find(p => p.id === id);
  return `<section class="campagna tiratura" aria-labelledby="campagna-titolo">
  ${fascia([['Tiratura limitata'], ['New', true], ['Drop 001'], ['Pochi pezzi', true]], 'fascia-chiara fascia-tir', 3)}
  <h2 id="campagna-titolo" class="sr">Tiratura limitata: tre capi del Drop 001</h2>
  <div class="tir-giostra" data-giostra>
    <ul class="tir-binario">
${TIR.map((t, k) => { const p = cap(t.capo); return `      <li${k === 0 ? ' class="attiva"' : ''}><a class="tir-carta" href="${p.id}.html">
        <figure>${img(t.foto, t.alt, { dove: 'home tiratura ' + (k + 1), sizes: '(min-width: 960px) 440px, 80vw' })}</figure>
        <div class="tir-info">
          <p class="tir-dove">${esc(t.dove)}</p>
          <h3>${esc(p.nome)} <span>${euro(p.prezzo)}</span></h3>
          <p class="tir-frase">${esc(p.frase)}</p>
          <ul class="tir-dettagli">${p.dettagli.slice(0, 2).map(d => '<li>' + esc(d) + '</li>').join('')}</ul>
          <p class="tir-taglie" aria-label="Taglie: ${p.taglie.map(x => (p.esaurite || []).includes(x) ? x + ' esaurita' : x).join(', ')}">${p.taglie.map(x => (p.esaurite || []).includes(x) ? '<s>' + x + '</s>' : '<span>' + x + '</span>').join('')}</p>
        </div>
      </a></li>`; }).join('\n')}
    </ul>
    <div class="tir-comandi"><button type="button" data-giostra-vai="-1" aria-label="Capo precedente">‹</button><span class="tir-conta" aria-live="polite">1 / ${TIR.length}</span><button type="button" data-giostra-vai="1" aria-label="Capo successivo">›</button></div>
  </div>
  <p class="tir-sotto">Pochi pezzi per taglia: quando una finisce, nella scheda trovi «Avvisami».</p>
</section>`;
}

// ---------- HOME ----------
function home() {
  const lb = [
    ['lb-galleria', 'Ragazzo con felpa blu MARO di spalle nella Galleria Vittorio Emanuele, sullo sfondo il Duomo'],
    ['lb-citylife-tramonto', 'Felpa verde MARO di spalle davanti ai grattacieli di CityLife al tramonto'],
    ['lb-duomo-coppia', 'Due ragazzi con felpe blu MARO di spalle verso il Duomo di Milano'],
    ['lb-citylife-strada', 'Ragazzo con felpa verde MARO cammina in una strada di CityLife'],
    ['lb-galleria-sera', 'Due ragazzi con felpe MARO verde e blu nella Galleria illuminata la sera'],
    ['lb-panchina', 'Ragazza con felpa verde MARO seduta su una panchina davanti ai grattacieli'],
    ['lb-muro-duomo', 'Felpa blu MARO di spalle contro un muro antico vicino al Duomo'],
    ['lb-pista', 'Ragazza con felpa verde MARO cammina sulla pista ciclabile al tramonto'],
  ];
  const corpo = `
<section class="apertura" aria-label="Apertura">
  <video class="apertura-video" muted playsinline autoplay loop preload="auto" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" poster="${urlFoto('apertura-locandina')}" aria-hidden="true" tabindex="-1">
    <source src="assets/video/home-metro-1.mp4" type="video/mp4">
  </video>
  <video class="apertura-video" data-copia muted playsinline preload="none" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" aria-hidden="true" tabindex="-1">
    <source src="assets/video/home-metro-1.mp4" type="video/mp4">
  </video>
  <div class="apertura-testo">
    <h1>Fly with<br>your mind</h1>
  </div>
</section>

<section class="intro" aria-labelledby="intro-titolo">
  <h2 id="intro-titolo">Il primo drop è fuori</h2>
  <p>Tre polo e tre felpe, ricamate e stampate per chi vive la città.</p>
  <div class="pulsanti">
    <a class="btn btn-nero" href="shop.html">Acquista il drop</a>
    <a class="btn btn-nero" href="storia.html">Il brand</a>
  </div>
</section>

<section class="categorie" aria-label="Categorie">
${[
    ['cat-polo', 'Polo', 'polo.html', 'Vedi le polo', 'Polo jacquard beige MARO appesa su una terrazza, dietro il Duomo di Milano'],
    ['cat-felpe', 'Felpe', 'felpe.html', 'Vedi le felpe', 'Felpa verde MARO con la scritta verticale sulla schiena, dietro il Duomo di Firenze'],
    ['cat-pantaloni', 'Pantaloni', 'pantaloni.html', 'Vedi i pantaloni', 'Pantaloni cargo beige MARO appesi su una terrazza, dietro il golfo di Napoli e il Vesuvio'],
    ['cat-accessori', 'Accessori', 'accessori.html', 'Vedi gli accessori', 'Cappellino nero MARO con le ali ricamate, dietro il Canal Grande di Venezia'],
  ].map(([id, nome, link, vai, alt]) => `  <a class="categoria" href="${link}">
    ${img(id, alt, { dove: 'home categorie', sizes: '(min-width: 600px) 50vw, 100vw' })}
    <span class="categoria-testo"><span class="categoria-nome">${nome}</span><span class="categoria-vai">${vai}</span></span>
  </a>`).join('\n')}
</section>


<section class="vantaggi" aria-label="Acquistare su MARO">
  <ul>
    <li><strong>Spedizione gratuita</strong><span>sopra i 150 €, in 2–4 giorni</span></li>
    <li><strong>Reso entro 14 giorni</strong><span>anche se hai solo cambiato idea</span></li>
    <li><strong>Pagamento sicuro</strong><span>carta, PayPal, Apple Pay</span></li>
    <li><strong>Guida alle taglie</strong><a href="aiuto.html#taglie">misure in centimetri, capo per capo</a></li>
  </ul>
</section>

<section class="segno${SEGNO_DUE_SCENE && SEGNO_A_MANO ? ' a-mano' : ''}" id="storia" aria-labelledby="storia-titolo" data-entra>
  <div class="segno-scena">
    ${SEGNO_DUE_SCENE ? `${img('segno-scena-1', 'Mani che ricamano a mano la firma verticale MARO su un telaio nero, in un laboratorio alla luce di una lampada', { dove: 'home brand', sizes: '100vw' })}
    <div class="segno-scena-2" aria-hidden="true">${img('segno-scena-2', '', { dove: 'home brand', sizes: '100vw' })}</div>
    ${SEGNO_A_MANO ? `<div class="segno-cucitura" role="slider" tabindex="0" aria-label="Confronta le due foto del ricamo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="metà e metà"><span class="segno-maniglia" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="segno-aiuto" aria-hidden="true">Trascina per scoprire</span></div>` : '<span class="segno-ago" aria-hidden="true"></span>'}`
    : img('segno-scena-2', 'Mani che ricamano a mano la firma verticale MARO sul petto della Polo Jacquard, su un telaio, in un laboratorio alla luce di una lampada', { dove: 'home brand', sizes: '100vw' })}
  </div>
  <div class="segno-testo">
    <h2 id="storia-titolo" class="segno-titolo"><span>Dietro</span><span class="segno-vuoto">il segno</span></h2>
    <p>La firma che si legge dall’alto in basso, le ali di Omar e gli sport da cui nasce ogni capo MARO.</p>
    <a class="btn btn-bianco" href="storia.html">Leggi la storia</a>
  </div>
</section>

<section class="lookbook" id="lookbook" aria-labelledby="lookbook-titolo">
  <div class="lookbook-testa">
    <div><h2 id="lookbook-titolo" class="titolo">Lookbook</h2><p>Il Drop 001 indossato in città, di giorno e di sera.</p></div>
    <div class="lb-comandi">
      <span class="lb-conta" aria-live="polite"></span>
      <button class="lb-freccia" type="button" data-lb="-1" aria-label="Foto precedenti">‹</button>
      <button class="lb-freccia" type="button" data-lb="1" aria-label="Foto successive">›</button>
    </div>
  </div>
  <div class="lb-vetrina" aria-label="Foto del lookbook">
    <div class="lb-binario">
${lb.map(([id, alt], i) => `      <figure aria-label="Foto ${i + 1} di ${lb.length}">${img(id, alt, { dove: 'home lookbook', sizes: '(min-width: 960px) 32vw, 100vw' })}</figure>`).join('\n')}
    </div>
  </div>
</section>

<section class="iscriviti" id="iscriviti" aria-labelledby="iscriviti-titolo">
  <div class="iscriviti-testo">
  <h2 id="iscriviti-titolo" class="titolo">Non perdere il prossimo drop</h2>
  <div class="conto" data-drop="2026-11-14T18:00:00+01:00" aria-label="Drop 002: sabato 14 novembre, ore 18">
    <p class="conto-titolo">Drop 002 · sabato 14 novembre, ore 18</p>
    <div class="conto-cifre" aria-hidden="true"><span><b data-u="g">--</b>giorni</span><span><b data-u="o">--</b>ore</span><span><b data-u="m">--</b>minuti</span><span><b data-u="s">--</b>secondi</span></div>
  </div>
  <p class="iscriviti-sotto">Ti scriviamo il giorno prima dell’uscita, con i capi in anteprima. Una email per drop, niente di più.</p>
  <ul class="iscriviti-vantaggi">
    <li><b>10% sul primo ordine.</b> Ti iscrivi e ricevi un codice tuo, già nella borsa: vale una volta, su tutti i capi.</li>
    <li><b>Porta un amico.</b> Dopo il primo acquisto hai un link personale: chi lo usa ha il 10% sul suo primo ordine, tu un buono da 10 € per il prossimo. <a class="link" href="porta-un-amico.html">Come funziona</a></li>
  </ul>
  <form class="iscriviti-form" novalidate>
    <label for="email" class="sr">La tua email</label>
    <input id="email" name="email" type="email" autocomplete="email" placeholder="La tua email" required>
    <button class="btn btn-nero" type="submit">Iscriviti</button>
    <p class="esito" role="status" aria-live="polite"></p>
  </form>
  </div>
  <figure class="iscriviti-foto">${img('scena-composizione', 'Felpa verde, polo nera, cappellino, berretto e borraccia MARO disposti dall’alto su marmo e pietra, con rami d’ulivo e moschettoni', { dove: 'home iscrizione', sizes: '(min-width: 960px) 45vw, 100vw' })}</figure>
</section>`;
  return pagina({ titolo: 'MARO — Fly with your mind · Drop 001', descrizione: 'MARO, streetwear da Milano. Drop 001: tre polo e tre felpe con il segno delle ali, ricamate e stampate. Spedizione gratuita sopra i 150 €.', corpo, file: 'index.html' });
}

// ---------- SCHEDA PRODOTTO ----------
// composizione obbligatoria per legge anche online (Reg. UE 1007/2011): valori DI ESEMPIO finché Omar non li conferma
const CURA = {
  polo: [['Composizione', '100% cotone, piqué da circa 220 g/m²'], ['Lavaggio', 'a 30 °C al rovescio, niente asciugatrice'], ['Stiro', 'a bassa temperatura, evitando il ricamo']],
  jacquard: [['Composizione', '100% cotone, maglia jacquard'], ['Lavaggio', 'a 30 °C al rovescio, niente asciugatrice'], ['Stiro', 'a bassa temperatura, evitando il ricamo']],
  pantaloni: [['Composizione', '100% cotone, tela'], ['Lavaggio', 'a 30 °C al rovescio'], ['Stiro', 'a media temperatura, mai sulla stampa']],
  cappellino: [['Materiali', 'davanti in cotone, retro in rete di poliestere'], ['Pulizia', 'a mano con acqua fredda, niente lavatrice']],
  berretto: [['Composizione', 'maglia a coste in acrilico'], ['Lavaggio', 'a mano o a 30 °C, asciugatura in piano']],
  borraccia: [['Materiale', 'acciaio inox, finitura opaca'], ['Pulizia', 'a mano, niente lavastoviglie']],
  felpa: [['Composizione', '80% cotone, 20% poliestere, garzato all’interno, circa 380 g/m²'], ['Lavaggio', 'a 30 °C al rovescio, niente asciugatrice'], ['Stiro', 'mai sulla stampa']],
};
function prodotto(p) {
  if (!p.frase || !CURA[p.cura] || !p.descrizione) throw new Error(p.id + ': mancano frase, cura o descrizione');
  const altri = CATALOGO.filter(x => x.id !== p.id && x.tipo !== p.tipo).slice(0, 2)
    .concat(CATALOGO.filter(x => x.id !== p.id && x.tipo === p.tipo).slice(0, 1));
  const acc = p.tipo === 'accessori';
  if (p.foto.length > 4) throw new Error(p.id + ': massimo 4 foto per scheda (stessa struttura per tutti)');
  const n = p.foto.length;
  // vetrina a scorrimento: una foto per volta, stesso riquadro 4:5 per tutti i prodotti
  const foto = p.foto.map(([id, alt], i) =>
    `        <figure aria-label="Foto ${i + 1} di ${n}"${i ? ' aria-hidden="true"' : ''}>${img(id, alt, { dove: 'scheda ' + p.id, lazy: false, sizes: '(min-width: 960px) 46vw, 100vw' })}</figure>`).join('\n');
  const comandi = n < 2 ? '' : `
      <button class="vetrina-freccia prec" type="button" aria-label="Foto precedente" data-vai="-1">‹</button>
      <button class="vetrina-freccia succ" type="button" aria-label="Foto successiva" data-vai="1">›</button>
      <span class="vetrina-conta" aria-live="polite">1 / ${n}</span>`;
  const miniature = n < 2 ? '' : `
    <div class="miniature" role="group" aria-label="Scegli la foto">
${p.foto.map(([id, alt], i) => `      <button type="button" data-foto="${i}" aria-label="Foto ${i + 1}: ${esc(alt)}"${i ? '' : ' aria-current="true"'}><img src="${urlPiccola(id) || urlFoto(id)}" alt="" width="80" height="100" loading="lazy" decoding="async"></button>`).join('\n')}
    </div>`;
  const galleria = `    <div class="vetrina" aria-label="Foto di ${esc(p.nome)}">
      <span class="vetrina-zoom" aria-hidden="true">Tocca per ingrandire</span>
      <div class="vetrina-binario">
${foto}
      </div>${comandi}
    </div>${miniature}`;
  const corpo = `
<div class="prodotto" data-id="${p.id}" data-tipo="${p.tipo}">
  <div class="prodotto-intro">
    <a class="indietro" href="${({ polo: 'polo', felpa: 'felpe', pantaloni: 'pantaloni', accessori: 'accessori' })[p.tipo]}.html">← ${({ polo: 'Polo', felpa: 'Felpe', pantaloni: 'Pantaloni', accessori: 'Accessori' })[p.tipo]}</a>
    <h1>${esc(p.nome)}</h1>
    <p class="colore">${esc(p.colore)}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
  </div>
  <div class="galleria" data-n="${p.foto.length}">
${galleria}
  </div>
  <div class="prodotto-acquisto">
    <p class="prodotto-testo"><strong>${esc(p.frase)}</strong> ${esc(p.testo)}</p>
${acc ? '    <p class="vestibilita"><strong>Taglia unica.</strong></p>\n' : `    <p class="vestibilita"><strong>${p.tipo === 'polo' ? 'Vestibilità regolare: prendi la tua taglia abituale.' : p.tipo === 'pantaloni' ? 'Gamba dritta e comoda: prendi la tua taglia abituale.' : 'Vestibilità comoda, spalla leggermente scesa: se sei tra due taglie, scegli la più piccola.'}</strong> In foto: taglia M, su manichino.</p>
`}    <fieldset class="taglie">
      <legend>Seleziona la taglia</legend>
      <div class="taglie-griglia">
${p.taglie.map(t => { const fin = (p.esaurite || []).includes(t); return `        <label${fin ? ' class="esaurita"' : ''}><input type="radio" name="taglia" value="${t}"${fin ? ' data-esaurita' : ''} aria-label="${t}${fin ? ', esaurita' : ''}"><span>${t}</span></label>`; }).join('\n')}
      </div>
      <p class="taglie-errore" role="alert" hidden>Scegli una taglia.</p>
${acc ? '' : '      <button class="trova-apri" type="button" aria-expanded="false" aria-controls="trova">Trova la tua taglia</button>\n'}    </fieldset>
${acc ? '' : `    <div class="trova" id="trova" hidden data-taglie="${p.taglie.join(',')}" data-tipo="${p.tipo}">
      <div class="trova-domanda" data-chiave="altezza"><p>Quanto sei alto?</p><div>
        <button type="button" data-v="0">Meno di 170 cm</button><button type="button" data-v="1">170–179 cm</button><button type="button" data-v="2">180–189 cm</button><button type="button" data-v="3">190 cm o più</button></div></div>
      <div class="trova-domanda" data-chiave="corpo"><p>La tua corporatura?</p><div>
        <button type="button" data-v="-1">Snella</button><button type="button" data-v="0">Media</button><button type="button" data-v="1">Robusta</button></div></div>
      <div class="trova-domanda" data-chiave="fit"><p>Come ti piace portarla?</p><div>
        <button type="button" data-v="-1">Aderente</button><button type="button" data-v="0">Giusta</button><button type="button" data-v="1">Larga</button></div></div>
      <p class="trova-esito" role="status" aria-live="polite"></p>
    </div>
`}    <button class="btn btn-nero btn-largo" type="button" data-aggiungi>Aggiungi alla borsa</button>
    <p class="consegna" data-consegna>Ordini entro le 13 dei giorni lavorativi: partono il giorno stesso, arrivano in 2–4 giorni lavorativi.</p>
${acc ? '' : '    <p class="regalo-scheda">È un regalo e non sai la taglia? <a class="link" href="carta-regalo.html">Scegli la carta regalo</a></p>\n'}    <div class="azioni-scheda">
      <button class="btn btn-contorno-nero" type="button" data-cuore="${p.id}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-cuore"/></svg><span>Salva</span></button>
      <button class="btn btn-contorno-nero" type="button" data-condividi><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-condividi"/></svg><span>Condividi</span></button>
    </div>
    <p class="condividi-esito" role="status" aria-live="polite"></p>
    <form class="avvisami" hidden novalidate>
      <p><strong>Taglia <span data-taglia-esaurita></span> esaurita.</strong> Ti scriviamo appena torna disponibile.</p>
      <label for="email-avvisami" class="sr">La tua email</label>
      <div class="avvisami-riga"><input id="email-avvisami" type="email" autocomplete="email" placeholder="La tua email" required><button class="btn btn-nero" type="submit">Avvisami</button></div>
      <p class="avvisami-esito" role="status" aria-live="polite"></p>
    </form>
    <details>
      <summary>Dettagli</summary>
      <ul>${p.dettagli.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </details>
    <details>
      <summary>Composizione e cura</summary>
      <ul>${CURA[p.cura].map(([k, v]) => `<li><strong>${k}:</strong> ${esc(v)}</li>`).join('')}</ul>
      <p class="piccolo">Dati di esempio, da confermare con l’etichetta del capo.</p>
    </details>
${acc || p.tipo === 'pantaloni' ? '' : `    <details>
      <summary>Guida alle taglie</summary>
      <table class="guida">
        <thead><tr><th>Taglia</th><th>Torace (cm)</th><th>Lunghezza (cm)</th></tr></thead>
        <tbody>${p.taglie.map((t, i) => { const k = i + (p.tipo === 'polo' ? 1 : 0); return `<tr><td>${t}</td><td>${52 + k * 3}</td><td>${68 + k * 2}</td></tr>`; }).join('')}</tbody>
      </table>
      <p class="piccolo">Misure del capo steso, di esempio.</p>
    </details>
`}    <details>
      <summary>Spedizione e resi</summary>
      <p>Spedizione in Italia in 2–4 giorni lavorativi, gratuita sopra i 150 €. Reso entro 14 giorni dalla consegna, per qualsiasi motivo. <a class="link" href="aiuto.html#resi">Tutti i dettagli</a></p>
    </details>
  </div>
</div>
${recensioni(p)}

<section class="completa" aria-labelledby="completa-titolo">
  <h2 id="completa-titolo" class="titolo">Completa il look</h2>
  <div class="griglia griglia-3">
${altri.map(x => scheda(x, 'scheda ' + x.id)).join('\n')}
  </div>
</section>

<section class="visti" aria-labelledby="visti-titolo" hidden>
  <h2 id="visti-titolo">Visti di recente</h2>
  <div class="visti-lista"></div>
</section>`;
  return pagina({ titolo: `${p.nome} — MARO`, descrizione: p.descrizione, corpo, file: p.id + '.html' });
}

// ---------- RECENSIONI DI ESEMPIO (solo anteprima: per legge, sul sito vero solo recensioni verificate) ----------
// sei per capo, ognuna legata ai dettagli veri di quel capo: [nome, stelle, taglia presa, come veste, testo]
const RECENSIONI = {
  'polo-linee': [
    ['Marco R.', 5, 'M', 'giusta', 'La metto in ufficio sotto la giacca e il venerdì da sola. Le tre linee sulle maniche la rendono diversa dalle solite polo nere.'],
    ['Youssef B.', 5, 'L', 'giusta', 'Ricamo della firma fitto, non si sfilaccia. Dietro le ali si vedono appena alzi le braccia, mi piace che non siano urlate.'],
    ['Chiara M.', 4, 'S', 'giusta', 'Presa per il mio ragazzo, gli sta bene. Una stella in meno perché il nero dopo qualche lavaggio è un filo meno intenso.'],
    ['Davide P.', 5, 'XL', 'grande', 'Ho preso la XL per stare largo e così è stato. Collo a costine che resta in forma, tre bottoni giusti.'],
    ['Lorenzo D.', 4, 'M', 'piccola', 'Sulle spalle è precisa, se ti piace morbida prendi una taglia in più. Per il resto ottima.'],
    ['Sofia L.', 5, 'S', 'giusta', '“Fly with your mind” sopra l’orlo è il dettaglio che me l’ha fatta comprare. Tessuto piacevole anche d’estate.'],
  ],
  'polo-tricolore': [
    ['Karim T.', 5, 'M', 'giusta', 'Le maniche a fasce sono il pezzo forte: dal vivo i colori sono pieni, non slavati come temevo.'],
    ['Federico V.', 5, 'L', 'giusta', 'Le ali rosse e verdi sulla schiena le notano tutti. Indossata a un matrimonio in campagna, mi hanno chiesto dove l’avevo presa.'],
    ['Amina K.', 4, 'S', 'grande', 'Bellissima, ma su di me la S è un po’ abbondante. Sulle donne conviene scendere di una taglia.'],
    ['Riccardo N.', 5, 'XL', 'giusta', 'È l’unica polo colorata che ho. Ricamo sul petto pulito, i bottoni sono solidi.'],
    ['Elena C.', 3, 'M', 'giusta', 'Fatta bene, ma le maniche sono più accese di quanto pensassi: non è una polo per tutti i giorni. Per l’estate però è perfetta.'],
    ['Hamza L.', 5, 'M', 'giusta', 'La scritta a colori sopra l’orlo riprende le maniche. Si vede che ogni dettaglio è pensato insieme.'],
  ],
  'polo-jacquard': [
    ['Tommaso B.', 5, 'L', 'giusta', 'Il motivo a colonne è tessuto, non stampato: lo senti sotto le dita. Sembra una polo da negozio di via Montenapoleone.'],
    ['Giulia S.', 5, 'M', 'giusta', 'Il collo color tortora con il grigio perla è elegante senza essere serio. La metto anche la sera.'],
    ['Samir A.', 4, 'M', 'piccola', 'Tessuto più spesso delle altre polo, quindi un po’ meno elastico: se sei tra due taglie prendi la più grande.'],
    ['Alessia R.', 5, 'S', 'giusta', 'La firma tono su tono si vede solo da vicino ed è proprio quello che cercavo. Niente loghi in faccia.'],
    ['Gabriele T.', 5, 'XL', 'giusta', 'Costa di più delle altre e si capisce perché. Dopo un mese di lavaggi il motivo è identico al primo giorno.'],
    ['Nadia H.', 4, 'S', 'giusta', 'Molto bella, la consiglio. Va lavata a 30 gradi e stesa piana, altrimenti si allunga un poco.'],
  ],
  'felpa-stretta': [
    ['Matteo F.', 5, 'L', 'grande', 'La stretta di mano sulla schiena è grande e definita, dopo i lavaggi niente crepe. Comoda come una felpa deve essere.'],
    ['Ilaria G.', 5, 'M', 'grande', 'Mi piace che davanti sia pulita: la puoi mettere ovunque. Il messaggio sta dietro, per chi lo vuole leggere.'],
    ['Simone G.', 4, 'XL', 'grande', 'Molto larga, con la XL arrivo quasi a metà coscia. Io la volevo così, ma per un fit normale scendi di una.'],
    ['Fatima E.', 5, 'S', 'giusta', 'Il grigio melange è morbido e caldo, cappuccio bello pieno. La uso per andare in palestra e al lavoro.'],
    ['Andrea M.', 5, 'M', 'grande', 'Regalata a mio fratello per il compleanno. Ha detto che è la sua felpa preferita, e non lo dice mai.'],
    ['Beatrice O.', 4, 'M', 'grande', 'Tasca a marsupio capiente, polsini che tengono. Il grigio si macchia un po’ facilmente, ma si lava bene.'],
  ],
  'felpa-firma': [
    ['Luca D.', 5, 'L', 'grande', 'Il blu notte dal vivo è ancora più bello che in foto. Le onde della scritta sulla schiena hanno colori vivi.'],
    ['Martina Z.', 5, 'S', 'grande', 'Firma piccola sul petto, scritta grande dietro: è la combinazione giusta. Felpa pesante, perfetta quando inizia il freddo.'],
    ['Youssef B.', 5, 'XL', 'grande', 'Presa dopo averla vista addosso a un amico in metro. Comoda, larga, il cappuccio sta su da solo.'],
    ['Sara B.', 4, 'M', 'grande', 'Bella e calda. Una stella in meno perché la coulisse del cappuccio è un po’ corta.'],
    ['Riccardo N.', 5, 'L', 'giusta', 'Ho preso la L invece della XL seguendo “Trova la tua taglia” e ci ha preso. Costa ma dura.'],
    ['Chiara M.', 5, 'S', 'grande', 'La porto con i jeans larghi e le sneakers bianche, sta bene con tutto. Già ordinata anche la polo.'],
  ],
  'felpa-verticale': [
    ['Davide P.', 5, 'M', 'grande', 'La firma che scende dalle spalle all’orlo è il dettaglio più bello del drop. Il verde bottiglia è scuro, elegante.'],
    ['Sofia L.', 5, 'S', 'grande', 'Davanti niente, dietro tutto: mi piace che la grafica si scopra solo quando ti giri. Tessuto spesso e morbido.'],
    ['Hamza L.', 4, 'L', 'grande', 'Ottima felpa. Il verde in foto sembra più chiaro, dal vivo è più scuro: a me va bene, ma meglio saperlo.'],
    ['Elena C.', 5, 'M', 'grande', 'Le fiamme intorno alle lettere hanno tanti dettagli, si vedono anche da lontano. Me la fermano per strada.'],
    ['Tommaso B.', 5, 'XL', 'grande', 'Taglio comodo, maniche giuste anche per chi ha le braccia lunghe. Cappuccio largo che non schiaccia i capelli.'],
    ['Amina K.', 4, 'S', 'grande', 'La M era esaurita e ho preso la S: abbondante lo stesso. La prossima la prendo al drop, prima che finisca.'],
  ],
};
function recensioni(p) {
  const scelte = RECENSIONI[p.id];
  if (!scelte && (p.tipo === 'accessori' || p.tipo === 'pantaloni')) return ''; // accessori di prova: niente recensioni inventate
  if (!scelte || scelte.length < 5) throw new Error('Recensioni mancanti per ' + p.id + ' (servono almeno 5)');
  const media = (scelte.reduce((a, r) => a + r[1], 0) / scelte.length).toFixed(1).replace('.', ',');
  const fit = { piccola: 0, giusta: 0, grande: 0 }; scelte.forEach(r => fit[r[3]]++);
  const stelle = n => '<span class="stelle" aria-label="' + n + ' stelle su 5">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';
  return `
<section class="recensioni" aria-labelledby="rec-titolo">
  <div class="rec-testa">
    <h2 id="rec-titolo">Recensioni</h2>
    <p class="rec-esempio">Recensioni di esempio · sito dimostrativo</p>
  </div>
  <div class="rec-sintesi">
    <div><p class="rec-media">${media}</p>${stelle(Math.round(scelte.reduce((a, r) => a + r[1], 0) / scelte.length))}<p class="piccolo">${scelte.length} recensioni</p></div>
    <div class="rec-fit"><p>Come veste</p>
      <div class="fit-barra"><span>Piccola</span><span>Giusta</span><span>Grande</span><i style="left:${Math.round(((fit.giusta * 50) + (fit.grande * 100)) / scelte.length)}%"></i></div>
    </div>
  </div>
  <ul class="rec-lista">
${scelte.map(r => `    <li><div class="rec-riga">${stelle(r[1])}<span class="verificato">Acquisto verificato</span></div><p>${esc(r[4])}</p><p class="piccolo">${esc(r[0])} · taglia ${r[2]} · veste ${r[3]}</p></li>`).join('\n')}
  </ul>
</section>`;
}

// ---------- CARTA REGALO (multiuso: si usa su più ordini; dati di esempio, da confermare col cliente) ----------
function cartaRegalo() {
  const corpo = `
<section class="cr" aria-labelledby="cr-titolo">
  <div class="cr-testa">
    <h1 id="cr-titolo" class="titolo">Carta regalo</h1>
    <p class="cr-lead">Regala un capo MARO senza indovinare la taglia: sceglie chi la riceve.</p>
  </div>
  <div class="cr-corpo">
    <div class="cr-anteprima">
      <div class="cr-carta" aria-hidden="true">
        <svg class="cr-carta-filigrana" viewBox="${LOGO_VB}"><use href="#maro-simbolo"/></svg>
        <div class="cr-carta-alto"><span class="cr-carta-marchio"><svg viewBox="${LOGO_VB}"><use href="#maro-simbolo"/></svg>MARO</span><span>Carta regalo</span></div>
        <p class="cr-carta-importo"><span data-cr-importo>100 €</span></p>
        <svg class="cr-carta-onda" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 22 C60 2 110 38 170 20 S290 4 400 18" stroke="#1f8a4c"/><path d="M0 28 C60 8 110 44 170 26 S290 10 400 24" stroke="#fff"/><path d="M0 34 C60 14 110 50 170 32 S290 16 400 30" stroke="#c8102e"/></svg>
        <div class="cr-carta-basso">
          <div><p class="cr-carta-per" data-cr-per>Per te</p><p class="cr-carta-msg" data-cr-msg>Il tuo messaggio comparirà qui.</p><p class="cr-carta-da" data-cr-da></p></div>
          <p class="cr-carta-codice">MARO-••••-••••<br>valida 12 mesi</p>
        </div>
      </div>
      <p class="piccolo">Anteprima: la carta arriva così, via email, con il codice da usare alla cassa.</p>
    </div>
    <form class="cr-form" data-carta novalidate>
      <fieldset class="cr-importi"><legend>Importo</legend>
        <div>${[50, 100, 150, 200].map(n => `<button type="button" data-importo="${n}" aria-pressed="${n === 100}">${n} €</button>`).join('')}</div>
      </fieldset>
      <label>Per<input name="per" type="text" autocomplete="off" maxlength="30" placeholder="Nome di chi la riceve" required></label>
      <label>Da<input name="da" type="text" autocomplete="given-name" maxlength="30" placeholder="Il tuo nome (facoltativo)"></label>
      <label>Messaggio <span class="piccolo" data-cr-conta>0/120</span><textarea name="msg" maxlength="120" rows="3" placeholder="Facoltativo"></textarea></label>
      <label>Email di chi la riceve<input name="email" type="email" autocomplete="off" placeholder="nome@email.it" required></label>
      <div class="cr-quando">
        <p class="cr-etichetta" id="cr-quando-et">Quando inviarla</p>
        <div class="cr-scelte" role="group" aria-labelledby="cr-quando-et"><button type="button" data-quando="oggi" aria-pressed="true">Oggi</button><button type="button" data-quando="domani" aria-pressed="false">Domani</button><button type="button" data-quando="altro" aria-pressed="false" aria-expanded="false" aria-controls="cr-cal">Altra data</button></div>
        <div class="cr-cal" id="cr-cal" hidden>
          <div class="cr-cal-testa"><button type="button" data-mese="-1" aria-label="Mese precedente">‹</button><p aria-live="polite"></p><button type="button" data-mese="1" aria-label="Mese successivo">›</button></div>
          <div class="cr-cal-nomi" aria-hidden="true"><span>lu</span><span>ma</span><span>me</span><span>gi</span><span>ve</span><span>sa</span><span>do</span></div>
          <div class="cr-cal-griglia"></div>
        </div>
        <p class="cr-quando-scelto" aria-live="polite"></p>
        <input type="hidden" name="quando">
      </div>
      <button class="btn btn-nero btn-largo" type="submit">Aggiungi alla borsa</button>
      <p class="cr-esito" role="alert"></p>
    </form>
  </div>
  <div class="domande cr-domande">
    ${domanda('Come arriva?', 'Via email, il giorno che scegli, con un codice da usare alla cassa. Puoi mandarla anche oggi.')}
    ${domanda('Dove si usa e quanto dura?', 'Su tutto il sito, anche in più ordini, per 12 mesi dall’invio. Se il carrello costa di più, la differenza si paga con carta o PayPal.')}
    ${domanda('Si può rendere?', 'La carta no, e non si cambia in denaro. I capi comprati con la carta sì: reso entro 14 giorni, e l’importo torna sulla carta.')}
  </div>
</section>`;
  return pagina({ titolo: 'Carta regalo — MARO', descrizione: 'Carta regalo MARO da 50, 100, 150 o 200 €: arriva via email il giorno che scegli e si usa su tutto il sito, anche in più ordini.', corpo, file: 'carta-regalo.html' });
}

// ---------- PREFERITI ----------
function preferiti() {
  const corpo = `
<section class="preferiti">
  <h1 class="titolo">Preferiti</h1>
  <p class="piccolo">Salvati su questo dispositivo.</p>
  <div class="pref-lista griglia"></div>
  <div class="pref-vuoto" hidden>
    <p>Non hai ancora salvato niente. Tocca il cuore su un capo per ritrovarlo qui.</p>
    <a class="btn btn-nero" href="shop.html">Guarda tutti i capi</a>
  </div>
</section>`;
  return pagina({ titolo: 'Preferiti — MARO', descrizione: 'I capi MARO che hai salvato.', corpo, file: 'preferiti.html' });
}

// ---------- 404 ----------
function nonTrovata() {
  const corpo = `
<section class="nontrovata">
  <svg class="nt-simbolo" viewBox="${LOGO_VB}" aria-hidden="true"><use href="#maro-simbolo"/></svg>
  <h1 class="titolo">Pagina<br>non trovata.</h1>
  <p>Il link è sbagliato o la pagina non esiste più. Il drop invece c’è.</p>
  <a class="btn btn-nero" href="shop.html">Vai allo shop</a>
</section>`;
  return pagina({ titolo: 'Pagina non trovata — MARO', descrizione: 'Pagina non trovata.', corpo, file: '404.html' });
}

// ---------- AIUTO (testi di esempio finché il cliente non conferma) ----------
function tabellaTaglie(taglie, k0) {
  return `<table class="guida">
        <thead><tr><th>Taglia</th><th>Torace (cm)</th><th>Lunghezza (cm)</th></tr></thead>
        <tbody>${taglie.map((t, i) => `<tr><td>${t}</td><td>${52 + (i + k0) * 3}</td><td>${68 + (i + k0) * 2}</td></tr>`).join('')}</tbody>
      </table>`;
}
const ICONE = {
  spedizioni: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 12h26v22H4zM30 20h8l6 7v7H30z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="12" cy="36" r="4" fill="#fff" stroke="currentColor" stroke-width="2.4"/><circle cx="36" cy="36" r="4" fill="#fff" stroke="currentColor" stroke-width="2.4"/></svg>',
  resi: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 16H32a10 10 0 0 1 0 20H12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 8l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  taglie: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="16" width="40" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 16v6M20 16v9M28 16v6M36 16v9" stroke="currentColor" stroke-width="2.4"/></svg>',
  contatti: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 10h36v24H20l-10 8v-8H6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 20h20M14 26h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};
const domanda = (q, a) => `      <details><summary>${q}</summary><p>${a}</p></details>`;
function aiuto() {
  const temi = [['spedizioni', 'Ordini e spedizioni'], ['resi', 'Resi e rimborsi'], ['taglie', 'Guida alle taglie'], ['contatti', 'Contatti']];
  const corpo = `
<section class="aiuto-testa" aria-labelledby="aiuto-titolo">
  <h1 id="aiuto-titolo" class="titolo">Come possiamo<br>aiutarti?</h1>
  <nav class="aiuto-temi" aria-label="Argomenti">
${temi.map(([id, t]) => `    <a href="#${id}">${ICONE[id]}<span>${t}</span></a>`).join('\n')}
  </nav>
</section>

<div class="aiuto">
  <section class="aiuto-tema" id="spedizioni" aria-labelledby="t-sped">
    <div class="aiuto-tema-testa"><h2 id="t-sped">Ordini e spedizioni</h2><p>Tutto quello che succede dal pagamento alla porta di casa.</p></div>
    <div class="domande">
${domanda('Dov’è il mio ordine?', 'Appena il pacco parte ricevi un’email con il numero di tracciamento: da lì segui la consegna passo per passo.')}
${domanda('Quanto ci mette ad arrivare?', 'In Italia 2–4 giorni lavorativi. Gli ordini fatti entro le 13 partono il giorno stesso.')}
${domanda('Quanto costa la spedizione?', 'In Italia costa 5,90 € ed è gratuita per ordini sopra i 150 €. Il costo è sempre mostrato nella borsa, prima di pagare.')}
${domanda('Come posso pagare?', 'Carta di credito o di debito, PayPal e Apple Pay. Il pagamento è protetto e non vediamo mai i dati della tua carta.')}
    </div>
  </section>

  <section class="aiuto-tema" id="resi" aria-labelledby="t-resi">
    <div class="aiuto-tema-testa"><h2 id="t-resi">Resi e rimborsi</h2><p>Hai 14 giorni dalla consegna per cambiare idea.</p></div>
    <div class="domande">
${domanda('Come faccio un reso?', 'Scrivici con il numero d’ordine: ti mandiamo l’etichetta e le istruzioni. Il capo deve essere integro e con il cartellino. La spedizione del reso è a carico tuo: 5,90 €, scalati dal rimborso.')}
${domanda('Posso cambiare taglia?', 'Sì: fai il reso del capo e ordina la taglia giusta. Se è esaurita, nella scheda del capo tocca la taglia e lascia la tua email: ti avvisiamo appena torna.')}
${domanda('Quando ricevo il rimborso?', 'Entro 14 giorni da quando il capo ci arriva, sullo stesso metodo che hai usato per pagare.')}
    </div>
  </section>

  <section class="aiuto-tema" id="taglie" aria-labelledby="t-taglie">
    <div class="aiuto-tema-testa"><h2 id="t-taglie">Guida alle taglie</h2><p>Misure del capo steso, in centimetri. Confrontale con un capo tuo che ti sta bene.</p>
      <figure class="misure-disegno" aria-label="Come prendere le misure">
        <svg viewBox="0 0 220 200" role="img" aria-label="Disegno di una maglia: il torace si misura da ascella ad ascella, la lunghezza dalla spalla all’orlo">
          <path d="M70 20 L40 32 L10 90 L34 100 L52 66 L52 186 L168 186 L168 66 L186 100 L210 90 L180 32 L150 20 Q110 44 70 20Z" fill="#f5f5f5" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M56 78 H164" stroke="#c8102e" stroke-width="2.5"/><path d="M56 72v12M164 72v12" stroke="#c8102e" stroke-width="2.5"/>
          <path d="M140 30 V182" stroke="#007a3d" stroke-width="2.5"/><path d="M134 30h12M134 182h12" stroke="#007a3d" stroke-width="2.5"/>
        </svg>
        <figcaption><span class="punto rosso"></span>Torace: da ascella ad ascella · <span class="punto verde"></span>Lunghezza: dalla spalla all’orlo</figcaption>
      </figure>
    </div>
    <div>
      <div class="filtri taglie-schede" role="group" aria-label="Scegli il capo">
        <button type="button" data-tabella="polo" aria-pressed="true">Polo</button>
        <button type="button" data-tabella="felpe" aria-pressed="false">Felpe</button>
      </div>
      <div data-tabella-di="polo">${tabellaTaglie(['S', 'M', 'L', 'XL', 'XXL'], 1)}</div>
      <div data-tabella-di="felpe" hidden>${tabellaTaglie(['XS', 'S', 'M', 'L', 'XL', 'XXL'], 0)}</div>
      <p class="piccolo">Tra due taglie? Polo: scegli la più grande se la vuoi comoda. Felpe: sono già ampie, scegli la più piccola.</p>
    </div>
  </section>

  <section class="aiuto-tema" id="contatti" aria-labelledby="t-contatti">
    <div class="aiuto-tema-testa"><h2 id="t-contatti">Contatti</h2><p>Non hai trovato la risposta? Scrivici.</p></div>
    <div class="contatto">
      <p><strong>Email, WhatsApp e Instagram</strong> arriveranno con l’apertura del negozio.</p>
      <p class="piccolo">Rispondiamo dal lunedì al venerdì, entro un giorno lavorativo.</p>
    </div>
  </section>
</div>`;
  return pagina({ titolo: 'Aiuto — MARO', descrizione: 'Ordini, spedizioni, resi, guida alle taglie e contatti di MARO.', corpo, file: 'aiuto.html' });
}

// ---------- STORIA v5 (21/10): apertura, manifesto di Omar coi suoi disegni (al posto di «Il segno» con gli sport), Le ali, chiusura ----------
// Manifesto di Omar (21/10): il suo testo (messaggio WhatsApp) diviso come ha chiesto lui, sotto le foto dei suoi disegni nel suo ordine.
// Parole sue, non riscritte. L'ultima riga «MARO — FLY WITH YOUR MIND.» diventa la chiusura col logo (MARO mai in orizzontale).
const MANIFESTO = [
  { foto: 'bm-1', etichetta: 'La visione', alt: 'Disegno a penna blu di Omar su un quaderno a righe: la M con le ali e i riccioli sotto', testo: `<h2 id="bm-titolo">Fly with<br>your mind.</h2><p class="bm-grande">Every goal begins with a vision.</p>` },
  { foto: 'bm-2', etichetta: 'Il nome', alt: 'Disegno a penna su carta a quadretti: MARO scritto in verticale, una lettera sotto l’altra, con scie che lo avvolgono', testo: `<p>MARO nasce per chi ha un obiettivo da raggiungere e la fiducia necessaria per trasformare un pensiero in realtà.</p>` },
  { foto: 'bm-3', etichetta: 'La misura', alt: 'Cartamodello a matita su carta millimetrata con le misure: le due ali e MARO verticale al centro', testo: `<p><i>Fly with your mind</i> significa imparare dal passato, vivere il presente e immaginare il futuro che vogliamo costruire. Significa guardare oltre i propri limiti e credere in una visione, anche quando sembra lontana.</p>` },
  { foto: 'bm-4', etichetta: 'Il lavoro', alt: 'Le due ali disegnate a matita, con le piume tratteggiate, su un foglio bianco', testo: `<p class="bm-grande">Ma sognare non basta.</p><p>Servono disciplina, sacrificio e la forza di affrontare le difficoltà, facendo anche ciò che è scomodo o faticoso, senza cercare scorciatoie.</p>` },
  { foto: 'bm-5', etichetta: 'Il segno', alt: 'Disegno finale a penna su carta a quadretti: le due ali piumate e MARO in verticale al centro', testo: `<p>Crediamo nel rispetto di sé stessi e degli altri, nella lealtà, nella fiducia e nella forza della collaborazione.</p><p class="bm-grande">Immagina. Credi. Agisci.</p><p>La tua mente dà forma alla visione. Le tue azioni la trasformano in realtà.</p>` },
];
// carosello di «Le ali» (21/10): foto di Francesco, ~500 px (originali più grandi da chiedere)
const CAROSELLO_ALI = [
  ['ali-1', 'Ragazzo con la Polo Linee MARO nera e il cappellino con le ali, tiene una borraccia nera con le ali bianche'],
  ['ali-2', 'Ragazzo in piedi davanti a un palazzo, con la Polo Linee MARO, pantaloni neri e cappellino'],
  ['ali-3', 'Dettaglio del petto della Polo Linee: MARO in verticale bianco e le righe sulle spalle'],
  ['ali-4', 'Dettaglio del cappellino nero con la M con le ali bianca, ricamata sul davanti'],
  ['ali-5', 'Ragazzo di spalle con la Polo Linee MARO e il cappellino, le ali piccole sotto il colletto'],
  ['ali-6', 'Ragazzo seduto sui gradini con giacca nera MARO e cappellino con le ali'],
];
function storia() {
  const passi = MANIFESTO.map((m, i) => `
    <li class="bm-passo" data-entra>
      <p class="bn-sport"><span class="bn-punto" aria-hidden="true"></span>${String(i + 1).padStart(2, '0')} · ${esc(m.etichetta)}</p>
      <img class="bm-firma-fondo" src="assets/img/firma-maro.svg?v=${impronta('assets/img/firma-maro.svg')}" width="870" height="1860" alt="" aria-hidden="true" loading="lazy">
      <figure class="bm-disegno" style="--r: ${(MISURE[m.foto][0] / MISURE[m.foto][1]).toFixed(4)}">
        <button type="button" class="bm-gira" aria-pressed="false" aria-label="${esc(m.etichetta)}: guarda il foglio originale">${img(m.foto, m.alt, { cls: 'bm-segno', dove: 'brand manifesto ' + (i + 1), sizes: '(min-width: 640px) 600px, 100vw' })}${img(m.foto + '-foglio', 'Il foglio originale: ' + m.alt.charAt(0).toLowerCase() + m.alt.slice(1), { cls: 'bm-foglio', dove: 'brand manifesto foglio ' + (i + 1), sizes: '(min-width: 640px) 600px, 100vw' })}<span class="bm-gira-icona" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/></svg></span></button>
      </figure>
      <div class="bm-testo">${m.testo}</div>
    </li>`).join('');
  const corpo = `
<section class="bn-apertura" aria-labelledby="bn-titolo">
  <figure>${img('bn-tennis', 'Tennista al servizio tra due colonne di marmo, con la Polo Tricolore MARO nera e le righe verde bianco rosso sulle maniche', { dove: 'brand apertura', lazy: false, sizes: '100vw' })}</figure>
  <div class="bn-apertura-testo">
    <p class="occhiello">Il brand</p>
    <h1 id="bn-titolo">In campo<br>dal 2020.</h1>
    <div class="bn-intro">
      <img class="bn-firma" src="assets/img/firma-maro.svg?v=${impronta('assets/img/firma-maro.svg')}" width="870" height="1860" alt="">
      <p class="bn-lead">MARO nasce nel 2020 da Omar, e il nome è il suo, con le lettere in un altro ordine. Polo, felpe e pantaloni con il taglio dello sport, tennis e padel prima di tutto, e la cura di un capo da portare anche dopo la partita.</p>
    </div>
  </div>
  <div class="bn-ponte">
    <p>Prima di ogni capo c’è un’idea. Qui sotto la vedi prendere forma: i disegni di Omar, uno dopo l’altro, con le sue parole.</p>
    <p class="bn-ponte-invito"><span class="bm-gira-icona" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/></svg></span><span><span data-verbo>Clicca</span> su un disegno per vedere il foglio originale</span></p>
  </div>
</section>

<section class="bm" aria-labelledby="bm-titolo">
  <div class="bn-filo" aria-hidden="true"><span class="bn-filo-luce"></span></div>
  <ol class="bm-passi">${passi}
  </ol>
</section>

<section class="bn-ali" aria-labelledby="bn-simbolo">
  <div class="ali-giro" data-giro>
    <ul class="ali-binario" tabindex="0" aria-label="Foto della campagna: scorri per vederle tutte">${CAROSELLO_ALI.map(([id, alt], i) => `
      <li>${img(id, alt, { dove: 'brand ali carosello', sizes: '(min-width: 960px) 520px, 100vw' })}</li>`).join('')}
    </ul>
    <div class="ali-comandi">
      <button type="button" class="ali-freccia" data-giro-prec aria-label="Foto precedente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <p class="ali-conto" aria-live="polite"><span data-giro-n>1</span> / ${CAROSELLO_ALI.length}</p>
      <button type="button" class="ali-freccia" data-giro-succ aria-label="Foto successiva"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      <p class="ali-scorri">Scorri o usa le frecce</p>
    </div>
  </div>
  <div class="bn-ali-testo">
    <p class="occhiello">Dal foglio al capo</p>
    <h2 id="bn-simbolo">Le ali.</h2>
    <p>La M con le ali del primo disegno oggi è sul cappellino, sul berretto e sulla borraccia. MARO in verticale, il secondo, scende sul petto della Polo Linee.</p>
    <a class="btn btn-nero" href="accessori.html">Accessori</a>
  </div>
</section>

<section class="bn-fine" aria-labelledby="bn-motto" data-entra>
  <svg class="bn-fine-logo" viewBox="${LOGO_VB}" aria-hidden="true"><use href="#logo-maro"/></svg>
  <h2 id="bn-motto">Fly with<br>your mind.</h2>
  <a class="btn btn-bianco" href="shop.html">Acquista il drop</a>
</section>`;
  return pagina({ titolo: 'Il brand — MARO', descrizione: 'MARO nasce nel 2020: abbigliamento sportivo ed elegante per tennis, padel e ogni giorno, con la firma verticale e le ali di Omar.', corpo, file: 'storia.html' });
}

// ---------- PORTA UN AMICO (19/10, richiesta di Omar alla call del 18/10) ----------
// Regole (valori di esempio, da confermare con Omar): l'amico ha il 10% sul primo ordine; chi invita riceve un codice da 10 €
// quando l'ordine dell'amico supera i 14 giorni del reso. Invita solo chi ha già comprato. I codici non si sommano.
// Oggi è una dimostrazione nel browser; con il motore (fase 2) codici, ordini e premi li gestisce il server + Stripe.
const AMICO_PCT = 10, AMICO_BUONO = 10;
const blocInvito = `<div class="invito" data-invito hidden>
    <p class="occhiello">Il tuo link</p>
    <div class="invito-riga"><input type="text" readonly data-invito-link aria-label="Il tuo link da condividere"><button type="button" class="btn btn-nero" data-invito-copia>Copia</button></div>
    <div class="invito-azioni"><a class="btn btn-contorno-nero" data-invito-wa target="_blank" rel="noopener" aria-label="Invia il link su WhatsApp">WhatsApp</a><button type="button" class="btn btn-contorno-nero" data-invito-condividi hidden>Condividi</button></div>
    <p class="invito-esito" role="status"></p>
  </div>`;
const regoleAmico = `<ol class="amico-passi">
    <li><b>01</b><h3>Condividi il tuo link</h3><p>Dopo il primo ordine ricevi un link tutto tuo: lo trovi qui e nell’email di conferma.</p></li>
    <li><b>02</b><h3>Il tuo amico ha il ${AMICO_PCT}%</h3><p>Aprendo il link trova lo sconto già nella borsa, sul suo primo ordine.</p></li>
    <li><b>03</b><h3>Tu ricevi ${AMICO_BUONO} €</h3><p>Quando il suo ordine supera i 14 giorni per il reso, ti mandiamo via email un codice da ${AMICO_BUONO} € per il prossimo acquisto.</p></li>
  </ol>
  <p class="amico-nota">Un codice per ordine: lo sconto amico non si somma al ${AMICO_PCT}% dell’iscrizione. Il link vale per chi non ha mai ordinato su MARO. Condizioni di esempio, da confermare.</p>`;
function portaUnAmico() {
  const corpo = `
<section class="amico" aria-labelledby="amico-titolo">
  <div class="amico-testa">
    <p class="occhiello">Porta un amico</p>
    <h1 id="amico-titolo">${AMICO_PCT}% a lui.<br>${AMICO_BUONO} € a te.</h1>
    <p class="amico-lead">Hai già un capo MARO? Mandalo a chi lo porterebbe bene: lui ha il ${AMICO_PCT}% sul primo ordine, tu un codice da ${AMICO_BUONO} € quando il suo ordine è confermato.</p>
  </div>
  ${blocInvito}
  <div class="amico-senza" data-invito-senza>
    <p><strong>Il tuo link arriva con il primo ordine.</strong> Così lo sconto va davvero a un amico nuovo, e non a un’altra email della stessa persona.</p>
    <a class="btn btn-nero" href="shop.html">Guarda i capi</a>
  </div>
  ${regoleAmico}
</section>`;
  return pagina({ titolo: 'Porta un amico — MARO', descrizione: `Invita un amico su MARO: lui ha il ${AMICO_PCT}% sul primo ordine, tu un codice da ${AMICO_BUONO} € quando il suo ordine è confermato.`, corpo, file: 'porta-un-amico.html' });
}
// pagina su cui Stripe rimanderà dopo il pagamento (success_url); oggi la apre il pagamento di prova della borsa
function ordineConfermato() {
  const corpo = `
<section class="amico ordine-ok" aria-labelledby="ordine-titolo">
  <div class="amico-testa">
    <p class="occhiello">Ordine ricevuto</p>
    <h1 id="ordine-titolo">Grazie.<br>È tuo.</h1>
    <p class="amico-lead" data-ordine-testo>Ti abbiamo mandato la conferma via email. Ti scriviamo di nuovo quando il pacco parte, di solito entro 48 ore.</p>
    <p class="ordine-prova">Anteprima: pagamento di prova, nessun addebito.</p>
  </div>
  <div class="ordine-amico">
    <h2>Porta un amico</h2>
    <p>Lui ha il ${AMICO_PCT}% sul primo ordine, tu ${AMICO_BUONO} € sul prossimo.</p>
    ${blocInvito}
    <div class="amico-senza" data-invito-senza><p>Il tuo link comparirà qui dopo il pagamento.</p></div>
    <a class="link" href="porta-un-amico.html">Come funziona</a>
  </div>
</section>`;
  return pagina({ titolo: 'Ordine ricevuto — MARO', descrizione: 'Conferma del tuo ordine MARO.', corpo, file: 'ordine-confermato.html' });
}

// ---------- IL MIO ACCOUNT (19/10): Accedi / Registrati con email e password, codici disponibili e usati, ordini, link amico ----------
// DIMOSTRAZIONE: account salvati solo in questo browser (della password resta solo l'impronta SHA-256, mai il testo).
// Con il motore (fase 2): account, password (hash lato server), codici, ordini e premi nel database (D1); il codice risulta
// "usato" solo dopo il pagamento riuscito su Stripe; "Password dimenticata" manda un link via email.
function account() {
  const campo = (id, etichetta, tipo, extra = '') => `<div class="acc-campo"><label for="${id}">${etichetta}</label><input id="${id}" type="${tipo}" ${extra}></div>`;
  const corpo = `
<section class="amico acc" aria-label="Il mio account">
  <div data-conto-fuori>
  <div id="accedi" data-acc-vista="accedi">
    <p class="occhiello">Il mio account</p>
    <h1 id="conto-titolo" tabindex="-1">Entra in MARO.</h1>
    <p class="amico-lead">Nel tuo account trovi i codici sconto, quelli che hai già usato, i tuoi ordini e il link per invitare un amico.</p>
    <div class="acc-schede" role="tablist" aria-label="Accedi o registrati">
      <button type="button" role="tab" id="tab-accedi" aria-controls="pan-accedi" aria-selected="true" data-acc-scheda="accedi">Accedi</button>
      <button type="button" role="tab" id="tab-registrati" aria-controls="pan-registrati" aria-selected="false" tabindex="-1" data-acc-scheda="registrati">Registrati</button>
    </div>
    <form class="acc-pannello" id="pan-accedi" role="tabpanel" aria-labelledby="tab-accedi" data-acc-accedi novalidate>
      ${campo('acc-email', 'Email', 'email', 'autocomplete="email" required')}
      ${campo('acc-pw', 'Password', 'password', 'autocomplete="current-password" required')}
      <p class="acc-esito" role="alert" data-acc-esito></p>
      <button type="submit" class="btn btn-nero btn-largo">Accedi</button>
      <a class="acc-link" href="#password-dimenticata" data-acc-dimenticata>Password dimenticata?</a>
      <p class="acc-info" data-acc-info role="status"></p>
    </form>
    <form class="acc-pannello" id="pan-registrati" role="tabpanel" aria-labelledby="tab-registrati" data-acc-registrati hidden novalidate>
      ${campo('reg-nome', 'Nome', 'text', 'autocomplete="given-name" required maxlength="40"')}
      ${campo('reg-email', 'Email', 'email', 'autocomplete="email" required')}
      ${campo('reg-pw', 'Password', 'password', 'autocomplete="new-password" required aria-describedby="reg-pw-regole"')}
      <ul class="acc-regole" id="reg-pw-regole" data-pw-regole>
        <li data-regola="lung">Almeno 8 caratteri</li>
        <li data-regola="num">Almeno un numero</li>
        <li data-regola="maiu">Almeno una lettera maiuscola</li>
      </ul>
      <label class="acc-spunta"><input type="checkbox" data-reg-newsletter checked> <span>Voglio i drop in anteprima e il <strong>10% sul primo ordine</strong> (newsletter, ti cancelli quando vuoi).</span></label>
      <label class="acc-spunta"><input type="checkbox" data-reg-privacy required> <span>Ho letto l’informativa privacy. <em>(obbligatorio)</em></span></label>
      <p class="acc-esito" role="alert" data-reg-esito></p>
      <button type="submit" class="btn btn-nero btn-largo">Crea l’account</button>
    </form>
  </div>
  <!-- password dimenticata (21/10, come i grandi negozi): schermata propria → «controlla la tua email» → nuova password dal link -->
  <form class="acc-vista" id="password-dimenticata" data-acc-vista="recupero" data-acc-recupero hidden novalidate>
    <a class="acc-indietro" href="#accedi">← Torna all’accesso</a>
    <p class="occhiello">Il mio account</p>
    <h1 tabindex="-1">Hai dimenticato la password?</h1>
    <p class="amico-lead">Scrivi l’email del tuo account: ti mandiamo un link per sceglierne una nuova.</p>
    <div class="acc-pannello">
      ${campo('rec-email', 'Email', 'email', 'autocomplete="email" required')}
      <p class="acc-esito" role="alert" data-rec-esito></p>
      <button type="submit" class="btn btn-nero btn-largo">Inviami il link</button>
    </div>
  </form>
  <div class="acc-vista" id="email-inviata" data-acc-vista="inviata" hidden>
    <p class="occhiello">Il mio account</p>
    <h1 tabindex="-1">Controlla la tua email.</h1>
    <p class="amico-lead">Se esiste un account per <strong data-rec-dove></strong>, ti abbiamo mandato un link per scegliere una nuova password. Il link vale 24 ore.</p>
    <div class="acc-pannello">
      <p class="acc-sotto">Non la trovi? Guarda in Spam o in Promozioni. Arriva da MARO, con oggetto «MARO · scegli una nuova password».</p>
      <p class="acc-info" role="status" data-rec-prova></p>
      <button type="button" class="btn btn-contorno-nero btn-largo" data-rec-ancora disabled>Invia di nuovo</button>
      <a class="acc-link" href="#password-dimenticata" data-rec-altra>Usa un’altra email</a>
      <a class="acc-link" href="#accedi">Torna all’accesso</a>
    </div>
  </div>
  <form class="acc-vista" id="nuova-password" data-acc-vista="nuova" data-acc-nuova hidden novalidate>
    <p class="occhiello">Il mio account</p>
    <h1 tabindex="-1">Scegli una nuova password.</h1>
    <p class="amico-lead">Dopo il salvataggio entri subito nel tuo account; gli accessi dagli altri dispositivi si chiudono, per sicurezza.</p>
    <div class="acc-pannello">
      <div class="acc-campo"><label for="np-pw">Nuova password</label><div class="acc-pw"><input id="np-pw" type="password" autocomplete="new-password" required aria-describedby="np-regole"><button type="button" class="acc-mostra" data-acc-mostra="np-pw" aria-pressed="false">Mostra</button></div></div>
      <ul class="acc-regole" id="np-regole" data-pw-regole-nuova>
        <li data-regola="lung">Almeno 8 caratteri</li>
        <li data-regola="num">Almeno un numero</li>
        <li data-regola="maiu">Almeno una lettera maiuscola</li>
      </ul>
      <p class="acc-esito" role="alert" data-np-esito></p>
      <button type="submit" class="btn btn-nero btn-largo">Salva la password</button>
      <a class="btn btn-contorno-nero btn-largo" href="#password-dimenticata" data-np-nuovo hidden>Chiedi un nuovo link</a>
    </div>
  </form>
  <p class="ordine-prova">Anteprima: negozio in prova, nessun pagamento vero.</p>
  </div>
  <div data-conto-dentro hidden>
    <p class="occhiello">Il mio account</p>
    <h1>Ciao<span data-conto-nome></span>.</h1><script>if(window.MARO_NOME)document.querySelector('[data-conto-nome]').textContent=', '+window.MARO_NOME;</script>
    <p class="acc-chi"><span data-conto-email></span> · <button type="button" class="acc-esci" data-conto-esci>Esci</button></p>
    <p class="acc-info acc-avviso" role="status" data-conto-avviso hidden></p>
    <div class="acc-blocco">
      <h2>I tuoi codici</h2>
      <p class="acc-sotto">Ogni codice vale una volta sola. Diventa «usato» solo quando completi un ordine: finché resta qui, è tuo.</p>
      <ul class="acc-codici" data-codici-liberi><li class="acc-vuoto">Caricamento…</li></ul>
      <h3 class="acc-h3">Già usati</h3>
      <ul class="acc-codici usati" data-codici-usati><li class="acc-vuoto">Caricamento…</li></ul>
    </div>
    <div class="acc-blocco">
      <h2>I tuoi ordini</h2>
      <ul class="acc-ordini" data-conto-ordini><li class="acc-vuoto">Caricamento…</li></ul>
    </div>
    <div class="acc-blocco">
      <h2>Porta un amico</h2>
      <p class="acc-sotto">Lui ha il ${AMICO_PCT}% sul primo ordine, tu ${AMICO_BUONO} € sul prossimo. <a class="link" href="porta-un-amico.html">Come funziona</a></p>
      ${blocInvito}
      <div class="amico-senza" data-invito-senza><p>Il tuo link arriva con il primo ordine.</p><a class="btn btn-nero" href="shop.html">Guarda i capi</a></div>
    </div>
    <div class="acc-blocco">
      <h2>Elimina l’account</h2>
      <p class="acc-sotto">Cancelliamo nome, email, password e i codici non ancora usati, e non ricevi più la newsletter. Gli ordini già fatti restano registrati, perché per legge le vendite si conservano 10 anni.</p>
      <details class="acc-elimina">
        <summary>Voglio eliminare l’account</summary>
        <form data-acc-elimina novalidate>
          <div class="acc-campo"><label for="el-pw">Per conferma, scrivi la tua password</label><input id="el-pw" type="password" autocomplete="current-password" required></div>
          <p class="acc-esito" role="alert" data-el-esito></p>
          <button type="submit" class="btn btn-nero">Elimina per sempre</button>
        </form>
      </details>
    </div>
  </div>
</section>`;
  return pagina({ titolo: 'Il mio account — MARO', descrizione: 'Il tuo account MARO: codici sconto, ordini e link per invitare un amico.', corpo, file: 'account.html' });
}

fs.writeFileSync(path.join(ROOT, 'account.html'), account());
fs.writeFileSync(path.join(ROOT, 'porta-un-amico.html'), portaUnAmico());
fs.writeFileSync(path.join(ROOT, 'ordine-confermato.html'), ordineConfermato());
fs.writeFileSync(path.join(ROOT, 'index.html'), home());
for (const cat of CATEGORIE) fs.writeFileSync(path.join(ROOT, cat.file), categoriaPagina(cat));
fs.writeFileSync(path.join(ROOT, 'aiuto.html'), aiuto());
fs.writeFileSync(path.join(ROOT, 'storia.html'), storia());
fs.writeFileSync(path.join(ROOT, 'preferiti.html'), preferiti());
fs.writeFileSync(path.join(ROOT, 'carta-regalo.html'), cartaRegalo());
// la 404 di GitHub Pages può comparire a qualsiasi indirizzo: tutti i link partono dalla cartella del sito
fs.writeFileSync(path.join(ROOT, '404.html'), nonTrovata().replace('<head>', '<head>\n<base href="/MaroBrand/">'));
for (const p of CATALOGO) fs.writeFileSync(path.join(ROOT, p.id + '.html'), prodotto(p));

// foto preparate ma non usate (avviso, non errore)
const nonUsate = Object.keys(MISURE).filter(k => !usate.has(k) && k !== 'apertura-locandina');
console.log(`Pagine: ${3 + CATALOGO.length}. Foto usate: ${usate.size}.` + (nonUsate.length ? ' Non usate: ' + nonUsate.join(', ') : ''));
