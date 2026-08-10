# CineFlix Docker + ngrok deployment

This build runs CineFlix as one production Node/Express container. Vite compiles the React/MUI frontend during the Docker build, then the final runtime image serves `dist/` and `/api` from port 8787.

## 1. Requirements

- Docker Desktop on Windows/macOS, or Docker Engine + Compose on Linux.
- A TMDB token in `.env` for catalog data.
- An OMDb key in `.env` if you want real IMDb/Rotten Tomatoes ratings.
- An ngrok account/authtoken only if you want a public tunnel.

## 2. Environment file

Copy `.env.docker.example` to `.env`, then fill in your API keys.

Windows PowerShell:

```powershell
Copy-Item .env.docker.example .env
notepad .env
```

At minimum:

```env
TMDB_READ_ACCESS_TOKEN=your_tmdb_token
OMDB_API_KEY=your_omdb_key
VIDKING_BASE_URL=https://www.vidking.net
VIDKING_COLOR=e50914
```

Never commit `.env`.

## 3. Docker only (LAN / TV)

Build and start:

```powershell
docker compose up -d --build
```

Check status:

```powershell
docker compose ps
```

Open on the PC:

```text
http://localhost:8787/?performance=tv
```

For a TV on the same network, find the PC's IPv4 address with `ipconfig`, then open:

```text
http://YOUR_PC_IP:8787/?performance=tv
```

Logs:

```powershell
docker compose logs -f cineflix
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8787/api/health
```

Stop:

```powershell
docker compose down
```

The named volume `cineflix-cache` keeps the small OMDb ratings cache between container restarts. Use `docker compose down -v` only when you also want to delete that cache.

## 4. Docker + ngrok

Add your ngrok token to `.env`:

```env
NGROK_AUTHTOKEN=your_ngrok_authtoken
```

Then start both services:

```powershell
docker compose -f compose.yaml -f compose.ngrok.yaml up -d --build
```

The ngrok container connects to `http://cineflix:8787` over the internal Compose network; no Node or ngrok installation is required on the host beyond Docker.

Find the generated public URL from ngrok's local agent API:

```powershell
(Invoke-RestMethod http://localhost:4040/api/tunnels).tunnels | Select-Object -ExpandProperty public_url
```

You will get an HTTPS URL similar to:

```text
https://example-name.ngrok-free.app
```

For the low-memory UI, open:

```text
https://example-name.ngrok-free.app/?performance=tv
```

ngrok's local inspector is bound only to `127.0.0.1:4040` by this Compose file.

Logs:

```powershell
docker compose -f compose.yaml -f compose.ngrok.yaml logs -f ngrok
```

Stop both:

```powershell
docker compose -f compose.yaml -f compose.ngrok.yaml down
```

## 5. Updating after source changes

```powershell
docker compose down
docker compose up -d --build
```

With ngrok:

```powershell
docker compose -f compose.yaml -f compose.ngrok.yaml down
docker compose -f compose.yaml -f compose.ngrok.yaml up -d --build
```

## 6. Resource limits

Defaults in `.env.docker.example`:

```env
CINEFLIX_MEMORY_LIMIT=384m
CINEFLIX_CPU_LIMIT=1.0
NODE_OPTIONS=--max-old-space-size=256
```

The memory limit applies to the Node/Express container. The TV browser's own RAM usage is separate; continue using `?performance=tv` on low-memory TVs.

If the container is OOM-killed, raise `CINEFLIX_MEMORY_LIMIT` to `512m` before changing the browser-side TV profile.

## 7. Security note for ngrok

An ngrok URL makes this web application reachable from the public internet. CineFlix itself does not currently implement accounts or access control. Treat the generated URL as public and do not expose secrets through the frontend. For a longer-lived endpoint, add an ngrok Traffic Policy (Basic Auth/OAuth/OIDC) or application-level authentication before sharing the URL broadly.

The API credentials remain server-side inside the CineFlix container and are not compiled into Vite because they are not `VITE_` variables.
