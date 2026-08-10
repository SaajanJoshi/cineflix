# Validation notes

The source package was checked before delivery with:

- `node --check` for every server-side `.mjs` module
- TypeScript's JavaScript/JSX parser across all `src/**/*.js`, `src/**/*.jsx`, and `vite.config.js`
- a mock OMDb flow covering direct title/year matching and exact TMDB-to-IMDb-ID fallback
- manual source review of movie playback, TV season/episode playback, origin-checked player messages, local Continue Watching, My List, search fallback and preview lifecycle

A full `npm install && npm run build` could not be completed in the packaging environment because its outbound npm installation timed out. No generated `node_modules` directory is included. Run `npm install` and `npm run build` on the target computer as described in `README.md`.


## v3.2 TV optimization validation

- Added viewport-managed image attachment/removal with a shared observer and shared legacy scroll fallback.
- TV cards request `w300` backdrops / `w342` posters instead of `w780` / `w500`.
- Hero and detail backgrounds are capped at `w1280` rather than `original`.
- Card action controls are mounted only for the active card.
- Card Tooltips were removed from repeated card trees.
- Search, detail and player modules are code-split with `React.lazy`.
- TV mode disables preview iframes and hero auto-rotation.
- D-pad navigation geometry is restricted to nearby elements.
- Elasticsearch is dynamically imported only when configured.
- General server cache is capped at 320 entries; OMDb persistent cache flush is capped at 1,200 entries.
- React StrictMode was removed from this appliance-style build to prevent duplicate development effects.
- Server `.mjs` files pass `node --check`.
- Frontend JSX/JS passed TypeScript parser syntax validation.
- Final Vite build could not be executed in the packaging environment because `npm install` timed out without installing dependencies.

## v3.3.0 Docker/ngrok validation

- `compose.yaml` parses as valid YAML and defines the `cineflix` service.
- `compose.ngrok.yaml` parses as valid YAML and defines the `ngrok` service.
- `server/index.mjs`, `server/config.mjs`, and `vite.config.js` pass `node --check`.
- Docker runtime dependencies were separated from frontend/build-only dependencies so the final image does not need React/MUI/Vite packages.
- `.dockerignore` excludes `.env`, caches, local modules, archives, and build artifacts from the Docker build context.
- The Dockerfile uses a build stage plus a non-root runtime stage and an HTTP health check.
- The ngrok service uses `NGROK_AUTHTOKEN` at runtime and does not bake credentials into an image or config file.
- ngrok inspector port 4040 is bound to `127.0.0.1` only.
- The local environment could not complete `npm install` before its execution timeout, so a full Docker image build could not be executed here. Run `docker compose up -d --build` on the target machine for the final build validation.
