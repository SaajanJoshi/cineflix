import { lazy, Suspense, useEffect, useMemo, useState, useRef } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { api } from './api/client.js';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';
import { useLibrary } from './hooks/useLibrary.js';
import { useTvNavigation } from './hooks/useTvNavigation.js';
import { performanceProfile } from './lib/performance.js';
import AppHeader from './components/AppHeader.jsx';
import Hero from './components/Hero.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieRail from './components/MovieRail.jsx';

const SearchView = lazy(() => import('./components/SearchView.jsx'));
const DetailsDialog = lazy(() => import('./components/DetailsDialog.jsx'));
const PlayerDialog = lazy(() => import('./components/PlayerDialog.jsx'));

function uniqueMedia(rails = []) {
  const map = new Map();
  rails.forEach((rail) => (rail.media || rail.movies || []).forEach((item) => {
    const media = item.media || item;
    map.set(media.key || `${media.mediaType}:${media.id}`, media);
  }));
  return [...map.values()];
}

function filterRail(rail, mediaType) {
  const items = (rail.media || []).filter((item) => item.mediaType === mediaType);
  return { ...rail, media: items, ranked: rail.ranked && items.length <= 10 };
}

async function loadRatingsProgressively(items, onBatch, isLive, limit = 80) {
  const unique = [...new Map(items
    .filter((item) => item?.id && item?.mediaType)
    .map((item) => [item.key || `${item.mediaType}:${item.id}`, item])).values()]
    .slice(0, limit);

  // A small first response makes IMDb/RT badges appear quickly. Later batches
  // fill the remaining rails without blocking the whole page on dozens of
  // external OMDb requests.
  for (let offset = 0; offset < unique.length; offset += 12) {
    const data = await api.ratings(unique.slice(offset, offset + 12));
    if (!isLive()) return;
    onBatch(data);
  }
}

function mergeRatingsCapped(current, incoming, limit = 180) {
  const entries = new Map(Object.entries(current || {}));
  for (const [key, value] of Object.entries(incoming || {})) {
    if (entries.has(key)) entries.delete(key);
    entries.set(key, value);
  }
  while (entries.size > limit) entries.delete(entries.keys().next().value);
  return Object.fromEntries(entries);
}

