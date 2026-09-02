# CLAUDE.md

Storefront for kprime. Pakistan only · PKR · COD only · English only · guest checkout only.
Full reasoning lives in `kprime-storefront-plan.md`. This file is the short version — the rules
that don't change.

## Stack

Next.js App Router (RSC) · TypeScript · Tailwind · Medusa v2.19 backend (existing, separate repo)
· `@medusajs/js-sdk`.

Two separate installs — the backend runs React 18 and the storefront React 19, so they must not
share a `node_modules`. The storefront is deliberately not a pnpm workspace package.

```
pnpm dev:backend    # localhost:9000, admin at /app
pnpm dev:storefront # localhost:8000
```

From `kprime-storefront/`:

```
npm run build    # must pass before any commit
npm run lint
npm test         # vitest
```

## Hard rules

1. **No inline hex, rgb, or `text-gray-*`.** Colours come from the `@theme` block in
   `src/app/globals.css` — Tailwind v4, there is no `tailwind.config.ts`.
   If you need a value that isn't there, stop and say so — a token is missing.
2. **No `localStorage` or `sessionStorage`** except the cart ID and the checkout draft.
3. **No component calls the Medusa SDK directly.** Everything fetches through `lib/data/*`.
4. **Never ship the catalogue to the browser to filter it.** Filtering happens server-side in
   RSCs. See "Filtering" below.
5. **No account, login, or register anything.** Not in v1. Don't add links, routes, or
   components for it (see "Out of scope").
6. **One component per session.** Build the file named in the prompt. Don't create adjacent
   files, refactor neighbours, or "improve" things that weren't asked about.
7. **Ask before installing a dependency.**

## Design tokens

Navy brand, amber action, red sale, green success, white page. Every colour has exactly one job.

| Token | Hex | Job |
|---|---|---|
| `paper` | `#FFFFFF` | Page background |
| `cream` | `#F6F4EF` | Panels that lift off the page — trust strip, newsletter |
| `header` | `#FDF1DA` | Header bar only. Amber washed to near-white — **not** a CTA colour |
| `brand` | `#0F1E3D` | All text, headings, prices, footer, announcement bar, icons, active nav |
| `brand.light` | `#1E3A6B` | Hover on navy surfaces |
| `action` | `#F2A007` | Primary CTA only |
| `action.hover` | `#D98906` | |
| `action.ink` | `#1A1408` | Text on amber |
| `sale` | `#C2410C` | Discount badges, savings |
| `success` | `#15803D` | In stock, order confirmed |
| `muted` | `#6B7280` | Breadcrumbs, labels, strikethrough prices |
| `line` | `#E6E2DA` | Borders, dividers |

1. **Navy replaces black for text.** Never `#000`, `#333`, `text-gray-900`.
2. **Amber only ever means "act on this."** Buttons and nothing else, ~2% of the page.
   The `header` token is the one exception and is diluted to near-white for exactly this reason:
   a solid amber button on a full-strength amber bar measures 1.00:1 and disappears.
3. **Dark text on amber, never white.** White on `#F2A007` is 2.1:1 and fails WCAG.
4. **Green is success states only. Never a CTA.**
5. **Sale red is never the brand colour.**
6. **Light page always.** No dark mode in v1.

**Mobile-first.** Assume 80%+ mobile traffic. Design at 360px and scale up.

## Folder structure

```
components/
├── ui/        11 primitives (shadcn-generated, retokenised)
├── layout/    11 shell components
├── shared/    9 used on 3+ pages
└── page/      one page only — home, catalog, product, review,
               cart, checkout, order-confirmed, track
lib/
├── sdk.ts           Medusa client
└── data/            products.ts, categories.ts, cart.ts, orders.ts
config/
└── filters.ts       filter order + hidden list
```

**Imports run one way:** `page/` → `shared/` → `layout/` → `ui/`.
Never import across two `page/` folders. If `checkout/` needs something from `cart/`, that thing
belongs in `shared/` — move it and update imports, don't copy it.

`page/catalog/` serves three routes: `/categories/[handle]`, `/search`, `/collections/[handle]`.
They're the same page with different headers.

## Filtering

Everything goes through **one function**: `lib/data/products.ts → searchProducts(params)`.

