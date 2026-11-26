// Pintu masuk Cloudflare Worker: API + foto lewat sini, sisanya file statis di /public
import * as data from './functions/api/data.js';
import * as login from './functions/api/login.js';
import * as photo from './functions/api/photo.js';
import * as photoFile from './functions/photos/[name].js';
import * as admins from './functions/api/admins.js';
import * as log from './functions/api/log.js';
import * as priv from './functions/api/private.js';
import * as dupes from './functions/api/dupes.js';
import { cleanRejectedPhotos } from './lib/cleanup.js';
import { handleSeo, loadSite, homeSeoBlock, HOME_LD } from './lib/seo.js';

const HF_OK = /^\/hf\/Xenova\/clip-vit-base-patch32\/resolve\/main\/[A-Za-z0-9_./-]+$/;
async function hfProxy(request, url, ctx) {
  if (!HF_OK.test(url.pathname) || url.pathname.includes('..')) return new Response('Not found', { status: 404 });
  const cache = caches.default, key = new Request(url.origin + url.pathname);
  let res = await cache.match(key);
  if (res) return res;
  const up = await fetch('https://huggingface.co' + url.pathname.slice(3), { redirect: 'follow' });
  if (!up.ok) return new Response('Model error ' + up.status, { status: up.status });
  res = new Response(up.body, { headers: { 'content-type': up.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'public, max-age=2592000', 'access-control-allow-origin': '*' } });
  ctx.waitUntil(cache.put(key, res.clone()).catch(() => {}));
  return res;
}

const ROUTES = { '/api/data': data, '/api/login': login, '/api/photo': photo, '/api/admins': admins, '/api/log': log, '/api/private': priv, '/api/dupes': dupes };

function pick(mod, method) {
  const name = 'onRequest' + method.charAt(0) + method.slice(1).toLowerCase();
  return mod[name];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www -> tanpa www
    if (url.hostname === 'www.puncakgovillas.com') {
      url.hostname = 'puncakgovillas.com';
      return Response.redirect(url.toString(), 301);
    }
    const mod = ROUTES[url.pathname];
    if (mod) {
      const fn = pick(mod, request.method);
      if (!fn) return new Response('Method not allowed', { status: 405 });
      return fn({ request, env, ctx, params: {} });
    }
    // Proxy model AI pemilih foto (biar nggak keblokir/CORS di HP/laptop admin), di-cache di Cloudflare
    if (request.method === 'GET' && url.pathname.startsWith('/hf/')) return hfProxy(request, url, ctx);
    const m = /^\/photos\/([^/]+)$/.exec(url.pathname);
    if (m && request.method === 'GET') {
      return photoFile.onRequestGet({ request, env, ctx, params: { name: m[1] } });
    }
    // Halaman buat Google: detail villa, per area, per kategori, sitemap, robots
    if (request.method === 'GET' && /^\/(villa(\/[^/]*|-[a-z0-9-]+)?|sewa-villa-[a-z0-9-]+|sitemap\.xml|robots\.txt)\/?$/.test(url.pathname)) {
      try { const r = await handleSeo(request, env); if (r) return r; } catch (e) { console.error('seo', e); }
    }
    // Halaman utama: tempel daftar area & kategori (teks + link) biar kebaca Google
    if (request.method === 'GET' && url.pathname === '/') {
      const res = await env.ASSETS.fetch(request);
      try {
        const site = await loadSite(env);
        let html = await res.text();
        html = html.replace('</head>', '<link rel="canonical" href="https://puncakgovillas.com/">\n<script type="application/ld+json">' + JSON.stringify(HOME_LD(site)).replace(/</g, '\\u003c') + '</script>\n</head>')
          .replace('</body>', homeSeoBlock(site) + '\n</body>');
        return new Response(html, { status: res.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120' } });
      } catch (e) { console.error('home seo', e); return res; }
    }
    return env.ASSETS.fetch(request);
  },
  // Cron harian (lihat wrangler.toml): bersihin foto villa yang udah lama ditolak
  async scheduled(event, env, ctx) {
    if (env.BUCKET) ctx.waitUntil(cleanRejectedPhotos(env));
  },
};
