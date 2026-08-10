# syntax=docker/dockerfile:1

# CineFlix cloud/Render image.
# Stage 1 compiles the React + MUI SPA. None of the frontend build toolchain
# is required in the final runtime image.
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# Stage 2 contains only the production Express server, server dependencies,
# and the compiled SPA.
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=10000 \
    NODE_OPTIONS=--max-old-space-size=256 \
    OMDB_CACHE_FILE=/app/.cache/omdb-ratings.json

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
RUN mkdir -p /app/.cache && chown -R node:node /app/.cache

USER node
EXPOSE 10000

# Render also performs the HTTP health check configured in render.yaml.
# This image-level check remains useful if the same image is run elsewhere.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const p=process.env.PORT||10000;fetch('http://127.0.0.1:'+p+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
