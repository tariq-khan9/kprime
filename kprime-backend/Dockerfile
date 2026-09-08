# Medusa backend — API, admin dashboard at /app, and the product image host.
#
# Built from the REPO ROOT, not this directory:
#   docker build -f kprime-backend/Dockerfile .
# because `.npmrc` and `pnpm-workspace.yaml` live at the root and both are
# load-bearing (see below).
#
# Debian slim, not Alpine: @swc/core, esbuild, protobufjs, msgpackr-extract and
# unrs-resolver all ship glibc-built native addons. On musl they would have to
# be compiled from source, which is slow and fragile.
#
# Trixie (Debian 13) rather than bookworm — the same image on bookworm reports
# noticeably more outstanding CVEs. Rebuild this image periodically regardless:
# base-image patches are the main reason to, and nothing here pins a digest.

# ---------------------------------------------------------------- dependencies
FROM node:22-trixie-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo

# `.npmrc` sets node-linker=hoisted. Medusa resolves modules by path string and
# walks node_modules directly, so pnpm's default symlinked layout makes it fail
# at boot with "Cannot find module". This file is not optional.
#
# `pnpm-workspace.yaml` carries onlyBuiltDependencies. pnpm 10 blocks dependency
# lifecycle scripts unless a package is listed there, and without them the six
# native packages install "successfully" and then fail at runtime.
COPY .npmrc pnpm-workspace.yaml package.json ./
COPY kprime-backend/package.json ./kprime-backend/

RUN pnpm install --frozen-lockfile=false

# ---------------------------------------------------------------------- build
FROM deps AS build

WORKDIR /repo
COPY kprime-backend ./kprime-backend

WORKDIR /repo/kprime-backend
# Emits a self-contained app into .medusa/server, including compiled .js copies
# of everything in src/scripts.
RUN pnpm run build

# -------------------------------------------------------------------- runtime
FROM node:22-trixie-slim AS runtime

# Pillow, for tools/generate-placeholders.py.
#
# DEMO ONLY. The 777 placeholder images exist because there is no real product
# photography yet. When it lands, delete this apt layer, the tools/ copy below,
# and the generator itself — nothing in the running shop needs Python.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pil curl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

ENV NODE_ENV=production
WORKDIR /app

# `medusa build` produces a complete application here, with its own
# package.json. This is what Medusa v2 expects to run in production, so it
# becomes the working directory rather than the source tree.
COPY --from=build /repo/kprime-backend/.medusa/server ./
COPY .npmrc ./

# Store pruned in the SAME layer as the install. pnpm keeps a
# content-addressed store alongside the hoisted tree, and deleting it in a later
# RUN would not shrink the image — the bytes stay in the earlier layer.
RUN pnpm install --prod --frozen-lockfile=false     && pnpm store prune     && rm -rf "$(pnpm store path 2>/dev/null || echo /root/.local/share/pnpm/store)"     && rm -rf /root/.cache

# Not part of the build output — `medusa build` only compiles src/. The
# generator reads ../static relative to itself, which resolves to /app/static,
# the mounted volume.
COPY kprime-backend/tools ./tools

# Product images live here. MUST be a mounted volume: without one, every
# container replacement wipes all 777 files and every product falls back to the
# first-letter tile.
RUN mkdir -p ./static/placeholder
VOLUME ["/app/static"]

EXPOSE 9000

# Medusa has no dedicated health route; /health is added by this project.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS http://localhost:9000/health || exit 1

# Invoke the binary directly, NOT `pnpm run start`.
#
# `medusa build` emits a package.json with no `packageManager` field, so
# corepack at runtime resolves "latest pnpm", downloads it, and then re-resolves
# the lockfile — the container spent its first minutes downloading ~1200
# packages on every single start. A production container must not need the
# network to boot.
CMD ["node_modules/.bin/medusa", "start"]
