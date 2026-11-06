# Paisaidee as a phone app

This folder turns the Paisaidee website into a real phone app with
[Capacitor](https://capacitorjs.com). The website itself is unchanged: it
still deploys from the repo root with no build step. Everything app-only
lives in here.

## How it works (read this once)

A Capacitor app is a small native app (Java/Kotlin on Android, Swift on
iPhone) whose whole screen is one **WebView**: the phone's own browser
engine, with no address bar. Inside it runs our normal HTML, CSS and JS.

```
┌──────────── the phone app ────────────┐
│  native shell (Capacitor)             │      the internet
│  ┌─────────────────────────────────┐  │
│  │ WebView                         │  │   /api/... (fetch)
│  │  index.html, js/, css/, assets/ ├──┼──────────────────► muan.pages.dev
│  │  (a copy, packed in the app)    │  │                    (later paisaidee.app)
│  └─────────────────────────────────┘  │                    Functions + D1
│  plugins: GPS, share, push… (later)   │
└───────────────────────────────────────┘
```

Three things follow from that picture, and they explain every change made
for the app:

1. **The pages are inside the app; the data is not.** `build-www.mjs`
   copies the website into `www/`, and Capacitor packs `www/` into the
   app. Venues, check-ins and your profile still come from the server.
   The bundled `data/venues.json` goes in too, so the app still shows
   places when the server can't be reached.
2. **The app lives at a different address from the server.** Inside the
   app the page's address is `https://localhost` (Android) or
   `capacitor://localhost` (iPhone), not muan.pages.dev. So:
   - every `/api/...` call has to name the server. `build-www.mjs` writes
     `window.PSD_SERVER` into the app's copy of index.html, and `apiFetch()`
     in js/app.js puts it in front of each call. On the website
     PSD_SERVER isn't set and nothing changes.
   - the browser asks the server first whether a different site may talk
     to it. That's **CORS**. functions/api/_middleware.js answers yes, but
     only for the two app addresses (`APP_ORIGINS` in functions/api/_auth.js).
3. **The sign-in cookie doesn't work across sites.** Browsers never send
   the website's `psd_session` cookie from a different address. So the app
   gets its session as a **token**. On sign-in, /api/auth/google returns
   the token (only to the app). The app stores it and sends
   `Authorization: Bearer <token>` with every call. The server accepts
   either the cookie or the token, from the same sessions table.

Shared links (a venue, the wheel, the monthly recap) use `SITE_ORIGIN`,
which is the real website. `https://localhost` would mean nothing to
whoever you send it to.

## What's in this folder

| File | What it is |
|---|---|
| `package.json` | The app's Node packages (Capacitor) and the `npm run` shortcuts |
| `capacitor.config.js` | The app's name, its ID (`app.paisaidee`), and where its web files are |
| `build-www.mjs` | Makes `www/` from the website and writes in the server address |
| `assets/` | The app icon and splash screen sources. `npm run icons` makes every size Android needs from them |
| `www/` | Made by the build. Don't edit it, it's not in git |
| `android/` | The native Android project. You create it once (step 4 below), then commit it |
| `ios/` | The same for iPhone, later. Needs a Mac or a cloud build |

`app/` is kept off the public website by functions/_middleware.js and
_routes.json. Cloudflare deploys the whole repo, so without that every
file in here would be downloadable.

## One-time setup (Windows)

1. **Node 22 or newer.** In a terminal, `node -v`. If it's below v22,
   install the current LTS from nodejs.org.
2. **Android Studio**, with the Standard setup (SDK + emulator).
3. Install the packages:
   ```
   cd D:\muan-phase1\app
   npm install
   ```
4. Create the Android project:
   ```
   npm run build
   npx cap add android
   ```
   This makes the `android/` folder from Capacitor's template. It's real
   native code, and you'll edit it now and then, so it goes in git.
5. Let the app ask for location. Open
   `android\app\src\main\AndroidManifest.xml` and add these two lines
   right under the existing `INTERNET` permission line:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   ```
   Without them the app can't ask for GPS, and "near me" sorting and
   check-ins have no position. Android then shows its own permission
   prompt the first time the app asks.

## Running it

```
npm run sync          # rebuild www/ and copy it into the native project
npx cap open android  # opens the project in Android Studio
```

The first time, in Android Studio:
- Wait for **Gradle sync** to finish (bottom status bar). The first one
  downloads a lot and can take 5–10 minutes.
- **Device Manager** (phone icon on the right) → **+** → **Create Virtual
  Device** → a Pixel → the newest system image (download it) → Finish.
- Press the green **Run ▶**. The emulator boots and the app opens.

After that, the loop is: change the website files at the repo root, then
`npm run sync`, then Run ▶ again. `sync` = build + `cap sync`, which copies
`www/` into the app and updates native plugins. When only web files
changed, `npx cap copy android` is enough.

### Which server the app talks to

| Command | Server | Use it for |
|---|---|---|
| `npm run build` | https://muan.pages.dev | Normal builds |
| `npm run build -- --server https://paisaidee.app` | Your domain | Once it's bought and attached |
| `npm run build:local` | wrangler on this laptop | Testing API changes before they're deployed |

Run `npx cap sync android` after any of them.

Two things to know right now:
- **muan.pages.dev is blocked on your network.** The emulator uses your
  laptop's connection, so it's blocked there too. The app then falls back
  to the bundled venue list, so it still shows everything except live
  data (weather, your profile, check-ins).
- **The CORS and token changes are on this branch, not live yet.** Until
  this branch is merged and deployed, the live server refuses the app's
  API calls (also falls back to the bundled list).

To see the real API working before both are sorted, run the server
locally:
```
# terminal 1, at the repo root
npx wrangler pages dev . --d1 DB=muan-db
# terminal 2, in app/
npm run build:local
npx cap sync android
```
then Run ▶. `10.0.2.2` is the emulator's name for "the laptop I'm running
on". The local database starts empty, so venues still come from the
bundle unless you load data into it. `build:local` also turns on two
Android switches that let an https app page call a plain-http server
(cleartext + mixed content). Release builds never get them.

### Seeing inside the app (debugging)

With the app running in the emulator, open Chrome on your laptop and go
to `chrome://inspect`. The app's WebView is listed there. Click
**inspect** and you get normal DevTools: console, network, elements. The
`[muan]` log lines show up there. This is the single most useful tool for
app work.

## What works and what doesn't yet

Works: everything you can do signed out on the website. That covers
browsing, the map, search, Open now, the wheel, Saved (stored on the
phone), sharing, the intro, and the location ask.

Not yet:
- **Signing in.** Google blocks its web sign-in inside app WebViews
  (`disallowed_useragent`). The app needs Google's native sign-in plugin
  (stage 3). The You tab says "coming soon" instead of showing a button
  that can't work. The server half is already done: the plugin returns
  the same kind of Google ID token the website gets, /api/auth/google
  checks it the same way, and the app keeps the token it gets back.
- **Opening shared links in the app.** Links still open the website.
  That's "deep links", later.
- **Push notifications.** Later. iPhone push needs the paid Apple account.

## Stage 2: making it feel like an app

Three things a wrapped website gets wrong, and how each is fixed:

**The icon and the splash screen.** A new Capacitor app has Capacitor's
blue icon. `assets/` holds our sources: the flame pin on night ink for
the icon, and the pin on cream for the splash (the screen while the app
starts). One phone screen needs the icon at five sizes, and Android 8+
also uses **adaptive icons**: a foreground and a background layer that
each phone maker crops to its own shape (circle, squircle…) and can
animate. That's why there are three icon files. `icon-foreground.png`
keeps the pin small enough to survive any crop. Run:
```
npm run icons
```
It writes all 74 files into `android/app/src/main/res/`. Commit them.
Change a source image, run it again.

Android 12+ draws its own splash (the app icon on a background colour),
so tell it the colour. In `android/app/src/main/res/values/styles.xml`,
inside `<style name="AppTheme.NoActionBarLaunch" ...>`, add:
```xml
<item name="windowSplashScreenBackground">#FFFCF5</item>
```

**The status bar.** Android picks dark or light clock/battery icons from
the *phone's* dark-mode setting, not the app's theme. So a phone in dark
mode would draw light icons on our cream screen, and they'd vanish.
`nativeBars()` in js/app.js tells Android which to use whenever the theme
changes, via Capacitor's built-in **SystemBars** plugin. (The app drawing
under the status bar, "edge to edge", is normal on Android 15+. The
website's `env(safe-area-inset-*)` CSS already keeps content clear of it.)

**The back button.** Android's back gesture is a big part of how people
move around. A WebView can only go back through browser history, and only
venue pages make history entries, so on Map or You "back" just closed the
app. `initNativeBackButton()` in js/app.js uses the **@capacitor/app**
plugin to make back undo the last thing, in this order:
1. a photo viewer, the wheel or the mood picker → closes it
2. the intro → the previous page (never a surprise skip)
3. a venue or any other detail page → its own back button
4. the Map or You tab → Home
5. Home → the app goes to the background (Android's normal behaviour)

Both features are invisible on the website: `NATIVE` is null there.

After pulling stage 2 changes:
```
npm install
npm run icons
npm run sync
```
then Run ▶. `npm install` brings in the two new packages, and `sync` tells
the Android project about the new plugin. Native plugins need a full
Run ▶, not just a copy.

## The road from here

1. **This branch.** The code is app-ready and the Android project runs in
   the emulator.
2. **Polish in the emulator.** Icon, splash, status bar, back button
   (done, see above). Learn chrome://inspect.
3. **Native plugins.** Google sign-in, geolocation via the Capacitor
   plugin (better prompts), the native share sheet, then push.
4. **The domain.** paisaidee.app attached in Cloudflare. Build with
   `--server https://paisaidee.app`. Add it to the Google OAuth origins.
5. **iPhone.** Apple Developer account (US$99/yr). `npx cap add ios`.
   Cloud builds on Codemagic or GitHub Actions (no Mac needed). TestFlight
   public link for testers. Note: iOS stores the token in WebView storage,
   which iOS can clear under storage pressure. Before release, move it to
   `@capacitor/preferences` (native storage).

## Troubleshooting

- **The emulator says hardware acceleration isn't available.** Windows
  Settings → "Turn Windows features on or off" → tick **Windows Hypervisor
  Platform** → restart. VMware Workstation 17 runs alongside it.
- **White screen in the app.** Open chrome://inspect and read the console.
  It's usually a JS error, or `www/` was never built (run `npm run sync`).
- **`npx cap ...` says it can't find a config or the web assets.**
  You're in the repo root. Capacitor commands always run from `app/`.
- **API calls fail in chrome://inspect with a CORS error.** The server
  you built for doesn't have this branch's changes (see above).
