# Paisaidee advert — source

Renders `out/paisaidee-advert.mp4` (1080x1920, 30fps, 17.5s, no audio) frame by frame.

    npm i playwright @fontsource/noto-sans-lao @fontsource/space-grotesk
    mkdir out
    node render.js          # needs ffmpeg on PATH
    node keys.js 2 9 12.6   # stills at those seconds, for checking

Edit the words in `COPY` at the top of frame.js (all Lao is unchecked — TODO(lao)),
including `url`, which is muan.pages.dev until paisaidee.app is bought.
Pins are the real venue coordinates from data/venues.json (pins.json).
The Tipsy Elephant card uses its real Friday hours (17:00–24:00); "650 m" is illustrative.
