# CineFlix on Render

This package is prepared for a single Render Web Service. The Docker image builds
the React/MUI frontend and serves the compiled files and `/api/*` from the same
Express process.

## Required secrets

Set these in Render, never in Git:

- `TMDB_READ_ACCESS_TOKEN` - required for the catalog.
- `OMDB_API_KEY` - recommended for IMDb and Rotten Tomatoes ratings.

Optional Elasticsearch variables can be added later:

- `ELASTICSEARCH_NODE`
- `ELASTICSEARCH_API_KEY` or username/password
- `ELASTICSEARCH_INDEX`

## Blueprint deployment

1. Create a GitHub repository and upload this project to its repository root.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repository.
4. Render detects `render.yaml`.
5. During initial Blueprint creation, enter the two secrets marked `sync: false`.
6. Apply the Blueprint.
7. Wait for the Docker build and `/api/health` health check to pass.
8. Open the generated `https://<service>.onrender.com` URL.
9. For a TV that is not auto-detected, append `/?performance=tv`.

## Manual Web Service deployment

If you do not use Blueprints:

1. Choose **New > Web Service** in Render.
2. Connect the GitHub repository.
3. Choose **Docker** as the runtime/language.
4. Dockerfile path: `./Dockerfile`.
5. Use the Free instance to test, or a paid instance to avoid idle spin-down.
6. Add `TMDB_READ_ACCESS_TOKEN` and `OMDB_API_KEY` under Environment.
7. Add `/api/health` as the health check path.
8. Do not add a custom `PORT`; Render provides it.
9. Deploy.

## Free tier behavior

Render Free web services can spin down after inactivity. The next request starts
the service again, so the first load can be slower. The local filesystem is also
ephemeral, which means the OMDb cache can be rebuilt after restarts. My List and
Continue Watching are stored in the browser, so they do not depend on the Render
filesystem.

## Verify after deployment

Open:

- `/api/health` - service/API configuration
- `/api/ratings/diagnose` - OMDb diagnostic
- `/?performance=tv` - forced low-memory TV profile

Expected health response includes `"ok": true` and `"tmdb": true`.

## Custom domain

Add a custom domain from the Render service settings if desired. Render terminates
public HTTPS for the web service, so the app itself continues listening over HTTP
inside the container.
