/* Clones the leasing lines from the page so the gold bar can scroll
   in a loop. The words themselves live in _data/site.yml and are edited
   from the admin. */
(() => {
  function mount(el) {
    const source = el.querySelector(".announce__group");
    const seq = el.querySelector(".announce__seq");
    const track = el.querySelector(".announce__track");
    if (!source || !seq || !track) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const width = el.clientWidth || window.innerWidth;
    let guard = 0;
    while (seq.scrollWidth < width + 32 && guard < 24) {
      const clone = source.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a").forEach((link) => {
        link.tabIndex = -1;
      });
      seq.appendChild(clone);
      guard += 1;
    }

    const seqClone = seq.cloneNode(true);
    seqClone.setAttribute("aria-hidden", "true");
    seqClone.querySelectorAll("a").forEach((link) => {
      link.tabIndex = -1;
    });
    track.appendChild(seqClone);
    el.classList.add("is-ready");

    const seconds = Math.max(16, seq.getBoundingClientRect().width / 46);
    track.style.animationDuration = `${seconds}s`;

    el.addEventListener("focusin", () => {
      track.style.animation = "none";
      track.style.transform = "translateX(0)";
    });
    el.addEventListener("focusout", (event) => {
      if (el.contains(event.relatedTarget)) return;
      track.style.animation = "";
      track.style.transform = "";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("announce");
    if (el) mount(el);
  });
})();
