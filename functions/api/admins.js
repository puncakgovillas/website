import { json, needBucket } from '../../lib/lib.js';
import { requireUser, getAdmins, saveAdmins, hashPassword } from '../../lib/auth.js';
import { addLog } from '../../lib/log.js';

// GET /api/admins -> daftar admin staf (pemilik)
export async function onRequestGet({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { error } = await requireUser(request, env, 'owner'); if (error) return error;
  const list = await getAdmins(env);
  return json({ admins: list.map((a) => ({ id: a.id, name: a.name, createdAt: a.createdAt, canSeeOwner: !!a.canSeeOwner })) });
}

// POST /api/admins { name, password } -> tambah admin / ganti password kalau namanya sudah ada (pemilik)
export async function onRequestPost({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env, 'owner'); if (error) return error;
  let b = {};
  try { b = await request.json(); } catch {}
  const name = String(b.name || '').trim().slice(0, 40), pw = String(b.password || '');
  if (!name) return json({ error: 'Nama admin wajib diisi.' }, 400);
  if (pw.length < 6) return json({ error: 'Password minimal 6 karakter.' }, 400);
  const list = await getAdmins(env);
  const salt = crypto.randomUUID();
  const hash = await hashPassword(pw, salt);
  const ex = list.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (ex) { ex.salt = salt; ex.hash = hash; ex.ver = (ex.ver || 1) + 1; }
  else list.push({ id: crypto.randomUUID().slice(0, 8), name, salt, hash, ver: 1, canSeeOwner: !!b.canSeeOwner, createdAt: new Date().toISOString() });
  await saveAdmins(env, list);
  await addLog(env, user, [{ t: 'akun', text: (ex ? 'Ganti password admin: ' : 'Tambah admin: ') + name }]);
  return json({ ok: true });
}

// DELETE /api/admins?id=xxx (pemilik)
export async function onRequestDelete({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env, 'owner'); if (error) return error;
  const id = new URL(request.url).searchParams.get('id');
  const list = await getAdmins(env);
  const a = list.find((x) => x.id === id);
  if (!a) return json({ error: 'Admin nggak ketemu.' }, 404);
  await saveAdmins(env, list.filter((x) => x.id !== id));
  await addLog(env, user, [{ t: 'akun', text: 'Hapus admin: ' + a.name }]);
  return json({ ok: true });
}

// PATCH /api/admins { id, canSeeOwner } -> atur boleh/tidak lihat kontak pemilik (pemilik)
export async function onRequestPatch({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env, 'owner'); if (error) return error;
  let b = {};
  try { b = await request.json(); } catch {}
  const list = await getAdmins(env);
  const a = list.find((x) => x.id === b.id);
  if (!a) return json({ error: 'Admin nggak ketemu.' }, 404);
  a.canSeeOwner = !!b.canSeeOwner;
  await saveAdmins(env, list);
  await addLog(env, user, [{ t: 'akun', text: (a.canSeeOwner ? 'Kasih akses kontak pemilik ke ' : 'Cabut akses kontak pemilik dari ') + a.name }]);
  return json({ ok: true });
}
