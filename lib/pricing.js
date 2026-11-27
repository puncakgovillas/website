// Hitungan harga per malam versi server (sama persis dengan public/app.js: dayType/rate/discount).
// Kalau aturan harga di app.js diubah, ubah juga di sini.
const toUTC = (ds) => { const a = ds.split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
const toDS = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (ds, n) => toDS(toUTC(ds) + n * 864e5);
export const dow = (ds) => new Date(toUTC(ds)).getUTCDay();
export const todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

export function makePricer(d) {
  const s = d.settings || {};
  const hs = d.highSeason || [], hol = new Set((d.holidays || []).map((h) => h.date));
  const lb = s.lebB >= 0 ? +s.lebB : 1, la = s.lebA >= 0 ? +s.lebA : 5;
  const leb = Array.isArray(s.lebaran) ? s.lebaran : ['2027-03-10'];
  const isHigh = (ds) => hs.some((r) => ds >= r.start && ds <= r.end);
  const isHol = (ds) => hol.has(ds);
  const isLeb = (ds) => leb.some((h) => ds >= addDays(h, -lb) && ds <= addDays(h, la));
  const isXmas = (ds) => { const md = ds.slice(5); return md === '12-24' || md === '12-25'; };
  function dayType(ds) {
    const w = dow(ds);
    if (isHigh(ds)) return 'high';
    if (isXmas(ds) || isLeb(ds) || w === 6) return 'weekend';
    if (w === 5 || isHol(addDays(ds, 1))) return 'semi';
    return 'weekday';
  }
  const semiPrice = (v) => { if (v.priceSemi) return +v.priceSemi; const a = +v.priceWeekday || 0, b = +v.priceWeekend || 0; if (a && b) return Math.round((a + b) / 2 / 50000) * 50000; return b || a || 0; };
  function baseRate(v, ds) {
    let t = dayType(ds);
    if (t === 'high') { if (+v.priceHigh) return { p: +v.priceHigh, t: 'high' }; t = dow(ds) === 6 || isXmas(ds) || isLeb(ds) ? 'weekend' : (dow(ds) === 5 || isHol(addDays(ds, 1)) ? 'semi' : 'weekday'); }
    if (t === 'weekend' && +v.priceWeekend) return { p: +v.priceWeekend, t: 'weekend' };
    if (t === 'weekend' || t === 'semi') { const sp = semiPrice(v); if (sp) return { p: sp, t: 'semi' }; }
    return { p: +v.priceWeekday || +v.priceWeekend || 0, t: 'weekday' };
  }
  const promos = (Array.isArray(s.promos) ? s.promos : (s.promo ? [s.promo] : [])).filter((p) => p && p.on && +p.pct > 0 && +p.pct < 90 && Array.isArray(p.dates))
    .map((p) => ({ pct: +p.pct, dates: new Set(p.dates), villas: new Set(Array.isArray(p.villas) ? p.villas : []) }));
  const promoPc = (ds, v) => promos.reduce((m, p) => (p.dates.has(ds) && (!p.villas.size || p.villas.has(v.id)) ? Math.max(m, p.pct) : m), 0);
  function rate(v, ds) {
    const r = baseRate(v, ds), pc = Math.max(discOn(v, ds), promoPc(ds, v));
    if (pc && r.p) return { p: Math.round(r.p * (100 - pc) / 100 / 10000) * 10000, t: r.t, o: r.p, pc };
    return r;
  }
  return { dayType, rate, isHol, semiPrice };
}

// Diskon per villa: v.disc (%), berlaku di malam discFrom..discTo (kosong = tanpa batas)
export function discOn(v, ds) {
  const pc = +v.disc || 0;
  if (pc <= 0 || pc >= 90) return 0;
  if (v.discFrom && ds < v.discFrom) return 0;
  if (v.discTo && ds > v.discTo) return 0;
  return pc;
}
// Diskon yang masih/akan berlaku (buat label "% OFF" di kartu)
export function discActive(v, today = todayWIB()) {
  const pc = +v.disc || 0;
  if (pc <= 0 || pc >= 90) return 0;
  if (v.discTo && v.discTo < today) return 0;
  return pc;
}
