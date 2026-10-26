// Prepara le immagini del sito da design-source/ → assets/foto/ (webp).
// Ritagli, bianco e nero con grana per le foto di campagna, fotogrammi dai video.
// Uso: node _build/foto.js   (usa Edge tramite Playwright installato nel progetto Hedoné)
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.resolve(__dirname, '../../hedonè progetto serio/node_modules/playwright'));

const SRC = path.resolve(__dirname, '../design-source');
const OUT = path.resolve(__dirname, '../assets/foto');
fs.mkdirSync(OUT, { recursive: true });

// crop: [x, y, w, h] in pixel della sorgente · bn: bianco e nero con grana · t: secondo del video
const LAVORI = [
  // prodotti (a colori, 4:5) — render set 2 del 12/10 + vecchi ritagli dove non ci sono render
  { out: 'polo-linee-fronte', src: 'foto-set-2-2026-10-12/844979170_1484340676849877_4314181911587208056_n.webp' },
  { out: 'polo-linee-retro', src: 'foto-set-2-2026-10-12/844630786_2274440500013051_2574921512573776104_n.webp' },
  { out: 'polo-linee-lato', src: 'foto-set-2-2026-10-12/846729154_1328455792575119_3681129651427690667_n.webp' },
  { out: 'polo-linee-tre-quarti', src: 'foto-set-2-2026-10-12/848455857_2614018082373794_6614527628984696990_n.webp' },
  { out: 'polo-tricolore-fronte', src: 'foto-set-2-2026-10-12/844279053_1155327820406880_764553782245653081_n.webp' },
  { out: 'polo-tricolore-retro', src: 'foto-set-2-2026-10-12/843980820_2203736513860866_3177360006066256744_n.webp' },
  { out: 'polo-tricolore-lato', src: 'foto-set-2-2026-10-12/845363612_27058171763881222_4437336543937843483_n.webp' },
  { out: 'polo-tricolore-dettaglio', src: 'foto-set-2-2026-10-12/844861463_2368147683717115_233577849421255923_n.webp' },
  { out: 'felpa-stretta-retro', src: 'foto-set-2-2026-10-12/843980819_1746234016485749_8440262151992339185_n.webp' },
  { out: 'felpa-stretta-tre-quarti', src: 'foto-set-2-2026-10-12/846569898_1634036261559273_1035113113446627478_n.webp' },
  { out: 'felpa-stretta-fronte', src: 'foto-set-2-2026-10-12/848027522_1451170926908925_6783953235368109804_n.webp' },
  { out: 'felpa-firma-retro', src: 'foto-set-2-2026-10-12/844072147_1810124660318198_7017883015441705205_n.webp' },
  { out: 'felpa-firma-tre-quarti', src: 'foto-set-2-2026-10-12/844861471_4656824397880401_7427535886801104678_n.webp' },
  { out: 'felpa-firma-fronte', src: 'foto-set-2-2026-10-12/847420150_1406026624930256_5378025056577203795_n.webp' },
  // Felpa Verticale (verde bottiglia): render set 4 + vecchia foto in montagna
  { out: 'felpa-verticale-manichino', src: 'foto-schede-palazzo-2026-10-19/felpa-verticale-manichino.jpeg', crop: [1, 0, 1280, 1600] }, // dal 19/10 manichino nel palazzo (prima: set 4)
  { out: 'felpa-verticale-fronte', src: 'foto-schede-palazzo-2026-10-19/felpa-verticale-fronte.jpeg', crop: [2, 0, 1292, 1615] }, // dal 19/10 nel palazzo (prima: set 4)
  { out: 'copertina-felpa-verticale', src: 'foto-copertine-2026-10-19/felpa-verticale.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  { out: 'felpa-verticale-montagna', src: 'mockup-ai/felpa-nera-montagne.jpg', crop: [194, 0, 690, 863] },
  // Polo Jacquard: render set 3 (N1 manichino, N3 tre quarti; N2 senza manichino = copertina)
  { out: 'polo-jacquard-manichino', src: 'foto-set-3-2026-10-12/842309532_1786625739245873_7983844797197221728_n.webp' },
  { out: 'polo-jacquard-tre-quarti', src: 'foto-set-3-2026-10-12/848027522_1150423370653244_5846329442587009076_n.webp' },
  { out: 'copertina-polo-jacquard', src: 'foto-copertine-2026-10-19/polo-jacquard.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  // copertine della home: SENZA manichino (richiesta di Francesco 12/10)
  { out: 'copertina-polo-linee', src: 'foto-copertine-2026-10-19/polo-linee.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  { out: 'copertina-polo-tricolore', src: 'foto-copertine-2026-10-19/polo-tricolore.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  { out: 'copertina-felpa-stretta', src: 'foto-copertine-2026-10-19/felpa-stretta.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  { out: 'copertina-felpa-firma', src: 'foto-copertine-2026-10-19/felpa-firma.webp', }, // dal 19/10, intera 9:16 (Francesco: non tagliare)
  // pantaloni di prova (19/10, README in foto-pantaloni-2026-10-19)
  { out: 'pant-cargo-copertina', src: 'foto-pantaloni-2026-10-19/cargo-indossato-strada.webp' },
  { out: 'pant-cargo-piegato', src: 'foto-pantaloni-2026-10-19/cargo-piegato.webp' },
  { out: 'pant-cargo-appeso', src: 'foto-pantaloni-2026-10-19/cargo-appeso.webp' },
  // accessori di prova (19/10, README in foto-accessori-2026-10-19)
  { out: 'acc-cappellino-copertina', src: 'foto-logo-nuovo-2026-10-19/cappellino-fronte.webp' },
  { out: 'acc-cappellino-tre-quarti', src: 'foto-logo-nuovo-2026-10-19/cappellino-tre-quarti.webp' },
  { out: 'acc-cappellino-dettaglio', src: 'foto-logo-nuovo-2026-10-19/cappellino-dettaglio.webp' },
  { out: 'acc-berretto-copertina', src: 'foto-logo-nuovo-2026-10-19/berretto-fronte.webp' },
  { out: 'acc-berretto-lato', src: 'foto-logo-nuovo-2026-10-19/berretto-lato.webp' },
  { out: 'acc-berretto-dettaglio', src: 'foto-logo-nuovo-2026-10-19/berretto-dettaglio.webp' },
  { out: 'acc-berretto-fronte', src: 'foto-logo-nuovo-2026-10-19/berretto-fronte-2.webp' },
  { out: 'acc-borraccia-copertina', src: 'foto-accessori-2026-10-19/borraccia-fronte.webp' }, // logo girato di lato: non più usata dal 19/10
  { out: 'acc-borraccia-dritta', src: 'foto-logo-nuovo-2026-10-19/borraccia-fronte-dritta.webp' }, // copertina dal 19/10: logo dritto di fronte
  { out: 'acc-borraccia-inclinata', src: 'foto-logo-nuovo-2026-10-19/borraccia-inclinata.webp' },
  { out: 'acc-borraccia-dettaglio', src: 'foto-logo-nuovo-2026-10-19/borraccia-dettaglio.webp' },
  // categorie della home dal 19/10: una città per categoria (README in foto-categorie-2026-10-19)
  { out: 'cat-polo', src: 'foto-categorie-2026-10-19/1-polo-jacquard-milano.webp' },
  { out: 'cat-felpe', src: 'foto-categorie-2026-10-19/3-felpa-verde-firenze.webp' },
  { out: 'cat-pantaloni', src: 'foto-categorie-2026-10-19/4-pantaloni-cargo-napoli.webp' },
  { out: 'cat-accessori', src: 'foto-logo-nuovo-2026-10-19/5-cappellino-ali-venezia.webp', crop: [173, 0, 1126, 1408] },
  // categorie in home fino al 18/10 (non più usate)
  { out: 'categoria-polo', src: 'mockup-ai/polo-nere-tre.jpg', crop: [1330, 50, 620, 775] },
  { out: 'categoria-felpe', src: 'foto-reali/felpa-grigia-parete-verde.jpg', crop: [65, 0, 1076, 1345] },
  // pagina Storia (bianco e nero con grana, proporzioni originali; lo schizzo resta a colori)
  // scene (set 5 del 12/10): campagna e pagina del brand, a colori, senza tagli
  { out: 'scena-ricamo-mani', src: 'foto-set-5-2026-10-12/845684221_1655451425975308_3820682003388145130_n.webp' },
  // Dietro il segno dal 19/10: ricamo con il logo di Omar (README in foto-dietro-il-segno-2026-10-19)
  { out: 'segno-scena-1', src: 'foto-logo-nuovo-2026-10-19/orizzontale-1-telaio-nero.webp', crop: [0, 2, 2096, 1179], max: 2048 },
  { out: 'segno-scena-2', src: 'foto-logo-nuovo-2026-10-19/orizzontale-2-polo-jacquard.webp', crop: [0, 2, 2096, 1179], max: 2048 },
  { out: 'segno-ricamo-logo', src: 'foto-dietro-il-segno-2026-10-19/dietro-il-segno-logo-omar.webp' },
  { out: 'scena-capi-maro', src: 'foto-set-5-2026-10-12/846966136_2610599519436733_3385366467222422541_n.webp' }, // MARO orizzontale coi capi: sostituita il 19/10
  { out: 'scena-composizione', src: 'foto-logo-nuovo-2026-10-19/composizione-capi-accessori-marmo.webp' }, // iscrizione in home dal 19/10 (Francesco)
  { out: 'scena-orizzonte', src: 'foto-set-5-2026-10-12/846053658_1783488912923974_9001021024052174187_n.webp' },
  { out: 'scena-dolomiti', src: 'foto-set-5-2026-10-12/845962368_1854137572601714_822437747464123275_n.webp', max: 2048, q: 0.86 },
  { out: 'scena-citta', src: 'foto-set-5-2026-10-12/846613319_4604241063165391_3335941884249520016_n.webp' },
  { out: 'scena-ricamo-vicino', src: 'foto-set-5-2026-10-12/846671117_924186993887815_3303255480979063179_n.webp' },
  { out: 'scena-showroom', src: 'foto-set-5-2026-10-12/840312014_28569449039377509_7023473326715691606_n.webp' },
  // lookbook (set 6, Milano, 4:5)
  { out: 'lb-galleria', src: 'foto-set-6-lookbook-2026-10-12/843937776_1142786151551774_7865409833358537198_n.webp' },
  { out: 'lb-citylife-tramonto', src: 'foto-set-6-lookbook-2026-10-12/846024298_1693017522427463_5236299039848534645_n.webp' },
  { out: 'lb-duomo-coppia', src: 'foto-set-6-lookbook-2026-10-12/844008261_1143757978215727_2040360599069335891_n.webp' },
  { out: 'lb-citylife-strada', src: 'foto-set-6-lookbook-2026-10-12/844630781_1687321869479481_5290674282119455048_n.webp' },
  { out: 'lb-galleria-sera', src: 'foto-set-6-lookbook-2026-10-12/844498036_1792152842070288_2275089470874845541_n.webp' },
  { out: 'lb-panchina', src: 'foto-set-6-lookbook-2026-10-12/848027518_1394028379580796_8595108630778463954_n.webp' },
  { out: 'lb-muro-duomo', src: 'foto-set-6-lookbook-2026-10-12/848310828_2377284119345501_5890415487277954341_n.webp' },
  { out: 'lb-pista', src: 'foto-set-6-lookbook-2026-10-12/847555109_2232195931054454_393029917893088234_n.webp' },
  // campagna, storia, lookbook (bianco e nero con grana, proporzioni originali)
  { out: 'campagna-due-ragazzi', src: 'foto-reali/due-ragazzi-parco-ringhiera.jpg' },
  { out: 'storia-stretta-di-mano', src: 'foto-reali/stretta-di-mano-parco.jpg' },
  // pagina del brand, struttura "I segni" (13/10): foto mai usate prima, intere
  // home › Tiratura limitata (14/10): tre capi appesi in tre posti, 4:5 interi
  { out: 'tir-jacquard', src: 'foto-tiratura-2026-10-14/846671120_1085441171022353_6506936060070174390_n.webp' },
  { out: 'tir-tricolore', src: 'foto-tiratura-2026-10-14/848391520_2586203298490276_8227519206258409952_n.webp' },
  { out: 'tir-verticale', src: 'foto-tiratura-2026-10-14/848652338_955875450907660_6273583632672960041_n.webp' },
  { out: 'segno-ali', src: 'foto-set-5-2026-10-12/847805131_1768248471058589_4644519022755093556_n.webp' },
  { out: 'segno-firma-metro', src: 'mockup-ai/metro-insegna-colonna.jpg' },
  // pagina del brand, struttura Gucci/Nike (13/10 sera): set 7 di Francesco + stretta di mano vera portata a 4:5
  { out: 'brand-ali', src: 'foto-set-7-brand-2026-10-13/845544434_1504806778073680_1509547925904962727_n.webp' },
  { out: 'brand-firma', src: 'foto-set-7-brand-2026-10-13/848498400_2565039890682567_9093410238897195326_n.webp' },
  { out: 'brand-stretta', src: 'foto-reali/stretta-di-mano-parco.jpg', crop: [65, 0, 1076, 1345] },
  { out: 'brand-banner', src: 'foto-set-7-brand-2026-10-13/847388252_3001004070249275_6814422014820926890_n.webp', max: 2048, q: 0.86 },
  // pagina del brand v4 (19/10): una foto per sport, intere (README in foto-brand-2026-10-19)
  { out: 'bn-tennis', src: 'foto-logo-nuovo-2026-10-19/1-tennis-servizio-colonne-polo-tricolore.webp', crop: [0, 0, 1920, 1120], max: 1920, q: 0.86 }, // un filo più bassa (richiesta di Francesco): si toglie solo il fondo, pallina e racchetta intere
  { out: 'bn-corsa', src: 'foto-logo-nuovo-2026-10-19/2-corsa-colosseo-polo-linee.webp', max: 1920, q: 0.86 },
  { out: 'bn-basket', src: 'foto-logo-nuovo-2026-10-19/3-basket-duomo-jacquard-cargo.webp', max: 1600 },
  { out: 'bn-boxe', src: 'foto-brand-2026-10-19/4-boxe-palestra-jacquard-cargo.webp', max: 1600 },
  { out: 'bn-allenamento', src: 'foto-logo-nuovo-2026-10-19/5-allenamento-felpa-verticale-borraccia.webp', max: 1600 },
  { out: 'bn-ali', src: 'foto-logo-nuovo-2026-10-19/6-cappellino-borraccia-polo-linee.webp', max: 1600 },
  // manifesto di Omar (21/10, README in disegni-omar-2026-10-21), nel suo ordine. Due versioni per disegno:
  // bm-N = il segno in negativo (bianco su nero, si fonde col fondo della sezione), bm-N-foglio = la foto del foglio in B/N con grana ("Guarda il foglio")
  ...[
    ['1-m-alata.jpeg', [102, 205, 1188, 1004]], // solo il disegno, senza mezza pagina vuota
    ['2-maro-verticale.jpeg'], ['3-cartamodello-misure.jpeg'], ['4-ali-matita.jpeg'], ['5-versione-finale.jpeg'],
  ].flatMap(([f, crop], i) => [
    { out: 'bm-' + (i + 1), src: 'disegni-omar-2026-10-21/' + f, crop, segno: {} },
    { out: 'bm-' + (i + 1) + '-foglio', src: 'disegni-omar-2026-10-21/' + f, crop, bn: true },
  ]),
  // carosello di «Le ali» (21/10, README in foto-ali-carosello-2026-10-21): ~500 px, nessun ritaglio
  ...['1-cappellino-borraccia', '2-in-piedi-palazzo', '3-firma-petto-dettaglio', '4-cappellino-dettaglio', '5-di-spalle', '6-seduto-scale'].map((n, i) => ({ out: 'ali-' + (i + 1), src: 'foto-ali-carosello-2026-10-21/' + n + '.png', q: 0.9 })),
  // copertine delle schede dal 19/10: foto della campagna sportiva ritagliate in 4:5 sul capo (scelta di Francesco:
  // stessa campagna della pagina del brand, eccezione voluta alla regola delle foto doppie; ritagli diversi, id diversi)
  { out: 'cop-polo-linee', src: 'foto-logo-nuovo-2026-10-19/2-corsa-colosseo-polo-linee.webp', crop: [340, 0, 1024, 1280] },
  { out: 'cop-polo-tricolore', src: 'foto-logo-nuovo-2026-10-19/1-tennis-servizio-colonne-polo-tricolore.webp', crop: [262, 0, 1024, 1280] },
  { out: 'cop-polo-jacquard', src: 'foto-brand-2026-10-19/4-boxe-palestra-jacquard-cargo.webp', crop: [0, 180, 1184, 1480] },
  { out: 'cop-felpa-verticale', src: 'foto-logo-nuovo-2026-10-19/5-allenamento-felpa-verticale-borraccia.webp', crop: [0, 120, 1280, 1600] },
  { out: 'cop-cargo-firma', src: 'foto-logo-nuovo-2026-10-19/3-basket-duomo-jacquard-cargo.webp', crop: [0, 160, 1280, 1600] },
  { out: 'cop-cappellino-ali', src: 'foto-logo-nuovo-2026-10-19/6-cappellino-borraccia-polo-linee.webp', crop: [169, 0, 1126, 1408] },
  { out: 'cop-felpa-firma', src: 'foto-logo-nuovo-2026-10-19/7-basket-duomo-felpa-firma.webp', crop: [2, 0, 1292, 1615] },
  { out: 'cop-felpa-stretta', src: 'foto-logo-nuovo-2026-10-19/8-boxe-felpa-stretta-di-mano.webp', crop: [2, 0, 1292, 1615] },
  // copertine delle schede in palazzo (19/10, README in foto-schede-palazzo-2026-10-19); la foto sportiva va al passaggio del mouse
  { out: 'pal-polo-linee', src: 'foto-schede-palazzo-2026-10-19/polo-linee.webp', crop: [2, 0, 1292, 1615] },
  { out: 'pal-polo-tricolore', src: 'foto-schede-palazzo-2026-10-19/polo-tricolore.webp', crop: [2, 0, 1292, 1615] },
  { out: 'pal-polo-jacquard', src: 'foto-schede-palazzo-2026-10-19/polo-jacquard.webp', crop: [2, 0, 1292, 1615] },
  { out: 'pal-felpa-firma', src: 'foto-schede-palazzo-2026-10-19/felpa-firma.webp', crop: [2, 0, 1292, 1615] },
  { out: 'pal-felpa-stretta', src: 'foto-schede-palazzo-2026-10-19/felpa-stretta.webp', crop: [2, 0, 1292, 1615] },
  { out: 'pal-cargo-firma', src: 'foto-schede-palazzo-2026-10-19/cargo-firma.jpeg', crop: [2, 0, 1292, 1615] },
  { out: 'pal-felpa-verticale', src: 'foto-schede-palazzo-2026-10-19/felpa-verticale.jpeg', crop: [2, 0, 1292, 1615] },
  // locandina del video d'apertura (mostrata finché il video non parte)
  { out: 'apertura-locandina', src: 'video-home/home-metro-vidu-2026-10-26.mp4', t: 0.05, max: 1920, q: 0.92 },
  // pagina del brand (21/10): fotogramma fisso del video del tennista (finché il video non parte, e con «riduci movimento»)
  { out: 'bn-tennis-rovescio', src: 'foto-brand-2026-10-21/tennis-rovescio-polo-tricolore.png', max: 1536, q: 0.88 }, // apertura del brand dal 21/10 notte (al posto del video)
  { out: 'bn-tennis-locandina', src: 'video-brand-2026-10-21/tennis-swing-colore-selettivo.mp4', t: 0.1, max: 864, q: 0.9 },
  // 22/10: collage di Francesco (Polo Tricolore allo stadio) diviso in due scatti per la pagina del brand; giuntura tra x 767 e 768
  { out: 'brand-stadio-fronte', src: 'foto-polo-tricolore-2026-10-22/collage-stadio-fronte-retro.png', crop: [0, 0, 765, 1024] },
  { out: 'brand-stadio-retro', src: 'foto-polo-tricolore-2026-10-22/collage-stadio-fronte-retro.png', crop: [770, 0, 766, 1024] },
];

const srv = http.createServer((q, r) => {
  const f = path.join(SRC, decodeURIComponent(q.url.split('?')[0]));
  if (q.url === '/__vuota') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>foto</title>'); }
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  const size = fs.statSync(f).size, type = /mp4$/.test(f) ? 'video/mp4' : /webp$/.test(f) ? 'image/webp' : 'image/jpeg';
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  if (m) {
    const a = +m[1], b = m[2] ? +m[2] : size - 1;
    r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(r);
  }
  r.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  fs.createReadStream(f).pipe(r);
}).listen(8981);

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage();
  await p.goto('http://localhost:8981/__vuota');
  // SOLO=nome1,nome2 → prepara solo quelle foto (le altre restano come sono)
  const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
  for (const l of LAVORI.filter(l => !SOLO || SOLO.includes(l.out))) {
    const dataUrl = await p.evaluate(async (l) => {
      let el, W, H;
      const url = '/' + l.src.split('/').map(encodeURIComponent).join('/');
      if (/\.mp4$/.test(l.src)) {
        el = document.createElement('video'); el.muted = true; el.preload = 'auto'; el.src = url;
        await new Promise((ok, ko) => { el.onloadeddata = ok; el.onerror = () => ko(new Error('video ' + l.src)); });
        await new Promise(ok => { el.onseeked = ok; el.currentTime = l.t; });
        W = el.videoWidth; H = el.videoHeight;
      } else {
        el = new Image(); el.src = url; await el.decode(); W = el.naturalWidth; H = el.naturalHeight;
      }
      const [x, y, w, h] = l.crop || [0, 0, W, H];
      const max = l.max || 1400, k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(el, x, y, w, h, 0, 0, c.width, c.height);
      if (l.segno) {
        // disegno in negativo (manifesto 21/10): tratto bianco su nero pieno. Ogni pixel si confronta con il foglio intorno
        // (copia molto sfocata): ombre e luce non uniforme del foglio spariscono, resta solo quanto il tratto è più scuro della carta
        const f2 = document.createElement('canvas'); f2.width = c.width; f2.height = c.height;
        const g2 = f2.getContext('2d'); g2.filter = 'blur(' + Math.round(Math.max(c.width, c.height) / 40) + 'px)'; g2.drawImage(c, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height), px = d.data, fo = g2.getImageData(0, 0, c.width, c.height).data;
        const L = (a, i) => 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
        const soglia = l.segno.soglia || 12, guadagno = l.segno.guadagno || 3.2;
        for (let i = 0; i < px.length; i += 4) {
          const v = Math.max(0, Math.min(255, (L(fo, i) - L(px, i) - soglia) * guadagno));
          px[i] = px[i + 1] = px[i + 2] = v;
        }
        g.putImageData(d, 0, 0);
      } else if (l.bn || l.out === 'apertura-locandina') {
        const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
        let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < px.length; i += 4) {
          let v = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (l.bn) { v = (v - 128) * 1.12 + 128 + (rnd() - 0.5) * 22; } // contrasto + grana
          v = Math.max(0, Math.min(255, v));
          px[i] = px[i + 1] = px[i + 2] = v;
        }
        g.putImageData(d, 0, 0);
      }
      // versione piccola (640 px) per telefoni e griglie
      let piccola = null;
      if (c.width > 700) { const p = document.createElement('canvas'); p.width = 640; p.height = Math.round(c.height * 640 / c.width); const pg = p.getContext('2d'); pg.imageSmoothingQuality = 'high'; pg.drawImage(c, 0, 0, p.width, p.height); piccola = p.toDataURL('image/webp', 0.8); }
      return { url: c.toDataURL('image/webp', l.q || 0.82), w: c.width, h: c.height, piccola };
    }, l);
    fs.writeFileSync(path.join(OUT, l.out + '.webp'), Buffer.from(dataUrl.url.split(',')[1], 'base64'));
    const pic = path.join(OUT, l.out + '-640.webp');
    if (dataUrl.piccola) fs.writeFileSync(pic, Buffer.from(dataUrl.piccola.split(',')[1], 'base64')); else if (fs.existsSync(pic)) fs.unlinkSync(pic);
    console.log(l.out.padEnd(26), dataUrl.w + '×' + dataUrl.h);
  }
  // dimensioni per il build (width/height nelle <img>, niente salti di impaginazione)
  const dims = {};
  for (const f of fs.readdirSync(OUT).filter(x => !x.endsWith('-640.webp'))) {
    const buf = fs.readFileSync(path.join(OUT, f));
    // webp VP8/VP8L/VP8X: leggiamo le misure dall'intestazione
    const tipo = buf.toString('ascii', 12, 16);
    let w, h;
    if (tipo === 'VP8 ') { w = buf.readUInt16LE(26) & 0x3fff; h = buf.readUInt16LE(28) & 0x3fff; }
    else if (tipo === 'VP8L') { const n = buf.readUInt32LE(21); w = (n & 0x3fff) + 1; h = ((n >> 14) & 0x3fff) + 1; }
    else { w = 1 + buf.readUIntLE(24, 3); h = 1 + buf.readUIntLE(27, 3); }
    dims[f.replace('.webp', '')] = [w, h];
  }
  fs.writeFileSync(path.join(__dirname, 'foto-misure.json'), JSON.stringify(dims, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
