// Halaman SEO yang dirender di server (biar kebaca Google):
//   /villa                 → daftar semua villa per area
//   /villa/<slug>          → halaman detail tiap villa
//   /sewa-villa-<area>     → villa per area (Cisarua, Ciloto, Kota Bunga, ...)
//   /villa-<kategori>      → villa kolam renang, rombongan, karaoke, murah
//   /sitemap.xml, /robots.txt
// Data diambil langsung dari data.json di R2, jadi otomatis ikut update tiap admin simpan.
import { DATA_KEY } from './lib.js';

const SITE = 'https://puncakgovillas.com';
const BRAND = 'PuncakGoVillas';

// ---------- data ----------
export async function loadSite(env) {
  const obj = env.BUCKET ? await env.BUCKET.get(DATA_KEY) : null;
  const d = obj ? await obj.json() : {};
  const villas = (d.villas || []).filter((v) => v && v.name && v.active !== false && !v.status);
  const slugs = assignSlugs(villas);
  villas.forEach((v) => { v._slug = slugs.get(v.id); v._area = areaOf(v.location); });
  return { d, villas, settings: d.settings || {} };
}

export function slugify(s) {
  return String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'villa';
}
// Slug unik per villa. Urutan pakai id biar stabil (sama persis kayak di app.js).
export function assignSlugs(villas) {
  const used = new Map(), out = new Map();
  [...villas].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).forEach((v) => {
    const base = slugify(v.name);
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    out.set(v.id, n === 1 ? base : base + '-' + n);
  });
  return out;
}

const AREAS = ['Cisarua', 'Ciloto', 'Kota Bunga', 'Cipanas', 'Hanjawar', 'Cimacan', 'Megamendung', 'Tugu', 'Cibodas', 'Puncak Resort', 'Pacet', 'Sindanglaya', 'Gadog', 'Ciburial', 'Cibereum', 'Safari'];
export function areaOf(loc) {
  const s = String(loc || '').toLowerCase().replace(/\s+/g, ' ');
  let best = null, pos = 1e9;
  for (const a of AREAS) { const i = s.indexOf(a.toLowerCase()); if (i >= 0 && i < pos) { pos = i; best = a; } }
  return best;
}
const areaSlug = (a) => 'sewa-villa-' + slugify(a);

const capOf = (v) => +v.capMax || +v.capStd || 0;
const minPrice = (v) => { const a = [v.priceWeekday, v.priceSemi, v.priceWeekend].map(Number).filter((x) => x > 0); return a.length ? Math.min(...a) : 0; };
const has = (v, re) => re.test((v.facilities || []).join(' ') + ' ' + (v.desc || ''));

const CATS = [
  { slug: 'villa-kolam-renang-puncak', name: 'Villa Kolam Renang di Puncak', short: 'Kolam renang',
    intro: 'Pilihan villa di Puncak yang punya kolam renang, cocok buat liburan keluarga dan rombongan.', test: (v) => has(v, /kolam|pool|renang/i) },
  { slug: 'villa-rombongan-puncak', name: 'Villa Rombongan & Kapasitas Besar di Puncak', short: 'Rombongan (30+ orang)',
    intro: 'Villa besar di Puncak yang muat 30 orang lebih. Pas buat gathering kantor, reuni, outing, dan acara keluarga besar.', test: (v) => capOf(v) >= 30 },
  { slug: 'villa-karaoke-puncak', name: 'Villa dengan Karaoke di Puncak', short: 'Ada karaoke',
    intro: 'Villa di Puncak yang udah ada fasilitas karaoke, biar liburan makin seru.', test: (v) => has(v, /karaoke/i) },
  { slug: 'villa-murah-puncak', name: 'Villa Murah di Puncak', short: 'Harga hemat',
    intro: 'Villa di Puncak dengan harga paling bersahabat, diurutkan dari yang termurah.', test: (v) => minPrice(v) > 0, sort: (a, b) => minPrice(a) - minPrice(b), limit: 60 },
];

