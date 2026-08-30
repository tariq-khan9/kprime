# Medusa backend, production image.
#
# `medusa build` emits a self-contained app under .medusa/server, with its own
# package.json — so the runner installs from that, not from the repo root. The
# bundled admin is built into .medusa/server/public/admin at the same time.

FROM node:24-alpine AS builder
WORKDIR /app

# NODE_ENV is deliberately NOT production here: `medusa build` needs the dev
# dependencies (TypeScript, the admin bundler) that a production install skips.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx medusa build


FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9000

# dumb-init reaps zombies and forwards signals, so `docker compose down` stops
# the server rather than waiting out the timeout and killing it.
RUN apk add --no-cache dumb-init curl

# Take ownership of /app BEFORE anything is installed into it, then drop
# privileges, so every file below is owned by the runtime user.
#
# `medusa db:migrate` writes into node_modules: for each module without one it
# creates a `dist/migrations` directory. Running as `node` against a root-owned
# tree fails eight modules with EACCES. Fixing it with a `chown -R` after the
# install would work, but it rewrites ~800MB of node_modules into a second
# layer and doubles the image.
RUN chown node:node /app
USER node

COPY --chown=node:node --from=builder /app/.medusa/server/package.json ./package.json
COPY --chown=node:node --from=builder /app/.medusa/server/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --chown=node:node --from=builder /app/.medusa/server ./

# Product images land here. Mounted as a named volume in production — without
# one, every upload is lost on the next rebuild.
RUN mkdir -p /app/static

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:9000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "medusa", "start"]
