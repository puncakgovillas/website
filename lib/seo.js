// Halaman SEO yang dirender di server (biar kebaca Google):
//   /villa                 → daftar semua villa per area
//   /villa/<slug>          → halaman detail tiap villa
//   /sewa-villa-<area>     → villa per area (Cisarua, Ciloto, Kota Bunga, ...)
//   /villa-<kategori>      → villa kolam renang, rombongan, karaoke, murah
//   /sitemap.xml, /robots.txt
// Data diambil langsung dari data.json di R2, jadi otomatis ikut update tiap admin simpan.
import { DATA_KEY } from './lib.js';
import { makePricer, discOn, discActive, todayWIB, addDays, dow } from './pricing.js';
import { guideOf, faqOf, rulesOf } from './content.js';

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
  return `<h2>Peraturan villa</h2><div class="rules">${s.checkin || s.checkout ? `<div class="ci">${s.checkin ? `<div><b>${esc(s.checkin)}</b><span>Check-in</span></div>` : ''}${s.checkout ? `<div><b>${esc(s.checkout)}</b><span>Check-out</span></div>` : ''}</div>` : ''}${list.length ? `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`;
}

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
  const body = `
<p class="crumb"><a href="/">Beranda</a> › <a href="/villa">Villa</a>${v._area ? ` › <a href="/${areaSlug(v._area)}">${esc(v._area)}</a>` : ''} › ${esc(v.name)}</p>
<h1>${esc(v.name)}</h1>
<p class="lead">📍 ${esc(v.location || 'Puncak')}${mp ? ` · mulai ${pc ? `<s class="old">${rp(mp)}</s><b>${rp(dcp(mp))}</b>` : `<b>${rp(mp)}</b>`}/malam` : ''}${pc ? `<span class="off">${pc}% OFF</span>` : ''}</p>
${ph.length ? `<div class="gal">${ph.map((p, i) => `<img src="${esc(p)}" alt="${esc(v.name)} – foto ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="620" height="465">`).join('')}</div>` : ''}
<div class="facts">
${v.bedrooms ? `<div><b>${v.bedrooms}</b><span>kamar tidur</span></div>` : ''}${v.bathrooms ? `<div><b>${v.bathrooms}</b><span>kamar mandi</span></div>` : ''}
${v.capStd ? `<div><b>${v.capStd} orang</b><span>kapasitas normal</span></div>` : ''}${v.capMax ? `<div><b>${v.capMax} orang</b><span>kapasitas maksimal</span></div>` : ''}
</div>
<div class="cta">${s.wa ? `<a class="btn wa big" href="${esc(waLink(s, 'Halo PuncakGoVillas, saya mau tanya ' + v.name + '. Untuk tanggal ... masih kosong?'))}" target="_blank" rel="noopener">Tanya & booking via WhatsApp</a>` : ''}<a class="btn big" href="/">Cek tanggal kosong</a></div>
${rows.length ? `<h2>Harga sewa ${esc(v.name)}${pc ? `<span class="off">${pc}% OFF</span>` : ''}</h2>${pc ? `<p class="lead" style="margin:0 0 8px">Lagi promo diskon ${pc}%${v.discFrom || v.discTo ? ` untuk menginap${v.discFrom ? ' mulai ' + esc(fmtLong(v.discFrom)) : ''}${v.discTo ? ' sampai ' + esc(fmtLong(v.discTo)) : ''}` : ''}.</p>` : ''}<table class="ptab">${rows.map(([a, b, p]) => `<tr><td>${a}<br><small>${b}</small></td><td>${pc ? `<s class="old">${rp(p)}</s>` + rp(dcp(p)) : rp(p)}<small>/malam</small></td></tr>`).join('')}</table>` : ''}
<h2>Kalender harga & tanggal kosong</h2>${calendarHtml(v, site)}
${fac.length ? `<h2>Fasilitas</h2><div class="chips">${fac.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
${v.desc ? `<h2>Tentang villa ini</h2><p class="desc">${esc(v.desc)}</p>` : ''}
${rulesHtml(v, s)}
<p style="margin-top:14px"><a href="/panduan-booking">📖 Panduan booking & pertanyaan yang sering ditanya →</a></p>
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
