# Next.js storefront.
#
# Built from the REPO ROOT:
#   docker build -f kprime-storefront/Dockerfile .
#
# **This image is environment-specific and cannot be otherwise.** Next inlines
# every NEXT_PUBLIC_* value into the client bundle at `next build`, so the
# domain, the WhatsApp number and the publishable key end up baked inside the
# image. There is no "build once, promote to production" — changing any of them
# means rebuilding. That is a Next constraint, not a packaging mistake.
#
# It also means the backend must already be seeded before this is built: the
# publishable key does not exist until `seed.ts` has run. See DEPLOYMENT.md.

# ---------------------------------------------------------------- dependencies
FROM node:22-trixie-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# `--ignore-workspace` is essential. The storefront is deliberately NOT a pnpm
# workspace package: Medusa's admin pins React 18 and Next 16 needs React 19,
# and under the node-linker=hoisted that Medusa requires, one shared tree
# resolves a single copy of react-remove-scroll and breaks every admin dialog.
# Installing here in isolation is what keeps the two Reacts apart.
# `.npmrc` (node-linker=hoisted) matters here too, even though it exists for
# Medusa's sake. Locally pnpm walks up from kprime-storefront/ and picks up the
# repo-root file, so the storefront has always been installed hoisted. Omitting
# it here gave the image pnpm's default symlinked layout instead, and Next then
# failed to resolve its own internals out of node_modules/.pnpm. The image must
# install the same way the working local tree does.
COPY .npmrc ./
COPY kprime-storefront/package.json ./
RUN pnpm install --ignore-workspace --frozen-lockfile=false

# ---------------------------------------------------------------------- build
FROM deps AS build

WORKDIR /app
COPY kprime-storefront ./

# Baked into the client bundle at build time — see the note at the top.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_DEFAULT_REGION

ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Fails loudly rather than silently shipping a broken shop: an unset key makes
# every product request 401, and an unset base URL puts localhost into every
# canonical tag and Open Graph image.
#
# Separate `if` blocks rather than a chain of `||` and `&&`: the shell parses
# `A || B && C || D` as `((A || B) && C) || D`, so a chained version can name
# the wrong variable as the one that is missing.
RUN set -e; \
    if [ -z "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" ]; then \
      echo "ERROR: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is empty."; \
      echo "       It is created by seeding the backend - run phase 1 of DEPLOYMENT.md."; \
      exit 1; \
    fi; \
    if [ -z "$NEXT_PUBLIC_BASE_URL" ]; then \
      echo "ERROR: NEXT_PUBLIC_BASE_URL is empty."; \
      echo "       Without it every canonical URL and OG image points at localhost."; \
      exit 1; \
    fi

RUN pnpm run build

# ~80 MB of Turbopack build artefacts that `next start` never reads. Removed
# here rather than after the COPY, because a later delete would not shrink the
# layer that already contains them.
RUN rm -rf .next/cache

# -------------------------------------------------------------------- runtime
FROM node:22-trixie-slim AS runtime

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Production dependencies installed fresh, rather than copying the build stage's
# node_modules wholesale. That tree also contains typescript, eslint, vitest,
# tailwind and @playwright/test — none of which a running server needs, and
# together the difference between a ~3 GB image and a workable one.
#
# There is no `output: "standalone"` in next.config.ts, so `next start` still
# needs a real node_modules; this is the smallest correct one.
COPY .npmrc kprime-storefront/package.json ./
RUN pnpm install --prod --ignore-workspace --frozen-lockfile=false \
    && pnpm store prune \
    && rm -rf "$(pnpm store path 2>/dev/null || echo /root/.local/share/pnpm/store)" \
    && rm -rf /root/.cache

# `--chown` on the COPY itself, never `RUN chown -R` afterwards: a recursive
# chown rewrites every inode, and overlayfs then duplicates the entire tree into
# a new layer. That one line was 889 MB of this image.
#
# Only .next needs to be writable — Next writes its ISR cache there at runtime.
# node_modules stays root-owned and is read-only to the app, which is what we
# want anyway.
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/ >/dev/null || exit 1

# The binary directly, not `pnpm run start` — same reason as the backend: going
# through pnpm makes corepack resolve and fetch a package manager at boot.
# Port 8000 matches the package.json script; Next does not read a PORT env var
# here.
CMD ["node_modules/.bin/next", "start", "-p", "8000"]
