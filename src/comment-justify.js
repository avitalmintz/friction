(function () {
  const DEFAULTS = { justifyComments: true };
  let settings = { ...DEFAULTS };
  let bypassNext = false;

  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      console.log("[friction/comment] settings", settings);
    });
    chrome.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        if (key in DEFAULTS) settings[key] = changes[key].newValue;
      }
    });
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (!settings.justifyComments) return;
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (bypassNext) {
        bypassNext = false;
        return;
      }
      if (!isCommentInput(e.target)) return;
      const text = readText(e.target);
      if (!text.trim()) return;

      console.log("[friction/comment] Enter intercepted, opening justify modal");
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal(e.target, text);
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!settings.justifyComments) return;
      if (bypassNext) return;
      const btn = e.target instanceof Element ? e.target.closest("button, [role='button']") : null;
      if (!btn) return;
      const labelText = (btn.textContent || "").trim().toLowerCase();
      const aria = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
      if (labelText !== "post" && !/post/.test(aria)) return;
      const input = findNearbyCommentInput(btn);
      if (!input) return;
      const text = readText(input);
      if (!text.trim()) return;

      console.log("[friction/comment] Post button intercepted, opening justify modal");
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal(input, text, btn);
    },
    true
  );

  function openModal(input, text, postButton) {
    if (!window.__friction?.showJustify) {
      console.warn("[friction/comment] modal helper not loaded; allowing comment through");
      submit(input, postButton, true);
      return;
    }
    window.__friction.showJustify({
      eyebrow: "before you comment · friction",
      title: "why are you commenting this?",
      subtitle: "type a reason and the comment will send as you wrote it. cancel keeps it in the box.",
      context: text.length > 240 ? text.slice(0, 240) + "…" : text,
      placeholder: "i am commenting because…",
      confirmLabel: "confirm & send",
      kind: "comment",
      onConfirm: (reason, grading) => {
        console.log("[friction/comment] confirmed; saving to diary and submitting");
        window.__friction.saveToDiary?.("comment", {
          comment: text.slice(0, 500),
          reason: reason.slice(0, 500),
          grading: grading || null
        });
        submit(input, postButton, false);
      },
      onCancel: () => {
        console.log("[friction/comment] cancelled; comment stays unsubmitted");
      }
    });
  }

  function submit(input, postButton, silent) {
    bypassNext = true;
    try {
      if (postButton) {
        triggerClick(postButton);
      } else {
        input?.focus?.();
        const opts = { key: "Enter", bubbles: true, cancelable: true, composed: true };
        input?.dispatchEvent?.(new KeyboardEvent("keydown", opts));
        input?.dispatchEvent?.(new KeyboardEvent("keypress", opts));
        input?.dispatchEvent?.(new KeyboardEvent("keyup", opts));
        if (typeof input?.form?.requestSubmit === "function") {
          try { input.form.requestSubmit(); } catch (err) { /* noop */ }
        }
      }
    } finally {
      setTimeout(() => { bypassNext = false; }, 800);
    }
    if (!silent) notifySent();
  }

  function triggerClick(el) {
    const rect = el.getBoundingClientRect?.() ?? { x: 0, y: 0, width: 0, height: 0 };
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      button: 0
    };
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerType: "mouse", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mousedown", base));
      el.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerType: "mouse", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mouseup", base));
      el.dispatchEvent(new MouseEvent("click", base));
    } catch (err) {
      console.warn("[friction/comment] dispatch failed", err);
    }
    try {
      if (typeof el.click === "function") el.click();
    } catch (err) {
      console.warn("[friction/comment] native click failed", err);
    }
  }

  function isCommentInput(el) {
    if (!el || !(el instanceof Element)) return false;
    const aria = el.getAttribute("aria-label")?.toLowerCase() ?? "";
    const placeholder = el.getAttribute("placeholder")?.toLowerCase() ?? "";
    if (/add a comment/.test(aria) || /add a comment/.test(placeholder)) return true;
    if (/comment/.test(aria) && (el.tagName === "TEXTAREA" || el.isContentEditable)) return true;
    return false;
  }

  function readText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    if (el.isContentEditable) return el.innerText || "";
    return "";
  }

  function findNearbyCommentInput(button) {
    const form = button.closest("form");
    if (form) {
      const t = form.querySelector("textarea, [contenteditable='true']");
      if (t && isCommentInput(t)) return t;
    }
    const region = button.closest("article, section, div[role='dialog']");
    if (region) {
      const candidates = region.querySelectorAll("textarea, [contenteditable='true']");
      for (const c of candidates) {
        if (isCommentInput(c)) return c;
      }
    }
    return null;
  }

  function notifySent() {
    const toast = document.createElement("div");
    toast.className = "friction-toast";
    toast.textContent = "comment justified · friction";
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("friction-toast-in"));
    setTimeout(() => {
      toast.classList.remove("friction-toast-in");
      setTimeout(() => toast.remove(), 280);
    }, 1600);
  }

  console.log("[friction/comment] module loaded (justify mode)");
})();
