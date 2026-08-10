# CineFlix v3.4.0 - Render Cloud Edition

This edition adds a Render-ready Dockerfile, `render.yaml` Blueprint, and a dedicated deployment guide while preserving the low-memory TV profile from v3.2/v3.3.

For Render deployment, start with **[RENDER_DEPLOY.md](RENDER_DEPLOY.md)**.

---

# CineFlix v3.2 — React + MUI streaming UI

A lightweight, TV-friendly streaming frontend built with React and Material UI. It combines catalog discovery, real ratings, fuzzy search, movies, TV seasons/episodes, hover previews, a watchlist, and local Continue Watching.

The visual language is inspired by familiar streaming-product patterns—cinematic hero artwork, content rails, Top 10 rows, card expansion, detail overlays, watchlists, and episode browsing—without copying Netflix, Prime Video, or Apple TV branding/assets.

## What is included

- Movies **and** TV series
- Separate Home, TV Shows, Movies, New & Popular, My List, and Search views
- Top 10 movies and series from weekly trends
- Top 10 Action, Comedy, Sci-Fi, and Horror movie rows
- Top 10 recent movie releases and new series
- Real IMDb and Rotten Tomatoes values through OMDb
- Correctly labelled TMDB score fallback when OMDb is not configured
- Elasticsearch fuzzy search across title, year, country, genre, and media type
- TMDB fallback search so the site still works before Elasticsearch is configured
- Muted hover/focus previews on standard and Top 10 cards using TMDB video metadata and YouTube embeds
- Full movie details, cast, creators/directors, maturity rating, recommendations, and trailers
- TV season selector, episode artwork/descriptions, and exact season/episode playback
- VidKing playback for movies and TV episodes
- My List saved in the browser
- Continue Watching and playback resume saved in the browser
- Remove from Continue Watching
- Autoplay-preview preference
- Keyboard/TV D-pad focus navigation
- Responsive layout for phones, computers, and large TVs

## API responsibilities

VidKing's documented interface is an embed/player interface. It accepts TMDB IDs for movie and TV playback, but its public documentation does not provide the catalog/search data required for posters, genres, recent releases, country filters, ratings, or Top 10 discovery.

This project therefore uses:

- **TMDB** — catalog, trending/discover lists, movies, TV shows, posters, backdrops, videos, details, seasons, episodes, cast, recommendations, and external IMDb IDs.
- **OMDb** — IMDb and Rotten Tomatoes rating values.
- **Elasticsearch** — optional fuzzy multi-field search.
- **VidKing** — movie and TV episode playback.

## Requirements

- Node.js 20.19+ or Node.js 22+
- A TMDB read-access token or API key
- An OMDb API key for actual IMDb/Rotten Tomatoes ratings
- Elasticsearch only when you want the full indexed search path

## Run on Windows

Open PowerShell in the extracted project folder:

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The React frontend runs on port `5173` and the Node API runs on port `8787`.

## Configure `.env`

At minimum, add a TMDB credential:

```env
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
```

For real IMDb and Rotten Tomatoes ratings, also add:

```env
OMDB_API_KEY=your_omdb_key
```

Keep these values in the root `.env` file. Do not place them in `src/` and do not prefix them with `VITE_`, because the API keys must stay server-side.

After changing `.env`, stop the current process with `Ctrl+C` and restart:

```powershell
npm run dev
```

## Fix or diagnose missing IMDb ratings

IMDb values are not supplied by TMDB or VidKing. They are fetched from OMDb. The application intentionally shows a labelled `TMDB` score rather than pretending that score is IMDb when OMDb is unavailable.

Run this after adding your key:

```powershell
npm run diagnose:ratings
```

Expected output begins with:

```text
OMDb is working.
```

You can also open this while the app is running:

```text
http://localhost:5173/api/ratings/diagnose
```

Common causes of missing ratings:

1. `OMDB_API_KEY` is empty or was added to the wrong file.
2. The OMDb activation email has not been confirmed.
3. The dev server was not restarted after editing `.env`.
4. The OMDb request allowance has been exhausted. The UI now reports this as a ratings warning.
5. OMDb has no Rotten Tomatoes value for that specific title. IMDb can still appear independently.

The card endpoint first tries an OMDb title/year/type lookup, then falls back to TMDB's exact external IMDb ID when the title lookup is not exact. The browser requests ratings in small progressive batches, so IMDb/RT badges on the first cards can appear before the remaining rails finish. Successful OMDb responses are cached in memory and in `.cache/omdb-ratings.json` for 24 hours, reducing repeated requests during development restarts.

## Elasticsearch search

The site functions without Elasticsearch by falling back to TMDB. To enable the full fuzzy index, configure:

```env
ELASTICSEARCH_NODE=https://your-elasticsearch-endpoint
ELASTICSEARCH_API_KEY=your_elastic_api_key
ELASTICSEARCH_INDEX=cineflix-media-v2
```

