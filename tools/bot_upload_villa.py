#!/usr/bin/env python3
"""Karyawan AI PDF Villa: kirim villa baru ke puncakgovillas.com (status "pending", nunggu verifikasi).

Pakai:  python3 bot_upload_villa.py --pdf "Villa CH 65 4 Kamar - PGV.pdf" --config config.json [--update] [--dry-run]

- Villa belum ada di website -> ditambah (status "pending", nunggu verifikasi).
- Villa udah ada -> dilewati, KECUALI pakai --update: fotonya diganti dengan halaman foto PDF ini
  (harga/jadwal/status nggak disentuh).

- config.json = config yang sama dengan build_villa_pdf.py (skill pdf-villa-pgv):
  name, lokasi, weekday, weekend, kapasitas ("40 Orang, 4 Kamar"), fasilitas[]; opsional semi, kamar_mandi, desc.
- Foto website = halaman foto di PDF (semua kecuali halaman spek terakhir), dirender 1600x900 JPG.
- Kunci robot: header x-bot-key. Diisi otomatis oleh Network secret environment (host puncakgovillas.com),
  atau dari env BOT_KEY kalau ada.
"""
import argparse, glob, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

BASE = os.environ.get("PGV_BASE", "https://puncakgovillas.com")


def rupiah(s):
    if isinstance(s, (int, float)):
        return int(s)
    m = re.search(r"\d[\d.,]*", str(s or ""))
    if not m:
        return 0
    t = m.group(0)
    jt = re.search(r"\d\s*(jt|juta)", str(s), re.I)
    if jt:
        return int(round(float(t.replace(",", ".")) * 1_000_000))
    return int(re.sub(r"\D", "", t) or 0)


def num_before(s, word):
    m = re.search(r"(\d+)\s*" + word, str(s or ""), re.I)
    return int(m.group(1)) if m else 0


def call(method, path, body=None, ctype=None):
    req = urllib.request.Request(BASE + path, data=body, method=method)
    # Cloudflare (Bot Fight) nolak User-Agent bawaan Python -> 403, jadi pakai nama yang jelas
    req.add_header("User-Agent", "PuncakGoVillas-KaryawanAI/1.0 (+https://puncakgovillas.com)")
    if ctype:
        req.add_header("content-type", ctype)
    if os.environ.get("BOT_KEY"):
        req.add_header("x-bot-key", os.environ["BOT_KEY"])
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--config", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--update", action="store_true", help="kalau villa udah ada, ganti fotonya")
    a = ap.parse_args()
    cfg = json.load(open(a.config, encoding="utf-8"))
    name = cfg["name"].strip()
    kap = cfg.get("kapasitas", "")
    villa = {
        "name": name,
        "location": cfg.get("lokasi", ""),
        "bedrooms": cfg.get("kamar") or num_before(kap, "kamar"),
        "bathrooms": cfg.get("kamar_mandi") or 0,
        "capMax": cfg.get("kapasitas_max") or num_before(kap, "orang"),
        "priceWeekday": rupiah(cfg.get("weekday")),
        "priceSemi": rupiah(cfg.get("semi")),
        "priceWeekend": rupiah(cfg.get("weekend")),
        "facilities": [f for f in cfg.get("fasilitas", []) if f],
        "desc": cfg.get("desc", ""),
    }

    tmp = tempfile.mkdtemp(prefix="pgvweb_")
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=82", "-scale-to-x", "1280", "-scale-to-y", "720",
                    a.pdf, os.path.join(tmp, "p")], check=True)
    pages = sorted(glob.glob(os.path.join(tmp, "p-*.jpg")))[:-1]  # buang halaman spek terakhir
    if not pages:
        print(json.dumps({"ok": False, "step": "render", "error": "PDF nggak ada halaman foto"}))
        sys.exit(2)
    if a.dry_run:
        print(json.dumps({"ok": True, "dry_run": True, "photos": len(pages), "villa": villa}, ensure_ascii=False))
        return
    st, r = call("GET", "/api/bot/villa?name=" + urllib.parse.quote(name))
    if st != 200:
        print(json.dumps({"ok": False, "step": "cek", "status": st, "resp": r}))
        sys.exit(2)
    existing = r if r.get("exists") else None
    if existing and not a.update:
        print(json.dumps({"ok": False, "skipped": "sudah ada di website", "id": r.get("id"), "status": r.get("status")}))
        return

    photos = []
    for p in pages:
        st, r = call("POST", "/api/bot/photo", open(p, "rb").read(), "image/jpeg")
        if st != 200 or not r.get("url"):
            print(json.dumps({"ok": False, "step": "foto", "status": st, "resp": r}))
            sys.exit(2)
        photos.append(r["url"])
    if existing:
        st, r = call("PUT", "/api/bot/villa", json.dumps({"id": existing["id"], "photos": photos}).encode(), "application/json")
        print(json.dumps({"ok": st == 200, "updated": True, "status": st, "resp": r, "photos": len(photos)}, ensure_ascii=False))
        if st != 200:
            sys.exit(2)
        return
    villa["photos"] = photos
    st, r = call("POST", "/api/bot/villa", json.dumps(villa).encode(), "application/json")
    print(json.dumps({"ok": st == 200, "status": st, "resp": r, "photos": len(photos)}, ensure_ascii=False))
    if st != 200:
        sys.exit(2)


if __name__ == "__main__":
    main()
