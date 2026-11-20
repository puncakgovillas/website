export const DATA_KEY = 'data.json';

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function needBucket(env) {
  if (!env.BUCKET) return json({ error: 'R2 bucket belum disambungkan (binding BUCKET).' }, 500);
  return null;
}
