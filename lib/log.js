// Riwayat perubahan: siapa ngubah apa, disimpan per bulan di R2 log/YYYY-MM.json
const LABEL = {
  name: 'nama', location: 'lokasi', bedrooms: 'jumlah kamar', bathrooms: 'kamar mandi', capStd: 'kapasitas normal',
  capMax: 'kapasitas maks', priceWeekday: 'harga weekday', priceSemi: 'harga semi weekend', priceWeekend: 'harga weekend', priceHigh: 'harga high season', disc: 'diskon', discFrom: 'diskon mulai', discTo: 'diskon sampai', rules: 'peraturan villa',
  facilities: 'fasilitas', desc: 'deskripsi', active: 'tampil/sembunyi', ownerAcc: 'akun mitra', status: 'status verifikasi',
};
const SETTING = { brand: 'nama brand', tagline: 'kalimat judul', wa: 'nomor WhatsApp', priceMode: 'tampilan harga', showOver: 'tampilkan di atas budget', overPct: 'toleransi budget', promo: 'banner promo', promos: 'promo', checkin: 'jam check-in', checkout: 'jam check-out', rules: 'peraturan umum', guide: 'panduan booking', faq: 'FAQ', calDays: 'batas update jadwal', lebaran: 'tanggal Lebaran', lebB: 'Lebaran H-', lebA: 'Lebaran H+' };
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function fmt(ds) { const [, m, d] = ds.split('-'); return Number(d) + ' ' + BLN[Number(m) - 1]; }
function nextDay(ds) { const t = Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10)) + 864e5; return new Date(t).toISOString().slice(0, 10); }
function rangesText(days) {
  const a = [...days].sort(); const out = []; let s = null, p = null;
  for (const d of a) { if (s && nextDay(p) === d) { p = d; continue; } if (s) out.push([s, p]); s = p = d; }
  if (s) out.push([s, p]);
  return out.map(([x, y]) => (x === y ? fmt(x) : fmt(x) + '–' + fmt(y)) ).join(', ') + ' (' + a.length + ' malam)';
}
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function describeChanges(oldD, newD) {
  const items = [];
  const oldV = new Map((oldD.villas || []).map((v) => [v.id, v]));
  const newV = new Map((newD.villas || []).map((v) => [v.id, v]));
  const vname = (id) => (newV.get(id) || oldV.get(id) || {}).name || 'villa';
  const changedIds = new Set();
  for (const [id, v] of newV) {
    const o = oldV.get(id);
    if (!o) { items.push({ t: 'villa', villa: v.name, text: 'Tambah villa baru: ' + v.name }); changedIds.add(id); continue; }
    const fields = Object.keys(LABEL).filter((k) => !same(o[k], v[k])).map((k) => LABEL[k]);
    const op = new Set(o.photos || []), np = new Set(v.photos || []);
    const add = [...np].filter((x) => !op.has(x)).length, del = [...op].filter((x) => !np.has(x)).length;
    const parts = [];
    if (fields.length) parts.push('ubah ' + fields.join(', '));
    if (add) parts.push('upload ' + add + ' foto');
    if (del) parts.push('hapus ' + del + ' foto');
    if (!add && !del && !same(o.photos, v.photos)) parts.push('ganti urutan/cover foto');
    if (parts.length) { items.push({ t: 'villa', villa: v.name, text: v.name + ': ' + parts.join(' · ') }); changedIds.add(id); }
  }
  for (const [id, o] of oldV) if (!newV.has(id)) items.push({ t: 'villa', villa: o.name, text: 'Hapus villa: ' + o.name });

  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const ob = oldD.booked || {}, nb = newD.booked || {};
  for (const id of new Set([...Object.keys(ob), ...Object.keys(nb)])) {
    const o = new Set((ob[id] || []).filter((d) => d >= today)), n = new Set((nb[id] || []).filter((d) => d >= today));
    const add = [...n].filter((d) => !o.has(d)), del = [...o].filter((d) => !n.has(d));
    if (add.length) items.push({ t: 'jadwal', villa: vname(id), text: vname(id) + ': tandai terisi malam ' + rangesText(add) });
    if (del.length) items.push({ t: 'jadwal', villa: vname(id), text: vname(id) + ': kosongkan malam ' + rangesText(del) });
  }
  if (!same(oldD.syncInfo, newD.syncInfo) && newD.syncInfo) items.push({ t: 'jadwal', text: 'Sinkron jadwal dari aplikasi Pembukuan' });

  const oh = new Map((oldD.highSeason || []).map((r) => [r.id, r])), nh = new Map((newD.highSeason || []).map((r) => [r.id, r]));
  for (const [id, r] of nh) if (!oh.has(id)) items.push({ t: 'lain', text: 'Tambah high season: ' + (r.label || '') + ' ' + fmt(r.start) + '–' + fmt(r.end) });
  for (const [id, r] of oh) if (!nh.has(id)) items.push({ t: 'lain', text: 'Hapus high season: ' + (r.label || '') + ' ' + fmt(r.start) + '–' + fmt(r.end) });

  const oH = new Map((oldD.holidays || []).map((h) => [h.date, h])), nH = new Map((newD.holidays || []).map((h) => [h.date, h]));
  const hAdd = [...nH].filter(([d]) => !oH.has(d)), hDel = [...oH].filter(([d]) => !nH.has(d));
  const hTxt = ([d, h]) => fmt(d) + (h.label ? ' (' + h.label + ')' : '');
  if (hAdd.length > 3) items.push({ t: 'lain', text: 'Tambah ' + hAdd.length + ' tanggal merah' });
  else hAdd.forEach((x) => items.push({ t: 'lain', text: 'Tambah tanggal merah: ' + hTxt(x) }));
  if (hDel.length > 3) items.push({ t: 'lain', text: 'Hapus ' + hDel.length + ' tanggal merah' });
  else hDel.forEach((x) => items.push({ t: 'lain', text: 'Hapus tanggal merah: ' + hTxt(x) }));

  const sk = Object.keys(SETTING).filter((k) => !same((oldD.settings || {})[k], (newD.settings || {})[k]));
  if (sk.length) items.push({ t: 'lain', text: 'Ubah pengaturan: ' + sk.map((k) => SETTING[k]).join(', ') });
  return { items, changedIds };
}

export async function addLog(env, user, items) {
  if (!items.length) return;
  const now = new Date();
  const key = 'log/' + new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 7) + '.json';
  const obj = await env.BUCKET.get(key);
  let list = [];
  if (obj) { try { list = await obj.json(); } catch { list = []; } }
  list.push({ at: now.toISOString(), by: user.name, role: user.role, items });
  await env.BUCKET.put(key, JSON.stringify(list), { httpMetadata: { contentType: 'application/json' } });
}

export async function readLog(env, month) {
  const obj = await env.BUCKET.get('log/' + month + '.json');
  if (!obj) return [];
  try { return await obj.json(); } catch { return []; }
}
