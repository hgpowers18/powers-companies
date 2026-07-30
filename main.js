(() => {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuIcon = document.getElementById("menu-icon");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    if (mobileMenu) mobileMenu.classList.toggle("is-open", open);
    if (menuIcon) menuIcon.textContent = open ? "✕" : "☰";
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => setMenu(!menuOpen));
  }

  document.querySelectorAll("[data-close-menu]").forEach((el) => {
    el.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) setMenu(false);
  });

  /* ========== CAROUSEL ========== */
  const slides = Array.from(document.querySelectorAll(".carousel__img"));
  const dots = Array.from(document.querySelectorAll(".carousel__dot"));
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let slide = 0;
  let carTimer = null;

  function renderSlide() {
    slides.forEach((img, i) => img.classList.toggle("is-active", i === slide));
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === slide);
      dot.setAttribute("aria-current", i === slide ? "true" : "false");
    });
  }

  function startCarousel() {
    clearInterval(carTimer);
    if (reduceMotion || slides.length === 0) return;
    carTimer = setInterval(() => {
      slide = (slide + 1) % slides.length;
      renderSlide();
    }, 6000);
  }

  function goTo(i) {
    slide = i;
    renderSlide();
    startCarousel();
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => goTo((slide + slides.length - 1) % slides.length));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => goTo((slide + 1) % slides.length));
  }
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => goTo(i));
  });

  renderSlide();
  startCarousel();

  /* ========== AUDIO ========== */
  const audioBtn = document.getElementById("audio-btn");
  const audioIcon = document.getElementById("audio-icon");
  const audioLabel = document.getElementById("audio-label");
  const audio = new Audio("uploads/powers_story.mp3");
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
    if (audioIcon) audioIcon.textContent = playing ? "❚❚" : "▶";
    if (audioLabel) audioLabel.textContent = playing ? "Pause our story" : "Hear our story";
    if (audioBtn) audioBtn.setAttribute("aria-pressed", playing ? "true" : "false");
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
