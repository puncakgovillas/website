export const DATA_KEY = 'data.json';

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

// Bandingkan password admin tanpa bocor lewat waktu respons
export function isAdmin(request, env) {
  const given = request.headers.get('x-admin-key') || '';
  const real = env.ADMIN_PASSWORD || '';
  if (!real || given.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= given.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}

export function needBucket(env) {
  if (!env.BUCKET) return json({ error: 'R2 bucket belum disambungkan (binding BUCKET).' }, 500);
  return null;
}