function CatalogGrid({ title, subtitle, items, ratingsById, onOpen, onPlay, onToggleSaved, isSaved, previewsEnabled }) {
  return (
    <Box component="main" sx={{ pt: { xs: 16, lg: 12.5 }, px: { xs: 2, md: 5 }, pb: 9, minHeight: '100vh' }}>
      <Typography component="h1" sx={{ fontSize: { xs: '2.2rem', md: '3.7rem' }, fontWeight: 950, letterSpacing: '-.06em' }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: .5 }}>{subtitle}</Typography>
      {!items.length ? (
        <Box sx={{ mt: 7, py: 5, borderTop: '1px solid rgba(255,255,255,.09)' }}>
          <Typography sx={{ fontSize: '1.2rem', fontWeight: 850 }}>Nothing here yet</Typography>
          <Typography color="text.secondary" sx={{ mt: .7 }}>Add titles with the plus button and they will appear here.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(3,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 2.2, md: 2.7 }, mt: 3.2 }}>
          {items.map((media) => (
            <Box key={media.key || `${media.mediaType}:${media.id}`} sx={{ minWidth: 0, '& > div': { width: '100%' } }}>
              <MovieCard
                movie={media}
                ratings={ratingsById[media.key || `${media.mediaType}:${media.id}`] || media.ratings}
                onOpen={onOpen}
                onPlay={onPlay}
                onToggleSaved={onToggleSaved}
                saved={isSaved(media)}
                previewsEnabled={previewsEnabled}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function App() {
  useTvNavigation();
  const library = useLibrary();
  const runtimeProfile = performanceProfile();
  const effectivePreviewsEnabled = library.previewsEnabled && !runtimeProfile.lowMemory;
  const [view, setView] = useState(() => {
    try {
      const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '/';
      if (path.startsWith('/search')) return 'search';
      if (path.startsWith('/my-list')) return 'my-list';
      if (path.startsWith('/movies')) return 'movies';
      if (path.startsWith('/series')) return 'series';
      return 'home';
    } catch (e) {
      return 'home';
    }
  });
  const [home, setHome] = useState(null);
  const [health, setHealth] = useState(null);
  const [ratingsById, setRatingsById] = useState({});
  const [ratingWarning, setRatingWarning] = useState('');
  const [selected, setSelected] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDetails, setHeroDetails] = useState(null);

  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [genre, setGenre] = useState('');
  // default to 'movie' so the search view lists movies by default with lazy loading
  const [searchType, setSearchType] = useState('movie');
  const [search, setSearch] = useState({ loading: false, loadingMore: false, error: '', warning: '', results: [], provider: '', page: 1, totalPages: 1, totalResults: 0 });
  const debouncedQuery = useDebouncedValue(query, 300);
  const debouncedCountry = useDebouncedValue(country, 300);
  const latestSearchParamsRef = useRef({ query: debouncedQuery, year, country: debouncedCountry, genre, mediaType: searchType });

  useEffect(() => {
    latestSearchParamsRef.current = { query: debouncedQuery, year, country: debouncedCountry, genre, mediaType: searchType };
  }, [debouncedQuery, year, debouncedCountry, genre, searchType]);

  useEffect(() => {
    let live = true;
    Promise.all([api.home(), api.health()])
      .then(([homeData, healthData]) => {
        if (!live) return;
        setHome(homeData);
        setHealth(healthData);
        if (!healthData.ratings?.configured) {
          setRatingWarning('IMDb and Rotten Tomatoes need OMDB_API_KEY in .env. Add the key, restart the app, then run npm run diagnose:ratings. TMDB scores are shown meanwhile.');
        }
      })
      .catch((error) => live && setLoadError(error.message));
    return () => { live = false; };
  }, []);

  const allHomeMedia = useMemo(() => uniqueMedia(home?.rails || []), [home]);
  const ratingCandidates = useMemo(() => {
    const map = new Map();
    const add = (media) => {
      if (!media?.id || !media?.mediaType) return;
      map.set(media.key || `${media.mediaType}:${media.id}`, media);
    };
    allHomeMedia.forEach(add);
    library.myList.forEach(add);
    library.continueWatching.forEach((entry) => add(entry.media));
    return [...map.values()];
  }, [allHomeMedia, library.myList, library.continueWatching]);
  const ratingCandidateSignature = useMemo(
    () => ratingCandidates.map((media) => media.key || `${media.mediaType}:${media.id}`).join(','),
    [ratingCandidates],
  );

  useEffect(() => {
    if (!ratingCandidates.length || health?.ratings?.configured !== true) return undefined;
    let live = true;
    loadRatingsProgressively(
      ratingCandidates,
      (data) => {
        setRatingsById((current) => mergeRatingsCapped(current, data.ratings, runtimeProfile.lowMemory ? 96 : 180));
        const problem = Object.values(data.ratings || {}).find((item) => ['invalid-key', 'rate-limit', 'network-error', 'http-error'].includes(item?.status));
        if (problem) setRatingWarning(`IMDb ratings could not load: ${problem.message}`);
      },
      () => live,
      runtimeProfile.lowMemory ? 48 : 80,
    ).catch((error) => live && setRatingWarning(`IMDb ratings could not load: ${error.message}`));
    return () => { live = false; };
  }, [ratingCandidateSignature, health?.ratings?.configured]);

  useEffect(() => {
    if (view !== 'search') return;
    const hasCriteria = debouncedQuery.trim().length >= 2 || year || debouncedCountry.trim() || genre;
    // When there are no explicit criteria, show a default movie listing so the
    // search view is useful immediately and supports lazy loading.
    const effectiveMediaType = hasCriteria ? searchType : (searchType === 'all' ? 'movie' : searchType);

    let live = true;
    const fetchPage = async (page = 1) => {
      if (!live) return;
      setSearch((current) => ({ ...current, loading: true, loadingMore: false, error: '' }));

      try {
        const data = await api.search({ query: debouncedQuery, year, country: debouncedCountry, genre, mediaType: effectiveMediaType, page });
        if (!live) return;
        const results = data.results || [];
        const nextState = {
          loading: false,
          loadingMore: false,
          error: '',
          warning: data.warning || '',
          provider: data.provider || '',
          page: Number(data.page || page),
          totalPages: Number(data.totalPages || 1),
          totalResults: Number(data.totalResults || results.length),
          results,
        };
        setSearch(nextState);

        if (results.length && health?.ratings?.configured === true) {
          loadRatingsProgressively(
            results,
            (ratingData) => setRatingsById((current) => mergeRatingsCapped(current, ratingData.ratings, runtimeProfile.lowMemory ? 96 : 180)),
            () => live,
            runtimeProfile.lowMemory ? 24 : 36,
          ).catch(() => {});
        }
      } catch (error) {
        if (!live) return;
        setSearch({ loading: false, loadingMore: false, error: error.message, warning: '', results: [], provider: '', page: 1, totalPages: 1, totalResults: 0 });
      }
    };

    fetchPage(1);
    return () => { live = false; };
  }, [view, debouncedQuery, year, debouncedCountry, genre, searchType, health?.ratings?.configured]);

  const loadMoreSearch = () => {
    // Use functional update and a ref holding latest search params to avoid
    // stale closures when the user has active search criteria.
    let live = true;
    setSearch((cur) => {
      if (cur.loadingMore || cur.page >= cur.totalPages) return cur;
      const nextPage = cur.page + 1;
      // mark as loading immediately
      const loadingState = { ...cur, loadingMore: true, error: '' };

      (async () => {
        try {
          const params = latestSearchParamsRef.current;
          const data = await api.search({ query: params.query, year: params.year, country: params.country, genre: params.genre, mediaType: params.mediaType, page: nextPage });
          if (!live) return;
          const moreResults = data.results || [];
          setSearch((current) => {
            const updatedResults = [...(current.results || []), ...moreResults];
            const nextState = {
              loading: false,
              loadingMore: false,
              error: '',
              warning: data.warning || '',
              provider: data.provider || '',
              page: Number(data.page || nextPage),
              totalPages: Number(data.totalPages || 1),
              totalResults: Number(data.totalResults || updatedResults.length),
              results: updatedResults,
            };
            if (updatedResults.length && health?.ratings?.configured === true) {
              loadRatingsProgressively(
                updatedResults,
                (ratingData) => setRatingsById((current) => mergeRatingsCapped(current, ratingData.ratings, runtimeProfile.lowMemory ? 24 : 36)),
                () => live,
                runtimeProfile.lowMemory ? 24 : 36,
              ).catch(() => {});
            }
            return nextState;
          });
        } catch (error) {
          if (!live) return;
          setSearch((current) => ({ ...current, loadingMore: false, error: error.message }));
        }
      })();

      return loadingState;
    });
    return () => { live = false; };
  };

  const progressByMedia = useMemo(() => {
    const map = {};
    library.continueWatching.forEach((entry) => {
      const key = entry.media?.key || `${entry.media?.mediaType}:${entry.media?.id}`;
      if (key && !map[key]) map[key] = entry;
    });
    return map;
  }, [library.continueWatching]);

  const featured = useMemo(() => {
    const base = home?.featured || [];
    if (view === 'movies') {
      const movieItems = base.filter((item) => item.mediaType === 'movie');
      return movieItems.length ? movieItems : allHomeMedia.filter((item) => item.mediaType === 'movie').slice(0, 5);
    }
    if (view === 'series') {
      const tvItems = base.filter((item) => item.mediaType === 'tv');
      return tvItems.length ? tvItems : allHomeMedia.filter((item) => item.mediaType === 'tv').slice(0, 5);
    }
    if (view === 'new') {
      return uniqueMedia((home?.rails || []).filter((rail) => rail.key.startsWith('new-'))).slice(0, 5);
    }
    return base;
  }, [home, view, allHomeMedia]);

  useEffect(() => {
    setHeroIndex(0);
  }, [view, featured.length]);

  useEffect(() => {
    if (runtimeProfile.lowMemory || !['home', 'movies', 'series', 'new'].includes(view) || featured.length < 2) return undefined;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % featured.length), 12000);
    return () => window.clearInterval(timer);
  }, [view, featured.length]);

  const visibleRails = useMemo(() => {
    const rails = home?.rails || [];
    if (view === 'movies') return rails.map((rail) => filterRail(rail, 'movie')).filter((rail) => rail.media.length);
    if (view === 'series') return rails.map((rail) => filterRail(rail, 'tv')).filter((rail) => rail.media.length);
    if (view === 'new') return rails.filter((rail) => ['trending', 'new-movies', 'new-series', 'top-movies', 'top-series'].includes(rail.key));
    return rails;
  }, [home, view]);

  const heroMedia = featured[heroIndex] || home?.hero || visibleRails[0]?.media?.[0];
  const heroKey = heroMedia?.key || (heroMedia ? `${heroMedia.mediaType}:${heroMedia.id}` : '');

  useEffect(() => {
    if (!heroMedia?.id || !heroMedia?.mediaType) {
      setHeroDetails(null);
      return;
    }
    let live = true;
    setHeroDetails(null);
    api.media(heroMedia.mediaType, heroMedia.id)
      .then((data) => {
        if (!live) return;
        setHeroDetails(data);
        if (data.ratings) setRatingsById((current) => mergeRatingsCapped(current, { [data.key || heroKey]: data.ratings }, runtimeProfile.lowMemory ? 96 : 180));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [heroKey]);

  const enhancedHero = heroDetails?.key === heroKey ? { ...heroMedia, ...heroDetails } : heroMedia;

  const openView = (nextView) => {
    setView(nextView);
    setHeroIndex(0);
    const path = nextView === 'home' ? '/' : `/${nextView}`;
    try {
      window.history.pushState({ view: nextView }, '', path);
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: runtimeProfile.lowMemory ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const onPop = (event) => {
      const stateView = event.state?.view;
      if (stateView) {
        setView(stateView);
      } else {
        const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '/';
        if (path.startsWith('/search')) setView('search');
        else if (path.startsWith('/my-list')) setView('my-list');
        else if (path.startsWith('/movies')) setView('movies');
        else if (path.startsWith('/series')) setView('series');
        else setView('home');
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const play = (media, option = {}) => {
    const resume = option?.media ? option : null;
    const episodeOption = resume || option;
    setSelected(null);
    setPlayback({
      media,
      ...(media.mediaType === 'tv' ? {
        season: Number(episodeOption?.season || 1),
        episode: Number(episodeOption?.episode || 1),
        episodeName: episodeOption?.episodeName || '',
      } : {}),
    });
  };

  const renderRails = () => (
    <>
      {library.continueWatching.length ? (
        <MovieRail
          title="Continue Watching"
          subtitle="Pick up where you left off"
          media={library.continueWatching.filter((entry) => view === 'movies' ? entry.media?.mediaType === 'movie' : view === 'series' ? entry.media?.mediaType === 'tv' : true)}
          ratingsById={ratingsById}
          onOpen={setSelected}
          onPlay={play}
          onToggleSaved={library.toggleSaved}
          onRemoveProgress={library.removeFromContinueWatching}
          isSaved={library.isSaved}
          previewsEnabled={effectivePreviewsEnabled}
        />
      ) : null}

      {library.myList.length && view === 'home' ? (
        <MovieRail
          title="My List"
          subtitle="Saved on this device"
          media={library.myList}
          ratingsById={ratingsById}
          onOpen={setSelected}
          onPlay={play}
          onToggleSaved={library.toggleSaved}
          isSaved={library.isSaved}
          progressByMedia={progressByMedia}
          previewsEnabled={effectivePreviewsEnabled}
        />
      ) : null}

      {visibleRails.map((rail) => (
        <MovieRail
          key={rail.key}
          title={rail.title}
          subtitle={rail.subtitle}
          media={rail.media}
          ratingsById={ratingsById}
          ranked={Boolean(rail.ranked)}
          onOpen={setSelected}
          onPlay={play}
          onToggleSaved={library.toggleSaved}
          isSaved={library.isSaved}
          progressByMedia={progressByMedia}
          previewsEnabled={effectivePreviewsEnabled}
        />
      ))}
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      <AppHeader
        view={view}
        onView={openView}
        searchText={query}
        onSearchText={setQuery}
        previewsEnabled={library.previewsEnabled}
        onPreviewsEnabled={library.setPreviewsEnabled}
        myListCount={library.myList.length}
        performanceMode={runtimeProfile.mode}
      />

      {view === 'search' ? (
        <Suspense fallback={<Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}>
          <SearchView
            query={query}
            onQuery={setQuery}
            year={year}
            onYear={setYear}
            country={country}
            onCountry={setCountry}
            genre={genre}
            onGenre={setGenre}
            mediaType={searchType}
            onMediaType={setSearchType}
            genres={home?.genres?.all || []}
            results={search.results}
            page={search.page}
            totalPages={search.totalPages}
            totalResults={search.totalResults}
            loading={search.loading}
            loadingMore={search.loadingMore}
            error={search.error}
            warning={search.warning}
            provider={search.provider}
            onOpen={setSelected}
            onPlay={play}
            onToggleSaved={library.toggleSaved}
            onLoadMore={loadMoreSearch}
            isSaved={library.isSaved}
            ratingsById={ratingsById}
            previewsEnabled={effectivePreviewsEnabled}
          />
        </Suspense>
      ) : view === 'my-list' ? (
        <CatalogGrid
          title="My List"
          subtitle="Your saved movies and TV shows on this device."
          items={library.myList}
          ratingsById={ratingsById}
          onOpen={setSelected}
          onPlay={play}
          onToggleSaved={library.toggleSaved}
          isSaved={library.isSaved}
          previewsEnabled={effectivePreviewsEnabled}
        />
      ) : (
        <>
          {loadError ? (
            <Box sx={{ pt: { xs: 16, lg: 13 }, px: { xs: 2, md: 5 } }}>
              <Alert severity="error" sx={{ maxWidth: 920 }}>{loadError}</Alert>
              <Typography color="text.secondary" sx={{ mt: 2 }}>Copy .env.example to .env and configure a TMDB token.</Typography>
            </Box>
          ) : null}

          {!home && !loadError ? <Box sx={{ minHeight: '82vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : null}

          {home ? (
            <>
              <Hero
                media={enhancedHero}
                ratings={ratingsById[heroKey] || enhancedHero?.ratings}
                activeIndex={heroIndex}
                count={featured.length}
                onSelect={setHeroIndex}
                onPlay={play}
                onInfo={setSelected}
                onToggleSaved={library.toggleSaved}
                saved={enhancedHero ? library.isSaved(enhancedHero) : false}
              />
              <Box component="main" sx={{ mt: { xs: -5.5, md: -7 }, position: 'relative', zIndex: 2, pb: 8 }}>
                {ratingWarning ? (
                  <Box sx={{ px: { xs: 2, md: 5 }, mb: 2.5 }}>
                    <Alert severity="info" onClose={() => setRatingWarning('')} sx={{ maxWidth: 980, bgcolor: 'rgba(16,34,48,.88)', color: '#e8f4ff', '& .MuiAlert-icon': { color: '#90caf9' } }}>
                      {ratingWarning}
                    </Alert>
                  </Box>
                ) : null}
                {renderRails()}
              </Box>
            </>
          ) : null}
        </>
      )}

      {selected ? (
        <Suspense fallback={null}>
          <DetailsDialog
            movie={selected}
            ratings={ratingsById[selected?.key || `${selected?.mediaType}:${selected?.id}`]}
            onClose={() => setSelected(null)}
            onPlay={play}
            onOpen={setSelected}
            onToggleSaved={library.toggleSaved}
            isSaved={library.isSaved}
            ratingsById={ratingsById}
            previewsEnabled={effectivePreviewsEnabled}
            ratingsConfigured={health?.ratings?.configured === true}
          />
        </Suspense>
      ) : null}
      {playback ? (
        <Suspense fallback={null}>
          <PlayerDialog playback={playback} playerConfig={health?.player} onClose={() => setPlayback(null)} />
        </Suspense>
      ) : null}
    </Box>
  );
}
