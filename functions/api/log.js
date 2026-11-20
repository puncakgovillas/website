import { json, needBucket } from '../../lib/lib.js';
import { requireUser } from '../../lib/auth.js';
import { readLog } from '../../lib/log.js';

// GET /api/log?month=2026-11 -> riwayat perubahan bulan itu (pemilik)
export async function onRequestGet({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { error } = await requireUser(request, env, 'owner'); if (error) return error;
  const m = new URL(request.url).searchParams.get('month') || new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
  if (!/^\d{4}-\d\d$/.test(m)) return json({ error: 'Bulan tidak valid.' }, 400);
  return json({ month: m, entries: (await readLog(env, m)).reverse() });
}
