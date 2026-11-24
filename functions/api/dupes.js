import { json, needBucket, DATA_KEY } from '../../lib/lib.js';
import { requireUser } from '../../lib/auth.js';
import { findDupes, normPhone } from '../../lib/dupes.js';

async function load(env) {
  const [d, p] = await Promise.all([env.BUCKET.get(DATA_KEY), env.BUCKET.get('private.json')]);
  const data = d ? await d.json() : { villas: [] };
  let priv = {};
  if (p) { try { priv = (await p.json()).villas || {}; } catch {} }
  return { villas: data.villas || [], priv };
}

// GET /api/dupes
//  - admin/pemilik: daftar villa "menunggu verifikasi" + villa lain yang kemungkinan sama
//  - mitra: cuma status villa miliknya sendiri (kemungkinan dobel atau nggak), tanpa info villa/broker lain
export async function onRequestGet({ request, env }) {
  const miss = needBucket(env); if (miss) return miss;
  const { user, error } = await requireUser(request, env); if (error) return error;
  const { villas, priv } = await load(env);
  const pending = villas.filter((v) => v.status === 'pending');
  if (user.role === 'mitra') {
    const mine = pending.filter((v) => v.ownerAcc === user.id);
    return json({ villas: mine.map((v) => ({ id: v.id, possibleDup: findDupes(v, villas, priv).length > 0, noPhone: !normPhone((priv[v.id] || {}).ownerPhone) })) }, 200, { 'cache-control': 'no-store' });
  }
  const seePhone = user.role === 'owner' || user.canSeeOwner;
  const brief = (v) => ({
    id: v.id, name: v.name, location: v.location || '', bedrooms: v.bedrooms || 0,
    priceWeekday: v.priceWeekday || 0, priceWeekend: v.priceWeekend || 0, status: v.status || 'ok',
    by: v.createdBy || '', createdAt: v.createdAt || '', ownerAcc: v.ownerAcc || '',
    photo: (v.photos || [])[0] || '', ...(seePhone ? { ownerPhone: (priv[v.id] || {}).ownerPhone || '', ownerName: (priv[v.id] || {}).ownerName || '' } : {}),
  });
  const list = pending.map((v) => ({
    ...brief(v), noPhone: !normPhone((priv[v.id] || {}).ownerPhone),
    matches: findDupes(v, villas, priv).map((m) => ({ ...brief(m.villa), reasons: m.reasons, strong: m.strong })),
  })).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return json({ villas: list }, 200, { 'cache-control': 'no-store' });
}
