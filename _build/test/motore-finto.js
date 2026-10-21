// Motore finto per le prove del sito: lo STESSO codice del motore vero (MaroBrand-motore/src/index.js),
// con database in memoria (SQLite di Node, come D1) e una finta pagina di pagamento Stripe che paga subito,
// manda il webhook firmato e torna sul sito. Così le prove non toccano il database vero né Stripe.
// Uso: const m = await require('./motore-finto').avvia(8986, 'http://localhost:8987'); … m.chiudi();
const http = require('http'), fs = require('fs'), path = require('path'), { createHmac } = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const DIR = 'C:/Users/Claude FK/.claude/projects/MaroBrand-motore';

function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8'));
  const stmt = (sql, par = []) => ({
    sql, par, bind: (...p) => stmt(sql, p),
    first: async () => db.prepare(sql).get(...par) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...par) }),
    run: async () => { const r = db.prepare(sql).run(...par); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
  });
  return { _db: db, prepare: (sql) => stmt(sql), batch: async (l) => { db.exec('BEGIN'); try { const o = l.map((s) => db.prepare(s.sql).run(...s.par)); db.exec('COMMIT'); return o; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
}

async function avvia(porta, sito) {
  const { default: motore } = await import(require('url').pathToFileURL(path.join(DIR, 'src', 'index.js')).href);
  const WHSEC = 'whsec_finto', sessioni = new Map(), statoSess = new Map(), coupon = new Map(), stato = { email: 'cliente@esempio.it' };
  const env = { DB: d1(), STRIPE_SECRET_KEY: 'sk_test_finta', STRIPE_WEBHOOK_SECRET: WHSEC, SITO: sito, ORIGINI: sito, MODALITA: 'prova' };
  const BASE = 'http://localhost:' + porta;
  // Stripe finto: solo le chiamate del motore a api.stripe.com, il resto passa
  const fetchVero = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    if (!String(url).startsWith('https://api.stripe.com/')) return fetchVero(url, o);
    const c = Object.fromEntries(new URLSearchParams(o.body || ''));
    if (url.endsWith('/coupons')) { const id = 'cpn_' + (coupon.size + 1); coupon.set(id, Number(c.amount_off)); return new Response(JSON.stringify({ id }), { status: 200 }); }
    if (url.endsWith('/checkout/sessions')) {
      const id = 'cs_test_finto' + String(sessioni.size + 1).padStart(8, '0');
      sessioni.set(id, c); statoSess.set(id, 'open');
      return new Response(JSON.stringify({ id, url: BASE + '/finto-stripe?s=' + id }), { status: 200 });
    }
    // 21/10: stato dei pagamenti (open → complete | expired), chiusura, impronta della carta (ogni email la sua carta)
    let m;
    if ((m = /\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)\/expire$/.exec(url))) { if (statoSess.get(m[1]) !== 'open') return new Response('{"error":{"message":"non aperta"}}', { status: 400 }); statoSess.set(m[1], 'expired'); return new Response(JSON.stringify({ id: m[1], status: 'expired' }), { status: 200 }); }
    if ((m = /\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)$/.exec(url))) return statoSess.has(m[1]) ? new Response(JSON.stringify({ id: m[1], status: statoSess.get(m[1]) }), { status: 200 }) : new Response('{}', { status: 404 });
    if ((m = /\/payment_intents\/(pi_[A-Za-z0-9_]+)/.exec(url))) return new Response(JSON.stringify({ id: m[1], payment_method: { card: { fingerprint: 'carta-' + m[1] } } }), { status: 200 });
    return new Response('{"error":{"message":"finto"}}', { status: 404 });
  };
  const srv = http.createServer(async (q, r) => {
    const u = new URL(q.url, BASE);
    if (u.pathname === '/finto-stripe') {
      // "paga" subito come un cliente con la carta 4242, poi Stripe manda il webhook e riporta sul sito
      const id = u.searchParams.get('s'), c = sessioni.get(id);
      const righe = Object.keys(c).filter((k) => /^line_items\[\d+\]\[quantity\]$/.test(k)).map((k) => { const i = k.match(/\d+/)[0]; return Number(c[`line_items[${i}][price_data][unit_amount]`]) * Number(c[k]); });
      const sub = righe.reduce((a, b) => a + b, 0), sped = Number(c['shipping_options[0][shipping_rate_data][fixed_amount][amount]']), sconto = coupon.get(c['discounts[0][coupon]']) || 0;
      const email = c.customer_email || stato.email;
      statoSess.set(id, 'complete');
      const sessione = { id, payment_intent: 'pi_' + id.slice(3), payment_status: 'paid', customer_details: { email, name: 'Cliente Prova' }, collected_information: { shipping_details: { name: 'Mario Prova', address: { line1: 'Via delle Prove 1', postal_code: '20121', city: 'Milano', state: 'MI', country: 'IT' } } }, amount_subtotal: sub, amount_total: sub - sconto + sped, total_details: { amount_discount: sconto, amount_shipping: sped },
        metadata: { righe: c['metadata[righe]'], codice: c['metadata[codice]'] || '', tipo_codice: c['metadata[tipo_codice]'] || '' } };
      const corpo = JSON.stringify({ type: 'checkout.session.completed', data: { object: sessione } }), t = Math.floor(Date.now() / 1000);
      await motore.fetch(new Request(BASE + '/api/stripe/webhook', { method: 'POST', body: corpo, headers: { 'stripe-signature': `t=${t},v1=${createHmac('sha256', WHSEC).update(t + '.' + corpo).digest('hex')}` } }), env);
      r.writeHead(302, { location: c.success_url.replace('{CHECKOUT_SESSION_ID}', id) }); return r.end();
    }
    const corpo = await new Promise((ok) => { let s = ''; q.on('data', (d) => (s += d)); q.on('end', () => ok(s)); });
    const ris = await motore.fetch(new Request(BASE + q.url, { method: q.method, headers: q.headers, body: ['GET', 'HEAD'].includes(q.method) ? undefined : corpo }), env);
    r.writeHead(ris.status, Object.fromEntries(ris.headers)); r.end(Buffer.from(await ris.arrayBuffer()));
  });
  await new Promise((ok) => srv.listen(porta, ok));
  return {
    url: BASE, env, sessioni, stato,
    sql: (q, ...p) => env.DB._db.prepare(q).all(...p),
    chiudi: () => new Promise((ok) => { globalThis.fetch = fetchVero; srv.close(ok); }),
  };
}
module.exports = { avvia };
