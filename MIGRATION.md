# Upgrade checklist from the previous build

1. Stop the running process with `Ctrl+C`.
2. Copy your current `.env` somewhere safe.
3. Replace the old project files with the v3 files.
4. Restore `.env` to the project root.
5. Confirm these values exist:

```env
TMDB_READ_ACCESS_TOKEN=...
OMDB_API_KEY=...
VIDKING_BASE_URL=https://www.vidking.net
VIDKING_COLOR=e50914
```

6. Reinstall/update dependencies:

```powershell
npm install
```

7. Verify the ratings key:

```powershell
npm run diagnose:ratings
```

8. Start the application:

```powershell
npm run dev
```

9. Open `http://localhost:5173`.
10. When Elasticsearch is enabled, use `ELASTICSEARCH_INDEX=cineflix-media-v2` and run `npm run sync:search`.

The new build uses v3 browser-storage keys for My List, Continue Watching, and the preview preference. It also reads the earlier movie-only `cineflix:progress:{tmdbId}` resume value and migrates away from it on the next progress update. Replacing source files does not remove browser-local values unless site storage is cleared.
