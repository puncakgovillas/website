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
