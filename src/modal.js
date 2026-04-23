(function () {
  window.__friction = window.__friction || {};

  const GRADE_MIN_CHARS = 4;
  const CONFIRM_MIN_CHARS = 1;

  function showJustify({
    eyebrow = "friction",
    title,
    subtitle,
    context,
    placeholder = "…",
    confirmLabel = "confirm",
    kind = "like",
    onConfirm,
    onCancel
  }) {
    if (document.querySelector(".friction-root.friction-justify")) return;

    const root = document.createElement("div");
    root.className = "friction-root friction-justify";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");

    const inner = document.createElement("div");
    inner.className = "friction-inner friction-justify-inner";

    const eye = document.createElement("div");
    eye.className = "friction-eyebrow";
    eye.textContent = eyebrow;

    const head = document.createElement("div");
    head.className = "friction-prompt";
    head.textContent = title;

    const sub = document.createElement("div");
    sub.className = "friction-sub";
    sub.textContent = subtitle;

    inner.appendChild(eye);
    inner.appendChild(head);
    inner.appendChild(sub);

    if (context) {
      const ctx = document.createElement("div");
      ctx.className = "friction-context";
      ctx.textContent = context;
      inner.appendChild(ctx);
    }

    const textarea = document.createElement("textarea");
    textarea.className = "friction-textarea";
    textarea.rows = 3;
    textarea.placeholder = placeholder;
    inner.appendChild(textarea);

    const grading = document.createElement("div");
    grading.className = "friction-grading";
    grading.style.display = "none";
    inner.appendChild(grading);

    const btnRow = document.createElement("div");
    btnRow.className = "friction-btnrow";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "friction-ghost";
    cancel.textContent = "cancel";
    cancel.addEventListener("click", () => close(false));

    const grade = document.createElement("button");
    grade.type = "button";
    grade.className = "friction-ghost friction-grade";
    grade.textContent = "grade this reason";
    grade.disabled = true;
    grade.style.display = "none";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "friction-continue";
    confirm.textContent = confirmLabel;
    confirm.disabled = true;

    let gradeResult = null;
    let gradeInFlight = false;

    const update = () => {
      const len = textarea.value.trim().length;
      const okConfirm = len >= CONFIRM_MIN_CHARS;
      confirm.disabled = !okConfirm;
      confirm.classList.toggle("friction-ready", okConfirm);
      const okGrade = len >= GRADE_MIN_CHARS && !gradeInFlight;
      grade.disabled = !okGrade;
      console.log("[friction/modal] update", { len, okConfirm, okGrade, gradeInFlight });
    };

    ["input", "keyup", "change", "paste"].forEach((evt) => {
      textarea.addEventListener(evt, () => setTimeout(update, 0));
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !confirm.disabled) {
        e.preventDefault();
        confirm.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    });

    grade.addEventListener("click", async () => {
      if (gradeInFlight) return;
      gradeInFlight = true;
      grade.textContent = "grading…";
      grade.disabled = true;
      grading.style.display = "block";
      grading.innerHTML = '<div class="friction-grading-loading">asking claude…</div>';

      try {
        const result = await gradeReason(textarea.value.trim(), kind);
        gradeResult = result;
        renderGrade(grading, result);
        grade.textContent = "re-grade";
      } catch (err) {
        console.error("[friction/modal] grading failed", err);
        grading.innerHTML = `<div class="friction-grading-err">could not grade: ${escapeHtml(err.message || String(err))}</div>`;
        grade.textContent = "try again";
      } finally {
        gradeInFlight = false;
        update();
      }
    });

    confirm.addEventListener("click", () => {
      if (confirm.disabled) return;
      const reason = textarea.value.trim();
      close(true, reason, gradeResult);
    });

    btnRow.appendChild(cancel);
    btnRow.appendChild(grade);
    btnRow.appendChild(confirm);
    inner.appendChild(btnRow);

    const footer = document.createElement("div");
    footer.className = "friction-footer";
    footer.textContent = "friction · a refusal, not a feature";
    inner.appendChild(footer);

    root.appendChild(inner);
    document.body.appendChild(root);

    // Show grade button only if API key is set
    if (chrome?.storage?.local) {
      chrome.storage.local.get({ anthropicKey: "" }, ({ anthropicKey }) => {
        if (anthropicKey) {
          grade.style.display = "";
        }
      });
    }

    requestAnimationFrame(() => {
      root.classList.add("friction-visible");
      setTimeout(() => {
        textarea.focus();
        update();
      }, 120);
    });

    function close(didConfirm, reason, grading) {
      root.classList.remove("friction-visible");
      setTimeout(() => root.remove(), 240);
      if (didConfirm) onConfirm?.(reason ?? "", grading);
      else onCancel?.();
    }
  }

  function renderGrade(container, result) {
    const score = Math.max(0, Math.min(10, Number(result.score) || 0));
    const tier = score <= 3 ? "low" : score <= 6 ? "mid" : "high";
    container.innerHTML = `
      <div class="friction-grading-head">
        <div class="friction-grading-scorebox friction-grading-${tier}">${score}<span>/10</span></div>
        <div class="friction-grading-verdict">${escapeHtml(result.verdict || "")}</div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function gradeReason(reason, kind) {
    const { anthropicKey, anthropicModel } = await new Promise((resolve) => {
      chrome.storage.local.get({ anthropicKey: "", anthropicModel: "claude-haiku-4-5" }, resolve);
    });
    if (!anthropicKey) throw new Error("no API key");

    const prompt = buildGradingPrompt(reason, kind);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: anthropicModel || "claude-haiku-4-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    return parseGradingJson(text);
  }

  function buildGradingPrompt(reason, kind) {
    const action = kind === "comment" ? "commenting on" : "liking";
    return `You are grading the sincerity of a reason someone gave for ${action} an Instagram post. They are using a browser extension called Friction that forces them to justify social media engagement before it goes through. The whole point is to surface whether the engagement is genuine care or reflexive habit.

Their reason:
"${reason.replace(/"/g, '\\"')}"

Score 1-10 on: depth, honesty about their actual motivation (even if shallow), and whether it reflects real care or just habit/obligation. Be a tough grader. "idk" = 1. "i liked the composition of the photo and it reminded me of my grandma" = 8. Reward specificity and honesty, even if the honesty is that they are acting reflexively. Punish vagueness, empty affirmation, dismissiveness.

Respond with ONLY a single JSON object — no markdown, no prose, no code fences — in exactly this format:
{"score": <integer 1-10>, "verdict": "<one short blunt sentence, max 18 words, addressing the user directly as 'you'>"}`;
  }

  function parseGradingJson(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("model did not return JSON");
    const parsed = JSON.parse(match[0]);
    return {
      score: Number(parsed.score),
      verdict: String(parsed.verdict || "")
    };
  }

  function saveToDiary(kind, payload) {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get({ likeDiary: [] }, ({ likeDiary }) => {
      const entry = {
        timestamp: new Date().toISOString(),
        kind,
        ...payload
      };
      const next = [entry, ...likeDiary].slice(0, 100);
      chrome.storage.local.set({ likeDiary: next });
    });
  }

  window.__friction.showJustify = showJustify;
  window.__friction.saveToDiary = saveToDiary;

  console.log("[friction/modal] module loaded (with grading)");
})();
