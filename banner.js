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

    // A finger on the bar holds it still so the link can be tapped, then lets
    // it go — even if the finger slides off the bar. Hover already does this
    // for a mouse. Clearing the inline state hands control back to the CSS,
    // so a touch can never leave the bar stuck.
    let touchHold = false;
    const hold = (event) => {
      if (event.pointerType !== "touch") return;
      touchHold = true;
      track.style.animationPlayState = "paused";
    };
    const release = (event) => {
      if (!touchHold) return;
      if (event.pointerType && event.pointerType !== "touch") return;
      touchHold = false;
      track.style.animationPlayState = "";
    };

    el.addEventListener("pointerdown", hold);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("announce");
    if (el) mount(el);
  });
})();
