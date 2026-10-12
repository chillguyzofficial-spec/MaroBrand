// Genera index.html + una pagina per capo.  Uso: node _build/build.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CATALOGO = require('./catalogo');
const MISURE = require('./foto-misure.json');
const V = '4'; // versione di css/js: aumentarla a ogni modifica pubblicata

// controllo: ogni foto in un solo punto del sito (le foto dei capi appartengono al loro capo)
const usate = new Map();
const usa = (id, dove) => {
  if (!MISURE[id]) throw new Error('Foto mancante: ' + id);
  if (usate.has(id) && usate.get(id) !== dove) throw new Error(`Foto "${id}" usata in "${usate.get(id)}" e in "${dove}"`);
  usate.set(id, dove);
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const euro = n => n.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' €';

function img(id, alt, { cls = '', lazy = true, dove, sizes = '100vw' } = {}) {
  usa(id, dove);
  const [w, h] = MISURE[id];
  return `<img src="assets/foto/${id}.webp" width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'} sizes="${sizes}">`;
}

const SIMBOLO = `<svg class="simbolo" viewBox="0 0 200 150" aria-hidden="true"><use href="#maro-simbolo"/></svg>`;
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="maro-simbolo" viewBox="0 0 200 150"><g transform="translate(0 15)" fill="currentColor"><path d="M62 110V32L76 18H88L100 44L112 18H124L138 32V110H116V60L106 82H94L84 60V110Z"/><path d="M52 26L2 2L8 42L20 42L24 66L36 64L42 88L52 92Z"/><path d="M148 26L198 2L192 42L180 42L176 66L164 64L158 88L148 92Z"/></g></symbol>
<symbol id="maro-firma" viewBox="0 0 200 560"><g fill="currentColor"><path d="M96 8C110 20 150 22 150 54C140 34 108 32 96 8Z"/><path d="M52 58Q6 100 52 142Q28 100 52 58Z"/><path d="M148 178Q194 220 148 262Q172 220 148 178Z"/><path d="M52 298Q6 340 52 382Q28 340 52 298Z"/><path d="M148 418Q194 460 148 502Q172 460 148 418Z"/><path d="M104 552C90 540 50 538 50 506C60 526 92 528 104 552Z"/><text x="100" y="146" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">M</text><text x="100" y="266" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">A</text><text x="100" y="386" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">R</text><text x="100" y="506" font-family="Anton,Impact,sans-serif" font-size="118" text-anchor="middle">O</text></g></symbol>
<symbol id="i-borsa" viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6L5 8zm4 0V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
<symbol id="i-chiudi" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8"/></symbol>
</defs></svg>`;

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
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/css/maro.css?v=${V}">
<script defer src="assets/js/maro.js?v=${V}"></script>
</head>
<body${file === 'index.html' ? ' class="home"' : ''}>
${SPRITE}
<a class="salta" href="#contenuto">Vai al contenuto</a>
<div class="avviso"><a href="index.html#iscriviti">Drop 001 — accesso anticipato: iscriviti</a></div>
<header class="testata">
  <a class="logo" href="index.html" aria-label="MARO, home">${SIMBOLO}<span>MARO</span></a>
  <nav class="menu" id="menu" aria-label="Menu principale">
    <a href="index.html#drop">Drop 001</a>
    <a href="index.html#polo">Polo</a>
    <a href="index.html#felpe">Felpe</a>
    <a href="index.html#storia">Storia</a>
  </nav>
  <div class="azioni">
    <button class="borsa-apri" type="button" aria-label="Borsa, 0 articoli" data-apri-borsa><svg viewBox="0 0 24 24"><use href="#i-borsa"/></svg><span class="borsa-num" hidden>0</span></button>
    <button class="menu-apri" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
</header>
<main id="contenuto">
${corpo}
</main>
<footer class="piede">
  <div class="piede-alto">
    <nav aria-label="Drop 001"><h2>Drop 001</h2><a href="index.html#polo">Polo</a><a href="index.html#felpe">Felpe</a><a href="index.html#lookbook">Lookbook</a></nav>
    <nav aria-label="MARO"><h2>MARO</h2><a href="index.html#storia">La storia</a><a href="index.html#iscriviti">Accesso anticipato</a></nav>
    <div><h2>Social</h2><p>Instagram e TikTok in arrivo</p></div>
  </div>
  <p class="piede-nome" aria-hidden="true">MARO</p>
  <div class="piede-basso">
    <span>© 2026 MARO — Milano</span>
    <span class="nota">Anteprima di presentazione: prezzi, materiali e testi sono di esempio.</span>
    <span class="linguetta" aria-hidden="true"></span>
  </div>
</footer>
<div class="borsa" id="borsa" role="dialog" aria-modal="true" aria-labelledby="borsa-titolo" hidden>
  <div class="borsa-velo" data-chiudi-borsa></div>
  <div class="borsa-pannello">
    <div class="borsa-testa"><h2 id="borsa-titolo">Borsa</h2><button type="button" data-chiudi-borsa aria-label="Chiudi la borsa"><svg viewBox="0 0 24 24"><use href="#i-chiudi"/></svg></button></div>
    <div class="borsa-righe" id="borsa-righe"></div>
    <div class="borsa-fondo" id="borsa-fondo"></div>
  </div>
</div>
<script>window.MARO_CATALOGO=${JSON.stringify(CATALOGO.map(p => ({ id: p.id, nome: p.nome, colore: p.colore, prezzo: p.prezzo, foto: p.foto[0][0] })))};</script>
</body>
</html>
`;
}

