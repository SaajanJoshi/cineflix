# CineFlix v3.2 TV memory optimization

## What was consuming memory

The previous UI could create more than one hundred movie-card trees on the Home page. Each card could reference a `w780` TMDB backdrop, and browsers often keep decoded image surfaces in memory. A 780x439 image is roughly 1.3 MB as a 32-bit decoded surface before browser overhead, even when its downloaded JPEG/WebP is much smaller. Long pages can therefore consume substantially more RAM than the network transfer size suggests.

Other avoidable costs were the always-mounted card action controls/tooltips, `original` hero/detail images, YouTube preview iframes, hero rotation, full-page remote-navigation geometry scans, and the Elasticsearch client being loaded by the Node process even when Elasticsearch was not configured.

## Changes in v3.2

1. **Viewport-managed images** — `SmartImage` uses one shared `IntersectionObserver`. Card and episode image `src` attributes exist only near the viewport and are removed again when far away.
2. **Smaller TV images** — TV mode uses `w300` backdrops, `w342` posters and `w300` episode stills. Hero/detail backdrops use `w1280` rather than `original`.
3. **Preview protection** — autoplay card/detail previews are disabled automatically in TV mode. Desktop users retain hover previews. `?performance=full` overrides this.
4. **Less movie-card DOM** — action buttons are only mounted for the active non-ranked card. Per-card MUI Tooltip components were removed.
5. **Code splitting** — Search, Details and Player modules are loaded only when used.
6. **Idle work reduction** — TV mode stops hero auto-rotation and uses non-animated scrolling where possible.
7. **Remote-navigation optimization** — D-pad navigation calculates geometry only for focusable elements near the current viewport.
8. **Bounded frontend rating state** — rating entries are capped to prevent repeated searches from growing state indefinitely.
9. **Bounded server cache** — the general in-memory cache is capped at 320 entries and expired entries are pruned.
10. **Smaller persistent rating cache** — the OMDb disk cache retains up to 1,200 recent entries when flushed.
11. **Lazy Elasticsearch SDK** — `@elastic/elasticsearch` is imported only if an Elasticsearch endpoint is configured.
12. **Production TV command** — `npm run start:tv` starts only Express and caps the Node old-generation heap at 256 MB.

## Modes

Automatic TV detection covers common Smart TV/browser strings such as Tizen, webOS, HbbTV, BRAVIA, Viera, Roku, Fire TV and Google TV. Constrained CPU/memory and coarse no-hover devices also select TV mode.

Force TV mode:

```text
?performance=tv
```

Force desktop/full mode:

```text
?performance=full
```

## Recommended deployment

Run the server on a PC, mini PC, NAS, Raspberry Pi-class host or VPS. The television should only open the site in its browser; it does not need Node/npm installed.

```powershell
npm install
npm run build
npm run start:tv
```

Open from the television:

```text
http://SERVER-LAN-IP:8787/?performance=tv
```

If the TV browser is very old, disabling card previews and using the TV profile is especially important. VidKing playback memory is outside CineFlix's React component tree because it is a third-party iframe.
