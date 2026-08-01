/* ============================================================================
   TAUHIDKU — TANYA USTADZ (AI berbasis dalil dari database hadits)
   ============================================================================
   Alur:
   1. Pengguna bertanya.
   2. Kita cari hadits-hadits relevan di database (pakai mesin pencarian
      TauhidHadits) — maksimal beberapa kitab sampai menemukan cukup dalil.
   3. Prompt dibangun: sistem prompt + konteks hadits + pertanyaan.
   4. Dipanggil Gemini API — langsung dari browser (kunci di config.js, mode
      lokal) atau lewat proxy serverless Netlify (kunci rahasia di server,
      mode deploy). Tanpa keduanya, jawaban ditampilkan langsung dari
      dalil-dalil yang ditemukan di database.
   ========================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = window.TAUHIDKU ? TAUHIDKU.ai.apiKey : "";
  const MODEL = window.TAUHIDKU ? TAUHIDKU.ai.model : "gemini-flash-latest";
  // Cadangan model: kuota free-tier dihitung per model, jadi jika model utama
  // kena 429 (kuota habis) / 404 (tidak tersedia), kita otomatis coba model lain.
  const MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-2.0-flash"];
  const SYS_PROMPT = window.TAUHIDKU ? TAUHIDKU.ai.systemPrompt : "";

  // Deteksi lingkungan: di komputer lokal (localhost) vs situs yang sudah di-deploy.
  // Saat di-deploy, kunci API disembunyikan di server (Netlify) dan dipanggil
  // lewat fungsi serverless /.netlify/functions/gemini — pengunjung tidak pernah
  // melihat kunci. Saat lokal, kunci boleh dipakai langsung dari config.js.
  const IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(window.location.hostname);
  const USE_PROXY = !KEY && !IS_LOCAL;

  const chatBox = $("chat-box");
  const form = $("chat-form");
  const input = $("chat-input");
  const sendBtn = $("chat-send");
  const suggest = $("chat-suggest");
  const hint = $("chat-hint");

  const MAX_DALIL = 8;       // maksimal hadits yang dipakai sebagai konteks (tampilkan semua dalil terkait)
  const MAX_KITAB = 8;       // maksimal kitab yang dipindai untuk mencari dalil
  const MAX_PER_KITAB = 3;   // maksimal dalil yang diambil dari satu kitab (agar hasil bervariasi)
  const history = [];        // riwayat percakapan (role, text)

  /* ---------- Escaping ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- Render markdown (judul, daftar, tebal, miring) ---------- */
  function md(s) {
    s = esc(s);
    const lines = s.split("\n");
    let html = "";
    let inList = null;
    const close = () => {
      if (inList) {
        html += "</" + inList + ">";
        inList = null;
      }
    };
    for (const line of lines) {
      let m;
      if ((m = line.match(/^##\s+(.+)$/))) {
        close();
        html += "<h4>" + m[1] + "</h4>";
      } else if ((m = line.match(/^###\s+(.+)$/))) {
        close();
        html += "<h5>" + m[1] + "</h5>";
      } else if ((m = line.match(/^\s*[-*]\s+(.+)$/))) {
        if (inList !== "ul") {
          close();
          inList = "ul";
          html += "<ul>";
        }
        html += "<li>" + m[1] + "</li>";
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
        if (inList !== "ol") {
          close();
          inList = "ol";
          html += "<ol>";
        }
        html += "<li>" + m[1] + "</li>";
      } else {
        close();
        html += line + "\n";
      }
    }
    close();
    // gaya inline — lakukan setelah blok agar tidak merusak tag HTML
    return html
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>");
  }

  /* ---------- Status kunci AI ---------- */
  if (hint) {
    if (KEY || USE_PROXY) {
      hint.className = "chat-hint ok";
      $("chat-hint-text").textContent =
        "✅ AI aktif — jawaban akan disusun AI dengan dalil dari database hadits.";
    } else {
      hint.className = "chat-hint";
      $("chat-hint-text").textContent =
        "ℹ️ Kunci AI belum diatur — pertanyaan akan dijawab dengan dalil-dalil dari database hadits. " +
        "Tempel kunci Gemini gratis di js/config.js (TAUHIDKU.ai.apiKey) untuk jawaban AI yang lebih lengkap.";
    }
  }

  /* ---------- Cari dalil relevan di database ----------
     Hanya hadits yang benar-benar sesuai dengan konteks pertanyaan yang
     ditampilkan:
     1. Kata kunci diambil hanya dari kata PENTING pertanyaan (kata tugas
        seperti "bagaimana", "cara", "yang" dibuang agar tidak menarik
        hadits yang tidak berkaitan).
     2. Ejaan diseragamkan (sholat→shalat) dan bentuk kata dasar dicari
        (bertaubat→taubat) agar kecocokan lebih akurat.
     3. Setiap hadits diberi SKOR = jumlah kata kunci yang cocok; hanya
        hadits dengan skor > 0 yang diambil, diurutkan dari yang paling
        relevan, dengan maksimal 3 hadits per kitab supaya hasil bervariasi.
  ---------------------------------------------------------------- */

  // Kata-kata umum yang tidak dijadikan kata kunci (bukan topik pertanyaan)
  const STOP_WORDS = new Set([
    // kata tanya
    "apa", "apakah", "bagaimana", "berapa", "kenapa", "mengapa", "kapan",
    "dimana", "kemana", "siapa", "adakah", "bolehkah", "bisakah", "kah",
    // kata sambung & kata depan
    "yang", "untuk", "dengan", "dari", "pada", "ke", "di", "dalam",
    "tentang", "seperti", "karena", "agar", "supaya", "sehingga", "maka",
    "atau", "dan", "tetapi", "tapi", "namun", "sedangkan", "sementara",
    "terhadap", "kepada", "oleh", "bagi", "serta", "melalui", "antara",
    "sampai", "hingga", "tanpa", "sesuai", "menurut",
    // kata bantu
    "adalah", "merupakan", "yaitu", "yakni", "harus", "bisa", "dapat",
    "boleh", "ingin", "mau", "akan", "sudah", "telah", "sedang", "masih",
    "jangan", "tidak", "bukan", "perlu", "sebaiknya", "seharusnya", "mungkin",
    // kata ganti
    "saya", "aku", "kamu", "anda", "kami", "kita", "mereka", "dia", "ia",
    "engkau", "beliau", "ini", "itu", "tersebut",
    // kata kerja/umum yang tidak spesifik
    "tolong", "mohon", "minta", "jelaskan", "berikan", "sebutkan",
    "ceritakan", "tuliskan", "uraikan", "bantu", "jawab", "tanya",
    "bertanya", "pertanyaan", "cara", "benar", "betul", "salah", "hal",
    "masalah", "misal", "misalnya", "contoh", "contohnya", "macam", "jenis",
    "bagian", "seputar", "mengenai", "perihal", "sangat", "sekali", "saja",
    "pun", "juga", "lagi", "pula", "baru", "tadi", "kemarin", "besok",
    "sekarang", "nanti", "kata", "arti", "makna", "pengertian", "definisi",
    // kata sambung syarat & waktu yang sering dipakai pembuka pertanyaan
    "jika", "kalau", "apabila", "atas", "bawah", "setelah", "sesudah",
    "selama", "sebelum", "sebagai", "ketika", "saat", "waktu", "bila",
    "bilamana", "terlebih",
  ]);

  // Ejaan yang diseragamkan agar kecocokan lebih baik
  const SYNONYMS = {
    sholat: "shalat",
    solat: "shalat",
    sembahyang: "shalat",
  };

  // Ambil kata kunci penting dari pertanyaan (stop words dibuang)
  function extractKeywords(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Pertanyaan berbahasa Arab → pecah per kata, buang kata tanya & "ال"
    if (/[\u0600-\u06FF]/.test(q)) {
      const arStop = new Set([
        "ما", "هل", "كيف", "لماذا", "متى", "اين", "من", "الى", "عن",
        "في", "على", "الذي", "التي", "اذا", "كان", "ان", "لا", "لم",
        "لن", "قد", "يا", "هذا", "هذه", "ذلك", "تلك", "بين", "عند",
        "مع", "ثم", "او", "غير", "كل", "بعض", "الا", "اما",
      ]);
      const words = stripTashkeel(q) // harakat dibuang dulu agar cocok dgn arStop
        .split(/\s+/)
        .map((w) => w.replace(/^\u0627\u0644/, "")) // buang "ال" (alif-lam)
        .filter((w) => w.length >= 3 && !arStop.has(w));
      return Array.from(new Set(words)).slice(0, 6);
    }
    const words = q
      .split(/[^a-z0-9']+/i)
      .filter((w) => w.length >= 3)
      .map((w) => SYNONYMS[w] || w)
      .filter((w) => !STOP_WORDS.has(w));
    return Array.from(new Set(words)).slice(0, 6);
  }

  // Bentuk kata dasar sederhana (mis. "bertaubat" → "taubat")
  function stemWord(w) {
    let s = w;
    const suffixes = ["kan", "nya", "lah", "kah", "an", "i"];
    for (const sfx of suffixes) {
      if (s.length > sfx.length + 2 && s.endsWith(sfx)) {
        s = s.slice(0, -sfx.length);
        break;
      }
    }
    const prefixes = ["meng", "men", "mem", "meny", "ber", "per", "ter", "pe", "pen", "peng", "di", "ke", "se"];
    for (const pfx of prefixes) {
      if (s.length > pfx.length + 2 && s.startsWith(pfx)) {
        s = s.slice(pfx.length);
        break;
      }
    }
    return s;
  }

  // Variasi kata kunci untuk pencocokan: asli, sinonim, bentuk dasar,
  // dan beberapa bentuk berimbuhan umum (mis. "shalatnya", "bertaubatlah")
  function keywordVariants(w) {
    const set = [w];
    if (SYNONYMS[w]) set.push(SYNONYMS[w]);
    const stem = stemWord(w);
    if (stem !== w && stem.length >= 4) set.push(stem);
    if (!/[\u0600-\u06FF]/.test(w)) {
      const bases = [w, stem].filter((b) => b.length >= 4);
      for (const base of bases) {
        for (const sfx of ["nya", "lah", "kan"]) {
          const v = base + sfx;
          if (set.indexOf(v) === -1) set.push(v);
        }
      }
    }
    return set;
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Buang harakat Arab agar kata kunci "صلاة" cocok dengan "الصَّلَاةِ"
  function stripTashkeel(s) {
    return s.replace(/[\u064B-\u0652\u0670]/g, "");
  }

  // Cocokkan kata kunci pada teks. Teks Indonesia memakai BATAS KATA agar
  // "tua" tidak menangkap "ketua"; teks Arab memakai substring (setelah
  // harakat dibuang) karena huruf Arab sering bersambung. Apostrof
  // dinormalkan dulu ("jama'ah" ≈ "jamaah") supaya ejaan yang mirip cocok.
  function matchesKeyword(text, v) {
    if (text == null) return false; // beberapa baris data tidak punya teks Arab
    if (/[\u0600-\u06FF]/.test(v)) {
      return stripTashkeel(text).indexOf(stripTashkeel(v)) !== -1;
    }
    const t = text.toLowerCase().replace(/[\u2019\u2018']/g, "");
    const k = v.replace(/[\u2019\u2018']/g, "");
    const re = new RegExp("(^|[^a-z0-9])" + escapeRegex(k) + "([^a-z0-9]|$)");
    return re.test(t);
  }

  // Skor relevansi satu hadits: jumlah kata kunci yang cocok (terjemah/Arab).
  // kwVariants = daftar varian per kata kunci yang sudah disiapkan sekali.
  function scoreHadith(arab, terjemah, kwVariants) {
    if (!kwVariants.length) return 0;
    let score = 0;
    for (const variants of kwVariants) {
      for (const v of variants) {
        if (matchesKeyword(terjemah, v) || matchesKeyword(arab, v)) {
          score++;
          break;
        }
      }
    }
    return score;
  }

  async function findDalil(query) {
    const H = window.TauhidHadits;
    if (!H) return [];
    try {
      const manifest = await H.loadManifest();
      const kitabs = manifest.kitab.slice(0, MAX_KITAB);
      const keywords = extractKeywords(query);
      if (!keywords.length) return [];

      // Variasi kata kunci disiapkan SEKALI untuk semua kitab (bukan per baris)
      const kwVariants = keywords.map((kw) => keywordVariants(kw));
      const allVariants = Array.from(new Set([].concat(...kwVariants)));
      const hasArabic = allVariants.some((v) => /[\u0600-\u06FF]/.test(v));
      // varian untuk pra-saring cepat, dinormalkan SAMA seperti di matchesKeyword:
      // Arab tanpa harakat, Latin tanpa apostrof (agar "jama'ah"≈"jamaah")
      const searchVariants = allVariants.map((v) =>
        hasArabic && /[\u0600-\u06FF]/.test(v)
          ? stripTashkeel(v)
          : v.replace(/[\u2019\u2018']/g, "")
      );

      const dalil = [];
      for (const k of kitabs) {
        if (dalil.length >= MAX_DALIL) break;
        let rows;
        try {
          rows = await H.loadKitab(k.file);
        } catch (e) {
          continue;
        }
        // SATU pemindaian per kitab: cocokkan semua varian sekaligus, lalu
        // skor hanya baris yang lolos pra-saring — jauh lebih cepat daripada
        // memanggil pencarian terpisah untuk tiap varian.
        const kitabBest = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          // teks dinormalkan SAMA seperti di matchesKeyword agar pra-saring
          // tidak lebih ketat daripada penilaian (hindari hasil terlewat)
          const t = (r[2] || "").toLowerCase().replace(/[\u2019\u2018']/g, "");
          const a = hasArabic ? stripTashkeel(r[1] || "") : "";
          let any = false;
          for (let j = 0; j < searchVariants.length; j++) {
            const sv = searchVariants[j];
            if (t.indexOf(sv) !== -1 || (a && a.indexOf(sv) !== -1)) {
              any = true;
              break;
            }
          }
          if (!any) continue;
          const s = scoreHadith(r[1], r[2], kwVariants);
          if (s > 0) {
            kitabBest.push({ kitab: k.name, id: r[0], arab: r[1], terjemah: r[2], score: s });
          }
        }
        kitabBest.sort((a, b) => b.score - a.score || a.id - b.id);
        // Ambil paling relevan dari tiap kitab agar hasil bervariasi
        dalil.push(...kitabBest.slice(0, MAX_PER_KITAB));
      }
      dalil.sort((a, b) => b.score - a.score || a.id - b.id);
      return dalil.slice(0, MAX_DALIL).map(({ score, ...d }) => d);
    } catch (e) {
      return [];
    }
  }

  /* ---------- Panggil Gemini API ---------- */
  async function callGemini(question, dalilText) {
    const ctx = dalilText
      ? "\n\nKandidat dalil hadits dari database. Gunakan HANYA hadits yang benar-benar relevan dengan pertanyaan; " +
        "abaikan hadits yang tidak sesuai dengan konteks:\n" + dalilText
      : "";
    const contents = history
      .slice(-8)
      .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    contents.push({ role: "user", parts: [{ text: question + ctx }] });

    const generationConfig = { temperature: 0.6, maxOutputTokens: 4096 };
    const payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: SYS_PROMPT }] },
      generationConfig: generationConfig,
    };

    // Urutan model yang dicoba: model utama dari config, lalu cadangan.
    const models = [MODEL].concat(MODEL_FALLBACKS.filter((m) => m !== MODEL));
    let lastErr = null;
    for (const model of models) {
      let res;
      try {
        if (KEY) {
          // Mode lokal: panggil Gemini langsung memakai kunci dari config.js
          const url =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(KEY);
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          // Mode deploy (Netlify): panggil fungsi serverless yang menyimpan
          // kunci rahasia di server — pengunjung tidak pernah melihat kunci.
          res = await fetch("/.netlify/functions/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.assign({ model: model }, payload)),
          });
        }
      } catch (e) {
        lastErr = e;
        break;
      }
      if (res.ok) {
        const data = await res.json();
        const text =
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0]
            ? data.candidates[0].content.parts[0].text
            : "";
        if (text) return text;
        lastErr = new Error("Gemini tidak mengembalikan jawaban.");
        break;
      }
      const errText = await res.text().catch(() => "");
      lastErr = new Error("API error " + res.status + " — " + errText.slice(0, 120));
      // 429 (kuota per-model) & 404 (model tak tersedia) → coba model berikutnya
      if (res.status === 429 || res.status === 404) continue;
      break;
    }
    throw lastErr || new Error("Gagal menghubungi Gemini API.");
  }

  /* ---------- Pesan di UI ---------- */
  function addUserMsg(text) {
    const div = document.createElement("div");
    div.className = "chat-msg user";
    div.innerHTML = esc(text);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "chat-msg ai chat-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  }

  function addAiMsg(text, dalil) {
    let html = '<span class="msg-name">🕌 Ustadz Tauhidku</span><div class="msg-body">' + md(text) + "</div>";
    if (dalil && dalil.length) {
      html +=
        '<div class="msg-dalil"><div class="msg-dalil-title">📜 Dalil dari database hadits (' +
        dalil.length +
        "):</div>";
      dalil.forEach((d) => {
        html +=
          '<div class="msg-dalil-item"><div class="msg-dalil-head"><span class="kitab">' +
          esc(d.kitab) +
          '</span><span class="no">Hadits no. ' +
          d.id +
          "</span></div>" +
          (d.arab
            ? '<p class="dalil-arab" dir="rtl" lang="ar">' + esc(d.arab) + "</p>"
            : "") +
          '<p class="dalil-tr">' +
          esc(d.terjemah) +
          "</p></div>";
      });
      html += "</div>";
    }
    const div = document.createElement("div");
    div.className = "chat-msg ai";
    div.innerHTML = html;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function setBusy(b) {
    input.disabled = b;
    sendBtn.disabled = b;
  }

  /* ---------- Alur utama menjawab ---------- */
  async function ask(question) {
    question = question.trim();
    if (!question) return;
    if (chatBox.querySelector(".chat-typing")) return;

    addUserMsg(question);
    setBusy(true);
    const typing = addTyping();

    let dalil = [];
    try {
      dalil = await findDalil(question);
      const dalilText = dalil
        .map((d, i) => {
          return (
            "Hadits " +
            (i + 1) +
            " [" +
            d.kitab +
            " no. " +
            d.id +
            "]:\n" +
            (d.arab ? "Teks Arab: " + d.arab + "\n" : "") +
            "Terjemahan: " +
            d.terjemah
          );
        })
        .join("\n\n");

      let answer;
      // Panggil AI bila ada kunci (lokal) atau saat situs di-deploy (proxy Netlify).
      if (KEY || USE_PROXY) {
        answer = await callGemini(question, dalilText);
      } else {
        answer = buildFallbackAnswer(question, dalil, false);
      }
      typing.remove();
      addAiMsg(answer, dalil);
      history.push({ role: "user", text: question });
      history.push({ role: "model", text: answer });
    } catch (e) {
      typing.remove();
      // Jika AI gagal (kuota habis, model tak tersedia, dsb.), jawab tetap
      // diberikan memakai dalil dari database — fitur tidak pernah "mati".
      const isQuota = /429|quota|rate.?limit/i.test(e.message || "");
      const fallback = buildFallbackAnswer(question, dalil, true);
      addAiMsg(fallback, dalil);
      history.push({ role: "user", text: question });
      history.push({ role: "model", text: fallback });
      window.tauhidToast(
        isQuota
          ? "Kuota AI gratis habis — menjawab dengan dalil database"
          : "AI terkendala — menjawab dengan dalil database",
        true
      );
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  /* ---------- Jawaban cadangan tanpa kunci AI ---------- */
  function buildFallbackAnswer(question, dalil, aiError) {
    const intro = aiError
      ? "Saat ini layanan AI sedang terkendala (kuota gratis habis atau gangguan server), jadi saya bawakan **dalil-dalil hadits dari database** yang paling relevan. Silakan baca dengan teliti:\n\n"
      : "Saat ini kunci AI belum diatur, jadi saya bawakan **dalil-dalil hadits dari database** yang paling relevan dengan pertanyaan Anda. Silakan baca dengan teliti:\n\n";
    if (dalil.length) {
      return (
        "Pertanyaan yang baik, semoga Allah membalas kebaikan Anda. 🤲\n\n" +
        intro +
        "Coba lagi beberapa saat untuk jawaban AI yang lebih lengkap.\n\n" +
        "_Semoga Allah memberikan pemahaman yang lurus. Wallahu a'lam bish-shawab._"
      );
    }
    return (
      "Terima kasih atas pertanyaannya. 🙏\n\n" +
      "Sayangnya saya belum menemukan hadits yang cocok di database untuk pertanyaan tersebut, " +
      (aiError
        ? "dan layanan AI sedang terkendala sehingga belum bisa menyusun jawaban otomatis."
        : "dan kunci AI belum diatur sehingga belum bisa menyusun jawaban otomatis.") +
      "\n\nSilakan coba tanyakan dengan kata kunci yang lebih umum (mis. 'taubat', 'shalat', 'orang tua').\n\n" +
      "_Wallahu a'lam bish-shawab._"
    );
  }

  /* ---------- Inisialisasi ---------- */
  (function init() {
    // Saran pertanyaan
    if (window.TAUHIDKU && suggest) {
      suggest.innerHTML = TAUHIDKU.suggestions
        .map((s) => '<button type="button" class="suggest-chip">' + esc(s) + "</button>")
        .join("");
      suggest.addEventListener("click", (e) => {
        const chip = e.target.closest(".suggest-chip");
        if (chip) {
          input.value = chip.textContent;
          ask(chip.textContent);
        }
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
      input.value = "";
    });

    input.focus();
  })();
})();