function scheda(p, dove) {
  const [fid, alt] = p.foto[0];
  return `<a class="scheda" href="${p.id}.html" data-tipo="${p.tipo}">
  <div class="scheda-foto">${img(fid, alt, { dove, sizes: '(min-width: 960px) 32vw, 50vw' })}</div>
  <div class="scheda-testo">
    <span class="pallini">${p.pallini.map(c => `<i style="background:${c}"></i>`).join('')}</span>
    <h3>${esc(p.nome)}</h3>
    <p>${esc(p.colore)}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
  </div>
</a>`;
}

// ---------- HOME ----------
function home() {
  const lb = [
    ['lookbook-metro-polo-1', 'In metro con le polo MARO'],
    ['lookbook-metro-polo-2', 'Quattro amici in metro con le polo MARO'],
  ];
  const corpo = `
<section class="apertura" aria-label="Apertura">
  <video class="apertura-video" muted playsinline autoplay loop preload="auto" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" poster="assets/foto/apertura-locandina.webp" aria-hidden="true" tabindex="-1">
    <source src="assets/video/home-metro-1.mp4" type="video/mp4">
  </video>
  <video class="apertura-video" data-copia muted playsinline preload="auto" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" aria-hidden="true" tabindex="-1">
    <source src="assets/video/home-metro-1.mp4" type="video/mp4">
  </video>
  <div class="apertura-testo">
    <p class="occhiello">Abbigliamento streetwear · Milano</p>
    <h1>Fly with<br>your mind</h1>
    <p>Polo e felpe disegnate a Milano. Il Drop 001 è online.</p>
    <div class="pulsanti">
      <a class="btn btn-bianco" href="#drop">Acquista il drop</a>
      <a class="btn btn-contorno" href="#storia">La storia</a>
    </div>
  </div>
</section>

<section class="drop" id="drop" aria-labelledby="drop-titolo">
  <span id="polo" class="ancora"></span><span id="felpe" class="ancora"></span>
  <div class="drop-testa">
    <h2 id="drop-titolo" class="titolo">Drop 001</h2>
    <div class="filtri" role="group" aria-label="Filtra">
      <button type="button" data-filtro="tutto" aria-pressed="true">Tutto <span>6</span></button>
      <button type="button" data-filtro="polo" aria-pressed="false">Polo <span>3</span></button>
      <button type="button" data-filtro="felpa" aria-pressed="false">Felpe <span>3</span></button>
    </div>
  </div>
  <div class="griglia">
${CATALOGO.map(p => scheda(p, 'scheda ' + p.id)).join('\n')}
  </div>
</section>

<section class="campagna" aria-labelledby="campagna-titolo">
  <div class="campagna-foto">${img('campagna-due-ragazzi', 'Due ragazzi con felpe MARO appoggiati a una ringhiera in un parco di Milano', { dove: 'home campagna', sizes: '(min-width: 960px) 50vw, 100vw' })}</div>
  <div class="campagna-testo">
    <h2 id="campagna-titolo" class="titolo titolo-xl">Piedi<br>a Milano.<br>Testa<br>altrove.</h2>
  </div>
</section>

<section class="storia" id="storia" aria-labelledby="storia-titolo">
  <div class="storia-testo">
    <span class="linguetta" aria-hidden="true"></span>
    <h2 id="storia-titolo" class="titolo">Due terre,<br>un volo</h2>
    <p>MARO nasce a Milano, da chi è cresciuto tra due culture: l’Italia e il Marocco. La stretta di mano è il primo disegno del marchio: due terre che si tengono.</p>
    <p>Le ali vengono da uno schizzo a penna. L’idea è rimasta quella: <strong>vola con la testa</strong>, anche quando i piedi sono in metro alle otto del mattino.</p>
  </div>
  <div class="storia-foto">${img('storia-stretta-di-mano', 'Due ragazzi si stringono la mano in un parco, uno indossa una felpa MARO', { dove: 'home storia', sizes: '(min-width: 960px) 50vw, 100vw' })}</div>
</section>

<section class="lookbook" id="lookbook" aria-labelledby="lookbook-titolo">
  <h2 id="lookbook-titolo" class="titolo">Lookbook</h2>
  <div class="lookbook-griglia">
${lb.map(([id, alt]) => `    <figure>${img(id, alt, { dove: 'home lookbook', sizes: '(min-width: 960px) 48vw, 100vw' })}</figure>`).join('\n')}
  </div>
</section>

<section class="iscriviti" id="iscriviti" aria-labelledby="iscriviti-titolo">
  <h2 id="iscriviti-titolo" class="titolo">Il prossimo drop arriva prima a chi è iscritto</h2>
  <form class="iscriviti-form" novalidate>
    <label for="email" class="sr">La tua email</label>
    <input id="email" name="email" type="email" autocomplete="email" placeholder="La tua email" required>
    <button class="btn btn-nero" type="submit">Iscriviti</button>
    <p class="esito" role="status" aria-live="polite"></p>
  </form>
</section>`;
  return pagina({ titolo: 'MARO — Fly with your mind · Drop 001', descrizione: 'MARO, streetwear nato a Milano. Drop 001: polo e felpe.', corpo, file: 'index.html' });
}

