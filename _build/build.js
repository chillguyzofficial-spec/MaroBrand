// Genera index.html + una pagina per capo.  Uso: node _build/build.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CATALOGO = require('./catalogo');
const MISURE = require('./foto-misure.json');
const V = '22'; // versione di css/js: aumentarla a ogni modifica pubblicata

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
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const euro = n => n.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' €';

function img(id, alt, { cls = '', lazy = true, dove, sizes = '100vw' } = {}) {
  usa(id, dove);
  const [w, h] = MISURE[id];
  return `<img src="${urlFoto(id)}" width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : (dove === 'home lookbook' ? ' decoding="async"' : ' fetchpriority="high"')} sizes="${sizes}">`;
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
<div class="avviso"><a href="index.html#iscriviti">Drop 001 disponibile ora — iscriviti per il prossimo</a></div>
<header class="testata">
  <a class="logo" href="index.html" aria-label="MARO, home">${SIMBOLO}<span>MARO</span></a>
  <nav class="menu" id="menu" aria-label="Menu principale">
    <a href="index.html#drop">Drop 001</a>
    <a href="index.html#polo">Polo</a>
    <a href="index.html#felpe">Felpe</a>
    <a href="storia.html">Il brand</a>
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
    <div class="piede-marchio">
      <a class="piede-logo" href="index.html" aria-label="MARO, home">${SIMBOLO}<span>MARO</span></a>
      <p>Streetwear da Milano.<br>Fly with your mind.</p>
    </div>
    <nav aria-label="Drop 001"><h2>Drop 001</h2><a href="index.html#polo">Polo</a><a href="index.html#felpe">Felpe</a><a href="index.html#lookbook">Lookbook</a></nav>
    <nav aria-label="MARO"><h2>MARO</h2><a href="storia.html">Il brand</a><a href="index.html#iscriviti">Accesso anticipato</a></nav>
    <nav aria-label="Aiuto"><h2>Aiuto</h2><a href="aiuto.html#spedizioni">Spedizioni</a><a href="aiuto.html#resi">Resi</a><a href="aiuto.html#taglie">Guida alle taglie</a><a href="aiuto.html#contatti">Contatti</a></nav>
    <div><h2>Social</h2><p>Instagram e TikTok in arrivo</p></div>
  </div>
  <div class="piede-basso">
    <span>© 2026 MARO · Milano</span>
    <span class="nota">Anteprima di presentazione: prezzi, materiali e testi sono di esempio.</span>
    <span class="piede-paese">Italia · EUR €</span>
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
<script>window.MARO_CATALOGO=${JSON.stringify(CATALOGO.map(p => ({ id: p.id, nome: p.nome, colore: p.colore, prezzo: p.prezzo, foto: p.copertina[0], src: urlFoto(p.copertina[0]) })))};</script>
</body>
</html>
`;
}

function scheda(p, dove) {
  const [fid, alt] = p.copertina;
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
  <video class="apertura-video" data-copia muted playsinline preload="auto" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" aria-hidden="true" tabindex="-1">
    <source src="assets/video/home-metro-1.mp4" type="video/mp4">
  </video>
  <div class="apertura-testo">
    <p class="occhiello">Streetwear · Milano</p>
    <h1>Fly with<br>your mind</h1>
    <p>Drop 001. Polo e felpe, disponibili ora.</p>
    <div class="pulsanti">
      <a class="btn btn-bianco" href="#drop">Acquista il drop</a>
      <a class="btn btn-contorno" href="storia.html">Il brand</a>
    </div>
  </div>
</section>

<section class="categorie" aria-label="Categorie">
  <a class="categoria" href="#polo">
    ${img('categoria-polo', 'Polo nera MARO appesa, retro con le ali', { dove: 'home categorie', sizes: '(min-width: 960px) 50vw, 100vw' })}
    <span class="categoria-testo"><span class="categoria-nome">Polo</span><span class="categoria-vai">Acquista</span></span>
  </a>
  <a class="categoria" href="#felpe">
    ${img('categoria-felpe', 'Ragazzo con felpa grigia MARO davanti a una parete verde', { dove: 'home categorie', sizes: '(min-width: 960px) 50vw, 100vw' })}
    <span class="categoria-testo"><span class="categoria-nome">Felpe</span><span class="categoria-vai">Acquista</span></span>
  </a>
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

<section class="vantaggi" aria-label="Acquistare su MARO">
  <ul>
    <li><strong>Spedizione in 2–4 giorni</strong><span>in tutta Italia</span></li>
    <li><strong>Reso entro 14 giorni</strong><span>se la taglia non va</span></li>
    <li><strong>Pagamento sicuro</strong><span>carta, PayPal, Apple Pay</span></li>
    <li><strong>Guida alle taglie</strong><a href="aiuto.html#taglie">trova la tua misura</a></li>
  </ul>
</section>

<section class="campagna" aria-labelledby="campagna-titolo">
  <div class="campagna-foto">${img('campagna-due-ragazzi', 'Due ragazzi con felpe MARO appoggiati a una ringhiera in un parco di Milano', { dove: 'home campagna', sizes: '(min-width: 960px) 50vw, 100vw' })}</div>
  <div class="campagna-testo">
    <h2 id="campagna-titolo" class="titolo titolo-xl">Fatto<br>per la<br>città.</h2>
    <p class="campagna-sotto">Polo e felpe pensate per tutti i giorni: dal lavoro alla sera, senza cambiarsi.</p>
  </div>
</section>

<section class="storia" id="storia" aria-labelledby="storia-titolo">
  <div class="storia-testo">
    <span class="linguetta" aria-hidden="true"></span>
    <h2 id="storia-titolo" class="titolo">Dietro<br>il segno</h2>
    <p>Cosa significano le ali, perché una stretta di mano e come nasce ogni capo MARO.</p>
    <a class="btn btn-nero" href="storia.html">Scopri il brand</a>
  </div>
  <div class="storia-foto">${img('scena-ricamo-mani', 'Mani al lavoro su una ricamatrice che ricama la scritta MARO', { dove: 'home brand', sizes: '(min-width: 960px) 50vw, 100vw' })}</div>
</section>

<section class="lookbook" id="lookbook" aria-labelledby="lookbook-titolo">
  <div class="lookbook-testa">
    <div><h2 id="lookbook-titolo" class="titolo">Lookbook</h2><p>Drop 001 · Milano</p></div>
    <div class="lb-comandi">
      <span class="lb-conta" aria-live="polite"></span>
      <button class="lb-freccia" type="button" data-lb="-1" aria-label="Foto precedenti">‹</button>
      <button class="lb-freccia" type="button" data-lb="1" aria-label="Foto successive">›</button>
    </div>
  </div>
  <div class="lb-vetrina" aria-label="Foto del lookbook">
    <div class="lb-binario">
${lb.map(([id, alt], i) => `      <figure aria-label="Foto ${i + 1} di ${lb.length}">${img(id, alt, { dove: 'home lookbook', lazy: false, sizes: '(min-width: 960px) 32vw, 100vw' })}</figure>`).join('\n')}
    </div>
  </div>
</section>

<section class="iscriviti" id="iscriviti" aria-labelledby="iscriviti-titolo">
  <div class="iscriviti-testo">
  <h2 id="iscriviti-titolo" class="titolo">Non perdere il prossimo drop</h2>
  <p class="iscriviti-sotto">Ti avvisiamo prima dell’uscita, con la data e i capi in anteprima. Niente spam.</p>
  <form class="iscriviti-form" novalidate>
    <label for="email" class="sr">La tua email</label>
    <input id="email" name="email" type="email" autocomplete="email" placeholder="La tua email" required>
    <button class="btn btn-nero" type="submit">Iscriviti</button>
    <p class="esito" role="status" aria-live="polite"></p>
  </form>
  </div>
  <figure class="iscriviti-foto">${img('scena-capi-maro', 'Felpe e polo MARO disposte sul marmo a comporre la scritta MARO', { dove: 'home iscrizione', sizes: '(min-width: 960px) 45vw, 100vw' })}</figure>
</section>`;
  return pagina({ titolo: 'MARO — Fly with your mind · Drop 001', descrizione: 'MARO, streetwear da Milano. Drop 001: polo e felpe disponibili ora. Fly with your mind.', corpo, file: 'index.html' });
}

