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
