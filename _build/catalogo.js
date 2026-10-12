// Drop 001 — i sei capi. Prezzi, grammature e testi sono DI ESEMPIO finché il cliente non li conferma.
const TAGLIE_POLO = ['S', 'M', 'L', 'XL', 'XXL'];
const TAGLIE_FELPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

module.exports = [
  {
    id: 'polo-linee', tipo: 'polo', nome: 'Polo Linee', colore: 'Nero, righe bianche sulle maniche',
    prezzo: 75, pallini: ['#000'], taglie: TAGLIE_POLO,
    foto: [['polo-linee-fronte', 'Polo Linee nera, fronte, firma MARO ricamata sul petto'], ['polo-linee-retro', 'Polo Linee nera, retro, ali e scritta Fly with your mind']],
    testo: 'Polo nera in piqué con tre righe bianche sulle maniche. Sul petto la firma MARO ricamata, sulla schiena le ali e la scritta “Fly with your mind”.',
    dettagli: ['Piqué di cotone', 'Firma MARO ricamata sul petto', 'Ali e scritta sul retro', 'Vestibilità regolare'],
  },
  {
    id: 'polo-tricolore', tipo: 'polo', nome: 'Polo Tricolore', colore: 'Nero, maniche verde bianco rosso',
    prezzo: 80, pallini: ['#000'], taglie: TAGLIE_POLO,
    foto: [['polo-tricolore-fronte', 'Polo Tricolore nera, fronte, maniche verde bianco rosso'], ['polo-tricolore-retro', 'Polo Tricolore nera, retro, ali rosse e verdi']],
    testo: 'La polo nera con le maniche nei colori d’Italia. Sul retro le ali in rosso e verde: i due colori che Italia e Marocco hanno in comune.',
    dettagli: ['Piqué di cotone', 'Maniche tricolore', 'Ali rosso e verde sul retro', 'Vestibilità regolare'],
  },
  {
    id: 'polo-jacquard', tipo: 'polo', nome: 'Polo Jacquard', colore: 'Grigio perla, collo tortora',
    prezzo: 95, pallini: ['#d9d6cf'], taglie: TAGLIE_POLO,
    foto: [['polo-jacquard-intera', 'Polo Jacquard grigio perla con collo tortora'], ['polo-jacquard-ricamo', 'Dettaglio della firma MARO ricamata sul tessuto jacquard']],
    testo: 'Maglia jacquard a righe verticali, collo e abbottonatura color tortora. La firma MARO è ricamata tono su tono: si vede da vicino.',
    dettagli: ['Maglia jacquard a righe', 'Collo e abbottonatura tortora', 'Firma MARO ricamata tono su tono', 'Vestibilità regolare'],
  },
  {
    id: 'felpa-stretta', tipo: 'felpa', nome: 'Felpa Stretta di mano', colore: 'Grigio melange, stampa sul retro',
    prezzo: 120, pallini: ['#b9b9b9'], taglie: TAGLIE_FELPA,
    foto: [['felpa-stretta-retro', 'Felpa grigia, retro con la stretta di mano e le bandiere di Marocco e Italia'], ['felpa-stretta-indossata', 'Felpa grigia indossata, fronte con la M alata']],
    testo: 'Sul retro il primo disegno di MARO: una stretta di mano sopra le bandiere di Marocco e Italia. Davanti, la M con le ali.',
    dettagli: ['Felpa di cotone garzata', 'Stampa sul retro', 'Cappuccio e tasca a marsupio', 'Vestibilità comoda'],
  },
  {
    id: 'felpa-firma', tipo: 'felpa', nome: 'Felpa Firma', colore: 'Blu notte, firma MARO sul retro',
    prezzo: 130, pallini: ['#1c2440'], taglie: TAGLIE_FELPA,
    foto: [['felpa-firma-retro', 'Felpa blu notte, retro con la firma MARO e le onde tricolore, davanti al Duomo di Milano']],
    testo: 'La firma MARO in grande sulla schiena, con le onde verde, bianco e rosso. Fotografata davanti al Duomo di Milano.',
    dettagli: ['Felpa di cotone garzata', 'Firma MARO con onde tricolore sul retro', 'Cappuccio e tasca a marsupio', 'Vestibilità comoda'],
  },
  {
    id: 'felpa-nera', tipo: 'felpa', nome: 'Felpa Nera', colore: 'Nero, firma MARO sul retro',
    prezzo: 110, pallini: ['#000'], taglie: TAGLIE_FELPA,
    foto: [['felpa-nera-retro', 'Felpa nera, retro con la firma MARO verticale']],
    testo: 'Nera, essenziale. La firma MARO verticale corre lungo la schiena.',
    dettagli: ['Felpa di cotone garzata', 'Firma MARO sul retro', 'Cappuccio e tasca a marsupio', 'Vestibilità comoda'],
  },
];
