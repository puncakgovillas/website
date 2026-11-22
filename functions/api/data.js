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
  const { items, changedIds } = describeChanges(current, incoming);
  const nowIso = new Date().toISOString();
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
