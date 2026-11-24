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
    const m = /^\/photos\/([^/]+)$/.exec(url.pathname);
    if (m && request.method === 'GET') {
      return photoFile.onRequestGet({ request, env, ctx, params: { name: m[1] } });
    }
    return env.ASSETS.fetch(request);
  },
  // Cron harian (lihat wrangler.toml): bersihin foto villa yang udah lama ditolak
  async scheduled(event, env, ctx) {
    if (env.BUCKET) ctx.waitUntil(cleanRejectedPhotos(env));
  },
};
