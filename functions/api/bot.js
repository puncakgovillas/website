// API khusus "Karyawan AI" (robot otomatis): tambah villa baru dari PDF villa di Google Drive.
// Login pakai header `x-bot-key` = secret BOT_KEY di Cloudflare (beda dari ADMIN_PASSWORD).
// Robot cuma bisa: upload foto & TAMBAH villa baru dengan status "pending" (belum tampil ke tamu).
// Villa baru muncul di tab Verifikasi admin; pemilik yang setujui sebelum tampil.
import { DATA_KEY, json, needBucket } from '../../lib/lib.js';
import { addLog } from '../../lib/log.js';
import { nameKey } from '../../lib/dupes.js';

const BOT = { id: 'bot', name: 'Karyawan AI', role: 'bot' };
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function sameStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function checkBot(request, env) {
  if (!env.BOT_KEY || env.BOT_KEY.length < 12) return json({ error: 'BOT_KEY belum diatur di Cloudflare.' }, 503);
  if (!sameStr(request.headers.get('x-bot-key') || '', env.BOT_KEY)) return json({ error: 'Kunci robot salah.' }, 401);
  return null;
}
const int = (x) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n > 0 ? n : 0; };
const str = (x, max = 300) => String(x == null ? '' : x).trim().slice(0, max);

// POST /api/bot/photo  (body = file gambar) -> { url }
export async function photoPost({ request, env }) {
  const miss = needBucket(env) || checkBot(request, env);
  if (miss) return miss;
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Format foto harus JPG, PNG, atau WEBP.' }, 400);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'Foto kosong.' }, 400);
  if (buf.byteLength > 8 * 1024 * 1024) return json({ error: 'Foto terlalu besar (maks 8 MB).' }, 413);
  const name = crypto.randomUUID().replace(/-/g, '') + '.' + ext;
  await env.BUCKET.put('photos/' + name, buf, {
    customMetadata: { by: BOT.name },
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });
  return json({ url: '/photos/' + name });
}

// GET /api/bot/villa?name=Villa CH 65 -> { exists, id, status }  (cek dulu biar nggak dobel)
export async function villaGet({ request, env }) {
  const miss = needBucket(env) || checkBot(request, env);
  if (miss) return miss;
  const k = nameKey(new URL(request.url).searchParams.get('name'));
  if (!k) return json({ error: 'Nama villa kosong.' }, 400);
  const obj = await env.BUCKET.get(DATA_KEY);
  const villas = obj ? (await obj.json()).villas || [] : [];
  const v = villas.find((x) => nameKey(x.name) === k);
  return json(v ? { exists: true, id: v.id, status: v.status || 'ok' } : { exists: false });
}

// POST /api/bot/villa  { name, location, bedrooms, bathrooms, capMax, priceWeekday, priceSemi, priceWeekend, facilities[], desc, photos[] }
// -> { ok, id }  · 409 kalau nama villa sudah ada
export async function villaPost({ request, env }) {
  const miss = needBucket(env) || checkBot(request, env);
  if (miss) return miss;
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Data tidak valid.' }, 400); }
  const name = str(b && b.name, 80);
  if (!nameKey(name)) return json({ error: 'Nama villa kosong.' }, 400);
  const photos = (Array.isArray(b.photos) ? b.photos : []).filter((p) => /^\/photos\/[a-z0-9]+\.(jpg|png|webp)$/.test(p)).slice(0, 80);
  if (!photos.length) return json({ error: 'Minimal 1 foto (upload dulu lewat /api/bot/photo).' }, 400);
  const priceWeekday = int(b.priceWeekday), priceWeekend = int(b.priceWeekend);
  const villa = {
    id: Math.random().toString(36).slice(2, 9),
    name, location: str(b.location, 120),
    bedrooms: int(b.bedrooms), bathrooms: int(b.bathrooms), capStd: 0, capMax: int(b.capMax),
    priceWeekday, priceSemi: int(b.priceSemi), priceWeekend, priceHigh: int(b.priceHigh) || priceWeekend,
    facilities: (Array.isArray(b.facilities) ? b.facilities : []).map((f) => str(f, 60)).filter(Boolean).slice(0, 40),
    desc: str(b.desc, 2000), photos, active: true, status: 'pending',
    createdBy: BOT.name, createdById: BOT.id,
  };

  // Simpan dengan cek etag (kalau ada yang nyimpan barengan, ulang baca-tulis)
  for (let attempt = 0; attempt < 4; attempt++) {
    const obj = await env.BUCKET.get(DATA_KEY);
    if (!obj) return json({ error: 'data.json belum ada.' }, 500);
    const current = await obj.json();
    const villas = current.villas || [];
    const dup = villas.find((x) => nameKey(x.name) === nameKey(name));
    if (dup) return json({ error: 'Villa dengan nama ini sudah ada.', exists: true, id: dup.id, status: dup.status || 'ok' }, 409);
    while (villas.some((x) => x.id === villa.id)) villa.id = Math.random().toString(36).slice(2, 9);
    const nowIso = new Date().toISOString();
    Object.assign(villa, { createdAt: nowIso, updatedBy: BOT.name, updatedAt: nowIso, calAt: nowIso, calBy: BOT.name });
    const next = { ...current, villas: [...villas, villa], rev: (current.rev || 0) + 1, savedAt: nowIso, savedBy: BOT.name };
    const stamp = nowIso.slice(0, 13);
    const put = await env.BUCKET.put(DATA_KEY, JSON.stringify(next), {
      onlyIf: { etagMatches: obj.etag },
      httpMetadata: { contentType: 'application/json' },
    });
    if (!put) continue; // keduluan simpan lain, coba lagi
    await env.BUCKET.put(`backups/${stamp}.json`, JSON.stringify(current), { httpMetadata: { contentType: 'application/json' } });
    await addLog(env, BOT, [{ t: 'villa', villa: name, text: 'Tambah villa baru (otomatis dari PDF, nunggu verifikasi): ' + name }]);
    return json({ ok: true, id: villa.id, rev: next.rev });
  }
  return json({ error: 'Lagi ramai yang nyimpan, coba lagi sebentar.' }, 503);
}
