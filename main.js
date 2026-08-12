(() => {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuIcon = document.getElementById("menu-icon");
  const yearEl = document.getElementById("year");
  const nav = document.querySelector(".nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    if (mobileMenu) mobileMenu.classList.toggle("is-open", open);
    if (menuIcon) menuIcon.textContent = open ? "✕" : "☰";
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    syncNav();
  }

  /* ========== NAV TINT ========== */
  // The bar is frosted glass, so it has to take the tone of whatever band is
  // behind it — cream over the light sections, dark over the video and the
  // dark ones. Sections opt in with data-nav="dark".
  const darkBands = Array.from(document.querySelectorAll('[data-nav="dark"]'));

  // At rest on the hero the glass is nearly clear so the video reads; it
  // thickens to full frost by the time the stats row has passed under the bar.
  const heroStats = document.querySelector(".hero .stats");
  const CLEAR = { tint: 0.12, blur: 3, rule: 0 };
  const FROSTED = { tint: 0.55, blur: 18, rule: 0.14 };

  function frostProgress() {
    if (!heroStats || !nav) return 1;
    const rampEnd = heroStats.getBoundingClientRect().bottom + window.scrollY - nav.offsetHeight;
    if (rampEnd <= 0) return 1;
    return Math.min(1, Math.max(0, window.scrollY / rampEnd));
  }

  function syncNav() {
    if (!nav) return;
    const probe = nav.offsetHeight / 2;
    const overDark = darkBands.some((band) => {
      const rect = band.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    });
    nav.classList.toggle("is-dark", overDark && !menuOpen);

    const p = frostProgress();
    const lerp = (from, to) => from + (to - from) * p;
    nav.style.setProperty("--nav-tint", lerp(CLEAR.tint, FROSTED.tint).toFixed(3));
    nav.style.setProperty("--nav-blur", `${lerp(CLEAR.blur, FROSTED.blur).toFixed(1)}px`);
    nav.style.setProperty("--nav-rule", lerp(CLEAR.rule, FROSTED.rule).toFixed(3));
    // Mid-ramp the tint has to track the scroll frame for frame; the crossfade
    // is only wanted when the bar switches bands.
    nav.classList.toggle("is-ramping", p < 1);
  }

  let navQueued = false;

  function queueSyncNav() {
    if (navQueued) return;
    navQueued = true;
    requestAnimationFrame(() => {
      navQueued = false;
      syncNav();
    });
  }

  window.addEventListener("scroll", queueSyncNav, { passive: true });
  window.addEventListener("resize", queueSyncNav);
  syncNav();

  if (menuBtn) {
    menuBtn.addEventListener("click", () => setMenu(!menuOpen));
  }

  document.querySelectorAll("[data-close-menu]").forEach((el) => {
    el.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) setMenu(false);
  });

  /* ========== HERO VIDEO ========== */
  const heroVideo = document.getElementById("hero-video");

  if (heroVideo) {
    const conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const frugal = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || ""));
    const mobileSrc = heroVideo.dataset.srcMobile;
    const src =
      mobileSrc && window.matchMedia("(max-width: 760px)").matches
        ? mobileSrc
        : heroVideo.dataset.src;

    // On metered connections or with reduced motion requested we never fetch the
    // video at all — the poster image is the hero.
    if (src && !reduceMotion && !frugal) {
      const play = () => {
        const attempt = heroVideo.play();
        if (attempt && attempt.catch) attempt.catch(() => {});
      };

      heroVideo.addEventListener("playing", () => heroVideo.classList.add("is-playing"));
      heroVideo.addEventListener("error", () => heroVideo.classList.remove("is-playing"));

      heroVideo.src = src;
      play();

      // iOS and some Android browsers hold autoplay until the first gesture.
      document.addEventListener("touchstart", play, { once: true, passive: true });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) play();
      });

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) play();
              else heroVideo.pause();
            });
          },
          { threshold: 0.05 }
        );
        io.observe(heroVideo);
      }
    }
  }

  /* ========== AUDIO ========== */
  const audioBtn = document.getElementById("audio-btn");
  const audioLabel = document.getElementById("audio-label");

  // The track and its labels are editable in the CMS, so read them off the
  // button and fall back to the original values if the attributes are absent.
  const audioSrc = (audioBtn && audioBtn.dataset.audioSrc) || "uploads/powers_story.mp3";
  const playLabel = (audioBtn && audioBtn.dataset.playLabel) || "Hear our story";
  const pauseLabel = (audioBtn && audioBtn.dataset.pauseLabel) || "Pause our story";

  const audio = new Audio(audioSrc);
  audio.preload = "metadata";

  let lastSec = -1;

  const saved = parseFloat(localStorage.getItem("powersStoryPos") || "0");
  audio.addEventListener("loadedmetadata", () => {
    if (saved > 0 && saved < audio.duration - 1) {
      audio.currentTime = saved;
    }
  });

  audio.addEventListener("timeupdate", () => {
    localStorage.setItem("powersStoryPos", String(audio.currentTime));
    const whole = Math.floor(audio.currentTime);
    if (whole !== lastSec) lastSec = whole;
  });

  audio.addEventListener("ended", () => {
    setPlaying(false);
    localStorage.setItem("powersStoryPos", "0");
  });

  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));

  function setPlaying(playing) {
    if (audioLabel) audioLabel.textContent = playing ? pauseLabel : playLabel;

    if (audioBtn) {
      audioBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      audioBtn.classList.toggle("is-playing", playing);
    }
  }

  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  /* ========== FORM ========== */
  const form = document.getElementById("contact-form");
  const success = document.getElementById("contact-success");

  if (form && success) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.classList.add("is-hidden");
      success.classList.remove("is-hidden");
    });
  }
})();
