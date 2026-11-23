import { json, needBucket } from '../../lib/lib.js';
import { requireUser } from '../../lib/auth.js';
import { addLog } from '../../lib/log.js';
import { DATA_KEY } from '../../lib/lib.js';

// Kontak pemilik villa: RAHASIA. Disimpan terpisah (private.json), nggak pernah ikut ke data publik.
const KEY = 'private.json';
const FIELDS = ['ownerName', 'ownerPhone', 'ownerNote'];

async function read(env) {
  const o = await env.BUCKET.get(KEY);
  if (!o) return { villas: {} };
  try { const d = await o.json(); return d && d.villas ? d : { villas: {} }; } catch { return { villas: {} }; }
}
function allowed(user) { return user.role === 'owner' || user.canSeeOwner || user.role === 'mitra'; }
// Mitra cuma boleh lihat/ubah kontak pemilik villa miliknya sendiri
async function mitraIds(env, user) {
  if (user.role !== 'mitra') return null;
  const o = await env.BUCKET.get(DATA_KEY);
  const d = o ? await o.json() : { villas: [] };
  return new Set((d.villas || []).filter((v) => v.ownerAcc === user.id).map((v) => v.id));
}

// GET /api/private -> { villas: { [villaId]: { ownerName, ownerPhone, ownerNote } } }
export async function onRequestGet({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env); if (error) return error;
  if (!allowed(user)) return json({ error: 'Kamu nggak punya akses kontak pemilik.' }, 403);
  const data = await read(env);
  const ids = await mitraIds(env, user);
  if (ids) Object.keys(data.villas).forEach((id) => { if (!ids.has(id)) delete data.villas[id]; });
  return json(data, 200, { 'cache-control': 'no-store' });
}

// PUT /api/private { villas: { [villaId]: {...} }, names: { [villaId]: nama villa } } -> gabung (yang dikirim saja)
export async function onRequestPut({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env); if (error) return error;
  if (!allowed(user)) return json({ error: 'Kamu nggak punya akses kontak pemilik.' }, 403);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Data tidak valid.' }, 400); }
  if (!b || typeof b.villas !== 'object') return json({ error: 'Data tidak valid.' }, 400);
  const cur = await read(env);
  const ids = await mitraIds(env, user);
  const items = [];
  for (const [id, v] of Object.entries(b.villas)) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !v || typeof v !== 'object') continue;
    if (ids && !ids.has(id)) continue;
    const next = {};
    FIELDS.forEach((f) => { const s = String(v[f] == null ? '' : v[f]).trim().slice(0, 300); if (s) next[f] = s; });
    const before = JSON.stringify(cur.villas[id] || {});
    if (Object.keys(next).length) cur.villas[id] = { ...next, updatedBy: user.name, updatedAt: new Date().toISOString() };
    else delete cur.villas[id];
    const after = JSON.stringify(cur.villas[id] || {});
    if (before !== after) items.push({ t: 'villa', villa: (b.names || {})[id] || '', text: ((b.names || {})[id] || 'Villa') + ': ubah kontak pemilik' });
  }
  if (items.length) {
    await env.BUCKET.put(KEY, JSON.stringify(cur), { httpMetadata: { contentType: 'application/json' } });
    await addLog(env, user, items);
  }
  const out = { ...cur.villas };
  if (ids) Object.keys(out).forEach((id) => { if (!ids.has(id)) delete out[id]; });
  return json({ ok: true, villas: out });
}
