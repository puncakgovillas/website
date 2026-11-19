// GET /photos/<nama-file>  -> ambil foto dari R2
export async function onRequestGet({ params, env, request }) {
  const name = String(params.name || '');
  if (!/^[a-z0-9]+\.(jpg|png|webp)$/.test(name) || !env.BUCKET) return new Response('Not found', { status: 404 });
  const obj = await env.BUCKET.get('photos/' + name, { onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