// ---------- SCHEDA PRODOTTO ----------
function prodotto(p) {
  const altri = CATALOGO.filter(x => x.id !== p.id && x.tipo !== p.tipo).slice(0, 2)
    .concat(CATALOGO.filter(x => x.id !== p.id && x.tipo === p.tipo).slice(0, 1));
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
${p.foto.map(([id, alt], i) => `      <button type="button" data-foto="${i}" aria-label="Foto ${i + 1}: ${esc(alt)}"${i ? '' : ' aria-current="true"'}><img src="${urlFoto(id)}" alt="" width="80" height="100" loading="lazy" decoding="async"></button>`).join('\n')}
    </div>`;
  const galleria = `    <div class="vetrina" aria-label="Foto di ${esc(p.nome)}">
      <div class="vetrina-binario">
${foto}
      </div>${comandi}
    </div>${miniature}`;
  const corpo = `
<div class="prodotto" data-id="${p.id}">
  <div class="prodotto-intro">
    <a class="indietro" href="index.html#drop">← Drop 001</a>
    <h1>${esc(p.nome)}</h1>
    <p class="colore">${esc(p.colore)}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
  </div>
  <div class="galleria" data-n="${p.foto.length}">
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
      <p>Spedizione in Italia in 2–4 giorni lavorativi. Reso entro 14 giorni dalla consegna. <a class="link" href="aiuto.html#resi">Tutti i dettagli</a></p>
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
${domanda('Quanto costa la spedizione?', 'Il costo è mostrato nella borsa, prima di pagare. Nessuna sorpresa alla fine.')}
${domanda('Come posso pagare?', 'Carta di credito o di debito, PayPal e Apple Pay. Il pagamento è protetto e non vediamo mai i dati della tua carta.')}
    </div>
  </section>

  <section class="aiuto-tema" id="resi" aria-labelledby="t-resi">
    <div class="aiuto-tema-testa"><h2 id="t-resi">Resi e rimborsi</h2><p>Hai 14 giorni dalla consegna per cambiare idea.</p></div>
    <div class="domande">
${domanda('Come faccio un reso?', 'Scrivici con il numero d’ordine: ti mandiamo l’etichetta e le istruzioni. Il capo deve essere integro e con il cartellino.')}
${domanda('Posso cambiare taglia?', 'Sì: fai il reso del capo e ordina la taglia giusta. Se la taglia è esaurita, ti avvisiamo appena torna.')}
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
      <p class="piccolo">Tra due taglie? Per una vestibilità più comoda scegli la più grande.</p>
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

// ---------- STORIA (testi provvisori: da completare con le parole del fondatore) ----------
function storia() {
  const corpo = `
<section class="st-hero" aria-labelledby="st-titolo">
  <figure class="st-hero-foto">${img('scena-dolomiti', 'Due ragazzi con felpe MARO di spalle davanti alle Dolomiti', { dove: 'brand apertura', lazy: false, sizes: '100vw' })}</figure>
  <div class="st-hero-testo">
    <p class="occhiello">Il brand</p>
    <h1 id="st-titolo">Nati<br>a Milano.</h1>
    <p class="st-lead">MARO fa streetwear essenziale: linee pulite e un segno che si riconosce da lontano. Per chi vive la città ogni giorno <strong>e tiene la testa alta.</strong></p>
  </div>
</section>

<section class="st-blocco st-chiaro" aria-labelledby="st-c1">
  <div class="st-testo">
    <div class="st-num" aria-hidden="true">01</div>
    <h2 id="st-c1">Il segno</h2>
    <p>Una M, due ali. È il simbolo che firma ogni capo MARO: sul petto delle polo, sui cartellini, sulle etichette.</p>
    <p>Accanto vive la firma verticale, con le sue fiamme. La usiamo in grande, sulla schiena, dove deve farsi vedere.</p>
  </div>
  <div class="st-media st-confronto">
    <figure class="st-simbolo"><svg viewBox="0 0 200 150" role="img" aria-label="Il simbolo MARO: una M con due ali"><use href="#maro-simbolo"/></svg><figcaption>Il simbolo</figcaption></figure>
    <figure class="st-firma"><svg viewBox="0 0 200 560" role="img" aria-label="La firma verticale MARO con le fiamme"><use href="#maro-firma"/></svg><figcaption>La firma</figcaption></figure>
  </div>
</section>

<section class="st-blocco st-scuro st-inverso" aria-labelledby="st-c2">
  <div class="st-testo">
    <div class="st-num" aria-hidden="true">02</div>
    <h2 id="st-c2">Testa alta.<br>Sempre.</h2>
    <p>“Fly with your mind” non è solo una scritta sulla maglia. È un modo di vivere la città: tra lavoro, metro e notti lunghe, con la testa sempre un passo avanti. <strong>Le ali stanno lì per ricordarlo.</strong></p>
  </div>
  <figure class="st-media">${img('scena-orizzonte', 'Ragazzo con felpa MARO di spalle in cima a una montagna guarda l’orizzonte', { dove: 'brand testa alta', sizes: '(min-width: 960px) 45vw, 100vw' })}</figure>
</section>

<section class="st-blocco st-grigio" aria-labelledby="st-c3">
  <div class="st-testo">
    <div class="st-num" aria-hidden="true">03</div>
    <h2 id="st-c3">Rispetto</h2>
    <p>La stretta di mano è il secondo segno di MARO. Due persone, un patto: rispetto per chi hai accanto.</p>
    <p>In strada vale più di qualsiasi logo. Per questo l’abbiamo stampata in grande, sulla schiena della felpa grigia.</p>
    <a class="link" href="felpa-stretta.html">Felpa Stretta di mano</a>
  </div>
  <figure class="st-media">${img('storia-stretta-di-mano', 'Due ragazzi si stringono la mano in un parco di Milano, uno indossa una felpa MARO', { dove: 'brand rispetto', sizes: '(min-width: 960px) 45vw, 100vw' })}</figure>
</section>

<section class="st-valori" aria-labelledby="st-c4">
  <div class="st-num" aria-hidden="true">04</div>
  <h2 id="st-c4">Come lavoriamo</h2>
  <ul>
    <li><figure>${img('scena-citta', 'Ragazzo con felpa MARO di spalle in un parco di Milano', { dove: 'brand lavoro', sizes: '(min-width: 960px) 30vw, 100vw' })}</figure><span class="st-passo">01</span><h3>Disegnato a Milano</h3><p>Ogni grafica nasce in studio e viene provata sul capo, da vicino e da lontano, prima di andare in produzione.</p></li>
    <li><figure>${img('scena-ricamo-vicino', 'Una macchina ricama la scritta MARO su una felpa', { dove: 'brand lavoro', sizes: '(min-width: 960px) 30vw, 100vw' })}</figure><span class="st-passo">02</span><h3>Ricamato dove conta</h3><p>Sulle polo simbolo e firma sono ricamati, non stampati: durano nel tempo, lavaggio dopo lavaggio.</p></li>
    <li><figure>${img('scena-showroom', 'Felpe e polo MARO appese in uno showroom scuro', { dove: 'brand lavoro', sizes: '(min-width: 960px) 30vw, 100vw' })}</figure><span class="st-passo">03</span><h3>Solo drop</h3><p>Niente collezioni di stagione: escono pochi capi alla volta, solo quando sono pronti. Finito un drop, si passa al successivo.</p></li>
  </ul>
</section>

<section class="st-fine" aria-labelledby="st-fine">
  <div class="st-fine-testo"><svg class="st-fine-simbolo" viewBox="0 0 200 150" aria-hidden="true"><use href="#maro-simbolo"/></svg><h2 id="st-fine">Indossa il segno.</h2></div>
  <a class="btn btn-bianco" href="index.html#drop">Acquista il drop</a>
</section>`;
  return pagina({ titolo: 'Il brand — MARO', descrizione: 'MARO, streetwear nato a Milano: il segno, il rispetto e il modo in cui nasce ogni capo.', corpo, file: 'storia.html' });
}

fs.writeFileSync(path.join(ROOT, 'index.html'), home());
fs.writeFileSync(path.join(ROOT, 'aiuto.html'), aiuto());
fs.writeFileSync(path.join(ROOT, 'storia.html'), storia());
for (const p of CATALOGO) fs.writeFileSync(path.join(ROOT, p.id + '.html'), prodotto(p));

// foto preparate ma non usate (avviso, non errore)
const nonUsate = Object.keys(MISURE).filter(k => !usate.has(k) && k !== 'apertura-locandina');
console.log(`Pagine: ${3 + CATALOGO.length}. Foto usate: ${usate.size}.` + (nonUsate.length ? ' Non usate: ' + nonUsate.join(', ') : ''));
