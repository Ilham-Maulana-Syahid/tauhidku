/* ============================================================================
   TEST RELEVANSI — memvalidasi logika pemilihan dalil di js/ustadz.js
   (STOP_WORDS, SYNONYMS, extractKeywords, stemWord, keywordVariants,
   matchesKeyword, scoreHadith) terhadap data hadits asli.
   Jalankan: node build/test-relevance.js

   CATATAN: file ini adalah SNAPSHOT dari fungsi-fungsi murni di ustadz.js.
   Jika logika di ustadz.js diubah, salinan di bawah ini HARUS ikut disesuaikan
   agar tes tetap memvalidasi kode yang sebenarnya.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

/* ---- Salinan persis logika dari js/ustadz.js (pure functions) ---- */
const STOP_WORDS = new Set([
  "apa", "apakah", "bagaimana", "berapa", "kenapa", "mengapa", "kapan",
  "dimana", "kemana", "siapa", "adakah", "bolehkah", "bisakah", "kah",
  "yang", "untuk", "dengan", "dari", "pada", "ke", "di", "dalam",
  "tentang", "seperti", "karena", "agar", "supaya", "sehingga", "maka",
  "atau", "dan", "tetapi", "tapi", "namun", "sedangkan", "sementara",
  "terhadap", "kepada", "oleh", "bagi", "serta", "melalui", "antara",
  "sampai", "hingga", "tanpa", "sesuai", "menurut",
  "adalah", "merupakan", "yaitu", "yakni", "harus", "bisa", "dapat",
  "boleh", "ingin", "mau", "akan", "sudah", "telah", "sedang", "masih",
  "jangan", "tidak", "bukan", "perlu", "sebaiknya", "seharusnya", "mungkin",
  "saya", "aku", "kamu", "anda", "kami", "kita", "mereka", "dia", "ia",
  "engkau", "beliau", "ini", "itu", "tersebut",
  "tolong", "mohon", "minta", "jelaskan", "berikan", "sebutkan",
  "ceritakan", "tuliskan", "uraikan", "bantu", "jawab", "tanya",
  "bertanya", "pertanyaan", "cara", "benar", "betul", "salah", "hal",
  "masalah", "misal", "misalnya", "contoh", "contohnya", "macam", "jenis",
  "bagian", "seputar", "mengenai", "perihal", "sangat", "sekali", "saja",
  "pun", "juga", "lagi", "pula", "baru", "tadi", "kemarin", "besok",
  "sekarang", "nanti", "kata", "arti", "makna", "pengertian", "definisi",
  "jika", "kalau", "apabila", "atas", "bawah", "setelah", "sesudah",
  "selama", "sebelum", "sebagai", "ketika", "saat", "waktu", "bila",
  "bilamana", "terlebih",
]);

const SYNONYMS = {
  sholat: "shalat",
  solat: "shalat",
  sembahyang: "shalat",
};

