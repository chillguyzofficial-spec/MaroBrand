// Uso: node _build/dividi-tavole.js <cartella con gNN.png>  → <cartella>/tagli/gNN-01.png ... (tavole di ChatGPT a griglia)
// divide le tavole a griglia: cerca righe/colonne di separazione chiare e sottili su tutta la regione, taglia, ripete
const sharp = require('C:/Users/Claude FK/.claude/projects/MaroBrand-motore/node_modules/sharp');
const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = path.join(dir, 'tagli'); fs.mkdirSync(out, { recursive: true });
const chiaro = (d, i) => { const r = d[i], g = d[i + 1], b = d[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx > 185 && mx - mn < 40; };
function linee(d, W, x0, y0, x1, y1, orizz) {
  const n = orizz ? y1 - y0 : x1 - x0, L = orizz ? x1 - x0 : y1 - y0, ok = [];
  for (let k = 0; k < n; k++) { let c = 0; for (let t = 0; t < L; t += 2) { const x = orizz ? x0 + t : x0 + k, y = orizz ? y0 + k : y0 + t; if (chiaro(d, (y * W + x) * 3)) c++; } ok.push(c / Math.ceil(L / 2) > 0.9); }
  const tagli = []; let k = 0;
  while (k < n) { if (!ok[k]) { k++; continue; } let e = k; while (e < n && ok[e]) e++; const sp = e - k;
    if (sp <= 12 && k > 40 && e < n - 40) tagli.push([k, e]); k = e; }
  return tagli;
}
function dividi(d, W, r, acc, prof = 0) {
  const [x0, y0, x1, y1] = r;
  for (const orizz of [false, true]) {
    const t = linee(d, W, x0, y0, x1, y1, orizz);
    if (t.length) { let a = 0; const n = orizz ? y1 - y0 : x1 - x0; const pezzi = [];
      for (const [s, e] of t) { pezzi.push([a, s]); a = e; } pezzi.push([a, n]);
      for (const [s, e] of pezzi) dividi(d, W, orizz ? [x0, y0 + s, x1, y0 + e] : [x0 + s, y0, x0 + e, y1], acc, prof + 1);
      return; }
  }
  acc.push(r);
}
(async () => {
  for (const f of fs.readdirSync(dir).filter(f => /^g\d+\.png$/.test(f)).sort()) {
    const { data, info } = await sharp(path.join(dir, f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const acc = []; dividi(data, info.width, [0, 0, info.width, info.height], acc);
    let i = 1; const righe = [];
    for (const [x0, y0, x1, y1] of acc) { const w = x1 - x0, h = y1 - y0; if (w < 60 || h < 60) continue;
      const nome = f.replace('.png', '') + '-' + String(i++).padStart(2, '0') + '.png';
      await sharp(path.join(dir, f)).extract({ left: x0, top: y0, width: w, height: h }).toFile(path.join(out, nome)); righe.push(nome + ' ' + w + 'x' + h); }
    console.log(f, acc.length === 1 ? 'singola' : righe.length + ' foto: ' + righe.join(', '));
  }
})();