For the included local Docker service (security disabled), use only:

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=cineflix-media-v2
```

Basic-auth deployments can use `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD` instead of an API key.

Populate the index:

```powershell
npm run sync:search
```

Then restart the app. Search supports:

- fuzzy title and original-title matching
- exact year filtering
- country name or two-letter country code
- genre filtering
- Movies / TV Shows / All media type

The included Docker Compose file is suitable for local development. For a lightweight production server, a hosted/serverless Elasticsearch deployment is usually a better fit than running the Elasticsearch JVM on the same small machine.

## Hover and TV-focus previews

After any standard or Top 10 card remains hovered or focused for about 0.7 seconds, the app requests the title's videos from TMDB. It prefers scene-like clips, then trailers and teasers, and embeds the selected YouTube video muted. Preview playback is disabled when:

- the Previews switch is off
- the device reports data-saving mode
- reduced-motion is enabled
- no usable TMDB/YouTube clip or trailer exists

These are promotional clips/trailers referenced by TMDB—not extracted scenes from the VidKing stream. Static artwork remains visible when a preview is unavailable or blocked by the TV browser.

## TV series playback

TV details include a season selector and episode list. Selecting an episode opens:

```text
https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}
```

Movies open:

```text
https://www.vidking.net/embed/movie/{tmdbId}
```

Continue Watching stores the exact season and episode. VidKing progress messages are throttled before writing to localStorage so frequent player events do not cause unnecessary TV-browser work.

## Production

Build the frontend:

```powershell
npm run build
```

Start the API and serve the generated `dist/` directory:

```powershell
npm start
```

When `dist/` exists, the Express server serves the React application and API from the same process. For larger deployments, the static `dist/` files may instead be placed behind a CDN while the Node API remains private.

Set production origins as a comma-separated list when needed:

```env
WEB_ORIGIN=https://example.com,https://www.example.com
```

## Lightweight design choices

- Native horizontal scrolling instead of a carousel package
- No animation framework or client state-management framework
- Direct MUI component imports
- Lazy-loaded appropriately sized TMDB images
- Delayed previews that mount only for the active card, including Top 10 posters
- Shared in-browser preview lookup cache so duplicate titles across rails do not repeat API requests
- Preview opt-out, reduced-motion, and data-saver handling
- Debounced search
- In-memory API caching plus a small persistent OMDb rating cache
- Throttled playback-progress writes
- Static production frontend with a small Express API

## Updating from the earlier build

1. Keep a copy of your existing `.env`.
2. Replace the old project files with this version.
3. Copy your `.env` back into the project root.
4. Add `OMDB_API_KEY` if it was missing.
5. Run `npm install`.
6. Run `npm run diagnose:ratings`.
7. Run `npm run dev`.
8. When using Elasticsearch, confirm the index is `cineflix-media-v2` and run `npm run sync:search`.

## Research notes

See [`UX_RESEARCH.md`](./UX_RESEARCH.md) for the official Netflix, Apple TV, Prime Video, TMDB, OMDb and Elasticsearch references that informed the interaction design.

## Playback and advertising

This project embeds VidKing through its public player route. It does not inject code into the third-party iframe or attempt to alter third-party player advertising. For guaranteed ad-free playback, use a licensed source/player that you control or that contractually provides an ad-free embed.

## v3.1.1 blank-screen diagnostics

If the browser previously showed only the dark background, this build adds a visible boot screen and React error boundary. A startup failure will now stay visible instead of failing silently. It also guards browser storage access for restricted/private/TV browser modes and pins the frontend package versions used by this source.

On Windows PowerShell after extracting this version:

```powershell
node -v
npm install
npm run dev
```

Vite 7 requires Node.js 20.19+ or 22.12+. Then open `http://localhost:5173/api/health`; it should return JSON. If the UI still fails, the browser page itself will now show the React error message; F12 > Console contains the full stack trace.

## TV / low-memory mode (v3.2)

CineFlix now automatically enables a low-memory profile on common Smart TV user agents and constrained devices. You can force it from any browser with:

```text
http://YOUR_SERVER_IP:8787/?performance=tv
```

To force the full desktop profile instead:

```text
http://YOUR_SERVER_IP:8787/?performance=full
```

TV mode keeps the same catalog, search, details, episodes, My List, Continue Watching and VidKing playback, but changes expensive presentation work:

- card images use smaller TMDB image variants;
- card/episode images only receive a `src` near the viewport and are detached again when far away;
- hero/detail backdrops are capped at `w1280` instead of `original`;
- hover/focus YouTube preview iframes are disabled by default;
- hero auto-rotation is disabled;
- hidden movie-card action buttons are not mounted until the card is active;
- search, details and player code are lazy-loaded;
- TV navigation only measures nearby focus targets;
- blur and smooth-scroll effects are reduced;
- the client rating cache is bounded.

The server also uses bounded in-memory caching and dynamically imports the Elasticsearch SDK only when `ELASTICSEARCH_NODE` is configured.

### Recommended way to run on a TV

Do not use the Vite development server for normal TV viewing. Build the site once and let the lightweight Express server serve the static files and API:

```powershell
npm install
npm run build
npm run start:tv
```

Then open this from the TV browser, replacing the IP with the computer/NAS running CineFlix:

```text
http://192.168.1.50:8787/?performance=tv
```

`start:tv` caps the Node V8 old-generation heap at 256 MB. The browser/player still needs its own memory; VidKing playback itself runs inside a separate iframe controlled by the playback provider.

For development without the Node file watcher, use:

```powershell
npm run dev:lite
```

This uses less RAM than `npm run dev`, while retaining the Vite development server.

---

## Docker + ngrok deployment (v3.3.0)

This package now includes:

- `Dockerfile` — multi-stage production build.
- `compose.yaml` — low-memory CineFlix container with health check and persistent rating cache.
- `compose.ngrok.yaml` — optional ngrok agent connected to CineFlix through the internal Docker network.
- `.env.docker.example` — deployment environment template.
- `DOCKER_NGROK.md` — Windows/TV/ngrok commands and troubleshooting.

Quick Docker start:

```bash
docker compose up -d --build
```

Quick Docker + ngrok start after setting `NGROK_AUTHTOKEN` in `.env`:

```bash
docker compose -f compose.yaml -f compose.ngrok.yaml up -d --build
```

For a low-memory TV, append `?performance=tv` to either the LAN URL or the ngrok HTTPS URL.
