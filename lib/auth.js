// Akun admin: pemilik (pakai ADMIN_PASSWORD) + admin staf (disimpan di R2 admins.json)
import { json } from './lib.js';

const enc = new TextEncoder();
const ADMINS_KEY = 'admins.json';
const TOKEN_DAYS = 30;

function b64u(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

export async function hashPassword(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return hex(bits);
}

export async function getAdmins(env) {
  const obj = await env.BUCKET.get(ADMINS_KEY);
  if (!obj) return [];
  try { return await obj.json(); } catch { return []; }
}
export async function saveAdmins(env, list) {
  await env.BUCKET.put(ADMINS_KEY, JSON.stringify(list), { httpMetadata: { contentType: 'application/json' } });
}

export async function makeToken(env, user) {
  const payload = b64u(enc.encode(JSON.stringify({ ...user, exp: Date.now() + TOKEN_DAYS * 864e5 })));
  return payload + '.' + (await hmac(env.ADMIN_PASSWORD, payload));
}

// Siapa yang lagi login? -> { id, name, role: 'owner' | 'staff' } atau null
export async function currentUser(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  const h = request.headers.get('authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [payload, sig] = tok.split('.');
  if (!payload || !sig) return null;
  if (!sameStr(sig, await hmac(env.ADMIN_PASSWORD, payload))) return null;
  let u;
  try { u = JSON.parse(new TextDecoder().decode(unb64u(payload))); } catch { return null; }
  if (!u || !u.exp || u.exp < Date.now()) return null;
  if (u.role === 'owner') return { id: 'owner', name: u.name || 'Pemilik', role: 'owner' };
  // Admin staf harus masih terdaftar (kalau dihapus pemilik, langsung nggak bisa masuk)
  const admins = await getAdmins(env);
  const a = admins.find((x) => x.id === u.id);
  if (!a || a.ver !== u.ver) return null;
  return { id: a.id, name: a.name, role: 'staff' };
}

export async function login(env, name, password) {
  name = String(name || '').trim();
  password = String(password || '');
  if (!env.ADMIN_PASSWORD || !password) return null;
  if (sameStr(password, env.ADMIN_PASSWORD)) {
    return { id: 'owner', name: name || 'Pemilik', role: 'owner' };
  }
  const admins = await getAdmins(env);
  const a = admins.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!a) return null;
  if (!sameStr(await hashPassword(password, a.salt), a.hash)) return null;
  return { id: a.id, name: a.name, role: 'staff', ver: a.ver };
}

export async function requireUser(request, env, role) {
  const u = await currentUser(request, env);
  if (!u) return { error: json({ error: 'Sesi habis, silakan login lagi.' }, 401) };
  if (role === 'owner' && u.role !== 'owner') return { error: json({ error: 'Cuma pemilik yang boleh.' }, 403) };
  return { user: u };
}
