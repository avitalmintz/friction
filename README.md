# Friction


> **This is a class project.** Built for *Conscious Media* (Week 4:
> Social Media Subversion). It is real code that really works, but it
> is not polished production software — expect rough edges. The point
> is the intervention, not the product.


## What it does

Three stacked interventions, all running only on `instagram.com`:

1. **Scroll pause.** Every 20 seconds of active scrolling, the screen
   fades to a dark overlay with a single rotating prompt. You cannot
   dismiss it for 2 seconds.
2. **Like revocation.** When you tap a heart, the extension silently
   un-taps it 2 seconds later. Your felt engagement stays; your
   engagement *signal* goes to zero. If you try to re-like the same
   post, a modal intercepts you and demands a written reason before
   the like will register this time.
3. **Comment justification.** Every time you try to post a comment, a
   modal intercepts it: *"why are you commenting this?"* You must type
   a reason before the comment sends. Your comment is not modified —
   it posts exactly as you wrote it. Your reason is saved to a private
   local diary. Cancel keeps the draft in the box, unsent.

### Optional: AI grading

If you paste an Anthropic API key into the extension's Options page,
both justification modals grow a **grade this reason** button. Click
it and Claude scores your reason 1–10 for depth, honesty, and whether
it reflects real care, with a one-line verdict. The score does not
block confirmation — it just asks you to see yourself. Score + verdict
are saved to the diary alongside the reason.

The grading call is the only network request this extension ever
makes, it happens only when you click the button, and it uses your
own API key.

Every number and every string above is configurable in the extension's
Options page. Every intervention has its own on/off toggle.

## Install (unpacked)

1. Clone or download this folder.
2. Open Chrome and visit `chrome://extensions/`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**. Select the `friction/` folder.
5. Open [instagram.com](https://www.instagram.com/). Scroll for thirty
   seconds — the overlay will appear. Tap a like — watch it disappear.
   Try to like it again — the justification modal appears.

To configure: click the Friction icon in Chrome's toolbar → Options.

To enable grading: in Options, paste an Anthropic API key
(`console.anthropic.com/settings/keys`) and pick a model. Save.

## File layout

```
friction/
├── manifest.json                Chrome MV3 manifest
├── MANIFESTO.md                 why this exists
├── README.md                    install + modify
├── icons/                       extension icons
└── src/
    ├── prompts.js               default scroll-pause prompts
    ├── modal.js                 shared justify modal + AI grading
    ├── content.js               scroll timer + overlay
    ├── like-revoke.js           click/dblclick/mutation → auto-undo + re-like modal
    ├── comment-justify.js       intercept submit → justify modal
    ├── overlay.css              overlay + toast + modal styles
    ├── options.html             settings UI
    └── options.js               settings + diary viewer
```

## What it stores

**Synced (`chrome.storage.sync`)**: `enabled`, `scrollWindowMs`,
`pauseSeconds`, `prompts`, `revokeLikes`, `revokeDelayMs`,
`justifyComments`.

**Local only (`chrome.storage.local`)**: `anthropicKey`,
`anthropicModel`, `likeDiary`.

The API key never leaves your browser and is never synced across
devices.

## Warnings, because this is a real intervention

- **Use it on an account you own.** Every intervention acts on your
  account. The comment justification does not modify your words, but
  the like revocation and scroll pause both produce visible effects.
- **Rapid un-liking on a large account might trip Instagram's bot
  detection.** On a normal-volume account it will not. On a burner,
  neither will matter.
- **Selector-dependent.** Instagram changes DOM labels occasionally.
  If a piece stops working, the most likely fix is updating the
  `aria-label` list in `like-revoke.js` or the input heuristics in
  `comment-justify.js`. See the in-console `[friction/…]` logs.
- **AI grading costs money.** Each call is one Claude request. On
  `claude-haiku-4-5` it's a tenth of a cent per grade. Leaving the key
  blank disables grading entirely.

## Extend it

- Add `"https://www.tiktok.com/*"` or `"https://twitter.com/*"` (or
  `"https://x.com/*"`) to `matches` / `host_permissions` in
  `manifest.json` to run the scroll pause on other sites. The like
  revocation and comment justification are Instagram-specific as
  written.

## Built with

Vibe-coded with Claude. See the manifesto for the argument.

## License

MIT. Fork it. Rewrite the prompts. Replace the modals. Make your own
refusals.