// ---------- util ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = (n) => 'Rp' + Math.round(+n || 0).toLocaleString('id-ID');
const rpShort = (n) => { n = +n || 0; return n >= 1e6 ? 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt' : rp(n); };
const abs = (p) => (/^https?:/.test(p) ? p : SITE + p);
function waNum(s) { let n = String(s.wa || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1); else if (n.startsWith('8')) n = '62' + n; return n; }
const waLink = (s, text) => 'https://wa.me/' + waNum(s) + '?text=' + encodeURIComponent(text);
const goodPhotos = (v) => (v.photos || []).filter((p) => typeof p === 'string' && /^(\/photos\/|https?:)/.test(p));

function areaCounts(villas) {
  const m = new Map(); villas.forEach((v) => { if (v._area) m.set(v._area, (m.get(v._area) || 0) + 1); });
  return [...m.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
}

// ---------- layout ----------
const CSS = `
.sp-top{background:var(--green);color:#fff}.sp-top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px;padding-bottom:10px}
.sp-top img{height:40px;width:auto;display:block}.sp-top a{color:#fff;text-decoration:none;font-weight:600;font-size:14px}
.sp-main{padding:18px 0 40px}.crumb{font-size:13px;color:var(--muted);margin:0 0 10px}.crumb a{color:var(--muted)}
.sp-main h1{font-size:26px;line-height:1.25;margin:0 0 8px}.sp-main h2{font-size:19px;margin:26px 0 10px}
.lead{color:var(--muted);margin:0 0 16px}
.gal{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;border-radius:var(--r);margin:0 0 16px}
.gal img{flex:0 0 88%;max-width:620px;aspect-ratio:4/3;object-fit:cover;border-radius:12px;scroll-snap-align:start;background:#ddd}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 6px}
.facts div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px}.facts b{display:block;font-size:16px}.facts span{font-size:12.5px;color:var(--muted)}
.ptab{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ptab td{padding:10px 12px;border-top:1px solid var(--line)}.ptab tr:first-child td{border-top:0}.ptab td:last-child{text-align:right;font-weight:700}
.ptab small{color:var(--muted);font-weight:400}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chips span{background:var(--soft);color:var(--green);border-radius:999px;padding:4px 11px;font-size:13px;font-weight:600}
.cta{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.vcard{background:#fff;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-decoration:none;color:var(--ink);display:flex;flex-direction:column}
.vcard img,.vcard .noimg{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:var(--green)}
.vcard div.t{padding:10px 12px 12px}.vcard b{display:block;font-size:15px;line-height:1.3}.vcard span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px}.vcard em{font-style:normal;font-weight:700;color:var(--green);display:block;margin-top:6px}
.links{display:flex;flex-wrap:wrap;gap:8px}.links a{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13.5px;font-weight:600;text-decoration:none;color:var(--green)}
.sp-foot{border-top:1px solid var(--line);padding:22px 0 34px;color:var(--muted);font-size:13.5px}.sp-foot h3{font-size:14px;color:var(--ink);margin:14px 0 8px}
.desc{white-space:pre-line}
`;

function page({ title, desc, path, body, image, jsonld, villas, status = 200 }) {
  const url = SITE + path;
  const ac = villas ? areaCounts(villas) : [];
  const html = `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${status === 404 ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`}
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(abs(image || '/img/bg-villa.jpg'))}">
<meta name="theme-color" content="#1f4a33">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"><style>${CSS}</style>
${(jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>
<header class="sp-top"><div class="wrap"><a href="/" aria-label="${BRAND} beranda"><img src="/img/logo.png" alt="${BRAND}" width="96" height="40"></a><a href="/">Cek villa kosong →</a></div></header>
<main class="sp-main"><div class="wrap">${body}</div></main>
<footer class="sp-foot"><div class="wrap">
${ac.length ? `<h3>Sewa villa per area</h3><div class="links">${ac.map(([a, n]) => `<a href="/${areaSlug(a)}">Villa ${esc(a)} (${n})</a>`).join('')}</div>` : ''}
<h3>Cari berdasarkan kebutuhan</h3><div class="links">${CATS.map((c) => `<a href="/${c.slug}">${esc(c.short)}</a>`).join('')}<a href="/villa">Semua villa</a></div>
<p style="margin-top:18px">© ${BRAND} · Komplek Bukit Danau Villa Brajamusti, Puncak · Sewa villa di Puncak, cek tanggal kosong & booking langsung via WhatsApp.</p>
</div></footer>
</body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

function vcard(v) {
  const ph = goodPhotos(v)[0];
  const mp = minPrice(v);
  return `<a class="vcard" href="/villa/${v._slug}">${ph ? `<img src="${esc(ph)}" alt="${esc(v.name)}" loading="lazy" width="400" height="300">` : `<div class="noimg">${esc(v.name.replace(/^villa\s*/i, '').charAt(0))}</div>`}<div class="t"><b>${esc(v.name)}</b><span>${esc(v.location || 'Puncak')}</span><span>${[v.bedrooms ? v.bedrooms + ' kamar' : '', capOf(v) ? 'muat ' + capOf(v) + ' orang' : ''].filter(Boolean).join(' · ')}</span>${mp ? `<em>Mulai ${rpShort(mp)}/malam</em>` : ''}</div></a>`;
}

const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })) });

