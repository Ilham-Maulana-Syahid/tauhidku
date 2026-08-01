# 🕌 Tauhidku — Kembali kepada Al-Qur'an & As-Sunnah

Website dakwah tauhid untuk membantu masyarakat beragama secara **lurus** sesuai Al-Qur'an dan Hadits.
Dibangun dengan **HTML + CSS + JS murni** (tanpa framework, tanpa backend) — data hadits disimpan sebagai file JSON statis.

> 🔎 Pencarian hadits di **65.191 hadits** terjemahan Indonesia dari **12 kitab** shahih & sunan.

---

## ✨ Fitur

- **📖 Pencarian Hadits** — cari kata kunci di seluruh ±65 ribu hadits, filter per kitab, lazy-load dengan indikator progres, bisa sertakan teks Arab.
- **🕌 Hadits Harian** — hadits pilihan yang berganti otomatis setiap hari + tombol "Hadits Lain" (acak).
- **🛡️ Tanya Ustadz (AI)** — tanyakan seputar agama. AI mencari **dalil hadits relevan di database**, lalu menyusun jawaban dengan rujukan (menggunakan **Google Gemini API**, gratis).
- **📚 Artikel & Materi** — artikel aqidah, ibadah, adab, dan muamalah berlandaskan dalil.
- **🕌 Desain islami elegan** — hijau zamrud + emas, ornamen geometris, kaligrafi, responsif & aksesibel (`prefers-reduced-motion`).

---

## 📁 Struktur

```
tauhidku/
├── index.html          # halaman utama (semua section)
├── netlify.toml        # konfigurasi deploy Netlify
├── .gitignore          # memblokir apikey.txt agar tidak ter-upload ke GitHub
├── netlify/
│   └── functions/
│       └── gemini.js   # 🔑 proxy serverless — menyimpan kunci AI secara rahasia
├── css/style.css       # tema hijau-emas islami
├── js/
│   ├── config.js       # ⭐ KONFIGURASI — artikel & kunci AI (lihat catatan deploy)
│   ├── main.js         # nav, reveal, hero stats, modal artikel, toast
│   ├── hadits.js       # mesin pencarian lintas kitab (lazy-load + progress)
│   ├── daily.js        # widget hadits harian & tombol acak
│   └── ustadz.js       # chat AI Tanya Ustadz (Gemini + dalil database)
├── data/
│   ├── manifest.json   # daftar 12 kitab + jumlah hadits
│   ├── daily.json      # 366 hadits harian (dibuat saat build)
│   ├── random.json     # 1.500 hadits untuk tombol acak (dibuat saat build)
│   └── hadits/*.json   # 12 kitab, format [id, arab, terjemah]
└── build/
    └── convert_sql.py  # ⚙️ konversi SQL dump → JSON (jalankan sekali)
```

---

## 🚀 Cara menjalankan

Karena website memuat data via `fetch()`, harus dibuka lewat server lokal (bukan klik dua kali):

```bash
cd tauhidku
# Windows
py -m http.server 8080
# lalu buka http://localhost:8080
```

---

## ⚙️ Mengaktifkan fitur "Tanya Ustadz" (AI)

Ada dua cara, tergantung pemakaian:

### A. Uji coba lokal (komputer sendiri)
1. Dapatkan kunci **Gemini API** gratis di [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Buka `js/config.js`, tempel kunci ke `TAUHIDKU.ai.apiKey`.
3. Simpan & muat ulang halaman. ✅

> ⚠️ Jangan commit kunci ini ke GitHub! Di `config.js` selalu kosongkan sebelum push.

### B. Situs publik (Netlify) — kunci disembunyikan di server
1. Kunci TIDAK perlu diisi di `config.js` (biarkan kosong).
2. Setelah deploy Netlify (lihat bagian berikutnya), buka **Site settings → Environment variables**.
3. Tambahkan variabel: `GEMINI_API_KEY` = kunci Gemini Anda.
4. Situs akan memanggil fungsi serverless `netlify/functions/gemini.js` sebagai **proxy** —
   pengunjung tidak pernah melihat kunci di kode situs. ✅

> Tanpa kunci (di kedua mode), fitur tetap jalan: pertanyaan dijawab dengan **dalil-dalil hadits dari database** (tanpa jawaban AI).

---

## 🌍 Deploy ke GitHub + Netlify (gratis, bisa diakses banyak orang)

### 1. Buat repositori di GitHub
1. Login ke [github.com](https://github.com) → klik tombol **+** (kanan atas) → **New repository**.
2. Nama repo misal `tauhidku` (boleh apa saja). **Biarkan kosong** centang "Add a README".
3. Klik **Create repository**.

### 2. Upload dari komputer (folder ini sudah siap deploy)
Buka Command Prompt di dalam folder `tauhidku`, lalu jalankan:

```bash
git init
git add .
git commit -m "Deploy Tauhidku"
git branch -M main
git remote add origin https://github.com/NAMA_USER_GITHUB_KAMU/tauhidku.git
git push -u origin main
```

> Ganti `NAMA_USER_GITHUB_KAMU` dengan username GitHub Anda. Saat push pertama kali,
> GitHub akan meminta login (username + token/password). Data ±115 MB — push pertama bisa agak lama.

### 3. Hubungkan Netlify (hosting gratis)
1. Buka [app.netlify.com](https://app.netlify.com) → login dengan akun GitHub (**Sign up** → **GitHub**).
2. Klik **Add new site → Import an existing project** → pilih **GitHub**.
3. Pilih repositori `tauhidku` → **Deploy site**. Netlify otomatis membaca `netlify.toml`.
4. Selesai! Situs live di alamat seperti `https://tauhidku-12345.netlify.app`.

### 4. Set kunci AI (sekali saja)
1. Di dashboard Netlify, buka **Site configuration → Environment variables**.
2. Tambahkan dua variabel:
   - `GEMINI_API_KEY` = kunci Gemini Anda (dari `apikey.txt`) — wajib.
   - `ALLOWED_ORIGIN` = alamat situs Anda, mis. `https://tauhidku-12345.netlify.app` —
     disarankan. Ini membatasi proxy AI agar hanya bisa dipakai dari situs Anda,
     sehingga orang lain tidak bisa menghabiskan kuota AI Anda.
3. Deploy ulang (tombol **Deploy** atau push perubahan). ✅

### 5. (Opsional) Pakai domain sendiri
- **Netlify**: Site configuration → Domain management → Add custom domain.
- **GitHub Pages**: tidak dipakai pada setup ini (Netlify sudah cukup & gratis).

> 💡 Setiap kali Anda `git push` perubahan baru, Netlify otomatis men-deploy versi terbaru.

---

## 🔄 Membangun ulang data hadits

Data JSON sudah tersedia. Jika ingin membangun ulang dari SQL:

```bash
py tauhidku/build/convert_sql.py            # semua kitab (±2 menit)
py tauhidku/build/convert_sql.py --fast     # tes cepat (200 hadits/kitab)
py tauhidku/build/convert_sql.py --kitab shahih-bukhari   # satu kitab saja
```

Sumber data: **hadits-database-main** (SQL dump dari [carihadis.com](https://carihadis.com), 12 kitab, 65.191 hadits terjemahan Indonesia).

---

## ✅ Validasi

```bash
py scripts/validate_tauhidku.py
```

Script mengecek: kelengkapan & jumlah data, kecocokan ID HTML/JS, dan render nyata di headless Chrome.

---

## ⚠️ Disclaimer

- Jawaban AI disusun otomatis dan dilengkapi dalil. Selalu **verifikasi kepada ustadz/ulama** untuk perkara penting.
- Hadits terjemahan diambil dari sumber yang tersedia (carihadis.com). Mohon koreksi bila ada kekeliruan. *Wallahu a'lam bish-shawab.*