// ---------- SCHEDA PRODOTTO ----------
function prodotto(p) {
  const altri = CATALOGO.filter(x => x.id !== p.id && x.tipo !== p.tipo).slice(0, 2)
    .concat(CATALOGO.filter(x => x.id !== p.id && x.tipo === p.tipo).slice(0, 1));
  const galleria = p.foto.map(([id, alt], i) => `<figure>${img(id, alt, { dove: 'scheda ' + p.id, lazy: i > 0, sizes: '(min-width: 960px) 30vw, 100vw' })}</figure>`).join('\n');
  const corpo = `
<div class="prodotto" data-id="${p.id}">
  <div class="prodotto-intro">
    <a class="indietro" href="index.html#drop">← Drop 001</a>
    <h1>${esc(p.nome)}</h1>
    <p class="colore">${esc(p.colore)}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
  </div>
  <div class="galleria galleria-${p.foto.length}">
${galleria}
  </div>
  <div class="prodotto-acquisto">
    <p class="prodotto-testo">${esc(p.testo)}</p>
    <fieldset class="taglie">
      <legend>Seleziona la taglia</legend>
      <div class="taglie-griglia">
${p.taglie.map(t => `        <label><input type="radio" name="taglia" value="${t}"><span>${t}</span></label>`).join('\n')}
      </div>
      <p class="taglie-errore" role="alert" hidden>Scegli una taglia.</p>
    </fieldset>
    <button class="btn btn-nero btn-largo" type="button" data-aggiungi>Aggiungi alla borsa</button>
    <details>
      <summary>Dettagli e materiali</summary>
      <ul>${p.dettagli.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </details>
    <details>
      <summary>Guida alle taglie</summary>
      <table class="guida">
        <thead><tr><th>Taglia</th><th>Torace (cm)</th><th>Lunghezza (cm)</th></tr></thead>
        <tbody>${p.taglie.map((t, i) => { const k = i + (p.tipo === 'polo' ? 1 : 0); return `<tr><td>${t}</td><td>${52 + k * 3}</td><td>${68 + k * 2}</td></tr>`; }).join('')}</tbody>
      </table>
      <p class="piccolo">Misure del capo steso, di esempio.</p>
    </details>
    <details>
      <summary>Spedizione e resi</summary>
      <p>Spedizione in Italia in 2–4 giorni lavorativi. Reso entro 14 giorni dalla consegna.</p>
    </details>
  </div>
</div>

<section class="completa" aria-labelledby="completa-titolo">
  <h2 id="completa-titolo" class="titolo">Completa il look</h2>
  <div class="griglia griglia-3">
${altri.map(x => scheda(x, 'scheda ' + x.id)).join('\n')}
  </div>
</section>`;
  return pagina({ titolo: `${p.nome} — MARO`, descrizione: `${p.nome}, ${p.colore}. Drop 001 MARO.`, corpo, file: p.id + '.html' });
}

fs.writeFileSync(path.join(ROOT, 'index.html'), home());
for (const p of CATALOGO) fs.writeFileSync(path.join(ROOT, p.id + '.html'), prodotto(p));

// foto preparate ma non usate (avviso, non errore)
const nonUsate = Object.keys(MISURE).filter(k => !usate.has(k) && k !== 'apertura-locandina');
console.log(`Pagine: ${1 + CATALOGO.length}. Foto usate: ${usate.size}.` + (nonUsate.length ? ' Non usate: ' + nonUsate.join(', ') : ''));
