/* Leasing banner.
   Placeholder copy lives in DEFAULT_MESSAGES.
   Edit the rotating lines at admin.html — saved in this browser —
   or change the placeholder below. Link syntax: [Towson](https://…)
*/
(() => {
  const STORAGE_KEY = "powers-announce-v1";

  const DEFAULT_MESSAGES = [
    "Now leasing at [Towson](#) and [Reisterstown](#)",
  ];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      const cleaned = parsed.map((line) => String(line).trim()).filter(Boolean);
      return cleaned.length ? cleaned : null;
    } catch {
      return null;
    }
  }

  function save(messages) {
    const cleaned = messages.map((line) => String(line).trim()).filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function safeUrl(url) {
    const value = String(url).trim();
    if (value.startsWith("#")) return value;
    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:" || parsed.protocol === "tel:") {
        return value;
      }
    } catch {
      /* ignore invalid urls */
    }
    return "#";
  }

  function appendMessage(parent, raw, tabbable) {
    const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(raw))) {
      if (match.index > last) {
        parent.appendChild(document.createTextNode(raw.slice(last, match.index)));
      }
      const link = document.createElement("a");
      const href = safeUrl(match[2]);
      link.href = href;
      link.textContent = match[1];
      if (!tabbable) link.tabIndex = -1;
      if (href === "#") {
        link.title = "Placeholder — add the leasing agent URL in admin";
      }
      parent.appendChild(link);
      last = match.index + match[0].length;
    }
    if (last < raw.length) {
      parent.appendChild(document.createTextNode(raw.slice(last)));
    }
  }

  function buildGroup(messages, hidden) {
    const group = document.createElement("div");
    group.className = "announce__group";
    if (hidden) group.setAttribute("aria-hidden", "true");

    messages.forEach((message) => {
      const item = document.createElement("span");
      item.className = "announce__item";
      appendMessage(item, message, !hidden);
      group.appendChild(item);

      const sep = document.createElement("span");
      sep.className = "announce__sep";
      sep.setAttribute("aria-hidden", "true");
      group.appendChild(sep);
    });

    return group;
  }

  const mounts = new WeakMap();

  function mount(el, override) {
    if (!el) return;

    let state = mounts.get(el);
    if (!state) {
      state = { width: -1, signature: "", observer: null };
      mounts.set(el, state);
      state.observer = new ResizeObserver(() => draw(el, state));
      state.observer.observe(el);
      el.addEventListener("focusin", () => {
        const track = el.querySelector(".announce__track");
        if (!track || !el.classList.contains("is-ready")) return;
        track.style.animation = "none";
        track.style.transform = "translateX(0)";
      });
      el.addEventListener("focusout", (event) => {
        if (el.contains(event.relatedTarget)) return;
        const track = el.querySelector(".announce__track");
        if (!track) return;
        track.style.animation = "";
        track.style.transform = "";
      });
    }

    state.override = override;
    state.signature = "";
    state.width = -1;
    draw(el, state);
  }

  function resolveMessages(override) {
    if (Array.isArray(override)) {
      const cleaned = override.map((line) => String(line).trim()).filter(Boolean);
      if (cleaned.length) return cleaned;
    }
    return load() || DEFAULT_MESSAGES.slice();
  }

  function draw(el, state) {
    const messages = resolveMessages(state.override);
    const signature = messages.join("\n");
    const width = el.clientWidth || window.innerWidth;
    if (signature === state.signature && width === state.width) return;
    state.signature = signature;
    state.width = width;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = document.createElement("div");
    viewport.className = "announce__viewport";
    const track = document.createElement("div");
    track.className = "announce__track";
    const seq = document.createElement("div");
    seq.className = "announce__seq";
    seq.appendChild(buildGroup(messages, false));
    track.appendChild(seq);
    viewport.appendChild(track);
    el.replaceChildren(viewport);

    if (reduce) {
      el.classList.remove("is-ready");
      return;
    }

    let guard = 0;
    while (seq.scrollWidth < width + 32 && guard < 24) {
      seq.appendChild(buildGroup(messages, true));
      guard += 1;
    }

    const clone = seq.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach((link) => {
      link.tabIndex = -1;
    });
    track.appendChild(clone);
    el.classList.add("is-ready");

    const seconds = Math.max(16, seq.getBoundingClientRect().width / 46);
    track.style.animationDuration = `${seconds}s`;
  }

  window.PowersBanner = {
    DEFAULT_MESSAGES,
    load,
    save,
    clear,
    mount,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("announce");
    if (el) mount(el);
  });
})();
