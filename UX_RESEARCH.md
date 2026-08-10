# Streaming UI/UX research and implementation map

Research checked on August 10, 2026. The project uses interaction patterns common to major streaming products, but keeps its own CineFlix name and visual identity.

## Netflix patterns reviewed

Official references:

- Autoplay preview preference: https://help.netflix.com/en/node/2102
- My List: https://help.netflix.com/en/node/10523
- New and Top 10 discovery: https://help.netflix.com/en/node/14422
- Current Netflix TV navigation update: https://help.netflix.com/en/node/321880164349028
- Autoplay next episode: https://help.netflix.com/en/node/121518

Patterns translated into CineFlix:

- edge-to-edge cinematic hero
- immediate Play and More Info actions
- horizontal content rails
- ranked Top 10 artwork
- My List
- muted preview autoplay with an on/off preference
- next-episode support for series
- separate movie and TV discovery experiences

CineFlix does not copy Netflix logos, proprietary artwork, recommendation scores, wording, or exact screen layouts.

## Apple TV patterns reviewed

Official references:

- Home, featured items and Continue Watching: https://support.apple.com/guide/tvapp/start-watching-on-the-home-screen-atvb05f2070b/web
- Watchlist, episodes, trailers, related items and details: https://support.apple.com/en-ca/guide/tvapp-mac/atv7bf64f99/mac

Patterns translated into CineFlix:

- Continue Watching as a high-priority home row
- watchlist-style My List
- rich title detail overlay
- season and episode browsing
- trailer/clip presentation
- related-title recommendations
- prominent featured-content area

## Prime Video patterns reviewed

Official references:

- Updated navigation and discovery experience: https://www.aboutamazon.com/news/entertainment/prime-video-updated-steaming-experience
- Rich cinematic carousels and Top 10 chart: https://www.aboutamazon.com/news/entertainment/prime-video-makes-it-easier-to-find-your-favorite-content

Patterns translated into CineFlix:

- clear Home, Movies and TV Shows destinations
- content-forward hero and rails
- richer artwork-led cards
- Top 10 discovery rows
- quick access to title details and playback

## Metadata, preview and search sources

- TMDB API overview: https://developer.themoviedb.org/docs/getting-started
- TMDB movie videos: https://developer.themoviedb.org/reference/movie-videos
- TMDB TV-series details: https://developer.themoviedb.org/reference/tv-series-details
- TMDB search workflow: https://developer.themoviedb.org/docs/search-and-query-for-details
- OMDb API: https://www.omdbapi.com/
- Elasticsearch multi-match query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch fuzziness: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options

Implementation decisions:

- TMDB supplies movies, series, artwork, trends, details, seasons, episodes, recommendations, external IDs and video metadata.
- OMDb supplies genuine IMDb and Rotten Tomatoes values when `OMDB_API_KEY` is configured.
- Elasticsearch supplies optional fuzzy, boosted multi-field search with exact filters.
- VidKing remains the movie/episode playback provider.
- Hover/focus previews use promotional clips, trailers or teasers referenced by TMDB and hosted by YouTube. They are not extracted from the VidKing stream.

## TV and lightweight-device decisions

- one active preview at a time
- 720 ms preview delay to avoid accidental network work
- preview opt-out plus reduced-motion and data-saver checks
- native scrolling rather than a carousel library
- large focus outlines and D-pad navigation
- lazy-loaded images
- progressive IMDb/Rotten Tomatoes batches so the first visible cards do not wait for every rail
- cached TMDB and OMDb calls
- throttled Continue Watching writes
- no account database required
