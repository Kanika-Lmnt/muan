# How assets/icon-192.png, icon-512.png and og-default.png were made

No build step (CLAUDE.md), so these are not generated at deploy time — they
are checked-in PNGs, and this folder is the recipe for regenerating them if
`assets/logo.svg` or the wordmark ever changes.

`icon.html` and `og.html` are the two pages. Both inline a copy of
`assets/logo.svg` rather than `<img src>`-ing it, because headless Chrome
screenshots the first frame and an external SVG does not reliably paint in
time (measured: a 538-byte all-ink 192px capture, every time). If
`assets/logo.svg` changes, paste the new markup into both pages before
re-rendering.

```sh
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"

# 512 icon
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=3000 --window-size=512,512 \
  --screenshot=../../assets/icon-512.png icon.html

# 192 icon. --window-size=192,192 lays out blank on Windows (the window has a
# minimum size), so render the same 512 box at a 0.375 device scale instead —
# that produces a real 192x192 file.
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=0.375 \
  --virtual-time-budget=3000 --window-size=512,512 \
  --screenshot=../../assets/icon-192.png icon.html

# 1200x630 share card. Needs network: Space Grotesk and Noto Sans Lao come
# from Google Fonts, same two families as the app.
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=8000 --window-size=1200,630 \
  --screenshot=../../assets/og-default.png og.html
```

Design constraints baked into `icon.html`, worth keeping if it is edited:

- Full-bleed Ink #131019, not transparent. Android composites a transparent
  icon onto white, which puts a flame-orange pin on white — off-brand and
  low contrast against the rest of the home screen.
- The pin is 60% of the canvas height, centred. That keeps it inside the
  maskable safe zone (the centred circle of 80% diameter): the pin's box is
  49% x 60% of the canvas, so the circle through its corners is 77.5% across.
  This is why `manifest.webmanifest` can honestly declare `"purpose": "any
  maskable"` — shrink the pin's share of the canvas and that stays true;
  grow it past ~62% and it stops being true and the purpose must change.
