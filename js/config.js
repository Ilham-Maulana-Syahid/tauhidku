/* ============================================================================
   TAUHIDKU — KONFIGURASI & DATA
   ============================================================================
   ✏️ Yang perlu kamu isi sendiri:
   → AI_API_KEY (mode LOKAL): tempel kunci Gemini API-mu di TAUHIDKU.ai.apiKey
     untuk uji coba di komputer sendiri. (Gratis di https://aistudio.google.com/apikey)
   → Untuk DEPLOY publik: BIARKAN KOSONG. Kunci disimpan rahasia sebagai
     environment variable GEMINI_API_KEY di Netlify, dan situs memanggil
     fungsi serverless /.netlify/functions/gemini sebagai proxy.
     JANGAN PERNAH commit kunci ke GitHub!
   → Kalau kosong (lokal & tanpa proxy), fitur tetap jalan — menjawab pakai
     dalil dari database hadits, tanpa jawaban AI.
   → GANTI juga daftar ARTIKEL jika ingin menambah/mengubah konten.
   ========================================================================== */

const TAUHIDKU = {
  /* ---------- AI (Tanya Ustadz) ---------- */
  ai: {
    // Kosongkan untuk deploy publik — kunci disimpan di Netlify (env GEMINI_API_KEY)
    // dan dipanggil lewat fungsi serverless netlify/functions/gemini.js.
    // Isi hanya untuk uji coba lokal (jangan commit ke GitHub!).
    apiKey: "",
    model: "gemini-flash-latest",  // model Flash terbaru — kuota free-tier dihitung per model
    // Prompt dasar untuk "ustadz AI" — boleh diedit. Dirancang agar jawaban terstruktur & mendalam.
    systemPrompt:
      "Kamu adalah 'Ustadz Tauhidku', asisten keagamaan Islam yang ramah, sopan, tawadhu', dan berilmu. " +
      "Tugasmu menjawab pertanyaan tentang Islam dengan benar, mendalam, dan mudah dipahami masyarakat umum.\n\n" +
      "PETUNJUK MENJAWAB:\n" +
      "1. Jawab SELALU dalam bahasa Indonesia yang baik, santun, dan mudah dipahami.\n" +
      "2. Susun jawaban secara TERSTRUKTUR dan RAPI memakai format markdown: gunakan judul bagian dengan '##' " +
      "(misal '## Penjelasan', '## Dalil', '## Kesimpulan'), daftar berpoin dengan '-', teks tebal **...** untuk " +
      "istilah/hukum penting, dan pisahkan paragraf dengan baris kosong.\n" +
      "3. Berikan penjelasan yang MENDALAM dan LENGKAP, jangan menjawab singkat/dangkal: mulai dengan definisi yang " +
      "jelas, lalu KUTIP LANGSUNG dalil dari Al-Qur'an (tulis ayat beserta artinya, sebut surat & ayat) dan/atau " +
      "hadits (tulis TEKS ARAB dan terjemahannya, sebut perawi dan kitabnya), lalu penjelasan rinci, " +
      "hikmah/faedah, contoh penerapan bila relevan, dan akhiri dengan kesimpulan singkat.\n" +
      "4. Jika diberi konteks hadits dari database, jadikan hadits tersebut rujukan utama dan KUTIP LANGSUNG " +
      "teks haditsnya — tulisan Arab beserta terjemahannya secara utuh — di dalam jawabanmu, jangan hanya " +
      "menyebutkan rujukan atau nomor haditsnya saja. PENTING: gunakan HANYA hadits yang benar-benar sesuai " +
      "dengan konteks pertanyaan; jika tidak ada hadits yang cocok, katakan jujur bahwa tidak ada dalil " +
      "hadits yang relevan di database untuk pertanyaan tersebut.\n" +
      "5. Jika ada perbedaan pendapat ulama (khilafiyah), sebutkan secara ringkas pendapat yang ada beserta " +
      "pendapat yang lebih kuat (rajih) dan alasannya, dengan adab tanpa mencela.\n" +
      "6. Gunakan istilah fiqih/akidah dengan benar dan jelaskan istilah asing secara singkat.\n" +
      "7. Jika tidak yakin atau tidak punya dalil, katakan dengan jujur dan sarankan bertanya kepada ustadz/ulama " +
      "yang lebih berkompeten. Jangan berfatwa di luar kapasitasmu.\n" +
      "8. Akhiri jawaban dengan doa/nasihat singkat, misal 'Wallahu a'lam bish-shawab.'\n" +
      "9. Utamakan akidah yang lurus sesuai Al-Qur'an dan Sunnah, serta jauhkan dari perpecahan.",
  },

  /* ---------- Statistik hero ---------- */
  stats: [
    { value: "65.191", label: "Hadits Terjemahan" },
    { value: "12", label: "Kitab Shahih & Sunan" },
    { value: "366", label: "Hadits Harian" },
    { value: "100%", label: "Gratis & Terbuka" },
  ],

  /* ---------- Pertanyaan saran untuk chat ---------- */
  suggestions: [
    "Apa pengertian tauhid dan mengapa penting?",
    "Bagaimana cara bertaubat yang benar?",
    "Apa hukum riba dalam Islam?",
    "Keutamaan shalat berjamaah?",
    "Bagaimana adab kepada kedua orang tua?",
    "Apa saja perbuatan yang dapat menghapus pahala?",
  ],

  /* ---------- Artikel & materi ---------- */
  articles: [
    {
      cat: "Aqidah",
      title: "Apa Itu Tauhid dan Mengapa Demikian Penting?",
      excerpt:
        "Tauhid adalah inti dari dakwah seluruh rasul. Memahami maknanya dengan benar adalah kunci keselamatan di dunia dan akhirat.",
      read: "5 menit",
      content: [
        {
          h: "Makna Tauhid",
          p: [
            "Tauhid secara bahasa berarti menjadikan sesuatu satu (esa). Secara istilah, tauhid adalah mengesakan Allah subhanahu wa ta'ala dalam rububiyah-Nya, uluhiyah-Nya, serta nama dan sifat-Nya.",
            "Tauhid adalah kalimat yang pertama kali diserukan oleh seluruh nabi dan rasul, dari Nabi Nuh hingga Nabi Muhammad shallallahu 'alaihi wasallam. Allah berfirman:",
          ],
          dalil: {
            arab: "وَمَآ أَرْسَلْنَا مِن قَبْلِكَ مِن رَّسُولٍ إِلَّا نُوحِىٓ إِلَيْهِ أَنَّهُۥ لَآ إِلَـٰهَ إِلَّآ أَنَا۠ فَاعْبُدُونِ",
            terjemah: "\"Dan Kami tidak mengutus seorang rasul pun sebelum engkau (Muhammad), melainkan Kami wahyukan kepadanya, bahwa tidak ada tuhan (yang berhak disembah) selain Aku, maka sembahlah Aku.\" (QS. Al-Anbiya': 25)",
          },
        },
        {
          h: "Tiga Pembagian Tauhid",
          p: [
            "Para ulama membagi tauhid menjadi tiga bagian agar lebih mudah dipahami:",
            "1) Tauhid Rububiyah — mengesakan Allah dalam perbuatan-Nya, seperti mencipta, memberi rezeki, dan mengatur alam semesta.",
            "2) Tauhid Uluhiyah — mengesakan Allah dalam ibadah, yaitu tidak beribadah kecuali kepada-Nya. Inilah inti dari kalimat 'la ilaha illallah'.",
            "3) Tauhid Asma' wa Shifat — menetapkan nama dan sifat Allah sebagaimana yang Dia tetapkan, tanpa tahrif, ta'thil, takyif, dan tamtsil.",
            "Ketiganya saling berkaitan. Barangsiapa tidak merealisasikan tauhid uluhiyah, maka ibadahnya tertolak meskipun ia mengakui bahwa Allah adalah Pencipta.",
          ],
        },
        {
          h: "Urgensi Tauhid",
          p: [
            "Tauhid adalah sebab utama masuk surga. Rasulullah shallallahu 'alaihi wasallam bersabda tentang hak Allah atas hamba-Nya dan hak hamba atas Allah.",
          ],
          dalil: {
            arab: "حَقُّ اللَّهِ عَلَى الْعِبَادِ أَنْ يَعْبُدُوهُ وَلَا يُشْرِكُوا بِهِ شَيْئًا",
            terjemah: "\"Hak Allah atas hamba-Nya adalah mereka beribadah kepada-Nya dan tidak menyekutukan-Nya dengan sesuatu apa pun.\" (HR. Bukhari no. 2856, dari Mu'adz bin Jabal)",
          },
        },
        {
          h: "Penutup",
          p: [
            "Mari kita pelajari tauhid dengan sungguh-sungguh, karena dengannya amal menjadi diterima dan hati menjadi tenang. Semoga Allah menetapkan kita di atas tauhid hingga akhir hayat. Aamiin.",
          ],
        },
      ],
    },
    {
      cat: "Ibadah",
      title: "Keutamaan Shalat Berjamaah",
      excerpt:
        "Shalat berjamaah memiliki keutamaan yang sangat besar, hingga pahalanya dilipatgandakan berkali-kali lipat.",
      read: "4 menit",
      content: [
        {
          h: "Anjuran Berjamaah",
          p: [
            "Shalat berjamaah adalah syi'ar Islam yang agung. Rasulullah shallallahu 'alaihi wasallam sangat menekankannya, bahkan dalam keadaan sakit pun beliau tetap melaksanakan shalat berjamaah.",
          ],
          dalil: {
            arab: "صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً",
            terjemah: "\"Shalat berjamaah lebih utama dua puluh tujuh derajat dibandingkan shalat sendirian.\" (HR. Bukhari no. 645 & Muslim no. 650, dari Ibnu 'Umar)",
          },
        },
        {
          h: "Hikmah di Baliknya",
          p: [
            "Selain pahala yang besar, berjamaah mengajarkan persatuan, kerapian shaf, dan menghidupkan masjid. Ia juga menjadi sebab diampuninya dosa dan dinaikkannya derajat.",
            "Maka janganlah kita meremehkan shalat berjamaah. Mulailah dari hal kecil: hadir di masjid tepat waktu, dan luruskan shaf ketika berdiri di belakang imam.",
          ],
        },
        {
          h: "Penutup",
          p: [
            "Semoga Allah memudahkan kita untuk istiqamah dalam shalat berjamaah di masjid-masjid-Nya. Aamiin.",
          ],
        },
      ],
    },
    {
      cat: "Aqidah",
      title: "Bahaya Syirik: Dosa yang Tidak Diampuni",
      excerpt:
        "Syirik adalah dosa terbesar yang membinasakan amal. Mengenali bentuk-bentuknya adalah bagian dari menjaga tauhid.",
      read: "6 menit",
      content: [
        {
          h: "Definisi Syirik",
          p: [
            "Syirik adalah menjadikan sekutu bagi Allah dalam ibadah, baik berupa berdoa kepada selain-Nya, meminta pertolongan kepada makhluk dalam perkara yang hanya Allah yang mampu, atau bernadzar untuk selain-Nya.",
            "Allah subhanahu wa ta'ala menegaskan bahwa dosa syirik tidak akan diampuni apabila pelakunya meninggal di atasnya:",
          ],
          dalil: {
            arab: "إِنَّ اللَّهَ لَا يَغْفِرُ أَنْ يُشْرَكَ بِهِ وَيَغْفِرُ مَا دُونَ ذَٰلِكَ لِمَنْ يَشَاءُ",
            terjemah: "\"Sungguh, Allah tidak akan mengampuni (dosa) syirik, dan Dia mengampuni apa yang di bawah (derajat) syirik itu bagi siapa yang Dia kehendaki.\" (QS. An-Nisa': 48)",
          },
        },
        {
          h: "Syirik Besar dan Syirik Kecil",
          p: [
            "Syirik besar mengeluarkan pelakunya dari Islam, seperti berdoa kepada kuburan, jin, atau patung. Sedangkan syirik kecil tidak mengeluarkan dari Islam tetapi menodai tauhid, seperti riya' (pamer) dalam ibadah dan sumpah dengan selain nama Allah.",
            "Rasulullah shallallahu 'alaihi wasallam mengingatkan bahwa riya' adalah syirik kecil:",
          ],
          dalil: {
            arab: "أَخْوَفُ مَا أَخَافُ عَلَيْكُمُ الشِّرْكُ الْأَصْغَرُ قَالُوا يَا رَسُولَ اللَّهِ وَمَا الشِّرْكُ الْأَصْغَرُ قَالَ الرِّيَاءُ",
            terjemah: "\"Yang paling aku khawatirkan menimpa kalian adalah syirik kecil.\" Para sahabat bertanya, \"Apakah syirik kecil itu, wahai Rasulullah?\" Beliau menjawab, \"Yaitu riya'.\" (HR. Ahmad no. 23630, hasan)",
          },
        },
        {
          h: "Menjaga Diri dari Syirik",
          p: [
            "Pelajarilah tauhid dengan benar, perbanyak doa memohon perlindungan dari syirik — sebagaimana doa Nabi Ibrahim 'alaihissalam — dan jauhilah sebab-sebab yang mengantarkan kepadanya seperti tathayyur (percaya sial), jimat, dan ramalan.",
          ],
        },
        {
          h: "Penutup",
          p: [
            "Semoga Allah melindungi kita dari syirik besar maupun kecil, dan menjadikan hati kita ikhlas hanya kepada-Nya. Aamiin.",
          ],
        },
      ],
    },
    {
      cat: "Adab",
      title: "Adab Kepada Kedua Orang Tua",
      excerpt:
        "Berbakti kepada orang tua adalah amal yang paling utama setelah shalat, dan menjadi sebab luasnya rezeki serta panjangnya umur.",
      read: "5 menit",
      content: [
        {
          h: "Kedudukan Birrul Walidain",
          p: [
            "Berbakti kepada kedua orang tua (birrul walidain) menempati kedudukan yang sangat tinggi dalam Islam. Ketika seorang sahabat bertanya tentang amal yang paling dicintai Allah, Rasulullah shallallahu 'alaihi wasallam menyebutkan shalat tepat waktu, lalu berbakti kepada kedua orang tua.",
          ],
          dalil: {
            arab: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوٓا۟ إِلَّآ إِيَّاهُ وَبِٱلْوَٰلِدَيْنِ إِحْسَـٰنًا",
            terjemah: "\"Dan Tuhanmu telah memerintahkan agar kamu jangan menyembah selain Dia dan hendaklah berbuat baik kepada ibu bapakmu.\" (QS. Al-Isra': 23)",
          },
        },
        {
          h: "Bentuk-Bentuk Berbakti",
          p: [
            "Berbakti bukan hanya dengan harta dan tenaga, tetapi juga dengan perkataan yang lembut, mendoakan keduanya, tidak membentak, serta menjaga silaturahmi dengan kerabat keduanya setelah mereka tiada.",
            "Allah mengaitkan perintah berbuat baik kepada orang tua dengan larangan membentak mereka:",
          ],
          dalil: {
            arab: "فَلَا تَقُل لَّهُمَآ أُفٍّ وَلَا تَنْهَرْهُمَا وَقُل لَّهُمَا قَوْلًا كَرِيمًا",
            terjemah: "\"Maka janganlah engkau mengatakan kepada keduanya perkataan 'ah' dan janganlah engkau membentak keduanya, dan ucapkanlah kepada keduanya perkataan yang baik.\" (QS. Al-Isra': 23)",
          },
        },
        {
          h: "Saat Keduanya Berbeda Agama",
          p: [
            "Tetap berbuat baik kepada orang tua yang berbeda agama, selama tidak memerintahkan kemaksiatan. Allah memerintahkan untuk tetap bergaul dengan keduanya dengan baik, tanpa mengikuti agama mereka.",
          ],
        },
        {
          h: "Penutup",
          p: [
            "Jangan menunda berbakti. Waktu bersama orang tua tidak akan kembali. Semoga Allah mengampuni dan merahmati orang tua kita, serta mempertemukan kita dengan mereka di surga-Nya. Aamiin.",
          ],
        },
      ],
    },
    {
      cat: "Ibadah",
      title: "Bagaimana Cara Bertaubat yang Benar?",
      excerpt:
        "Taubat adalah pintu kembali kepada Allah. Ketahui syarat-syaratnya agar taubat kita diterima dan tidak sia-sia.",
      read: "4 menit",
      content: [
        {
          h: "Makna Taubat",
          p: [
            "Taubat secara bahasa berarti kembali. Secara syar'i, taubat adalah kembali dari kemaksiatan kepada ketaatan, dari kebencian Allah kepada kecintaan-Nya.",
            "Allah mencintai orang-orang yang bertaubat dan menyucikan diri. Taubat adalah pintu yang selalu terbuka:",
          ],
          dalil: {
            arab: "قُلْ يَـٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ",
            terjemah: "\"Katakanlah, 'Wahai hamba-hamba-Ku yang melampaui batas terhadap diri mereka sendiri! Janganlah kamu berputus asa dari rahmat Allah.'\" (QS. Az-Zumar: 53)",
          },
        },
        {
          h: "Syarat Taubat yang Diterima",
          p: [
            "Para ulama menyebutkan tiga syarat taubat yang diterima:",
            "1) Menyesali perbuatan dosa yang telah dilakukan,",
            "2) Berhenti dari perbuatan dosa tersebut,",
            "3) Bertekad kuat untuk tidak mengulanginya.",
            "Adapun jika dosa tersebut berkaitan dengan hak sesama manusia, maka ditambah syarat keempat: mengembalikan hak tersebut atau meminta maaf kepada yang bersangkutan.",
          ],
        },
        {
          h: "Jangan Menunda Taubat",
          p: [
            "Rasulullah shallallahu 'alaihi wasallam mengingatkan agar kita bersegera bertaubat sebelum datangnya kematian, dan memperbanyak istighfar karena Allah sangat senang kepada hamba-Nya yang beristighfar.",
          ],
          dalil: {
            arab: "إِنَّ اللَّهَ يَبْسُطُ يَدَهُ بِاللَّيْلِ لِيَتُوبَ مُسِيءُ النَّهَارِ وَيَبْسُطُ يَدَهُ بِالنَّهَارِ لِيَتُوبَ مُسِيءُ اللَّيْلِ",
            terjemah: "\"Sesungguhnya Allah membentangkan tangan-Nya pada malam hari agar bertaubat orang yang berbuat dosa di siang hari, dan membentangkan tangan-Nya pada siang hari agar bertaubat orang yang berbuat dosa di malam hari.\" (HR. Muslim no. 2759)",
          },
        },
        {
          h: "Penutup",
          p: [
            "Jangan pernah merasa terlalu hina untuk bertaubat. Selama matahari belum terbit dari barat, pintu taubat masih terbuka. Semoga Allah menerima taubat kita semua. Aamiin.",
          ],
        },
      ],
    },
    {
      cat: "Muamalah",
      title: "Hukum Riba dan Bahayanya bagi Umat",
      excerpt:
        "Riba adalah salah satu dosa besar yang diperangi oleh Allah dan Rasul-Nya. Mengenali bentuknya membantu kita menjaga harta yang berkah.",
      read: "5 menit",
      content: [
        {
          h: "Larangan Riba",
          p: [
            "Riba secara bahasa berarti tambahan. Secara syar'i, riba adalah tambahan pada harta tanpa ada imbalan (kompensasi) yang dibenarkan syariat, baik dalam utang-piutang maupun jual beli.",
            "Allah subhanahu wa ta'ala menegaskan larangan ini dengan tegas:",
          ],
          dalil: {
            arab: "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا",
            terjemah: "\"Padahal Allah telah menghalalkan jual beli dan mengharamkan riba.\" (QS. Al-Baqarah: 275)",
          },
        },
        {
          h: "Perang dari Allah dan Rasul-Nya",
          p: [
            "Begitu beratnya dosa riba, hingga Allah dan Rasul-Nya menyatakan perang terhadap pelakunya. Ini menunjukkan betapa bahayanya riba bagi kehidupan individu maupun masyarakat.",
          ],
          dalil: {
            arab: "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱتَّقُوا۟ ٱللَّهَ وَذَرُوا۟ مَا بَقِىَ مِنَ ٱلرِّبَوٰٓا۟ إِن كُنتُم مُّؤْمِنِينَ",
            terjemah: "\"Wahai orang-orang yang beriman! Bertakwalah kepada Allah dan tinggalkan sisa-sisa riba jika kamu orang-orang beriman.\" (QS. Al-Baqarah: 278)",
          },
        },
        {
          h: "Menjauhi Riba di Zaman Modern",
          p: [
            "Di era modern, riba hadir dalam berbagai bentuk: bunga bank konvensional, kartu kredit berbunga, utang berbunga, hingga transaksi jual beli yang mengandung unsur riba. Pelajarilah fiqih muamalah agar kita tidak terjerumus karena ketidaktahuan.",
            "Bila kita telah terlanjur terlibat, maka segera tinggalkan dan bertaubat. Allah menjanjikan pengampunan bagi yang meninggalkan riba:",
          ],
          dalil: {
            arab: "فَمَن جَآءَهُۥ مَوْعِظَةٌ مِّن رَّبِّهِۦ فَٱنتَهَىٰ فَلَهُۥ مَا سَلَفَ وَأَمْرُهُۥٓ إِلَى ٱللَّهِ",
            terjemah: "\"Maka siapa yang sampai kepadanya peringatan dari Tuhannya, lalu dia berhenti (dari melakukan riba), maka apa yang telah diperolehnya dahulu menjadi miliknya dan urusannya (terserah) kepada Allah.\" (QS. Al-Baqarah: 275)",
          },
        },
        {
          h: "Penutup",
          p: [
            "Semoga Allah memberikan kita rezeki yang halal dan berkah, serta menjauhkan kita dari riba dan segala yang diharamkan. Aamiin.",
          ],
        },
      ],
    },
  ],
};

// Ekspor ke window supaya bisa diakses sebagai window.TAUHIDKU
// (di classic script, `const` global tidak otomatis jadi properti window).
window.TAUHIDKU = TAUHIDKU;
