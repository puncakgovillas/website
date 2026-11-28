# PuncakGoVillas – website cari villa

Website: https://puncakgovillas.com · Admin: https://puncakgovillas.com/admin

- `public/` – halaman (HTML, CSS, JS, gambar)
- `functions/` – API di Cloudflare Worker (`worker.js`)
  - `GET /api/data` data villa (publik) · `PUT /api/data` simpan (admin, header `x-admin-key`)
  - `POST/GET/DELETE /api/photo` upload, daftar, hapus foto (admin)
  - `GET /photos/<file>` foto dari R2
- `lib/seed.js` – data awal, dipakai kalau `data.json` di R2 belum ada

Setting di Cloudflare Workers:
- R2 binding `BUCKET` → bucket `puncakgovillas-data` (sudah di `wrangler.toml`)
- Environment variable (secret) `ADMIN_PASSWORD`

Setiap simpan, versi lama dicadangkan ke `backups/` di R2.

Deploy otomatis dari branch `main` lewat Cloudflare Workers Builds.

## Akun admin
- Pemilik masuk dengan nama bebas + `ADMIN_PASSWORD`.
- Admin staf dibuat pemilik di Pengaturan → Akun admin (disimpan di R2 `admins.json`, password di-hash PBKDF2).
- Tiap simpan dicatat di R2 `log/YYYY-MM.json` (siapa, kapan, apa yang berubah) → tab Riwayat (khusus pemilik).

## Kontak pemilik villa (rahasia)
- Disimpan terpisah di R2 `private.json`, lewat `GET/PUT /api/private`. Nggak pernah masuk `data.json`/website publik (`PUT /api/data` juga membuang field owner*).
- Yang bisa lihat: pemilik + admin yang dicentang "lihat kontak pemilik" (Pengaturan → Akun admin).

## Akun mitra (pemilik villa)
- Jenis akun `mitra` cuma bisa lihat & atur villa dengan `ownerAcc` = id akunnya (villa yang dia tambah, atau yang ditugasin pemilik lewat Edit villa).
- Server (`mergeMitra` di `functions/api/data.js`) yang maksa batasan ini: perubahan mitra ke villa lain, pengaturan, high season diabaikan.
- Mitra cuma bisa isi & lihat kontak pemilik villanya sendiri; nggak bisa akses riwayat, daftar/hapus foto, dan akun.
- Simpan bentrok (409) digabung otomatis di browser (merge 3 arah) lalu dicoba sekali lagi.

## Verifikasi villa dari mitra/broker (anti dobel)
- Villa **baru** yang diinput akun mitra otomatis `status: "pending"` (diatur server, mitra nggak bisa ubah) dan nggak tampil ke tamu.
- Mitra wajib isi no. HP pemilik buat villa baru.
- `GET /api/dupes`: admin dapat daftar villa pending + villa lain yang mirip (no. HP pemilik sama, nama sama/mirip, lokasi & kamar sama). Mitra cuma dapat tanda "kemungkinan dobel" buat villanya sendiri.
- Tab **Verifikasi** di admin: Setujui / Bukan dobel (disimpan di `notDup`) / Tolak (status `rejected`, villa nggak dihapus).
- `createdBy` / `createdAt` diisi server pas villa pertama kali dibuat → dasar aturan komisi "yang input duluan".
- Villa lama (sebelum fitur ini) nggak ikut dicek.
- Villa yang ditolak: fotonya dihapus otomatis 30 hari setelah ditolak (Cron Trigger harian `0 20 * * *` = 03:00 WIB, `lib/cleanup.js`). Data teks tetap disimpan. Admin juga bisa klik **Hapus permanen** buat langsung buang villa + fotonya.

## Jenis harga per malam
Urutan: high season (rentang di admin) > Natal (malam 24 & 25 Des = weekend) > Sabtu = weekend > Jumat / malam sebelum tanggal merah (Min–Kam) = semi weekend > weekday.
Harga semi weekend diisi per villa (`priceSemi`); kalau kosong pakai rata-rata weekday & weekend (dibulatkan 50rb).
Tanggal merah disimpan di `holidays` ([{date,label}]), default libur nasional SKB 3 Menteri 2027 (`DEF_HOL` di app.js).

