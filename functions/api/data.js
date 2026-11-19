import seed from '../../lib/seed.js';
import { DATA_KEY, json, isAdmin, needBucket } from '../../lib/lib.js';

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
  if (!isAdmin(request, env)) return json({ error: 'Password admin salah.' }, 401);
  const miss = needBucket(env);
  if (miss) return miss;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Data tidak valid.' }, 400); }
  const incoming = body && body.data;
  if (!incoming || !Array.isArray(incoming.villas) || typeof incoming.settings !== 'object') {
    return json({ error: 'Format data tidak valid.' }, 400);
  }
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
  const next = { ...incoming, rev: curRev + 1, savedAt: new Date().toISOString() };
  await env.BUCKET.put(DATA_KEY, JSON.stringify(next), {
    httpMetadata: { contentType: 'application/json' },
  });
  return json({ ok: true, rev: next.rev });
}