// ---------- halaman ----------
function villaPage(v, site) {
  const s = site.settings, ph = goodPhotos(v), mp = minPrice(v), cap = capOf(v);
  const area = v._area || 'Puncak';
  const fac = v.facilities || [];
  const semi = v.priceSemi || (v.priceWeekday && v.priceWeekend ? Math.round((+v.priceWeekday + +v.priceWeekend) / 2 / 50000) * 50000 : 0);
  const title = `${v.name} – Sewa Villa ${area}${v.bedrooms ? ' ' + v.bedrooms + ' Kamar' : ''} | ${BRAND}`;
  const desc = `Sewa ${v.name} di ${v.location || 'Puncak'}${v.bedrooms ? ', ' + v.bedrooms + ' kamar' : ''}${cap ? ', muat ' + cap + ' orang' : ''}${fac.length ? ', ' + fac.slice(0, 4).join(', ') : ''}.${mp ? ' Mulai ' + rp(mp) + '/malam.' : ''} Cek tanggal kosong & booking via WhatsApp.`.slice(0, 300);
  const related = site.villas.filter((x) => x.id !== v.id && x._area && x._area === v._area).slice(0, 6);
  const rows = [
    v.priceWeekday && ['Weekday', 'Minggu–Kamis malam', v.priceWeekday],
    semi && ['Semi weekend', 'Jumat & malam sebelum tanggal merah', semi],
    v.priceWeekend && ['Weekend', 'Sabtu malam & Natal', v.priceWeekend],
    v.priceHigh && ['High season', 'Libur panjang / tahun baru', v.priceHigh],
  ].filter(Boolean);
  const body = `
<p class="crumb"><a href="/">Beranda</a> › <a href="/villa">Villa</a>${v._area ? ` › <a href="/${areaSlug(v._area)}">${esc(v._area)}</a>` : ''} › ${esc(v.name)}</p>
<h1>${esc(v.name)}</h1>
<p class="lead">📍 ${esc(v.location || 'Puncak')}${mp ? ` · mulai <b>${rp(mp)}</b>/malam` : ''}</p>
${ph.length ? `<div class="gal">${ph.map((p, i) => `<img src="${esc(p)}" alt="${esc(v.name)} – foto ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="620" height="465">`).join('')}</div>` : ''}
<div class="facts">
${v.bedrooms ? `<div><b>${v.bedrooms}</b><span>kamar tidur</span></div>` : ''}${v.bathrooms ? `<div><b>${v.bathrooms}</b><span>kamar mandi</span></div>` : ''}
${v.capStd ? `<div><b>${v.capStd} orang</b><span>kapasitas normal</span></div>` : ''}${v.capMax ? `<div><b>${v.capMax} orang</b><span>kapasitas maksimal</span></div>` : ''}
</div>
<div class="cta">${s.wa ? `<a class="btn wa big" href="${esc(waLink(s, 'Halo PuncakGoVillas, saya mau tanya ' + v.name + '. Untuk tanggal ... masih kosong?'))}" target="_blank" rel="noopener">Tanya & booking via WhatsApp</a>` : ''}<a class="btn big" href="/">Cek tanggal kosong</a></div>
${rows.length ? `<h2>Harga sewa ${esc(v.name)}</h2><table class="ptab">${rows.map(([a, b, p]) => `<tr><td>${a}<br><small>${b}</small></td><td>${rp(p)}<small>/malam</small></td></tr>`).join('')}</table>` : ''}
${fac.length ? `<h2>Fasilitas</h2><div class="chips">${fac.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
${v.desc ? `<h2>Tentang villa ini</h2><p class="desc">${esc(v.desc)}</p>` : ''}
${related.length ? `<h2>Villa lain di ${esc(v._area)}</h2><div class="grid">${related.map(vcard).join('')}</div><p><a href="/${areaSlug(v._area)}">Lihat semua villa di ${esc(v._area)} →</a></p>` : ''}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'LodgingBusiness', name: v.name, url: SITE + '/villa/' + v._slug,
    image: ph.slice(0, 6).map(abs), description: desc,
    address: { '@type': 'PostalAddress', addressLocality: v.location || 'Puncak', addressRegion: 'Jawa Barat', addressCountry: 'ID' },
    ...(mp ? { priceRange: rp(mp) + (v.priceHigh || v.priceWeekend ? ' – ' + rp(Math.max(+v.priceHigh || 0, +v.priceWeekend || 0)) : '') + ' per malam' } : {}),
    ...(v.bedrooms ? { numberOfRooms: +v.bedrooms } : {}),
    ...(fac.length ? { amenityFeature: fac.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })) } : {}),
    ...(s.wa ? { telephone: '+' + waNum(s) } : {}),
  }, crumbLd([['Beranda', '/'], ['Villa', '/villa'], ...(v._area ? [[v._area, '/' + areaSlug(v._area)]] : []), [v.name, '/villa/' + v._slug]])];
  return page({ title, desc, path: '/villa/' + v._slug, body, image: ph[0], jsonld: ld, villas: site.villas });
}

