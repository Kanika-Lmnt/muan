# Phai (ໄຟ) — Paisaidee mascot

Colours are the app's night tokens: --flame #FF5A3C, --gold #FFC24B, --ink #131019.
viewBox 0 0 200 240; the flame's base sits at (100,228) so scale/squash from there.

- phai-idle.svg — animated (flicker + blink), honours prefers-reduced-motion
- phai-resting / looking-over / delighted / wink / cold — static poses
- phai.js — the builder: phai({eyes, mouth, look, tilt, sx, sy, cold, sparkle, sway})

Suggested mapping to heat: cold = cooled (no check-in for a while), resting = warm,
delighted = just checked in / burning, looking-over = empty states and loading, wink = share/end cards.
Holds up at 20px.
