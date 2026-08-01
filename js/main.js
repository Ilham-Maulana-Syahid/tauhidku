/* ============================================================================
   TAUHIDKU — MAIN (nav, reveal, hero stats, toast, dll.)
   ============================================================================ */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);

  /* ---------- Tahun footer ---------- */
  const yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Hero stats ---------- */
  const statsEl = $("hero-stats");
  if (statsEl && window.TAUHIDKU) {
    statsEl.innerHTML = TAUHIDKU.stats
      .map(
        (s) =>
          '<div class="hero-stat" data-reveal><div class="hero-stat-value">' +
          s.value +
          '</div><div class="hero-stat-label">' +
          s.label +
          "</div></div>"
      )
      .join("");
  }

  /* ---------- Navbar: scrolled state + menu mobile + active link ---------- */
  (function nav() {
    const navbar = $("navbar");
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 30);
      const btt = $("back-to-top");
      if (btt) btt.classList.toggle("show", window.scrollY > 520);
    }, { passive: true });

    const hamburger = $("hamburger");
    const navLinks = $("nav-links");
    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        hamburger.classList.toggle("open", open);
        hamburger.setAttribute("aria-expanded", open);
      });
      navLinks.querySelectorAll(".nav-link").forEach((l) =>
        l.addEventListener("click", () => {
          navLinks.classList.remove("open");
          hamburger.classList.remove("open");
          hamburger.setAttribute("aria-expanded", "false");
        })
      );
    }

    const sections = document.querySelectorAll("main section[id]");
    const links = Array.from(document.querySelectorAll(".nav-link"));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) =>
              l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id)
            );
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => obs.observe(s));
  })();

  /* ---------- Toast ---------- */
  const toastEl = $("toast");
  let toastTimer = null;
  window.tauhidToast = function (msg, isErr) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3400);
  };

  /* ---------- Back to top ---------- */
  const btt = $("back-to-top");
  if (btt) {
    btt.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
    );
  }

  /* ---------- Modal artikel ---------- */
  (function modal() {
    const modal = $("article-modal");
    const body = $("article-modal-body");
    if (!modal || !body || !window.TAUHIDKU) return;

    function close() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    $("article-close").addEventListener("click", close);
    $("article-close-btn").addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    const grid = $("artikel-grid");
    grid.innerHTML = TAUHIDKU.articles
      .map(
        (a, i) =>
          '<article class="artikel-card reveal" data-artikel="' +
          i +
          '" tabindex="0" role="button" aria-label="Baca artikel: ' +
          a.title +
          '"><span class="artikel-cat">' +
          a.cat +
          '</span><h3>' +
          a.title +
          "</h3><p>" +
          a.excerpt +
          '</p><div class="artikel-meta"><span>📖 ' +
          a.read +
          '</span></div><span class="artikel-read">Baca artikel</span></article>'
      )
      .join("");

    function openArticle(i) {
      const a = TAUHIDKU.articles[i];
      if (!a) return;
      const content = a.content
        .map((sec) => {
          const ps = (sec.p || [])
            .map((p) => "<p>" + p + "</p>")
            .join("");
          const dalil = sec.dalil
            ? '<div class="dalil"><p class="dalil-arab" dir="rtl" lang="ar">' +
              sec.dalil.arab +
              '</p><p>' +
              sec.dalil.terjemah +
              "</p></div>"
            : "";
          return "<h3>" + sec.h + "</h3>" + ps + dalil;
        })
        .join("");
      body.innerHTML =
        '<div class="artikel-head"><span class="artikel-cat">' +
        a.cat +
        "</span><h2>" +
        a.title +
        '</h2><div class="artikel-meta"><span>📖 ' +
        a.read +
        "</span></div></div><div class='artikel-content'>" +
        content +
        "</div>";
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      modal.querySelector(".modal-panel").scrollTop = 0;
    }

    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-artikel]");
      if (card) openArticle(Number(card.dataset.artikel));
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const card = e.target.closest("[data-artikel]");
        if (card) {
          e.preventDefault();
          openArticle(Number(card.dataset.artikel));
        }
      }
    });
  })();

  /* ---------- Reveal on scroll (dipanggil setelah semua konten dirender) ---------- */
  (function reveal() {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("reveal"));
    const els = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
  })();
})();