function extractKeywords(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (/[\u0600-\u06FF]/.test(q)) {
    const arStop = new Set([
      "ما", "هل", "كيف", "لماذا", "متى", "اين", "من", "الى", "عن",
      "في", "على", "الذي", "التي", "اذا", "كان", "ان", "لا", "لم",
      "لن", "قد", "يا", "هذا", "هذه", "ذلك", "تلك", "بين", "عند",
      "مع", "ثم", "او", "غير", "كل", "بعض", "الا", "اما",
    ]);
    const words = stripTashkeel(q)
      .split(/\s+/)
      .map((w) => w.replace(/^\u0627\u0644/, ""))
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

function stripTashkeel(s) {
  return s.replace(/[\u064B-\u0652\u0670]/g, "");
}

function matchesKeyword(text, v) {
  if (text == null) return false;
  if (/[\u0600-\u06FF]/.test(v)) {
    return stripTashkeel(text).indexOf(stripTashkeel(v)) !== -1;
  }
  const t = text.toLowerCase().replace(/[\u2019\u2018']/g, "");
  const k = v.replace(/[\u2019\u2018']/g, "");
  const re = new RegExp("(^|[^a-z0-9])" + escapeRegex(k) + "([^a-z0-9]|$)");
  return re.test(t);
}

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

/* ---- Muat data ---- */
const dataDir = path.join(__dirname, "..", "data", "hadits");
const kitabFiles = ["riyadhus-shalihin.json", "shahih-bukhari.json"];
const data = {};
for (const f of kitabFiles) {
  const p = path.join(dataDir, f);
  if (fs.existsSync(p)) {
    data[f] = JSON.parse(fs.readFileSync(p, "utf8"));
  } else {
    console.log("SKIP (file tidak ada):", f);
  }
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log("  ✅ " + name);
  } else {
    failures++;
    console.log("  ❌ " + name + (detail ? " — " + detail : ""));
  }
}

function topResults(query, limit) {
  const keywords = extractKeywords(query);
  const kwVariants = keywords.map((kw) => keywordVariants(kw));
  const out = [];
  for (const [file, rows] of Object.entries(data)) {
    for (const r of rows) {
      const s = scoreHadith(r[1], r[2], kwVariants);
      if (s > 0) out.push({ file, id: r[0], s, arab: r[1], tr: r[2], trShort: r[2].slice(0, 90) });
    }
  }
  out.sort((a, b) => b.s - a.s || a.id - b.id);
  return out.slice(0, limit || 8);
}

console.log("\n== 1. Ekstraksi kata kunci ==");
check("'Bagaimana cara bertaubat yang benar?' → ['bertaubat']",
  JSON.stringify(extractKeywords("Bagaimana cara bertaubat yang benar?")) === '["bertaubat"]',
  JSON.stringify(extractKeywords("Bagaimana cara bertaubat yang benar?")));
check("'Apa hukum riba dalam islam?' → ['hukum','riba','islam']",
  JSON.stringify(extractKeywords("Apa hukum riba dalam islam?")) === '["hukum","riba","islam"]',
  JSON.stringify(extractKeywords("Apa hukum riba dalam islam?")));
check("'Keutamaan shalat berjamaah' → ['keutamaan','shalat','berjamaah']",
  JSON.stringify(extractKeywords("Keutamaan shalat berjamaah")) === '["keutamaan","shalat","berjamaah"]',
  JSON.stringify(extractKeywords("Keutamaan shalat berjamaah")));
check("'Bagaimana sholat yang benar?' → ['shalat'] (sinonim)",
  JSON.stringify(extractKeywords("Bagaimana sholat yang benar?")) === '["shalat"]',
  JSON.stringify(extractKeywords("Bagaimana sholat yang benar?")));
check("'Adab kepada orang tua' → ['adab','orang','tua']",
  JSON.stringify(extractKeywords("Adab kepada orang tua")) === '["adab","orang","tua"]',
  JSON.stringify(extractKeywords("Adab kepada orang tua")));
check("'صلاة الجماعة' → kata Arab tanpa 'ال' & tanpa stop word",
  extractKeywords("صلاة الجماعة").length >= 1 && extractKeywords("صلاة الجماعة")[0].indexOf("ال") !== 0,
  JSON.stringify(extractKeywords("صلاة الجماعة")));

console.log("\n== 2. Stemming ==");
check("bertaubat → taubat", stemWord("bertaubat") === "taubat", stemWord("bertaubat"));
check("menjalankan → jalan", stemWord("menjalankan") === "jalan", stemWord("menjalankan"));
check("shalat → shalat", stemWord("shalat") === "shalat", stemWord("shalat"));

console.log("\n== 3. Pencocokan batas kata ==");
check("'tua' tidak cocok dengan 'ketua'", !matchesKeyword("seorang ketua kaum", "tua"));
check("'tua' cocok dengan 'orang tua'", matchesKeyword("berbakti kepada orang tua", "tua"));
check("'taubat' cocok dengan 'bertaubat' (lewat varian 'bertaubat')",
  keywordVariants("bertaubat").some((v) => matchesKeyword("saya bertaubat kepada Allah", v)));

console.log("\n== 4. Hasil riil di database ==");
for (const q of [
  "Bagaimana cara bertaubat yang benar?",
  "Apa hukum riba dalam islam?",
  "Keutamaan shalat berjamaah",
  "Adab kepada orang tua",
]) {
  const r = topResults(q, 5);
  console.log(`\n  Pertanyaan: "${q}"`);
  if (!r.length) {
    console.log("    (tidak ada hasil)");
    continue;
  }
  const kws = extractKeywords(q);
  for (const x of r) {
    const has = kws.filter((k) =>
      keywordVariants(k).some((v) => matchesKeyword(x.tr, v) || matchesKeyword(x.arab, v))
    );
    console.log(`    skor=${x.s} [${x.file} no.${x.id}] kata=${has.join(",")} → ${x.trShort}…`);
  }
  check(`    semua hasil mengandung minimal satu kata kunci "${kws.join('" / "')}"`,
    r.every((x) => kws.some((k) => keywordVariants(k).some((v) =>
      matchesKeyword(x.tr, v) || matchesKeyword(x.arab, v)))));
}

console.log("\n== 5. Query tidak relevan → tidak ada dalil ==");
// Kata kunci yang mustahil muncul di kitab hadits (sudah diverifikasi 0 hasil
// di Bukhari & Riyadhus Shalihin: "komputer" dan "laptop")
const nonsense = topResults("Apa itu komputer dan laptop?", 5);
check("'komputer laptop' → tanpa hasil (istilah di luar topik agama)",
  nonsense.length === 0, "hasil: " + nonsense.length);

console.log(failures ? "\n❌ GAGAL: " + failures + " tes" : "\n✅ SEMUA TES LULUS");
process.exit(failures ? 1 : 0);
