# Friction

**Three small refusals, stacked.**

Instagram wants three things from me: my **attention**, my **approval**, and
my **voice**. Every interaction is engineered to make giving all three as
frictionless as possible. The scroll has no weight. The like is one tap.
The comment sends with one keystroke. You arrive without meaning to and
leave without noticing. This is not an accident — it is the point. The
less friction a platform has, the more of you it extracts before you
remember to spend yourself somewhere else.

Friction is a small Chrome extension that refuses each of the three
extractions, in a different way, at the moment it happens.

## 1. The scroll refuses my attention.

Every thirty seconds of active scrolling, the page fades to black. A
single line of text sits in the center. For four seconds, the continue
button is disabled. The lines are never answers; they are questions
about why I am still here. *Why are you about to do this? What were
you avoiding by opening this? Is this making your day better.* Four
seconds is approximately the length of a breath. Thirty seconds is
approximately the length of a Reel. The numbers are chosen, not optimal.

## 2. The like refuses my approval.

Every time I tap a heart, the extension un-taps it a few seconds later.
The platform counts the tap on the way in; the extension counts it back
out before the signal settles. My felt experience of liking remains — I
still tap. The algorithmic record of my approval becomes zero.

**If I try to like the same post a second time**, the extension does
not let it pass silently. A modal appears: *"why are you liking this?"*
I cannot proceed until I type a reason. If I cancel, the post stays
un-liked. The act of re-liking becomes a confession instead of a reflex.

## 3. The comment refuses my voice alone.

Every time I try to post a comment, the extension stops me and asks
*"why are you commenting this?"* A modal shows my draft back to me, and
I cannot send it until I type a reason. The comment itself is never
modified — it posts exactly as I wrote it, or not at all. The platform
extracts my voice; the extension extracts an account of why I gave it.

## A fourth optional refusal: the reason is graded.

If I paste my Anthropic API key into the extension's settings, every
justification modal gets a **grade this reason** button. When I click
it, Claude reads what I typed and scores it 1–10 for depth, honesty,
and whether it reflects real care. A one-line verdict comes back:
*"you are describing engagement as habit, not attention."* The score
does not block me from confirming — I can always proceed. But I have
now seen a second observer render a judgment on whether I actually
meant this. The reason and the grade are both saved to my private
local diary.

## What this is not

- Not a digital wellness tool. It is not trying to make me happier or
  more productive. It is trying to make my refusal legible.
- Not a bot. It intervenes on me, not on other accounts.
- Not a surveillance tool. No logs, no analytics, no telemetry. All
  state lives in `chrome.storage.sync` / `chrome.storage.local` on my
  machine. The only external call is the optional grading request to
  Anthropic, made only when I click the button, with my own API key.
- Not a blocker. I can always continue. The point is that continuing
  should cost me something, even a very small thing.

## Install

See [README](README.md). The code is fewer than 1300 lines of
JavaScript, CSS, and HTML, and meant to be read.

— *Friction · three refusals, not three features.*
