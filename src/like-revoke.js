(function () {
  const DEFAULTS = {
    revokeLikes: true,
    revokeDelayMs: 2000
  };

  let settings = { ...DEFAULTS };
  const revokeInFlight = new WeakSet();
  const recentlyRevoked = new WeakSet();
  const revokedPostIds = new Set();

  const LIKE_LABELS = new Set(["Like", "Me gusta", "J'aime", "J\u2019aime", "Gefällt mir", "いいね", "좋아요"]);
  const UNLIKE_LABELS = new Set(["Unlike", "Ya no me gusta", "Je n'aime plus", "Gefällt mir nicht mehr", "いいね解除", "좋아요 취소"]);

  const isLikeLabel = (l) => !!l && LIKE_LABELS.has(l);
  const isUnlikeLabel = (l) => !!l && UNLIKE_LABELS.has(l);

  let startupPhase = true;
  setTimeout(() => {
    startupPhase = false;
  }, 2500);

  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      console.log("[friction/like] loaded settings", settings);
    });
    chrome.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        if (key in DEFAULTS) settings[key] = changes[key].newValue;
      }
    });
  }

  let lastClickTarget = null;
  document.addEventListener(
    "click",
    (e) => {
      lastClickTarget = e.target instanceof HTMLElement ? e.target : null;
      if (!settings.revokeLikes) return;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const likeSvg = path.find(
        (n) => n instanceof SVGElement && isLikeLabel(n.getAttribute?.("aria-label"))
      );
      if (!likeSvg) return;
      const button = findClickableAncestor(likeSvg);
      if (!button || revokeInFlight.has(button)) return;
      console.log("[friction/like] CLICK on Like svg");
      revokeInFlight.add(button);
      routeLike(button, "click", e.target);
    },
    true
  );

  let lastDblTarget = null;
  document.addEventListener(
    "dblclick",
    (e) => {
      lastDblTarget = e.target instanceof HTMLElement ? e.target : null;
      if (!settings.revokeLikes) return;
      if (!(e.target instanceof HTMLElement)) return;
      const article = e.target.closest("article, div[role='dialog'], main section");
      if (!article) return;
      const preUnlike = article.querySelector('svg[aria-label="Unlike"]');
      if (preUnlike) return;
      console.log("[friction/like] DBLCLICK on unliked article");
      setTimeout(() => {
        const svg = article.querySelector('svg[aria-label="Unlike"]');
        if (!svg) return;
        const button = findClickableAncestor(svg);
        if (!button || revokeInFlight.has(button)) return;
        revokeInFlight.add(button);
        routeLike(button, "dblclick", e.target);
      }, 400);
    },
    true
  );

  const observer = new MutationObserver((mutations) => {
    if (!settings.revokeLikes || startupPhase) return;
    for (const m of mutations) {
      if (m.type !== "attributes" || m.attributeName !== "aria-label") continue;
      const el = m.target;
      if (!(el instanceof Element)) continue;
      if (!isLikeLabel(m.oldValue) || !isUnlikeLabel(el.getAttribute("aria-label"))) continue;
      const button = findClickableAncestor(el);
      if (!button || revokeInFlight.has(button) || recentlyRevoked.has(button)) continue;
      console.log("[friction/like] MUTATION flip Like → Unlike");
      revokeInFlight.add(button);
      routeLike(button, "mutation", lastDblTarget || lastClickTarget);
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["aria-label"],
    attributeOldValue: true,
    subtree: true
  });

  function routeLike(button, via, originTarget) {
    const article = button.closest("article, div[role='dialog'], main section");
    const postId = getPostId(button, article, originTarget);

    if (!postId) {
      console.log("[friction/like] post id unknown; URL:", window.location.pathname);
    }

    if (postId && revokedPostIds.has(postId)) {
      console.log(`[friction/like] RE-LIKE of previously revoked post (via ${via}), post=${postId}`);
      handleRelike(button, article, postId);
      return;
    }

    verifyAndRevoke(button, via, postId);
  }

  function verifyAndRevoke(button, via, postId) {
    setTimeout(() => {
      const svg = button.querySelector("svg[aria-label]");
      const label = svg?.getAttribute("aria-label");
      if (!isUnlikeLabel(label)) {
        revokeInFlight.delete(button);
        return;
      }
      const remaining = Math.max(0, settings.revokeDelayMs - 200);
      setTimeout(() => {
        const svg2 = button.querySelector("svg[aria-label]");
        if (!isUnlikeLabel(svg2?.getAttribute("aria-label"))) {
          revokeInFlight.delete(button);
          return;
        }
        console.log(`[friction/like] REVOKING (via ${via}) post=${postId ?? "unknown"}`);
        simulateClick(button);
        notifyRevoked();
        recentlyRevoked.add(button);
        if (postId) revokedPostIds.add(postId);
        setTimeout(() => {
          revokeInFlight.delete(button);
          setTimeout(() => recentlyRevoked.delete(button), 2000);
        }, 400);
      }, remaining);
    }, 200);
  }

  function handleRelike(button, article, postId) {
    setTimeout(() => {
      const svg = button.querySelector("svg[aria-label]");
      if (!isUnlikeLabel(svg?.getAttribute("aria-label"))) {
        revokeInFlight.delete(button);
        return;
      }
      console.log("[friction/like] undoing re-like, asking for justification");
      simulateClick(button);
      recentlyRevoked.add(button);

      if (!window.__friction?.showJustify) {
        console.warn("[friction/like] modal helper missing; aborting re-like");
        revokeInFlight.delete(button);
        return;
      }

      window.__friction.showJustify({
        eyebrow: "second attempt · friction",
        title: "why are you liking this?",
        subtitle: "you just revoked this one. type a reason and the like will register this time.",
        confirmLabel: "confirm like",
        kind: "like",
        onConfirm: (reason, grading) => {
          window.__friction.saveToDiary?.("like", {
            postId,
            reason: reason.slice(0, 500),
            grading: grading || null
          });
          revokedPostIds.delete(postId);
          setTimeout(() => {
            console.log("[friction/like] re-applying like after justification");
            simulateClick(button);
          }, 200);
        },
        onCancel: () => {
          console.log("[friction/like] re-like cancelled by user");
        }
      });

      setTimeout(() => {
        revokeInFlight.delete(button);
        setTimeout(() => recentlyRevoked.delete(button), 2000);
      }, 400);
    }, 200);
  }

  function extractPostFromHref(href) {
    if (!href) return null;
    const m = href.match(/\/(p|reel)\/([^/?#]+)/);
    return m ? `${m[1]}:${m[2]}` : null;
  }

  function getPostId(button, article, originTarget) {
    const urlId = extractPostFromHref(window.location.pathname);
    if (urlId) return urlId;

    const searchRoots = [article, button, originTarget].filter(Boolean);
    for (const root of searchRoots) {
      const links = root.querySelectorAll?.("a[href]") ?? [];
      for (const a of links) {
        const id = extractPostFromHref(a.getAttribute("href"));
        if (id) return id;
      }
      if (root.matches?.("a[href]")) {
        const id = extractPostFromHref(root.getAttribute("href"));
        if (id) return id;
      }
    }

    for (const start of [originTarget, button]) {
      if (!start) continue;
      let cur = start;
      while (cur && cur !== document.body) {
        const parent = cur.parentElement;
        if (parent?.querySelectorAll) {
          const links = parent.querySelectorAll("a[href]");
          for (const a of links) {
            const id = extractPostFromHref(a.getAttribute("href"));
            if (id) return id;
          }
        }
        cur = parent;
      }
    }

    const imgRoots = [article, button].filter(Boolean);
    for (const root of imgRoots) {
      const imgs = root.querySelectorAll?.("img") ?? [];
      for (const img of imgs) {
        const src = img.currentSrc || img.src || "";
        if (src.length < 20) continue;
        const m = src.match(/\/([A-Za-z0-9_-]{10,})(?:_[a-z]\d+)?\.(?:jpg|jpeg|png|webp|mp4)/);
        if (m) return `img:${m[1]}`;
      }
    }

    return null;
  }

  function findClickableAncestor(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      if (
        cur.tagName === "BUTTON" ||
        cur.getAttribute?.("role") === "button" ||
        cur.getAttribute?.("tabindex") === "0"
      ) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return el.parentElement || null;
  }

  function simulateClick(target) {
    const innerSvg = target.querySelector?.("svg[aria-label]") || target;
    const rect = innerSvg.getBoundingClientRect?.() ?? { x: 0, y: 0, width: 0, height: 0 };
    const clientX = rect.x + rect.width / 2;
    const clientY = rect.y + rect.height / 2;
    const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX, clientY, button: 0 };
    for (const el of [target, innerSvg]) {
      try {
        el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerType: "mouse", isPrimary: true }));
        el.dispatchEvent(new MouseEvent("mousedown", base));
        el.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerType: "mouse", isPrimary: true }));
        el.dispatchEvent(new MouseEvent("mouseup", base));
        el.dispatchEvent(new MouseEvent("click", base));
      } catch (err) {
        console.warn("[friction/like] dispatch failed", err);
      }
    }
    try {
      if (typeof target.click === "function") target.click();
    } catch (err) {
      console.warn("[friction/like] native click failed", err);
    }
  }

  function notifyRevoked() {
    const toast = document.createElement("div");
    toast.className = "friction-toast";
    toast.textContent = "like revoked · friction";
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("friction-toast-in"));
    setTimeout(() => {
      toast.classList.remove("friction-toast-in");
      setTimeout(() => toast.remove(), 280);
    }, 1600);
  }

  console.log("[friction/like] module loaded (click + dblclick + mutation + justify)");
})();
