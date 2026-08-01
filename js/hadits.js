/* ============================================================================
   TAUHIDKU — HADITS (pencarian lintas kitab dengan lazy-load + progress)
   ============================================================================
   Data hadits disimpan per-kitab (12 file JSON, total ±115 MB). Agar tetap
   ringan, setiap kitab hanya dimuat saat dibutuhkan, lalu di-cache. Pencarian
   berjalan kitab-per-kitab dengan indikator progres, hasil muncul bertahap.
   ========================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const state = {
    manifest: null,
    kitabs: [],          // daftar kitab dari manifest
    cache: {},           // file -> array [id, arab, terjemah]
    activeKitab: "all",  // filter kitab ("all" atau nama file)
    includeArab: false,
    results: [],         // hasil pencarian terkumpul
    page: 0,
    PAGE_SIZE: 15,
    searching: false,
    abort: null,
    lastQuery: "",
  };

  /* ---------- Escaping HTML ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- Muat manifest ---------- */
  async function loadManifest() {
    if (state.manifest) return state.manifest;
    const res = await fetch("data/manifest.json");
    if (!res.ok) throw new Error("Gagal memuat manifest: " + res.status);
    state.manifest = await res.json();
    return state.manifest;
  }

  /* ---------- Muat satu kitab (dengan cache) ---------- */
  async function loadKitab(file) {
    if (state.cache[file]) return state.cache[file];
    const res = await fetch("data/hadits/" + file);
    if (!res.ok) throw new Error("Gagal memuat " + file);
    state.cache[file] = await res.json();
    return state.cache[file];
  }

  /* ---------- Cari dalam satu kitab ---------- */
  function searchInKitab(rows, q, includeArab) {
    const ql = q.toLowerCase();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const t = r[2].toLowerCase();
      if (t.indexOf(ql) !== -1 || (includeArab && r[1].indexOf(ql) !== -1)) {
        out.push({ id: r[0], arab: r[1], terjemah: r[2] });
      }
    }
    return out;
  }

  /* ---------- Pencarian penuh (semua kitab / kitab terpilih) ---------- */
  async function searchAll(query, opts) {
    opts = opts || {};
    const includeArab = opts.includeArab !== undefined ? opts.includeArab : state.includeArab;
    const onlyKitab = opts.onlyKitab !== undefined ? opts.onlyKitab : state.activeKitab;

    if (state.searching) {
      if (state.abort) state.abort.abort();
    }
    state.searching = true;
    state.lastQuery = query;
    state.page = 0;
    state.results = [];
    const ac = new AbortController();
    state.abort = ac;

    try {
      const manifest = await loadManifest();
      let list = manifest.kitab;
      if (onlyKitab !== "all") list = list.filter((k) => k.file === onlyKitab);

      for (let i = 0; i < list.length; i++) {
        if (ac.signal.aborted) return { aborted: true, results: state.results };
        const k = list[i];
        opts.onProgress && opts.onProgress({
          kitab: k,
          index: i + 1,
          total: list.length,
        });
        let rows;
        try {
          rows = await loadKitab(k.file);
        } catch (e) {
          if (ac.signal.aborted) return { aborted: true, results: state.results };
          opts.onError && opts.onError(k, e);
          continue;
        }
        const found = searchInKitab(rows, query, includeArab).map((f) =>
          Object.assign(f, { file: k.file })
        );
        state.results = state.results.concat(found);
        opts.onProgress && opts.onProgress({
          kitab: k,
          index: i + 1,
          total: list.length,
          found: found.length,
        });
        // Biarkan UI sempat render
        await new Promise((r) => setTimeout(r, 0));
      }
      return { aborted: false, results: state.results };
    } catch (e) {
      if (ac.signal.aborted) return { aborted: true, results: state.results };
      throw e;
    } finally {
      state.searching = false;
      state.abort = null;
    }
  }

  /* ================= UI ================= */

  async function renderKitabChips() {
    const wrap = $("kitab-filters");
    if (!wrap || wrap.dataset.rendered) return;
    const manifest = await loadManifest();
    wrap.dataset.rendered = "1";
    let html =
      '<button class="kitab-chip active" data-kitab="all">Semua Kitab <span class="chip-count">(' +
      manifest.kitab.reduce((s, k) => s + k.count, 0).toLocaleString("id-ID") +
      ")</span></button>";
    manifest.kitab.forEach((k) => {
      html +=
        '<button class="kitab-chip" data-kitab="' +
        k.file +
        '">' +
        esc(k.name) +
        ' <span class="chip-count">(' +
        k.count.toLocaleString("id-ID") +
        ")</span></button>";
    });
    wrap.innerHTML = html;

    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".kitab-chip");
      if (!chip) return;
      wrap.querySelectorAll(".kitab-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activeKitab = chip.dataset.kitab;
      const q = state.lastQuery || $("search-input").value.trim();
      if (q) doSearch();
      else $("search-empty").classList.remove("hidden");
    });
  }

  function showProgress(p) {
    const wrap = $("search-progress");
    const fill = $("progress-fill");
    const text = $("progress-text");
    wrap.classList.remove("hidden");
    const pct = Math.round(((p.index || 0) / p.total) * 100);
    fill.style.width = pct + "%";
    if (p.kitab && p.index !== undefined && p.index < p.total) {
      text.textContent =
        "Mencari di " + p.kitab.name + " (" + p.index + "/" + p.total + ")…";
    } else if (p.found !== undefined) {
      text.textContent = "Menemukan " + p.found + " hadits di " + p.kitab.name + " ✓";
    }
  }

  function renderResults() {
    const wrap = $("search-results");
    const count = $("result-count");
    const start = state.page * state.PAGE_SIZE;
    const slice = state.results.slice(start, start + state.PAGE_SIZE);

    if (state.results.length === 0) {
      count.classList.add("hidden");
      $("load-more-wrap").classList.add("hidden");
      const empty = $("search-empty");
      empty.classList.remove("hidden");
      empty.querySelector("p").textContent =
        state.lastQuery
          ? "Tidak ditemukan hadits dengan kata kunci \"" + state.lastQuery + "\". Coba kata lain atau periksa ejaan."
          : "Belum ada pencarian. Ketik kata kunci di atas untuk mulai.";
      wrap.innerHTML = "";
      return;
    }

    const nameOf = (file) => {
      const k = state.manifest.kitab.find((x) => x.file === file);
      return k ? k.name : file;
    };

    count.classList.remove("hidden");
    count.innerHTML =
      "Ditemukan <b>" +
      state.results.length.toLocaleString("id-ID") +
      "</b> hadits untuk <b>\"" +
      esc(state.lastQuery) +
      "\"</b>";

    const html = slice
      .map((r, idx) => {
        const global = start + idx;
        const terse = r.terjemah.length > 320 ? r.terjemah.slice(0, 320) + "…" : r.terjemah;
        const arab = r.arab
          ? '<p class="hadits-arab" dir="rtl" lang="ar">' + esc(r.arab) + "</p>"
          : "";
        return (
          '<article class="hadits-card" style="animation-delay:' +
          (idx * 0.03).toFixed(2) +
          's"><div class="hadits-head"><span class="hadits-kitab">' +
          esc(r.kitabName || nameOf(r.file)) +
          '</span><span class="hadits-no">no. ' +
          r.id +
          "</span></div>" +
          arab +
          '<p class="hadits-terjemah">' +
          esc(r.terjemah.length > 320 ? terse : r.terjemah) +
          "</p>" +
          (r.terjemah.length > 320
            ? '<button class="hadits-toggle" data-global="' +
              global +
              '">Baca selengkapnya ▼</button>'
            : "") +
          "</article>"
        );
      })
      .join("");

    if (slice.length === 0 && start > 0) {
      // sudah habis
      wrap.innerHTML = "";
    } else {
      wrap.innerHTML = html;
    }

    const hasMore = start + slice.length < state.results.length;
    $("load-more-wrap").classList.toggle("hidden", !hasMore);
    if (hasMore) {
      $("load-more").textContent =
        "Muat lebih banyak (" + (state.results.length - start - slice.length).toLocaleString("id-ID") + " lagi)";
    }
  }

  function doSearch() {
    const input = $("search-input");
    const q = input.value.trim();
    if (!q) {
      window.tauhidToast("Ketik dulu kata kunci pencariannya ya 🙂", true);
      return;
    }
    renderKitabChips();
    $("search-empty").classList.add("hidden");
    $("search-results").innerHTML = "";
    state.includeArab = $("toggle-arab").checked;

    searchAll(q, {
      includeArab: state.includeArab,
      onProgress: showProgress,
      onError: (k, e) => window.tauhidToast("Gagal memuat " + k.name, true),
    }).then((res) => {
      if (res.aborted) return;
      const wrap = $("search-progress");
      wrap.classList.remove("hidden");
      $("progress-fill").style.width = "100%";
      $("progress-text").textContent = "Selesai — " + res.results.length + " hadits ditemukan.";
      setTimeout(() => wrap.classList.add("hidden"), 1800);
      renderResults();
    }).catch(() => {
      window.tauhidToast("Gagal memuat data hadits — pastikan dijalankan lewat server lokal (py -m http.server).", true);
      const wrap = $("search-progress");
      if (wrap) wrap.classList.add("hidden");
    });
  }

  /* ---------- Inisialisasi ---------- */
  (function init() {
    const form = $("search-form");
    const loadMore = $("load-more");
    const toggle = $("toggle-arab");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      doSearch();
    });
    loadMore.addEventListener("click", () => {
      state.page++;
      renderResults();
    });

    // Baca selengkapnya / sembunyikan
    const resultsWrap = $("search-results");
    resultsWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".hadits-toggle");
      if (!btn) return;
      const global = Number(btn.dataset.global);
      const r = state.results[global];
      if (!r) return;
      const card = btn.closest(".hadits-card");
      const p = card.querySelector(".hadits-terjemah");
      const expanded = btn.textContent.indexOf("▲") !== -1;
      if (expanded) {
        p.textContent = r.terjemah.length > 320 ? r.terjemah.slice(0, 320) + "…" : r.terjemah;
        btn.textContent = "Baca selengkapnya ▼";
      } else {
        p.textContent = r.terjemah;
        btn.textContent = "Sembunyikan ▲";
      }
    });
    toggle.addEventListener("change", () => {
      state.includeArab = toggle.checked;
      const q = state.lastQuery;
      if (q) doSearch();
    });

    renderKitabChips().catch(() => {});
    const totalEl = $("search-total");
    loadManifest()
      .then((m) => {
        if (totalEl) totalEl.textContent = "±" + m.total.toLocaleString("id-ID");
      })
      .catch(() => {});
  })();

  /* ---------- Ekspor API untuk modul lain (ustadz.js) ---------- */
  window.TauhidHadits = {
    state,
    loadManifest,
    loadKitab,
    searchInKitab,
    searchAll,
    esc,
  };
})();
