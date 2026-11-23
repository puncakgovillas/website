import { json } from '../../lib/lib.js';
import { login, makeToken, currentUser } from '../../lib/auth.js';

// POST /api/login  { name, password } -> { token, name, role }
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD belum diatur di Cloudflare.' }, 500);
  let b = {};
  try { b = await request.json(); } catch {}
  const u = await login(env, b.name, b.password);
  if (!u) {
    await new Promise((r) => setTimeout(r, 800)); // perlambat tebak-tebakan password
    return json({ error: 'Nama atau password salah.' }, 401);
  }
  return json({ token: await makeToken(env, u), id: u.id, name: u.name, role: u.role, canSeeOwner: !!u.canSeeOwner });
}

// GET /api/login -> siapa yang lagi login
export async function onRequestGet({ request, env }) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'Sesi habis, silakan login lagi.' }, 401);
  return json(u);
}
