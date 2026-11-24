import seed from '../../lib/seed.js';
import { DATA_KEY, json, needBucket } from '../../lib/lib.js';
import { requireUser } from '../../lib/auth.js';
import { describeChanges, addLog } from '../../lib/log.js';

async function readData(env) {
  const obj = await env.BUCKET.get(DATA_KEY);
  if (!obj) return { ...seed };
  return await obj.json();
}

// GET /api/data  -> data villa (publik)
export async function onRequestGet({ env }) {
  const miss = needBucket(env);
  if (miss) return json(seed, 200, { 'cache-control': 'no-store' });
  const data = await readData(env);
  return json(data, 200, { 'cache-control': 'no-store' });
}

// PUT /api/data  -> simpan data (admin). Body: { rev, data }
export async function onRequestPut({ request, env }) {
  const miss = needBucket(env);
  if (miss) return miss;
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Data tidak valid.' }, 400); }
  const incoming = body && body.data;
  if (!incoming || !Array.isArray(incoming.villas) || typeof incoming.settings !== 'object') {
    return json({ error: 'Format data tidak valid.' }, 400);
  }
  // Kontak pemilik nggak boleh masuk data publik
  incoming.villas.forEach((v) => { delete v.ownerName; delete v.ownerPhone; delete v.ownerNote; });
  const current = await readData(env);
  const curRev = current.rev || 0;
  if ((body.rev || 0) !== curRev) {
    return json({ error: 'conflict', rev: curRev }, 409);
  }
  // Simpan cadangan versi lama (per jam) sebelum ditimpa, biar data nggak pernah hilang
  const stamp = new Date().toISOString().slice(0, 13);
  await env.BUCKET.put(`backups/${stamp}.json`, JSON.stringify(current), {
    httpMetadata: { contentType: 'application/json' },
  });
  const nowIso = new Date().toISOString();
  if (user.role === 'mitra') mergeMitra(current, incoming, user, nowIso);
  else stampTeam(current, incoming, user, nowIso);
  const { items, changedIds } = describeChanges(current, incoming);
  // Tandai villa yang diubah: siapa & kapan
  incoming.villas.forEach((v) => {
    if (changedIds.has(v.id)) { v.updatedBy = user.name; v.updatedAt = nowIso; }
    else { const o = (current.villas || []).find((x) => x.id === v.id); if (o) { v.updatedBy = o.updatedBy; v.updatedAt = o.updatedAt; } }
  });
  const next = { ...incoming, rev: curRev + 1, savedAt: nowIso, savedBy: user.name };
  await env.BUCKET.put(DATA_KEY, JSON.stringify(next), {
    httpMetadata: { contentType: 'application/json' },
  });
  await addLog(env, user, items);
  return json({ ok: true, rev: next.rev, villas: next.villas.map((v) => ({ id: v.id, updatedBy: v.updatedBy, updatedAt: v.updatedAt })) });
}

// Siapa & kapan villa pertama kali diinput: diisi server, nggak bisa diubah dari luar (dipakai buat aturan komisi "yang duluan")
const KEEP = ['createdBy', 'createdById', 'createdAt'];
function keepFrom(o, v) { KEEP.forEach((k) => { if (o && o[k] != null) v[k] = o[k]; else delete v[k]; }); }
function stampTeam(current, incoming, user, nowIso) {
  const cur = new Map((current.villas || []).map((v) => [v.id, v]));
  incoming.villas.forEach((v) => {
    const o = cur.get(v.id);
    if (o) keepFrom(o, v);
    else { v.createdBy = user.name; v.createdById = user.id; v.createdAt = nowIso; }
    if (v.status !== 'pending' && v.status !== 'rejected') delete v.status;
    if (v.status !== 'rejected') { delete v.rejectNote; delete v.rejectedAt; delete v.photosCleaned; }
    else if (o && o.status === 'rejected' && o.rejectedAt) { v.rejectedAt = o.rejectedAt; if (o.photosCleaned) v.photosCleaned = o.photosCleaned; }
    else v.rejectedAt = nowIso; // baru ditolak: mulai hitung 30 hari sebelum fotonya dibersihin otomatis
    if (!Array.isArray(v.notDup)) delete v.notDup;
  });
}

// Akun mitra cuma boleh ngubah villa miliknya sendiri. Sisanya selalu diambil dari data di server.
// Villa baru dari mitra selalu masuk status "pending" (menunggu verifikasi admin), mitra nggak bisa ngubah status sendiri.
const LOCKED = ['status', 'rejectNote', 'notDup', 'rejectedAt', 'photosCleaned'];
function mergeMitra(current, incoming, user, nowIso) {
  const own = (v) => v && v.ownerAcc === user.id;
  const cur = new Map((current.villas || []).map((v) => [v.id, v]));
  const inc = new Map(incoming.villas.map((v) => [v.id, v]));
  const villas = [];
  for (const v of current.villas || []) {
    if (!own(v)) { villas.push(v); continue; }
    const nv = inc.get(v.id);
    if (!nv) continue; // nggak ada = dihapus mitra
    const x = { ...nv, ownerAcc: user.id };
    keepFrom(v, x);
    LOCKED.forEach((k) => { if (v[k] != null) x[k] = v[k]; else delete x[k]; });
    villas.push(x);
  }
  for (const v of incoming.villas) {
    if (cur.has(v.id)) continue;
    const x = { ...v, ownerAcc: user.id, status: 'pending', createdBy: user.name, createdById: user.id, createdAt: nowIso };
    delete x.rejectNote; delete x.notDup; delete x.rejectedAt; delete x.photosCleaned;
    villas.push(x); // villa baru
  }
  const ownIds = new Set(villas.filter(own).map((v) => v.id));
  const booked = { ...(current.booked || {}) };
  for (const id of Object.keys(booked)) if (cur.has(id) && own(cur.get(id)) && !ownIds.has(id)) delete booked[id];
  for (const id of ownIds) { const b = (incoming.booked || {})[id]; if (Array.isArray(b) && b.length) booked[id] = b; else delete booked[id]; }
  for (const k of Object.keys(incoming)) delete incoming[k];
  Object.assign(incoming, current, { villas, booked });
}
