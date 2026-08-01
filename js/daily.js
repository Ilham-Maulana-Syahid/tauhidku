/* ============================================================================
   TAUHIDKU — HADITS HARIAN (widget harian + tombol acak)
   ============================================================================
   daily.json berisi 366 hadits (satu per hari dalam setahun) — dibuat saat
   build, jadi tidak perlu memuat semua kitab hanya untuk satu hadits.
   Tombol "Hadits Lain" mengambil dari random.json (1500 hadits pilihan).
   ========================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const card = $("daily-card");
  if (!card) return;

  let daily = null;
  let random = null;

  function render(h) {
    if (!h) return;
    // daily.json: [hari, file, id, arab, terjemah] | objek: {arab, terjemah, kitabName, id, file}
    $("daily-arab").textContent = h[3] || h.arab || "";
    $("daily-terjemah").textContent = h[4] || h.terjemah || "";
    const src = $("daily-sumber");
    const file = h[1] || h.file || "";
    const id = h[2] || h.id || "?";
    src.textContent =
      "HR. " + (h.kitabName || file.replace(".json", "").replace(/-/g, " ")) + " no. " + id;
    $("daily-loader").textContent = "";
    card.classList.remove("fade");
    card.classList.remove("loading");
  }

  async function loadDaily() {
    if (daily) return daily;
    const res = await fetch("data/daily.json");
    daily = await res.json();
    return daily;
  }

  async function loadRandom() {
    if (random) return random;
    const res = await fetch("data/random.json");
    random = await res.json();
    return random;
  }

  function pickByDate() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now - start) / 86400000); // 1..366
    return { idx: (day - 1) % 366, label: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) };
  }

  async function showDaily() {
    const { idx, label } = pickByDate();
    $("daily-date").textContent = label;
    card.classList.add("loading");
    const data = await loadDaily();
    if (!data[idx]) return;
    render(data[idx]);
  }

  async function showRandom() {
    card.classList.add("fade");
    card.classList.add("loading");
    $("daily-loader").textContent = "mengambil hadits…";
    const data = await loadRandom();
    const pick = data[Math.floor(Math.random() * data.length)];
    // format: [file, id, arab, terjemah]
    const kitabName = pick[0].replace(".json", "").replace(/-/g, " ");
    render({ arab: pick[2], terjemah: pick[3], kitabName: kitabName, id: pick[1], file: pick[0] });
  }

  $("daily-btn").addEventListener("click", showRandom);

  showDaily().catch((e) => {
    $("daily-terjemah").textContent =
      "Gagal memuat hadits harian. Jalankan lewat server lokal (py -m http.server) lalu muat ulang.";
    $("daily-loader").textContent = "";
    card.classList.remove("loading");
    card.classList.remove("fade");
  });
})();
