# Deploying kprime to a VPS

Fresh Ubuntu box → working shop. Every command here has been run against this
project, and every environment variable named is one the code actually reads.

**Target:** 4 GB RAM / 2 vCPU or better. The storefront build alone wants 1–2 GB;
on a 2 GB box it gets OOM-killed mid-build with a confusing error. If you are on
2 GB, add swap and stop the containers before building.

**Shape:** four containers on one host, nginx in front.

```
                  ┌── nginx (host, TLS) ──┐
 karkhanoprime.com ──┤                       ├── :8000  storefront
 api.yourdomain ──┘                       └── :9000  backend ─┬─ postgres
                                                              └─ redis
```

The backend needs its own public hostname because the browser loads product
images from it by absolute URL. Served over plain HTTP from an HTTPS page, every
image is blocked as mixed content.

---

## 1. VPS preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in for this to take effect

# Firewall — 8000 and 9000 stay closed; nginx is the only way in.
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

Node, pnpm and Python are **not** installed on the host. They live in the
images.

## 2. DNS

Two A records at your registrar, both pointing at the VPS IP:

| Type | Name | Value |
|---|---|---|
| A | `@` | your.vps.ip.address |
| A | `api` | your.vps.ip.address |

`api` is a subdomain of the domain you already own — free, no second purchase.

Wait for propagation before step 6; certbot fails if the names do not yet
resolve.

```bash
dig +short karkhanoprime.com api.karkhanoprime.com
```

## 3. Clone and configure

```bash
git clone <your-repo-url> kprime && cd kprime
cp .env.example .env
nano .env
```

Fill in `.env`. The parts that are not optional:

```bash
# Generate each separately — never reuse one value for both.
openssl rand -base64 32   # -> JWT_SECRET
openssl rand -base64 32   # -> COOKIE_SECRET
openssl rand -base64 24   # -> POSTGRES_PASSWORD
```

`docker-compose.yml` defaults Postgres to `medusa`/`medusa`. That is fine on a
laptop and unacceptable on a public server — set `POSTGRES_PASSWORD`.

`medusa-config.ts` refuses to start in production while `JWT_SECRET` is still
the dev placeholder, so this is enforced, not merely advised.

Leave `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` **blank for now** — it does not exist
yet.

## 4. Phase 1 — database and backend

The storefront cannot be built until the backend has been seeded, because the
publishable key it needs is created by seeding. So the first deploy is two
phases. Every deploy after this one is a single command.

```bash
docker compose --profile app up -d --build backend
docker compose logs -f backend        # wait for "Server is ready"
```

Migrate and seed. **Seeding runs exactly once** — `seed.ts` creates the region,
sales channel and publishable key, and a second run fails with *"Countries with
codes: pk are already assigned to a region"* and would reissue the key.

```bash
docker compose exec backend node_modules/.bin/medusa db:migrate
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/seed.js
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/setup-shipping-zones.js
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/setup-shipping-options.js
```

> Two things about these commands:
> - `.js`, not `.ts` — inside the image these are the compiled build output.
> - `node_modules/.bin/medusa`, not `npx medusa` — the build output's
>   package.json has no `packageManager` field, so anything going through
>   corepack downloads a package manager first.

Create your admin user:

```bash
docker compose exec backend node_modules/.bin/medusa user \
  -e you@karkhanoprime.com -p 'a-real-password'
```

**Capture the publishable key.** It is printed by the seed; if you missed it,
read it from the database:

```bash
docker compose exec kprime-postgres psql -U "$POSTGRES_USER" -d kprime \
  -c "select token from publishable_api_key limit 1;"
```

## 5. Product images

`kprime-backend/static/` is gitignored, so no images arrived with the clone.
They are generated on the server into the mounted volume.

`MEDUSA_BACKEND_URL` must already be `https://api.karkhanoprime.com` before the
last command: Medusa bakes absolute URLs into image rows at write time, and
getting it wrong points all 777 rows at the wrong host.

```bash
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/seed-catalogue.js
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/export-catalogue.js
docker compose exec backend python3 tools/generate-placeholders.py
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/add-placeholder-images.js
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/add-demo-collections.js
docker compose exec backend node_modules/.bin/medusa exec ./src/scripts/seed-sale-prices.js
```

This is demo data. When real photography lands, none of this runs — and the
Python layer can come out of the backend image entirely.

## 6. nginx and TLS

`/etc/nginx/sites-available/kprime`:

```nginx
server {
    listen 80;
    server_name karkhanoprime.com www.karkhanoprime.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        # Without these Next sees every visitor as 127.0.0.1, which also breaks
        # the rate limiting on /track.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.karkhanoprime.com;

    # Medusa admin uploads product images through this. The 1 MB default
    # rejects most photographs with a confusing 413.
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/kprime /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d karkhanoprime.com -d www.karkhanoprime.com -d api.karkhanoprime.com
```

Certbot rewrites both blocks for HTTPS and installs a renewal timer.

## 7. Phase 2 — storefront

**This comes last on purpose, and the order is not cosmetic.**

`generateStaticParams` on `/products/[handle]` fetches the product list *during*
`next build`. The URL it fetches is `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — the same
public value that gets baked into the browser bundle, because there is no
separate server-side variable. So the build fails outright unless
`https://api.karkhanoprime.com` already resolves, has a certificate, and serves
products:

```
Error: getaddrinfo ENOTFOUND api.karkhanoprime.com
Error: Failed to collect page data for /products/[handle]
```

That is why DNS, the backend, the catalogue and nginx+TLS all had to happen
first. Confirm it before building:

```bash
curl -s -o /dev/null -w '%{http_code}
' https://api.karkhanoprime.com/health   # 200
```

Paste the key into `.env`:

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

Then build. Everything under `NEXT_PUBLIC_` is compiled **into** the browser
bundle here, which is why the key has to exist first — the build refuses to
proceed without it rather than shipping a shop where every product request 401s.

```bash
docker compose --profile app up -d --build storefront
```

## 8. Verify

Run these against the live site. They are the same checks used in development,
re-pointed at the real domain.

```bash
# Dev-only routes must be gone. All eight should return 404.
for d in styleguide facets products categories collections health shipping product-states; do
  printf '%-16s %s\n' "$d" "$(curl -s -o /dev/null -w '%{http_code}' https://karkhanoprime.com/dev/$d)"
done

# Security headers, and no X-Powered-By.
curl -sI https://karkhanoprime.com | grep -iE 'x-content-type|referrer-policy|x-frame|permissions-policy|strict-transport|x-powered-by'

# Canonical must be the real domain, not localhost.
curl -s https://karkhanoprime.com/about | grep -o '<link rel="canonical"[^>]*>'

# Product images must load from the api subdomain over HTTPS.
curl -sI https://api.karkhanoprime.com/static/placeholder/cast-iron-skillet-1.png | head -1
```

Then by hand:

- Place a real order end to end, and find it again at `/track`.
- Tap the WhatsApp button on a phone; confirm it opens a chat to your number.
- Log in to `https://api.karkhanoprime.com/app`.
- `sudo reboot`, then confirm everything comes back on its own — that is what
  `restart: unless-stopped` is for.
- `docker compose --profile app down && docker compose --profile app up -d`, then
  confirm product images survive. They live in the `backend_static` volume; if
  they vanish, the volume is not mounted.

## 9. Day-two operations

**Which changes need what:**

| Change | What to run |
|---|---|
| Products, prices, stock, categories, orders, reviews | Nothing — edit in admin, live immediately |
| Storefront or backend code | `git pull && docker compose --profile app up -d --build` |
| Any `NEXT_PUBLIC_*` (domain, WhatsApp number, key) | Same, and it **must** be `--build` — a restart will not do it |
| `.env` secrets (SMTP, Brevo, database) | `docker compose --profile app up -d` — restart is enough |

**Admin edits appear immediately, provided `REVALIDATE_SECRET` is set.** After a
product, price, stock, category or review change the backend POSTs to the
storefront's `/api/revalidate`, which drops the matching cache tag. Leave the
secret blank and nothing breaks — but the storefront falls back to its hourly
timer, so an edit can take up to an hour to show. If edits seem slow to appear,
check `docker compose --profile app logs backend | grep revalidate`: it logs
every attempt, and a failure there is only ever a stale page, never a failed
save.

**Logs and rollback:**

```bash
docker compose --profile app logs -f backend
docker compose --profile app logs -f storefront

git log --oneline -5
git checkout <previous-sha> && docker compose --profile app up -d --build
```

**Back up the database before every deploy that touches migrations:**

```bash
docker compose exec kprime-postgres pg_dump -U "$POSTGRES_USER" kprime \
  | gzip > "backup-$(date +%F).sql.gz"
```

Restoring a dump taken elsewhere will carry its baked image URLs with it. If
those point at another host, re-run `add-placeholder-images.js` with the correct
`MEDUSA_BACKEND_URL` to rewrite them.

---

## What has actually been tested

Both images were built and run against a real database before this document was
written, so the following are observations rather than expectations:

| | |
|---|---|
| Backend image | 1.24 GB — boots to healthy, serves 389 products, admin at `/app` |
| Storefront image | 1.36 GB — serves every route, `/dev/*` 404s, 5/5 security headers |
| Compose | `up -d` still starts datastores only; `--profile app` starts all four |
| Static volume | mounted at `/app/static` and survives container replacement |

**Four bugs were found by building rather than by reading**, and are already
fixed in the files here — they are listed because each would otherwise have
surfaced mid-deploy:

1. **The containers re-downloaded ~1200 packages on every start.** Medusa's
   build output has no `packageManager` field, so `pnpm run start` made corepack
   fetch a package manager at boot. Both images now invoke
   `node_modules/.bin/...` directly and need no network to start.
2. **`RUN chown -R` cost 889 MB.** A recursive chown rewrites every inode and
   overlayfs duplicates the whole tree. Replaced with `COPY --chown`.
3. **Per-app `.dockerignore` files were silently ignored.** Both services build
   with `context: .`, and Docker only reads the one at the context root — so
   `node_modules` was being copied in.
4. **The storefront build needs a reachable backend**, which is why nginx and
   TLS come before it in this document rather than after.

---

## Before going live

`LAUNCH-CHECKLIST.md` holds the remaining items. The ones that are still
blockers at the time of writing:

- Courier rates in `setup-shipping-options.ts` are placeholders (Rs 250 / Rs 600)
  and `config/policies.ts` mirrors them by hand — change both together.
- The confirmation-call script, and who dispatches orders.
- Real product photography, which retires everything in section 6.
