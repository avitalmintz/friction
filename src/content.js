(function () {
  const DEFAULTS = {
    scrollWindowMs: 30000,
    pauseSeconds: 4,
    enabled: true,
    prompts: window.__FRICTION_DEFAULT_PROMPTS ?? []
  };

  let settings = { ...DEFAULTS };
  let scrollAccumMs = 0;
  let lastTickAt = Date.now();
  let overlayActive = false;
  let tickLogCounter = 0;

  loadSettings();
  if (chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(loadSettings);
  }

  function loadSettings() {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      if (!settings.prompts || !settings.prompts.length) {
        settings.prompts = DEFAULTS.prompts;
      }
      console.log("[friction/scroll] settings", {
        enabled: settings.enabled,
        scrollWindowMs: settings.scrollWindowMs,
        pauseSeconds: settings.pauseSeconds,
        prompts: settings.prompts.length
      });
    });
  }

  function onActivity(source) {
    if (!settings.enabled || overlayActive) return;
    const now = Date.now();
    const delta = Math.min(Math.max(now - lastTickAt, 0), 1500);
    lastTickAt = now;
    scrollAccumMs += delta;
    tickLogCounter += 1;
    if (tickLogCounter % 60 === 1) {
      console.log(
        `[friction/scroll] activity via ${source}, accum=${Math.round(scrollAccumMs)}ms / ${settings.scrollWindowMs}ms`
      );
    }
    if (scrollAccumMs >= settings.scrollWindowMs) {
      scrollAccumMs = 0;
      showOverlay();
    }
  }

  const handler = (source) => () => onActivity(source);

  document.addEventListener("scroll", handler("scroll"), { passive: true, capture: true });
  window.addEventListener("scroll", handler("window-scroll"), { passive: true });
  document.addEventListener("wheel", handler("wheel"), { passive: true, capture: true });
  document.addEventListener("touchmove", handler("touchmove"), { passive: true, capture: true });
  document.addEventListener(
    "keydown",
    (e) => {
      if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Space", " "].includes(e.key)) {
        onActivity("keydown");
      }
    },
    true
  );

  function pickPrompt() {
    const pool = settings.prompts && settings.prompts.length ? settings.prompts : DEFAULTS.prompts;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showOverlay() {
    if (overlayActive) return;
    overlayActive = true;
    console.log("[friction/scroll] OVERLAY triggered");

    const root = document.createElement("div");
    root.className = "friction-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");

    const inner = document.createElement("div");
    inner.className = "friction-inner";

    const prompt = document.createElement("div");
    prompt.className = "friction-prompt";
    prompt.textContent = pickPrompt();

    const meter = document.createElement("div");
    meter.className = "friction-meter";
    const fill = document.createElement("div");
    fill.className = "friction-meter-fill";
    meter.appendChild(fill);

    const btn = document.createElement("button");
    btn.className = "friction-continue";
    btn.type = "button";
    btn.textContent = "continue";
    btn.disabled = true;
    btn.addEventListener("click", dismiss);

    const footer = document.createElement("div");
    footer.className = "friction-footer";
    footer.textContent = "friction · a refusal of frictionless engagement";

    inner.appendChild(prompt);
    inner.appendChild(meter);
    inner.appendChild(btn);
    inner.appendChild(footer);
    root.appendChild(inner);
    document.body.appendChild(root);

    requestAnimationFrame(() => {
      root.classList.add("friction-visible");
      fill.style.transitionDuration = `${settings.pauseSeconds}s`;
      requestAnimationFrame(() => {
        fill.style.transform = "scaleX(1)";
      });
    });

    setTimeout(() => {
      btn.disabled = false;
      btn.classList.add("friction-ready");
    }, settings.pauseSeconds * 1000);

    function dismiss() {
      root.classList.remove("friction-visible");
      setTimeout(() => {
        root.remove();
        overlayActive = false;
        lastTickAt = Date.now();
      }, 240);
    }
  }

  console.log("[friction/scroll] module loaded (scroll + wheel + touchmove + keydown)");
})();