**Native in Medusa** — `category_id`, `collection_id`, `tag_id`, `type_id`, `option_value_id`,
`option_id`, `q`, `order`, `limit`/`offset`.

**Not native, done in the Next.js server layer** — price range, facet counts, rating.
Fetch the full result set with `fields` trimmed to what `ProductCard` needs, cache with
`unstable_cache`, then filter and paginate in server memory. Never paginate in Medusa *and*
post-filter — counts go wrong.

**Filterable specs are product options, not metadata.** Metadata is JSONB and unqueryable
through the store API. A single-value option adds no variants.

**Option spelling is load-bearing.** `Color` never `Colour`. `Red` never `red`. Title Case.
Units in the value, one form: `128GB`. A typo creates a phantom filter in the sidebar.

**Filter groups are derived from the data**, ordered by `config/filters.ts`. Render a group only
if it covers **≥25%** of the current result set. Semantics: OR within a group, AND across groups.

**Filter state lives in the URL**, not React state — `?color=red&brand=x&price=1000-5000`.
That's what gives shareable links, a working back button, and SSR.

## Routing

- **Flat single-segment handles.** `/categories/laptops`, never
  `/categories/electronics/computers/laptops`. Handles are globally unique.
- **Build the category nav recursively** — render whatever depth the tree returns. Don't
  hardcode two levels.
- **Parent categories don't inherit children's products.** Fetch with
  `include_descendants_tree=true`, collect descendant IDs, pass the array.
- **Static + revalidate:** `/`, `/products/[handle]`, `/collections/[handle]`.
- **Dynamic:** `/categories/[handle]`, `/search`, `/cart`, `/checkout`, `/order/confirmed/[id]`,
  `/track`.
- **Route groups:** `(shop)` full shell, `(checkout)` stripped — logo, stepper, trust strip only.

## Checkout — phone-first, guest only

**Required fields:** name, phone, province, city, street address. Email optional.
**No postal codes.** Province and city are dependent dropdowns.

**City must be a dropdown, never free text.** Geo zone matching is on the exact city string —
free text silently returns zero shipping options and dead-ends checkout. Populate from
`/store/shipping-cities`.

**Three identity rules, all load-bearing:**

1. `normalizePhone()` runs at the **API boundary**, not in components. Accepts `03xxxxxxxxx`,
   `+923xxxxxxxxx`, `00923…`, spaces, dashes → returns `923001234567`. Nothing else touches a
   raw phone string.
2. `cart.email` is **always** `{normalised}@nomail.kprime.pk` — even when a real email is
   supplied. The real one goes to `cart.metadata.contact_email`. **Never change this format.**
3. The normalised phone is written onto the Customer record (`phone` is a native field).

**Order of steps matters:** the address step must complete before the shipping step renders —
shipping options resolve against the city.

**Set `metadata.phone_verified = false` at placement.** Verification is a manual phone call.

**`/track` requires order number AND phone**, rate-limited. **Never build phone-only lookup** —
it's an enumeration hole exposing strangers' addresses and order history.

**The confirmation page is the only receipt.** No email, no SMS. It must carry the order number
prominently, items, total, delivery estimate, WhatsApp number, and a "screenshot this" prompt.
Copy stays soft: "we've received your order, we'll be in touch if we need anything."

## Reviews

Custom backend module. Flat — one review plus an optional merchant reply. Keep a `parent_id`
column but don't render deeper nesting. Default status `pending`; nothing renders until approved.
Verified buyer = a delivered order under that phone containing this product. Store
`average_rating` and `review_count` denormalised on the product. Rating filter and sort run in
the server layer, same as price.

## Out of scope — do not build

Customer accounts · login/register · order history by phone · OTP · SMS/WhatsApp sending ·
online payment · multi-currency · Urdu · free delivery threshold · wishlists · coupons ·
loyalty · returns portal · dark mode.

If a task seems to need one of these, stop and ask.

## Working method

- Build exactly what the prompt names. Bounded tasks, visible results.
- If a requirement is ambiguous, ask before writing code.
- Show the diff. If it can't be explained in a sentence, it's too big.
- Don't add comments explaining what the code obviously does.
- Don't write tests unless asked.
- No "make it better" refactors, ever.
