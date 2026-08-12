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

  /* ========== COMMUNITIES RAIL ========== */
  // The rail scrolls on its own with a swipe or a trackpad; the arrows are for
  // everyone else, and they take themselves away when every card already fits.
  const rail = document.querySelector("[data-rail]");
  const railArrows = document.querySelector("[data-rail-arrows]");

  if (rail && railArrows) {
    const buttons = Array.from(railArrows.querySelectorAll("[data-rail-dir]"));

    function railStep() {
      const card = rail.firstElementChild;
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;

      return card ? card.getBoundingClientRect().width + gap : rail.clientWidth;
    }

    function syncRail() {
      // A card's width can land on a fraction of a pixel, so the ends need a
      // little slack or the arrow never re-enables.
      const end = rail.scrollWidth - rail.clientWidth;

      railArrows.hidden = end <= 1;
      buttons.forEach((button) => {
        const forward = Number(button.dataset.railDir) > 0;
        button.disabled = forward ? rail.scrollLeft >= end - 1 : rail.scrollLeft <= 1;
      });
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        rail.scrollBy({
          left: railStep() * Number(button.dataset.railDir),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      });
    });

    let railQueued = false;

    function queueSyncRail() {
      if (railQueued) return;
      railQueued = true;
      requestAnimationFrame(() => {
        railQueued = false;
        syncRail();
      });
    }

    rail.addEventListener("scroll", queueSyncRail, { passive: true });
    window.addEventListener("resize", queueSyncRail);
    syncRail();
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
  const formError = document.getElementById("contact-error");

  if (form && success) {
    const submitBtn = form.querySelector(".contact__submit");
    const submitLabel = submitBtn ? submitBtn.textContent : "";
    const sendingLabel = (submitBtn && submitBtn.dataset.sendingLabel) || "Sending…";
    const inputs = Array.from(form.querySelectorAll("input, textarea")).filter(
      (input) => input.name !== "company",
    );

    // api/contact.js reports a problem with a field as one of these codes, so
    // the wording stays with the rest of the copy in the CMS.
    const messages = {
      required: form.dataset.errorRequired || "Please fill this in.",
      invalid: form.dataset.errorInvalid || "Please check this.",
      too_long: form.dataset.errorTooLong || "Please shorten this.",
    };

    let sending = false;

    function setFieldError(input, code) {
      const field = input.closest(".field");
      const message = field && field.querySelector(".field__error");

      if (field) field.classList.toggle("field--invalid", !!code);
      if (message) message.textContent = code ? messages[code] || messages.invalid : "";
      input.setAttribute("aria-invalid", code ? "true" : "false");
    }

    function showFieldErrors(errors) {
      let first = null;

      inputs.forEach((input) => {
        const code = errors[input.name];

        setFieldError(input, code);
        if (code && !first) first = input;
      });

      if (first) first.focus();

      return !!first;
    }

    /** The same checks the endpoint runs, so a mistake is caught before a round trip. */
    function validate() {
      const errors = {};

      inputs.forEach((input) => {
        if (input.validity.valueMissing) errors[input.name] = "required";
        else if (input.validity.typeMismatch) errors[input.name] = "invalid";
      });

      return !showFieldErrors(errors);
    }

    function setSending(state) {
      sending = state;

      if (!submitBtn) return;
      submitBtn.disabled = state;
      submitBtn.textContent = state ? sendingLabel : submitLabel;
    }

    function showFormError(show) {
      if (formError) formError.classList.toggle("is-hidden", !show);
    }

    inputs.forEach((input) => {
      input.addEventListener("input", () => setFieldError(input, ""));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (sending) return;

      showFormError(false);

      if (!validate()) return;

      setSending(true);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          // Only fall back to the general message when the endpoint has not
          // told us which field it objected to.
          if (!result.fields || !showFieldErrors(result.fields)) showFormError(true);
          setSending(false);

          return;
        }
      } catch {
        showFormError(true);
        setSending(false);

        return;
      }

      form.classList.add("is-hidden");
      success.classList.remove("is-hidden");
      success.setAttribute("tabindex", "-1");
      success.focus();
    });
  }
})();
