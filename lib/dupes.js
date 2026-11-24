// Deteksi villa dobel: dipakai buat villa baru dari broker/mitra (status "pending").
export function normPhone(p) {
  let n = String(p || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  return n.length >= 9 ? n : '';
}
const STOP = new Set(['villa', 'vila', 'pgv', 'kamar', 'the', 'new', 'baru']);
export function nameKey(s) {
  return String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w)).join(' ');
}
function bigrams(s) { const t = s.replace(/ /g, ''); const a = []; for (let i = 0; i < t.length - 1; i++) a.push(t.slice(i, i + 2)); return a; }
function dice(a, b) {
  const x = bigrams(a), y = bigrams(b); if (!x.length || !y.length) return 0;
  const m = new Map(); x.forEach((g) => m.set(g, (m.get(g) || 0) + 1));
  let hit = 0; y.forEach((g) => { const c = m.get(g); if (c) { hit++; m.set(g, c - 1); } });
  return (2 * hit) / (x.length + y.length);
}
function locKey(s) { return String(s || '').toLowerCase().split(/[-,(]/)[0].replace(/[^a-z]/g, ''); }

// Cari villa lain yang mirip sama villa v. Balikin [{ villa, reasons: [..], strong }]
export function findDupes(v, all, priv) {
  const out = [];
  const ph = normPhone((priv[v.id] || {}).ownerPhone);
  const nk = nameKey(v.name);
  const skip = new Set(v.notDup || []);
  for (const o of all) {
    if (o.id === v.id || o.status === 'rejected' || skip.has(o.id) || (o.notDup || []).includes(v.id)) continue;
    const reasons = []; let strong = false;
    const oph = normPhone((priv[o.id] || {}).ownerPhone);
    if (ph && oph && ph === oph) { reasons.push('No. HP pemilik sama'); strong = true; }
    const ok = nameKey(o.name);
    if (nk && ok) {
      if (nk === ok) { reasons.push('Nama villa sama'); strong = true; }
      else if ((nk.match(/\d+/g) || []).join() === (ok.match(/\d+/g) || []).join() && dice(nk, ok) >= 0.8) reasons.push('Nama villa mirip');
    }
    const sameLoc = locKey(v.location) && locKey(v.location) === locKey(o.location);
    const sameRoom = v.bedrooms && v.bedrooms === o.bedrooms;
    if (reasons.length && sameLoc && sameRoom) reasons.push('Lokasi & jumlah kamar sama');
    else if (!reasons.length && sameLoc && sameRoom && v.priceWeekend && v.priceWeekend === o.priceWeekend && v.priceWeekday === o.priceWeekday) reasons.push('Lokasi, kamar & harga sama persis');
    if (reasons.length) out.push({ villa: o, reasons, strong });
  }
  return out.sort((a, b) => (b.strong - a.strong) || (b.reasons.length - a.reasons.length));
}
