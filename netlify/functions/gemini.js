/* ============================================================================
   TAUHIDKU — PROXY GEMINI (Netlify Function)
   ============================================================================
   Fungsi ini menjaga kunci API Gemini tetap RAHASIA di server:
   - Pengunjung memanggil  /.netlify/functions/gemini
   - Fungsi ini yang memanggil Gemini API memakai kunci dari environment
     variable GEMINI_API_KEY (diatur di dashboard Netlify), sehingga kunci
     tidak pernah terlihat di kode situs yang dibuka publik.

   Cara set kunci di Netlify:
   Site settings → Environment variables → GEMINI_API_KEY = <kunci Anda>

   (Opsional) Batasi siapa yang boleh memakai proxy ini:
   → ALLOWED_ORIGIN = https://tauhidku-12345.netlify.app
     Hanya situs Anda yang bisa memanggil proxy; orang lain ditolak.
     Bisa diisi beberapa alamat, dipisah koma:
       https://tauhidku-12345.netlify.app,https://tauhidku.com
     Pakai URL lengkap (https://) tanpa garis miring di akhir.
     Kalau variabel ini tidak diisi, semua origin diizinkan (jangan lupa diisi!).
   ========================================================================== */

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

exports.handler = async (event) => {
  const origin = event.headers.origin || "";

  // Jika ALLOWED_ORIGIN diatur, tolak panggilan dari situs lain — termasuk
  // permintaan tanpa header Origin (curl/script) saat proteksi aktif.
  if (ALLOWED_ORIGIN) {
    const allowed = ALLOWED_ORIGIN.split(",").map((s) => s.trim());
    if (!origin || !allowed.includes(origin)) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Origin tidak diizinkan." }),
      };
    }
  }

  const headers = {
    // Echo origin peminta (valid untuk satu/multi domain); fallback "*".
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Preflight CORS (dipicu browser saat panggilan lintas asal)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Hanya mendukung POST." }) };
  }

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "GEMINI_API_KEY belum diatur di environment Netlify. " +
          "Tambahkan di Site settings → Environment variables.",
      }),
    };
  }

  try {
    const { model = "gemini-flash-latest", ...rest } = JSON.parse(event.body || "{}");
    const url =
      BASE_URL + "/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(GEMINI_KEY);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
    });

    // Teruskan status & isi respons Gemini apa adanya (termasuk 429/404,
    // supaya ustadz.js bisa otomatis mencoba model cadangan)
    const text = await res.text();
    return { statusCode: res.status, headers, body: text };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String((err && err.message) || err) }),
    };
  }
};
