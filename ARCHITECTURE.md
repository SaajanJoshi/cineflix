# CineFlix v3.2 architecture

## Product structure

The experience uses common, well-established streaming patterns:

1. A cinematic, edge-to-edge hero with immediate Play, More Info, and My List actions.
2. Horizontal discovery rails with large artwork and strong TV focus states.
3. Weekly Top 10 movie and series rows.
4. Dedicated Movies, TV Shows, New & Popular, My List, and Search destinations.
5. Delayed muted card previews instead of starting many videos at once.
6. A rich detail overlay with trailer/clip, synopsis, maturity information, cast, genres, recommendations, and actions.
7. TV season and episode browsing.
8. Continue Watching, resume position, and removal controls.

The implementation borrows product-level interaction principles rather than copying a service's logos, proprietary artwork, copy, or exact visual identity.

## System diagram

```text
TV / browser
    |
    | React + Material UI
    | - home rails and hero
    | - Movies / TV / Search / My List
    | - local Continue Watching
    | - hover/focus preview embeds
    v
Small Express API
    |-- TMDB
    |     catalog, trends, discover, images, videos,
    |     details, external IDs, seasons, episodes,
    |     cast and recommendations
    |
    |-- OMDb
    |     IMDb and Rotten Tomatoes values
    |
    |-- Elasticsearch (optional)
    |     fuzzy indexed search
    |
    +-- browser opens VidKing iframe
          movie or exact TV season/episode playback
```

## Frontend views

- `home` — mixed hero and all discovery rails
- `movies` — movie-only hero and movie rails
- `series` — TV-only hero and series rails
- `new` — trending, new movies, new series, and Top 10 rows
- `my-list` — locally saved titles
- `search` — title/year/country/genre/type search

The application keeps view state in React instead of adding a routing dependency. This keeps the bundle small for TV browsers while still presenting distinct destinations.

## Home catalog composition

TMDB requests are made in parallel and cached:

- weekly trending movies and TV shows
- Top 10 weekly movies
- Top 10 weekly series
- a ranked Top 10 of popular recent movies from approximately the last six months
- new/recent series
- Top 10 Action movies
- Top 10 Comedy movies
- Top 10 Sci-Fi movies
- Top 10 Horror movies
- popular Drama series
- popular Sci-Fi/Fantasy series

The labels explicitly describe TMDB weekly/popularity trends; they do not claim to be proprietary viewing figures from Netflix or another service.

## Ratings pipeline

### Card batches

The browser sends compact media summaries to `POST /api/ratings` in progressive batches of 12. This lets the first visible cards render IMDb/RT values without waiting for every rail.

For each title:

1. OMDb is queried by title, year, and media type. This normally needs one request.
2. The returned year is checked to avoid obvious title mismatches.
3. If the title lookup is missing or mismatched, the API fetches the exact IMDb ID from TMDB and looks it up in OMDb.
4. Successful results are cached in memory and in a small local JSON cache for 24 hours, so a dev-server restart does not immediately consume the same OMDb requests again.

### Detail pages

`GET /api/media/{movie|tv}/{tmdbId}` uses TMDB's exact external IMDb ID before requesting OMDb, maximizing accuracy for the selected title.

### Failure behavior

- With a working OMDb key: `IMDb` and `RT` badges are shown independently when available.
- Without OMDb: a clearly labelled `TMDB` community score is shown.
- The interface never relabels a TMDB score as IMDb.
- `npm run diagnose:ratings` tests the configured OMDb key.

## Search architecture

### Elasticsearch path

Indexed fields include:

- media type
- title and original title
- overview
- year and release/first-air date
- genres
- countries and country codes
- language
- popularity and TMDB score
- image paths
- external IMDb ID

Search uses fuzzy `multi_match` with title boosts plus exact filters for year, genre, media type, and country code/name.

### Fallback path

When Elasticsearch is not configured—or its index has no matching documents—the API uses TMDB multi-search/discover. This prevents search from becoming unusable during initial setup.

## Preview architecture

A standard or Top 10 card waits roughly 720 ms after pointer hover or TV focus. Only then does it request:

```text
GET /api/media/{type}/{tmdbId}/preview
```

The server filters TMDB videos to YouTube and ranks:

1. Clip
2. Trailer
3. Teaser
4. Featurette
5. Opening Credits
6. Behind the Scenes

Within the same type, official and English uploads are preferred. The browser mounts one muted `youtube-nocookie.com` iframe only for the active card and unmounts it when focus/hover leaves.

This avoids running a video on every card and keeps the experience practical on lower-power TVs.

## TV-series architecture

`GET /api/media/tv/{id}` returns:

- show metadata
- seasons
- creators/cast
- content rating
- preview videos
- recommendations

Selecting a season calls:

```text
GET /api/tv/{id}/season/{seasonNumber}
```

The player then receives the selected TMDB show ID, season, and episode. Continue Watching keys include all three values, so two episodes of the same show do not overwrite each other.

## VidKing integration

Movie playback:

```text
/embed/movie/{tmdbId}
```

TV playback:

```text
/embed/tv/{tmdbId}/{season}/{episode}
```

Player configuration includes colour, autoplay, episode selector, next episode, and saved progress. Parent-window `PLAYER_EVENT` messages are accepted only from the configured VidKing origin and only when the event content ID matches the active media.

Progress writes are throttled to important events or approximately five-second intervals. Entries at 95% or greater are removed from Continue Watching.

## API routes

```text
GET  /api/health
GET  /api/home
GET  /api/genres
GET  /api/media/:type/:id
GET  /api/media/:type/:id/preview
GET  /api/tv/:id/season/:season
POST /api/ratings
GET  /api/ratings/diagnose
GET  /api/search
```

The old `GET /api/ratings` and `GET /api/movie/:id` routes remain as compatibility paths.

## TV and performance decisions

- large, visible focus outlines
- D-pad spatial navigation
- no heavy carousel package
- native scroll rails
- no continuous background animations
- one active card preview at a time
- image lazy loading and async decoding
- server-side secrets
- cached API responses
- throttled localStorage writes
- no account/database requirement for My List or Continue Watching

## External service limitation

VidKing is treated as playback, not catalog truth. TMDB is treated as discovery metadata, OMDb as the external ratings source, and Elasticsearch as the optional search index. This separation is required because no single documented service in this stack supplies all four responsibilities.
