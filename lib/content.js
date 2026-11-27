// Isi default Panduan Booking & FAQ (dipakai kalau admin belum ngisi sendiri di Pengaturan).
// Versi yang sama ada di public/app.js (DEF_GUIDE/DEF_FAQ) buat ditampilin di admin.
export const DEF_GUIDE = [
  'Isi tanggal check-in, check-out & jumlah orang di puncakgovillas.com, lalu klik "Cari Villa".',
  'Pilih villa yang cocok. Klik "Detail" buat lihat foto, fasilitas, kalender harga & tanggal yang masih kosong.',
  'Klik "Booking via WhatsApp" (atau klik tanggal di kalender). Pesan ke admin otomatis keisi nama villa & tanggalnya.',
  'Admin cek ulang ketersediaan dan kirim total harga final.',
  'Bayar DP sesuai arahan admin buat ngunci tanggal. Pelunasan sesuai kesepakatan dengan admin.',
];
export const DEF_FAQ = [
  { q: 'Gimana cara booking villa?', a: 'Cari villa sesuai tanggal & jumlah orang di website, lalu klik "Booking via WhatsApp". Admin kami bakal konfirmasi ketersediaan dan total harganya.' },
  { q: 'Harga yang tampil di website udah final?', a: 'Harga di website adalah estimasi per malam sesuai tanggal. Ketersediaan dan harga final dikonfirmasi admin lewat WhatsApp.' },
  { q: 'Kenapa harga tiap malam beda-beda?', a: 'Weekday (Minggu–Kamis malam) paling murah. Jumat malam & malam sebelum tanggal merah pakai harga semi weekend. Sabtu malam, Natal & Lebaran pakai harga weekend. Tahun baru & libur panjang pakai harga high season.' },
  { q: 'Villa yang saya mau udah penuh, gimana?', a: 'Chat admin aja. Kami punya banyak pilihan villa di Puncak dan bisa carikan villa lain yang mirip di tanggal kamu.' },
  { q: 'Rombongan besar, ada villanya?', a: 'Ada villa kapasitas besar untuk rombongan. Kalau masih kurang, bisa ambil 2 villa berdekatan, admin bantu carikan kombinasinya.' },
];
export const guideOf = (s) => (Array.isArray(s.guide) && s.guide.filter((x) => String(x).trim()).length ? s.guide.filter((x) => String(x).trim()) : DEF_GUIDE);
export const faqOf = (s) => (Array.isArray(s.faq) && s.faq.filter((f) => f && f.q && f.a).length ? s.faq.filter((f) => f && f.q && f.a) : DEF_FAQ);
export const rulesOf = (txt) => String(txt || '').split('\n').map((x) => x.replace(/^\s*[-•*\d.)]+\s*/, '').trim()).filter(Boolean);
