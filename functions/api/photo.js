import { json, needBucket } from '../../lib/lib.js';
import { requireUser } from '../../lib/auth.js';
import { addLog } from '../../lib/log.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// POST /api/photo  (body = file gambar) -> { url }
export async function onRequestPost({ request, env }) {
  const miss = needBucket(env);
  if (miss) return miss;
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Format foto harus JPG, PNG, atau WEBP.' }, 400);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'Foto kosong.' }, 400);
  if (buf.byteLength > 8 * 1024 * 1024) return json({ error: 'Foto terlalu besar (maks 8 MB).' }, 413);
  const name = crypto.randomUUID().replace(/-/g, '') + '.' + ext;
  await env.BUCKET.put('photos/' + name, buf, {
    customMetadata: { by: user.name },
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });
  return json({ url: '/photos/' + name });
}

// GET /api/photo -> daftar semua foto (admin), buat bersih-bersih foto nganggur
export async function onRequestGet({ request, env }) {
  const miss = needBucket(env);
  if (miss) return miss;
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const out = [];
  let cursor;
  do {
    const page = await env.BUCKET.list({ prefix: 'photos/', cursor });
    page.objects.forEach((o) => out.push({ url: '/' + o.key, size: o.size }));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return json({ photos: out });
}

// DELETE /api/photo?url=/photos/xxx.jpg  (admin)
export async function onRequestDelete({ request, env }) {
  const miss = needBucket(env);
  if (miss) return miss;
  const { user, error } = await requireUser(request, env);
  if (error) return error;
  const url = new URL(request.url).searchParams.get('url') || '';
  const m = /^\/photos\/([a-z0-9]+\.(jpg|png|webp))$/.exec(url);
  if (!m) return json({ error: 'Alamat foto tidak valid.' }, 400);
  await env.BUCKET.delete('photos/' + m[1]);
  await addLog(env, user, [{ t: 'foto', text: 'Hapus foto nganggur ' + m[1] }]);
  return json({ ok: true });
}
