const FRICTION_PROMPTS = [
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

if (typeof window !== "undefined") {
  window.__FRICTION_DEFAULT_PROMPTS = FRICTION_PROMPTS;
}
