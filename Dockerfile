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
RUN npm run build
RUN npm prune --omit=dev

# --------------------
# Runtime stage
# --------------------
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app /app

# The host sets PORT; the app binds to process.env.PORT (default 8080).
EXPOSE 8080

# Adjust if your built entry file is different (e.g., dist/index.js)
CMD ["node", "dist/server.js"]