function listPage({ path, title, desc, h1, intro, list, crumbs, site, extra = '' }) {
  const body = `<p class="crumb">${crumbs.map(([n, p], i) => (i < crumbs.length - 1 ? `<a href="${p}">${esc(n)}</a>` : esc(n))).join(' › ')}</p>
<h1>${esc(h1)}</h1><p class="lead">${esc(intro)}</p>${extra}
${list.length ? `<div class="grid">${list.map(vcard).join('')}</div>` : '<p>Belum ada villa di kategori ini.</p>'}
<div class="cta">${site.settings.wa ? `<a class="btn wa big" href="${esc(waLink(site.settings, 'Halo PuncakGoVillas, saya mau cari villa di Puncak untuk tanggal ... , ... orang.'))}" target="_blank" rel="noopener">Minta rekomendasi via WhatsApp</a>` : ''}<a class="btn big" href="/">Cek villa kosong di tanggal kamu</a></div>`;
  const ld = [crumbLd(crumbs), { '@context': 'https://schema.org', '@type': 'ItemList', name: h1, numberOfItems: list.length,
    itemListElement: list.slice(0, 100).map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/villa/' + v._slug, name: v.name })) }];
  return page({ title, desc, path, body, image: goodPhotos(list.find((v) => goodPhotos(v).length) || {})[0], jsonld: ld, villas: site.villas });
}

function notFound(site) {
  return page({ title: 'Halaman nggak ketemu | ' + BRAND, desc: 'Halaman yang kamu cari nggak ada.', path: '/villa', status: 404, villas: site.villas,
    body: '<h1>Halaman nggak ketemu</h1><p class="lead">Villanya mungkin udah nggak tersedia. Coba lihat villa lain:</p><div class="cta"><a class="btn primary big" href="/villa">Lihat semua villa</a><a class="btn big" href="/">Cek villa kosong</a></div>' });
}

// Bagian yang ditempel ke halaman utama (biar Google lihat link ke semua area & villa)
export const HOME_LD = (site) => ({ '@context': 'https://schema.org', '@type': 'LodgingBusiness', name: BRAND, url: SITE + '/', logo: SITE + '/img/icon-512.png', image: SITE + '/img/bg-villa.jpg',
  description: 'Sewa villa di Puncak: cek villa yang kosong di tanggal kamu, lalu booking via WhatsApp.',
  address: { '@type': 'PostalAddress', streetAddress: 'Komplek Bukit Danau Villa Brajamusti', addressLocality: 'Puncak', addressRegion: 'Jawa Barat', addressCountry: 'ID' },
  ...(site.settings.wa ? { telephone: '+' + waNum(site.settings) } : {}) });
export function homeSeoBlock(site) {
  const ac = areaCounts(site.villas);
  return `<section id="seo" class="sp-foot" style="background:var(--bg)"><div class="wrap">
<h2 style="font-size:18px;color:var(--ink);margin:0 0 6px">Sewa villa di Puncak</h2>
<p style="margin:0 0 10px">${BRAND} punya ${site.villas.length} pilihan villa di Puncak, Bogor & Cianjur, dari villa keluarga 2 kamar sampai villa rombongan kapasitas besar dengan kolam renang & karaoke. Cek villa yang masih kosong di tanggal kamu, lalu booking langsung via WhatsApp.</p>
${ac.length ? `<h3>Villa per area</h3><div class="links">${ac.map(([a, n]) => `<a href="/${areaSlug(a)}">Villa ${esc(a)} (${n})</a>`).join('')}</div>` : ''}
<h3>Cari berdasarkan kebutuhan</h3><div class="links">${CATS.map((c) => `<a href="/${c.slug}">${esc(c.short)}</a>`).join('')}<a href="/villa">Semua ${site.villas.length} villa</a></div>
</div></section>`;
}

// ---------- router ----------
export async function handleSeo(request, env) {
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  }
  const site = await loadSite(env);
  if (p === '/sitemap.xml') {
    const urls = [['/', site.d.savedAt], ['/villa', site.d.savedAt],
      ...areaCounts(site.villas).map(([a]) => ['/' + areaSlug(a), site.d.savedAt]),
      ...CATS.map((c) => ['/' + c.slug, site.d.savedAt]),
      ...site.villas.map((v) => ['/villa/' + v._slug, v.updatedAt || v.createdAt || site.d.savedAt])];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, t]) => `<url><loc>${SITE}${u}</loc>${t ? `<lastmod>${String(t).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
  }
  if (p === '/villa') {
    const ac = areaCounts(site.villas);
    const sorted = [...site.villas].sort((a, b) => String(a._area || 'zzz').localeCompare(String(b._area || 'zzz')) || a.name.localeCompare(b.name));
    return listPage({ path: '/villa', site, list: sorted, title: `Daftar ${site.villas.length} Villa di Puncak – Sewa Villa Harian | ${BRAND}`,
      desc: `Daftar lengkap ${site.villas.length} villa di Puncak: Cisarua, Ciloto, Kota Bunga, Cipanas & sekitarnya. Lihat foto, fasilitas, harga, lalu booking via WhatsApp.`,
      h1: `Semua villa di Puncak (${site.villas.length})`, intro: 'Pilih villa sesuai area, jumlah kamar, dan budget. Klik villanya buat lihat foto, fasilitas, dan harga lengkap.',
      crumbs: [['Beranda', '/'], ['Villa', '/villa']],
      extra: ac.length ? `<div class="links" style="margin:0 0 16px">${ac.map(([a, n]) => `<a href="/${areaSlug(a)}">${esc(a)} (${n})</a>`).join('')}</div>` : '' });
  }
  let m = /^\/villa\/([a-z0-9-]+)$/.exec(p);
  if (m) {
    const v = site.villas.find((x) => x._slug === m[1]);
    return v ? villaPage(v, site) : notFound(site);
  }
  m = /^\/sewa-villa-([a-z0-9-]+)$/.exec(p);
  if (m) {
    const area = areaCounts(site.villas).map(([a]) => a).find((a) => slugify(a) === m[1]);
    if (!area) return notFound(site);
    const list = site.villas.filter((v) => v._area === area).sort((a, b) => (minPrice(a) || 9e9) - (minPrice(b) || 9e9));
    return listPage({ path: p, site, list, title: `Sewa Villa ${area} Puncak – ${list.length} Pilihan Villa | ${BRAND}`,
      desc: `${list.length} pilihan villa di ${area}, Puncak. Lihat foto, fasilitas & harga mulai ${rp(Math.min(...list.map(minPrice).filter(Boolean)) || 0)}/malam, cek tanggal kosong, booking via WhatsApp.`,
      h1: `Sewa villa di ${area}`, intro: `Ada ${list.length} villa di ${area} yang bisa kamu sewa harian. Diurutkan dari harga termurah.`,
      crumbs: [['Beranda', '/'], ['Villa', '/villa'], [area, p]] });
  }
  const cat = CATS.find((c) => '/' + c.slug === p);
  if (cat) {
    let list = site.villas.filter(cat.test);
    list.sort(cat.sort || ((a, b) => (minPrice(a) || 9e9) - (minPrice(b) || 9e9)));
    if (cat.limit) list = list.slice(0, cat.limit);
    return listPage({ path: p, site, list, title: `${cat.name} – ${list.length} Pilihan | ${BRAND}`,
      desc: `${cat.intro} ${list.length} pilihan villa, lengkap foto, fasilitas & harga. Booking via WhatsApp.`,
      h1: cat.name, intro: cat.intro, crumbs: [['Beranda', '/'], ['Villa', '/villa'], [cat.name, p]] });
  }
  return null; // bukan halaman SEO
}
