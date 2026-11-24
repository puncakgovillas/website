// Bersih-bersih otomatis (jalan tiap hari lewat Cron Trigger):
// foto villa yang DITOLAK lebih dari 30 hari dihapus dari R2. Data teks villanya tetap disimpan
// (buat catatan siapa yang pernah input), cuma fotonya yang dibuang biar nggak makan penyimpanan.
import { DATA_KEY } from './lib.js';
import { addLog } from './log.js';

export const CLEAN_DAYS = 30;

export async function cleanRejectedPhotos(env, now = Date.now()) {
  const obj = await env.BUCKET.get(DATA_KEY);
  if (!obj) return { cleaned: 0 };
  const data = await obj.json();
  const villas = data.villas || [];
  const limit = now - CLEAN_DAYS * 864e5;
  const due = villas.filter((v) => v.status === 'rejected' && v.rejectedAt && Date.parse(v.rejectedAt) < limit && (v.photos || []).length);
  if (!due.length) return { cleaned: 0 };
  const dueIds = new Set(due.map((v) => v.id));
  const usedElsewhere = new Set();
  villas.forEach((v) => { if (!dueIds.has(v.id)) (v.photos || []).forEach((p) => usedElsewhere.add(p)); });
  let files = 0;
  const items = [];
  for (const v of due) {
    for (const p of v.photos) {
      const m = /^\/photos\/([a-z0-9]+\.(jpg|png|webp))$/.exec(p);
      if (m && !usedElsewhere.has(p)) { await env.BUCKET.delete('photos/' + m[1]); files++; }
    }
    items.push({ t: 'villa', villa: v.name, text: v.name + ': hapus ' + v.photos.length + ' foto otomatis (ditolak > ' + CLEAN_DAYS + ' hari)' });
    v.photos = [];
    v.photosCleaned = new Date(now).toISOString();
  }
  // Simpan cadangan dulu, terus naikin rev biar admin yang lagi buka halaman otomatis ambil data terbaru
  await env.BUCKET.put('backups/' + new Date(now).toISOString().slice(0, 13) + '-clean.json', JSON.stringify(await (await env.BUCKET.get(DATA_KEY)).json()), { httpMetadata: { contentType: 'application/json' } });
  const next = { ...data, villas, rev: (data.rev || 0) + 1, savedAt: new Date(now).toISOString(), savedBy: 'Sistem' };
  await env.BUCKET.put(DATA_KEY, JSON.stringify(next), { httpMetadata: { contentType: 'application/json' } });
  await addLog(env, { name: 'Sistem (otomatis)', role: 'system' }, items);
  return { cleaned: due.length, files };
}