## Halaman SEO (dirender server, `lib/seo.js`)
- `/villa` semua villa · `/villa/<slug>` detail villa · `/sewa-villa-<area>` per area · `/villa-kolam-renang-puncak`, `/villa-rombongan-puncak`, `/villa-karaoke-puncak`, `/villa-murah-puncak`
- `/sitemap.xml`, `/robots.txt`; halaman utama ditempel blok link area/kategori + JSON-LD.
- Slug dihitung dari nama villa (urut id). Fungsi `slugify`/`villaSlug` di app.js harus sama dengan lib/seo.js.

## Upload massal (folder / PDF)
Tombol **Upload Folder / PDF** di tab Villa (admin & staff). Folder: subfolder per villa (nama subfolder = nama villa), foto JPG/PNG diurutkan sesuai nama file, PDF di dalamnya dipakai buat data. PDF: nama dari nama file, foto = halaman-halaman PDF, data dari halaman terakhir. pdf.js di-host sendiri di `public/vendor/pdfjs` (Apache-2.0).

## Pengingat update jadwal
Tiap villa (yang tampil) dicatat kapan jadwalnya terakhir diupdate (`calAt`, `calBy`, dihitung server).
Dianggap update kalau tanggal terisi hari ini ke depan berubah, atau ada yang klik "Udah dicek, nggak ada perubahan".
Kalau lebih dari `settings.calDays` hari (default 6), muncul peringatan di atas halaman admin & di tab jadwal. Mitra cuma lihat villanya sendiri.

## Kalender harga, peraturan, FAQ, promo
- Halaman `/villa/<slug>` nampilin kalender harga 6 bulan (lib/pricing.js = hitungan harga versi server, harus sama dengan app.js), tanggal penuh, klik tanggal → WhatsApp, dan "jadwal terakhir diperbarui" (`calAt`).
- Peraturan: `settings.checkin`, `settings.checkout`, `settings.rules` (per baris) + `villa.rules`. FAQ & langkah booking: `settings.faq`, `settings.guide` (default di lib/content.js). Halaman `/panduan-booking` + FAQ di homepage (JSON-LD FAQPage).
- Diskon per villa: `disc` (%), `discFrom`, `discTo`. Banner promo: `settings.promo = {on,title,text,until}` dengan hitung mundur.

## Pengelola villa & batasan admin
- `villa.ownerAcc` = akun (admin/staff atau mitra) yang pegang villa. Pemilik bisa ganti langsung dari daftar villa.
- Akun admin (role `staff`) cuma bisa ngubah tanggal terisi villa yang `ownerAcc`-nya dia (dicek di server: `limitStaff` di functions/api/data.js) dan nggak bisa ganti pengelola. Sinkron dari Pembukuan cuma buat pemilik.

## Karyawan AI: PDF villa otomatis (`functions/api/bot.js`)
Robot yang ngecek folder Drive "Foto Villa dan Video Villa/1. Siap PDF", bikin PDF villa, lalu nambahin villanya ke website.
- Login pakai header `x-bot-key` = secret `BOT_KEY` di Cloudflare (min. 12 karakter, beda dari `ADMIN_PASSWORD`). Kalau `BOT_KEY` belum diisi, API ini mati.
- `POST /api/bot/photo` upload foto · `GET /api/bot/villa?name=` cek villa udah ada · `POST /api/bot/villa` tambah villa baru · `PUT /api/bot/villa` `{id, photos}` ganti foto villa yang udah ada (kalau ada foto baru di Drive; harga/jadwal/status nggak disentuh, foto lama nggak dihapus).
- Robot cuma bisa **nambah** villa baru dan **ganti foto** villa, selalu `status: "pending"` (nggak tampil ke tamu) → pemilik setujui di tab **Verifikasi**. Nama yang udah ada ditolak (409). Nggak bisa ngubah/hapus villa lain.
