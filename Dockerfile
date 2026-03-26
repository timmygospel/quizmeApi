# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.16.0

# --------------------
# Build stage
# --------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
  rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Generate Prisma client before TypeScript compile (client is gitignored)
RUN npm run db:generate
RUN npm run build
RUN npm prune --omit=dev

# --------------------
# Runtime stage
# --------------------
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app /app

# Fly will set PORT (commonly 8080 for http_service). Your app should bind to process.env.PORT.
EXPOSE 8080

# Adjust if your built entry file is different (e.g., dist/index.js)
CMD ["node", "dist/server.js"]
