// Halaman SEO yang dirender di server (biar kebaca Google):
//   /villa                 → daftar semua villa per area
//   /villa/<slug>          → halaman detail tiap villa
//   /sewa-villa-<area>     → villa per area (Cisarua, Ciloto, Kota Bunga, ...)
//   /villa-<kategori>      → villa kolam renang, rombongan, karaoke, murah
//   /sitemap.xml, /robots.txt
// Data diambil langsung dari data.json di R2, jadi otomatis ikut update tiap admin simpan.
import { DATA_KEY } from './lib.js';
import { makePricer, discOn, discActive, todayWIB, addDays, dow } from './pricing.js';
import { guideOf, faqOf, rulesOf, withDefaults } from './content.js';

const SITE = 'https://puncakgovillas.com';
const BRAND = 'PuncakGoVillas';

// ---------- data ----------
export async function loadSite(env) {
  const obj = env.BUCKET ? await env.BUCKET.get(DATA_KEY) : null;
  const d = obj ? await obj.json() : {};
  const villas = (d.villas || []).filter((v) => v && v.name && v.active !== false && !v.status);
  const slugs = assignSlugs(villas);
  villas.forEach((v) => { v._slug = slugs.get(v.id); v._area = areaOf(v.location); });
  return { d, villas, settings: withDefaults(d.settings) };
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
  { slug: 'villa-rombongan-puncak', name: 'Villa Rombongan & Kapasitas Besar di Puncak', short: 'Rombongan (50+ orang)',
    intro: 'Villa besar di Puncak yang muat 50 orang atau lebih. Pas buat gathering kantor, reuni, outing, dan acara keluarga besar.', test: (v) => capOf(v) >= 50 },
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
.vp{padding-bottom:90px}
.vhero{position:relative;border-radius:20px;overflow:hidden;background:#1c2b22;margin:0 0 10px;box-shadow:0 14px 34px rgba(24,38,29,.18)}
.vhero .sl{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.vhero .sl::-webkit-scrollbar{display:none}
.vhero .sl img{flex:0 0 100%;width:100%;aspect-ratio:4/3;object-fit:cover;scroll-snap-align:start;display:block}
@media(min-width:760px){.vhero .sl img{aspect-ratio:16/9}}
.vhero .nb{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.92);font-size:22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);display:none}
@media(min-width:760px){.vhero .nb{display:block}}.vhero .nb.p{left:14px}.vhero .nb.n{right:14px}
.vhero .cnt{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.6);color:#fff;font-size:12.5px;font-weight:700;border-radius:999px;padding:5px 11px}
.vhero .tag{position:absolute;left:12px;top:12px;display:flex;gap:6px;flex-wrap:wrap}
.vhero .tag span{background:rgba(255,255,255,.95);color:var(--green);font-size:12.5px;font-weight:800;border-radius:999px;padding:5px 11px}.vhero .tag span.red{background:#d93a2b;color:#fff}
.vhero.none{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1f4a33,#2f6b49);color:#fff;font-size:64px;font-weight:800}
.thumbs{display:flex;gap:8px;overflow-x:auto;margin:0 0 18px;scrollbar-width:thin}.thumbs button{flex:0 0 auto;border:2px solid transparent;border-radius:10px;padding:0;overflow:hidden;cursor:pointer;background:none;opacity:.7}
.thumbs button.on{border-color:var(--green);opacity:1}.thumbs img{width:84px;height:60px;object-fit:cover;display:block}
.vtitle h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px}.vtitle .loc{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-weight:600;margin:0 0 14px}
.vlay{display:grid;gap:22px}@media(min-width:900px){.vlay{grid-template-columns:1fr 320px;align-items:start}}
.vside{position:sticky;top:16px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(24,38,29,.08)}
.vside .from{font-size:13px;color:var(--muted)}.vside .vbig{font-size:28px;font-weight:800;color:var(--green);letter-spacing:-.02em;line-height:1.15}.vside .vbig small{font-size:14px;color:var(--muted);font-weight:600}
.vside .btn{width:100%;margin-top:10px}.vside .mini{display:flex;gap:8px;margin-top:14px}.vside .mini div{flex:1;background:var(--bg);border-radius:12px;padding:8px 10px;text-align:center}.vside .mini b{display:block}.vside .mini span{font-size:11.5px;color:var(--muted)}
.vside .trust{margin:14px 0 0;padding:0;list-style:none;font-size:13px;color:var(--muted)}.vside .trust li{margin:6px 0}
@media(max-width:899px){.vside{position:static}}
.specs{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:0 0 6px}
.specs div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;align-items:center;gap:12px}
.specs i{font-style:normal;font-size:24px;width:44px;height:44px;border-radius:12px;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.specs b{display:block;font-size:20px;line-height:1.1}.specs span{font-size:12.5px;color:var(--muted)}
.vsec{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px;margin:0 0 16px}
.vsec>h2{margin:0 0 12px;font-size:19px;display:flex;align-items:center;gap:8px}.vsec>h2 i{font-style:normal;width:34px;height:34px;border-radius:10px;background:var(--soft);display:inline-flex;align-items:center;justify-content:center;font-size:18px}
.prices{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.prices div{border-radius:14px;padding:12px 14px;border:1px solid var(--line);border-left:5px solid var(--green);background:#fbfaf6}
.prices div.s{border-left-color:#e0a12f}.prices div.w{border-left-color:#e0612f}.prices div.h{border-left-color:#b3261e}
.prices span{display:block;font-weight:700;font-size:14px}.prices small{display:block;color:var(--muted);font-size:12px;margin:2px 0 6px}.prices b{font-size:19px}.prices em{font-style:normal;color:var(--muted);font-size:12px}
.facg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.facg span{display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:12px;padding:9px 11px;font-weight:600;font-size:14px}.facg i{font-style:normal;font-size:18px}
.vsec .cal{border:0;padding:0;max-width:none}
.rules ul.ic{list-style:none;padding:0}.rules ul.ic li{padding:8px 0 8px 30px;position:relative;border-top:1px dashed var(--line)}.rules ul.ic li:first-child{border-top:0}.rules ul.ic li:before{content:'✔';position:absolute;left:4px;top:8px;color:var(--green);font-weight:800}
.vsec .rules{border:0;padding:0}
.mbar{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#fff;border-top:1px solid var(--line);box-shadow:0 -6px 20px rgba(0,0,0,.08);padding:10px 14px;display:flex;align-items:center;gap:10px}
.mbar .pp{flex:1;line-height:1.15}.mbar .pp small{display:block;font-size:11.5px;color:var(--muted)}.mbar .pp b{font-size:18px;color:var(--green)}
@media(min-width:900px){.mbar{display:none}.vp{padding-bottom:20px}}
.off{display:inline-block;background:#d93a2b;color:#fff;font-weight:800;font-size:12px;border-radius:8px;padding:2px 7px;margin-left:6px;vertical-align:middle}
s.old{color:var(--muted);font-weight:400;font-size:.85em;margin-right:4px}
.cal{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:12px;max-width:560px}
.calh{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px}.calh b{font-size:16px}
.calh button{border:1px solid var(--line);background:#fff;border-radius:10px;width:38px;height:34px;font-size:18px;cursor:pointer}.calh button:disabled{opacity:.3;cursor:default}
.calg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.calg .wd{font-size:11.5px;color:var(--muted);text-align:center;font-weight:700;padding:2px 0}
.calg .c{min-height:50px;border-radius:9px;padding:4px 3px;text-align:center;font-size:13px;font-weight:700;color:var(--ink);text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;border:1px solid var(--line);background:#fff}
.calg .c small{font-size:10.5px;font-weight:600;color:var(--green);line-height:1.1}
.calg a.c:hover{border-color:var(--green);background:var(--soft)}
.calg .c.we small{color:#b4570a}.calg .c.hi small{color:#b3261e}.calg .c.dc{background:#fff4f2}.calg .c.dc small{color:#d93a2b}
.calg .c.full{background:#eee;color:#aaa;border-color:#eee;text-decoration:line-through}.calg .c.full small{color:#999;text-decoration:none}
.calg .c.past,.calg .c.empty{background:transparent;border-color:transparent;color:#c7c7c7}
.calk{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:var(--muted);margin:10px 0 0}.calk i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:4px;border:1px solid var(--line)}
.upd{font-size:13px;color:var(--muted);margin:8px 0 0}
.rules{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:12px 16px}.rules ul{margin:6px 0 0;padding-left:20px}.rules li{margin:4px 0}
.ci{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 8px}.ci div{background:var(--soft);border-radius:10px;padding:8px 12px}.ci b{display:block;font-size:17px}.ci span{font-size:12px;color:var(--muted)}
.steps{counter-reset:st;list-style:none;padding:0;margin:0}.steps li{counter-increment:st;position:relative;padding:10px 12px 10px 52px;background:#fff;border:1px solid var(--line);border-radius:12px;margin:0 0 8px}
.steps li:before{content:counter(st);position:absolute;left:12px;top:9px;width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.faq details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:0 0 8px}.faq summary{font-weight:700;cursor:pointer}.faq p{margin:8px 0 2px;color:var(--ink)}
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
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(abs(image || '/img/og-kantor.jpg'))}">
<meta name="theme-color" content="#1f4a33">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"><style>${CSS}</style>
${(jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>
<header class="sp-top"><div class="wrap"><a href="/" aria-label="${BRAND} beranda"><img src="/img/logo.png" alt="${BRAND}" width="96" height="40"></a><span style="display:flex;gap:16px"><a href="/panduan-booking">Panduan</a><a href="/">Cek villa kosong →</a></span></div></header>
<main class="sp-main"><div class="wrap">${body}</div></main>
<footer class="sp-foot"><div class="wrap">
${ac.length ? `<h3>Sewa villa per area</h3><div class="links">${ac.map(([a, n]) => `<a href="/${areaSlug(a)}">Villa ${esc(a)} (${n})</a>`).join('')}</div>` : ''}
<h3>Cari berdasarkan kebutuhan</h3><div class="links">${CATS.map((c) => `<a href="/${c.slug}">${esc(c.short)}</a>`).join('')}<a href="/villa">Semua villa</a></div>
<p style="margin-top:18px">© ${BRAND} · Komplek Bukit Danau Villa Brajamusti, Puncak · Sewa villa di Puncak, cek tanggal kosong & booking langsung via WhatsApp.</p>
</div></footer>
</body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}

function vcard(v) {
  const ph = goodPhotos(v)[0];
  const mp = minPrice(v);
  return `<a class="vcard" href="/villa/${v._slug}">${ph ? `<img src="${esc(ph)}" alt="${esc(v.name)}" loading="lazy" width="400" height="300">` : `<div class="noimg">${esc(v.name.replace(/^villa\s*/i, '').charAt(0))}</div>`}<div class="t"><b>${esc(v.name)}</b><span>${esc(v.location || 'Puncak')}</span><span>${[v.bedrooms ? v.bedrooms + ' kamar' : '', capOf(v) ? 'muat ' + capOf(v) + ' orang' : ''].filter(Boolean).join(' · ')}</span>${mp ? `<em>Mulai ${discActive(v) ? `<s class="old">${rpShort(mp)}</s>` + rpShort(Math.round(mp * (100 - discActive(v)) / 100 / 10000) * 10000) : rpShort(mp)}/malam${discActive(v) ? `<span class="off">${discActive(v)}% OFF</span>` : ''}</em>` : ''}</div></a>`;
}

const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })) });

// ---------- kalender harga, peraturan ----------
const pShort = (p) => (p >= 1e6 ? (Math.round(p / 1e5) / 10).toLocaleString('id-ID') + 'jt' : Math.round(p / 1000) + 'rb');
const fmtLong = (ds) => new Date(ds + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function calendarHtml(v, site, nMonths = 6) {
  const pr = makePricer(site.d), today = todayWIB(), booked = new Set((site.d.booked || {})[v.id] || []), s = site.settings;
  let [y, m] = today.split('-').map(Number);
  const months = [];
  for (let k = 0; k < nMonths; k++) {
    const first = `${y}-${String(m).padStart(2, '0')}-01`, lead = (dow(first) + 6) % 7;
    let cells = '<span class="wd">Sen</span><span class="wd">Sel</span><span class="wd">Rab</span><span class="wd">Kam</span><span class="wd">Jum</span><span class="wd">Sab</span><span class="wd">Min</span>' + '<span class="c empty"></span>'.repeat(lead);
    for (let ds = first; ds.slice(0, 7) === first.slice(0, 7); ds = addDays(ds, 1)) {
      const day = +ds.slice(8);
      if (ds < today) { cells += `<span class="c past">${day}</span>`; continue; }
      if (booked.has(ds)) { cells += `<span class="c full" title="Penuh">${day}<small>penuh</small></span>`; continue; }
      const r = pr.rate(v, ds);
      const cls = 'c' + (r.t === 'high' ? ' hi' : r.t === 'weekend' || r.t === 'semi' ? ' we' : '') + (r.pc ? ' dc' : '');
      const label = r.p ? pShort(r.p) : '';
      const txt = `Halo ${BRAND}, saya mau booking *${v.name}*\nCheck-in: ${fmtLong(ds)}\nCheck-out: ${fmtLong(addDays(ds, 1))} (1 malam)\nJumlah tamu: ... orang\nMasih available?`;
      cells += s.wa ? `<a class="${cls}" href="${esc(waLink(s, txt))}" target="_blank" rel="noopener" title="${esc(fmtLong(ds))}${r.p ? ' · ' + rp(r.p) : ''}">${day}<small>${label}</small></a>` : `<span class="${cls}">${day}<small>${label}</small></span>`;
    }
    months.push(`<div class="calm"${k ? ' hidden' : ''} data-m="${k}"><div class="calh"><button type="button" data-cm="-1" aria-label="Bulan sebelumnya"${k ? '' : ' disabled'}>‹</button><b>${MONTHS[m - 1]} ${y}</b><button type="button" data-cm="1" aria-label="Bulan berikutnya"${k < nMonths - 1 ? '' : ' disabled'}>›</button></div><div class="calg">${cells}</div></div>`);
    m++; if (m > 12) { m = 1; y++; }
  }
  const upd = v.calAt ? new Date(v.calAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/,?\s*(?:pukul\s*)?(\d{2})[.:](\d{2})$/, ' pukul $1.$2') + ' WIB' : '';
  return `<div class="cal" id="cal">${months.join('')}
<div class="calk"><span><i style="background:#fff"></i>Kosong (harga/malam)</span><span><i style="background:#fff;border-color:#b4570a"></i><b style="color:#b4570a">Jingga</b> = weekend/semi</span><span><i style="background:#fff4f2"></i>Diskon</span><span><i style="background:#eee"></i>Penuh</span></div>
${s.wa ? '<p class="upd">Klik tanggal buat langsung chat admin.</p>' : ''}${upd ? `<p class="upd">Jadwal terakhir diperbarui <b>${esc(upd)}</b></p>` : ''}</div>
<script>(function(){var c=document.getElementById('cal');if(!c)return;var ms=c.querySelectorAll('.calm'),i=0;c.addEventListener('click',function(e){var b=e.target.closest('[data-cm]');if(!b)return;ms[i].hidden=true;i=Math.max(0,Math.min(ms.length-1,i+ +b.dataset.cm));ms[i].hidden=false})})();</script>`;
}
function rulesHtml(v, s) {
  const list = rulesOf(s.rules).concat(rulesOf(v.rules));
  if (!list.length && !s.checkin && !s.checkout) return '';
  return `<div class="vsec"><h2><i>📋</i>Peraturan villa</h2><div class="rules">${s.checkin || s.checkout ? `<div class="ci">${s.checkin ? `<div><b>${esc(s.checkin)}</b><span>Check-in</span></div>` : ''}${s.checkout ? `<div><b>${esc(s.checkout)}</b><span>Check-out</span></div>` : ''}</div>` : ''}${list.length ? `<ul class="ic">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`;
}

const FAC_IC = [[/kolam|pool|renang/i, '🏊'], [/karaoke/i, '🎤'], [/billi?ard|biliar/i, '🎱'], [/wi-?fi|internet/i, '📶'], [/bbq|barbe|panggang/i, '🍖'], [/air panas|water heater|heater/i, '🚿'], [/parkir|parking/i, '🅿️'], [/dapur|kitchen|masak/i, '🍳'], [/tv|televisi/i, '📺'], [/gazebo|saung/i, '⛺'], [/taman|garden|halaman/i, '🌳'], [/view|pemandangan|gunung/i, '⛰️'], [/ping ?pong|tenis meja/i, '🏓'], [/api unggun|bonfire/i, '🔥'], [/mushol|musal/i, '🕌'], [/\bac\b/i, '❄️'], [/basket|lapang|futsal/i, '🏀'], [/balkon|teras/i, '🌅'], [/extra ?bed|kasur/i, '🛏️'], [/kulkas|lemari es/i, '🧊'], [/galon|air minum/i, '💧'], [/sound|musik|organ/i, '🔊']];
const facIc = (f) => (FAC_IC.find(([re]) => re.test(f)) || [0, '✅'])[1];
// ---------- halaman ----------
function villaPage(v, site) {
  const s = site.settings, ph = goodPhotos(v), mp = minPrice(v), cap = capOf(v);
  const area = v._area || 'Puncak';
  const fac = v.facilities || [];
  const semi = v.priceSemi || (v.priceWeekday && v.priceWeekend ? Math.round((+v.priceWeekday + +v.priceWeekend) / 2 / 50000) * 50000 : 0);
  const title = `${v.name} – Sewa Villa ${area}${v.bedrooms ? ' ' + v.bedrooms + ' Kamar' : ''} | ${BRAND}`;
  const desc = `Sewa ${v.name} di ${v.location || 'Puncak'}${v.bedrooms ? ', ' + v.bedrooms + ' kamar' : ''}${cap ? ', muat ' + cap + ' orang' : ''}${fac.length ? ', ' + fac.slice(0, 4).join(', ') : ''}.${mp ? ' Mulai ' + rp(mp) + '/malam.' : ''} Cek tanggal kosong & booking via WhatsApp.`.slice(0, 300);
  const related = site.villas.filter((x) => x.id !== v.id && x._area && x._area === v._area).slice(0, 6);
  const pc = discActive(v), dcp = (p) => Math.round(p * (100 - pc) / 100 / 10000) * 10000;
  const rows = [
    v.priceWeekday && ['Weekday', 'Minggu–Kamis malam', v.priceWeekday],
    semi && ['Semi weekend', 'Jumat & malam sebelum tanggal merah', semi],
    v.priceWeekend && ['Weekend', 'Sabtu malam & Natal', v.priceWeekend],
    v.priceHigh && ['High season', 'Libur panjang / tahun baru', v.priceHigh],
  ].filter(Boolean);
  const waBook = s.wa ? waLink(s, 'Halo PuncakGoVillas, saya mau booking ' + v.name + '\nCheck-in: ...\nCheck-out: ...\nJumlah tamu: ... orang\nMasih available?') : '';
  const fromP = mp ? (pc ? dcp(mp) : mp) : 0;
  const cls = { Weekday: '', 'Semi weekend': 's', Weekend: 'w', 'High season': 'h' };
  const body = `<div class="vp">
<p class="crumb"><a href="/">Beranda</a> › <a href="/villa">Villa</a>${v._area ? ` › <a href="/${areaSlug(v._area)}">${esc(v._area)}</a>` : ''} › ${esc(v.name)}</p>
${ph.length ? `<div class="vhero" id="vh"><div class="sl">${ph.map((p, i) => `<img src="${esc(p)}" alt="${esc(v.name)} – foto ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="960" height="540">`).join('')}</div>
<div class="tag">${v._area ? `<span>📍 ${esc(v._area)}</span>` : ''}${pc ? `<span class="red">${pc}% OFF</span>` : ''}</div>
${ph.length > 1 ? `<button class="nb p" type="button" data-g="-1" aria-label="Foto sebelumnya">‹</button><button class="nb n" type="button" data-g="1" aria-label="Foto berikutnya">›</button><span class="cnt"><span id="vhi">1</span>/${ph.length} foto</span>` : ''}</div>
${ph.length > 1 ? `<div class="thumbs">${ph.map((p, i) => `<button type="button" data-t="${i}"${i ? '' : ' class="on"'} aria-label="Foto ${i + 1}"><img src="${esc(p)}" alt="" loading="lazy" width="84" height="60"></button>`).join('')}</div>` : ''}` : `<div class="vhero none">${esc(v.name.replace(/^villa\s*/i, '').charAt(0))}</div>`}
<div class="vtitle"><h1>${esc(v.name)}</h1><span class="loc">📍 ${esc(v.location || 'Puncak')}</span></div>
<div class="vlay"><div>
<div class="specs">
${v.bedrooms ? `<div><i>🛏️</i><span><b>${v.bedrooms}</b>Kamar tidur</span></div>` : ''}${v.bathrooms ? `<div><i>🛁</i><span><b>${v.bathrooms}</b>Kamar mandi</span></div>` : ''}
${v.capStd ? `<div><i>👨‍👩‍👧</i><span><b>${v.capStd}</b>Kapasitas normal</span></div>` : ''}${v.capMax ? `<div><i>👥</i><span><b>${v.capMax}</b>Kapasitas maks</span></div>` : ''}
</div>
${fac.length ? `<div class="vsec" style="margin-top:16px"><h2><i>✨</i>Fasilitas</h2><div class="facg">${fac.map((f) => `<span><i>${facIc(f)}</i>${esc(f)}</span>`).join('')}</div></div>` : ''}
${rows.length ? `<div class="vsec"><h2><i>💰</i>Harga per malam${pc ? `<span class="off">${pc}% OFF</span>` : ''}</h2>${pc ? `<p class="lead" style="margin:0 0 10px">Lagi promo diskon ${pc}%${v.discFrom || v.discTo ? ` untuk menginap${v.discFrom ? ' mulai ' + esc(fmtLong(v.discFrom)) : ''}${v.discTo ? ' sampai ' + esc(fmtLong(v.discTo)) : ''}` : ''}.</p>` : ''}<div class="prices">${rows.map(([a, b, p]) => `<div class="${cls[a] || ''}"><span>${a}</span><small>${b}</small>${pc ? `<s class="old">${rp(p)}</s>` : ''}<b>${rp(pc ? dcp(p) : p)}</b> <em>/malam</em></div>`).join('')}</div></div>` : ''}
<div class="vsec"><h2><i>📅</i>Kalender harga & tanggal kosong</h2>${calendarHtml(v, site)}</div>
${v.desc ? `<div class="vsec"><h2><i>🏡</i>Tentang villa ini</h2><p class="desc" style="margin:0">${esc(v.desc)}</p></div>` : ''}
${rulesHtml(v, s)}
<p style="margin:4px 0 0"><a href="/panduan-booking" style="font-weight:700">📖 Panduan booking & pertanyaan yang sering ditanya →</a></p>
</div>
<aside class="vside">${fromP ? `<div class="from">Mulai dari</div>${pc ? `<s class="old">${rp(mp)}</s>` : ''}<div class="vbig">${rp(fromP)} <small>/malam</small></div>` : '<div class="vbig" style="font-size:20px">Tanya harga</div>'}
${s.wa ? `<a class="btn wa big" href="${esc(waBook)}" target="_blank" rel="noopener">💬 Booking via WhatsApp</a>` : ''}<a class="btn big" href="#cal">📅 Lihat tanggal kosong</a>
${s.checkin || s.checkout ? `<div class="mini">${s.checkin ? `<div><b>${esc(s.checkin)}</b><span>Check-in</span></div>` : ''}${s.checkout ? `<div><b>${esc(s.checkout)}</b><span>Check-out</span></div>` : ''}</div>` : ''}
<ul class="trust"><li>✅ Harga final dikonfirmasi admin</li><li>🏢 Punya kantor sendiri di Puncak</li><li>⚡ Fast respon via WhatsApp</li></ul></aside>
</div>
${related.length ? `<h2 style="margin-top:26px">Villa lain di ${esc(v._area)}</h2><div class="grid">${related.map(vcard).join('')}</div><p><a href="/${areaSlug(v._area)}">Lihat semua villa di ${esc(v._area)} →</a></p>` : ''}
</div>
${s.wa ? `<div class="mbar"><div class="pp">${fromP ? `<small>Mulai dari</small><b>${rpShort(fromP)}</b><small>per malam${pc ? ' · ' + pc + '% OFF' : ''}</small>` : '<b>Tanya harga</b>'}</div><a class="btn wa big" href="${esc(waBook)}" target="_blank" rel="noopener">💬 Booking</a></div>` : ''}
<script>(function(){var h=document.getElementById('vh');if(!h)return;var sl=h.querySelector('.sl'),n=sl.children.length,c=document.getElementById('vhi'),th=document.querySelectorAll('.thumbs button');
function cur(){return Math.round(sl.scrollLeft/Math.max(1,sl.clientWidth))}function go(i){i=Math.max(0,Math.min(n-1,i));sl.scrollTo({left:i*sl.clientWidth,behavior:'smooth'})}
sl.addEventListener('scroll',function(){var i=cur();if(c)c.textContent=i+1;th.forEach(function(b,k){b.classList.toggle('on',k===i)})},{passive:true});
h.addEventListener('click',function(e){var b=e.target.closest('[data-g]');if(b)go(cur()+ +b.dataset.g)});th.forEach(function(b){b.addEventListener('click',function(){go(+b.dataset.t)})})})();</script>`;
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

function faqHtml(s) { return `<div class="faq">${faqOf(s).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`; }
const faqLd = (s) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqOf(s).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
function guidePage(site) {
  const s = site.settings, rules = rulesOf(s.rules);
  const body = `<p class="crumb"><a href="/">Beranda</a> › Panduan Booking</p>
<h1>Panduan booking villa di ${BRAND}</h1><p class="lead">Cara sewa villa di Puncak lewat ${BRAND}, dari cari tanggal kosong sampai villa terkunci.</p>
<h2>Cara booking</h2><ol class="steps">${guideOf(s).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
<div class="cta"><a class="btn primary big" href="/">Cari villa kosong sekarang</a>${s.wa ? `<a class="btn wa big" href="${esc(waLink(s, 'Halo PuncakGoVillas, saya mau tanya soal booking villa.'))}" target="_blank" rel="noopener">Tanya admin via WhatsApp</a>` : ''}</div>
${rules.length || s.checkin || s.checkout ? `<h2>Peraturan umum villa</h2><div class="rules">${s.checkin || s.checkout ? `<div class="ci">${s.checkin ? `<div><b>${esc(s.checkin)}</b><span>Check-in</span></div>` : ''}${s.checkout ? `<div><b>${esc(s.checkout)}</b><span>Check-out</span></div>` : ''}</div>` : ''}${rules.length ? `<ul>${rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p class="upd">Beberapa villa punya peraturan tambahan, cek di halaman villanya.</p></div>` : ''}
<h2>Pertanyaan yang sering ditanya</h2>${faqHtml(s)}`;
  return page({ title: `Panduan Booking & FAQ Sewa Villa Puncak | ${BRAND}`, desc: `Cara booking villa di Puncak lewat ${BRAND}: cek tanggal kosong, pilih villa, booking via WhatsApp. Plus peraturan villa & jawaban pertanyaan yang sering ditanya.`, path: '/panduan-booking', body, jsonld: [faqLd(s), crumbLd([['Beranda', '/'], ['Panduan Booking', '/panduan-booking']])], villas: site.villas });
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
<h2 style="font-size:18px;color:var(--ink);margin:22px 0 8px">Pertanyaan yang sering ditanya</h2>${faqHtml(site.settings)}
<p><a href="/panduan-booking" style="font-weight:700;color:var(--green)">📖 Panduan booking lengkap →</a></p>
<script type="application/ld+json">${JSON.stringify(faqLd(site.settings)).replace(/</g, '\\u003c')}</script>
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
    const urls = [['/', site.d.savedAt], ['/villa', site.d.savedAt], ['/panduan-booking', site.d.savedAt],
      ...areaCounts(site.villas).map(([a]) => ['/' + areaSlug(a), site.d.savedAt]),
      ...CATS.map((c) => ['/' + c.slug, site.d.savedAt]),
      ...site.villas.map((v) => ['/villa/' + v._slug, v.updatedAt || v.createdAt || site.d.savedAt])];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, t]) => `<url><loc>${SITE}${u}</loc>${t ? `<lastmod>${String(t).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
  }
  if (p === '/panduan-booking') return guidePage(site);
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
