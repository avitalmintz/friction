const DEFAULT_PROMPTS = [
  "why are you about to do this?",
  "you will not remember any of the last thirty seconds tomorrow.",
  "this took you 0.3 seconds to reach for.",
  "the app is counting this as dwell time.",
  "what were you about to feel better about?",
  "the people in these posts are working.",
  "you have been here longer than you meant to.",
  "this pause is a design choice. so was the scroll.",
  "name one thing you learned from this feed today.",
  "what if you closed the app.",
  "this screen is rented space in your attention.",
  "you are currently the product.",
  "pick one post to remember. you will forget the rest.",
  "the feed will still be here tomorrow.",
  "what were you avoiding by opening this?",
  "is this making your day better.",
  "blink.",
  "the ads are performing very well.",
  "you have permission to be bored.",
  "a minute ago you were going to do something else."
];

const SYNC_DEFAULTS = {
  enabled: true,
  scrollWindowMs: 30000,
  pauseSeconds: 4,
  prompts: DEFAULT_PROMPTS,
  revokeLikes: true,
  revokeDelayMs: 2000,
  justifyComments: true
};

const LOCAL_DEFAULTS = {
  anthropicKey: "",
  anthropicModel: "claude-haiku-4-5"
};

function load() {
  chrome.storage.sync.get(SYNC_DEFAULTS, (stored) => {
    document.getElementById("enabled").checked = stored.enabled;
    document.getElementById("scrollWindow").value = Math.round(stored.scrollWindowMs / 1000);
    document.getElementById("pauseSeconds").value = stored.pauseSeconds;
    document.getElementById("prompts").value = (stored.prompts || DEFAULT_PROMPTS).join("\n");
    document.getElementById("revokeLikes").checked = stored.revokeLikes;
    document.getElementById("revokeDelay").value = Math.round(stored.revokeDelayMs / 1000);
    document.getElementById("justifyComments").checked = stored.justifyComments;
  });
  chrome.storage.local.get(LOCAL_DEFAULTS, (local) => {
    document.getElementById("anthropicKey").value = local.anthropicKey || "";
    document.getElementById("anthropicModel").value = local.anthropicModel || "claude-haiku-4-5";
  });
}

function save() {
  const enabled = document.getElementById("enabled").checked;
  const scrollWindowSec = Math.max(5, Number(document.getElementById("scrollWindow").value) || 30);
  const pauseSeconds = Math.max(1, Number(document.getElementById("pauseSeconds").value) || 4);
  const promptLines = document
    .getElementById("prompts")
    .value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const revokeLikes = document.getElementById("revokeLikes").checked;
  const revokeDelaySec = Math.max(1, Number(document.getElementById("revokeDelay").value) || 2);
  const justifyComments = document.getElementById("justifyComments").checked;
  const anthropicKey = document.getElementById("anthropicKey").value.trim();
  const anthropicModel = document.getElementById("anthropicModel").value || "claude-haiku-4-5";

  chrome.storage.sync.set({
    enabled,
    scrollWindowMs: scrollWindowSec * 1000,
    pauseSeconds,
    prompts: promptLines.length ? promptLines : DEFAULT_PROMPTS,
    revokeLikes,
    revokeDelayMs: revokeDelaySec * 1000,
    justifyComments
  });
  chrome.storage.local.set({ anthropicKey, anthropicModel }, () => {
    const saved = document.getElementById("saved");
    saved.classList.add("visible");
    setTimeout(() => saved.classList.remove("visible"), 1200);
  });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadDiary() {
  const list = document.getElementById("diary-list");
  if (!list) return;
  chrome.storage.local.get({ likeDiary: [] }, ({ likeDiary }) => {
    if (!likeDiary.length) {
      list.innerHTML =
        '<div style="padding:16px;color:var(--muted);font-size:13px;">No entries yet. You will see your justifications here after you re-like a revoked post or post a comment.</div>';
      return;
    }
    list.innerHTML = likeDiary
      .map((entry) => {
        const date = new Date(entry.timestamp);
        const timeLabel = date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
        const kind = entry.kind || (entry.comment ? "comment" : "like");
        const kindLabel = kind === "comment" ? "comment" : "like";
        const contextLine =
          kind === "comment"
            ? entry.comment || ""
            : entry.postId
            ? entry.postId.replace(/^(p|reel):/, "")
            : "";
        const contextHtml = escapeHtml(contextLine);
        const reasonHtml = escapeHtml(entry.reason);
        const gradingBlock = entry.grading
          ? `<div style="margin-top:6px;display:flex;align-items:center;gap:8px;font-size:12px;">
               <span style="display:inline-block;background:rgba(224,90,62,0.12);color:var(--coral);padding:2px 8px;border-radius:999px;font-weight:600;">${Number(entry.grading.score)}/10</span>
               <span style="color:var(--muted);font-style:italic;">${escapeHtml(entry.grading.verdict)}</span>
             </div>`
          : "";
        const contextBlock =
          kind === "comment" && contextLine
            ? `<div style="font-size:13px;color:var(--muted);font-style:italic;margin:6px 0 6px;padding-left:10px;border-left:2px solid var(--hair);">"${contextHtml}"</div>`
            : "";
        const headerContext =
          kind !== "comment" && contextLine ? ` · ${contextHtml}` : "";
        return `
          <div style="padding:14px 16px;border-bottom:1px solid var(--hair);">
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--coral);margin-bottom:4px;">${timeLabel} · ${kindLabel}${headerContext}</div>
            ${contextBlock}
            <div style="font-size:14px;line-height:1.5;color:var(--ink);">${reasonHtml}</div>
            ${gradingBlock}
          </div>`;
      })
      .join("");
  });
}

function clearDiary() {
  if (!confirm("Clear all diary entries? This cannot be undone.")) return;
  chrome.storage.local.set({ likeDiary: [] }, loadDiary);
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("clearDiary")?.addEventListener("click", clearDiary);
document.addEventListener("DOMContentLoaded", () => {
  load();
  loadDiary();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.likeDiary) loadDiary();
});
