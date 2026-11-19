import { json, isAdmin } from '../../lib/lib.js';

// POST /api/login  -> cek password admin
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD belum diatur di Cloudflare.' }, 500);
  if (!isAdmin(request, env)) {
    await new Promise((r) => setTimeout(r, 800)); // perlambat tebak-tebakan password
    return json({ error: 'Password salah.' }, 401);
  }
  return json({ ok: true });
}
