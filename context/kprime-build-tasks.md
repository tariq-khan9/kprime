# kprime Storefront — Sequential Build Tasks

158 tasks, in order. Do task 1, verify it, commit, then task 2. Nothing in a task depends on
anything numbered above it.

Companion to `kprime-storefront-plan.md` — that document holds the *decisions and reasoning*
(§ references below point into it). This document holds the *order of work*.

---

## How to use this

**One task per Claude Code session.** Paste the task text as the prompt, adding the file path
and any screenshot reference. Do not batch two tasks into one session, even when they look
adjacent.

**Every task has a Verify line.** If it doesn't pass, fix it in the same session. Do not start
the next task on a red check — a broken state costs minutes now and hours in three weeks.

**Commit after each task.** Message format: `task 47: Footer`.

**Read the diff.** If you can't explain what a line does, it doesn't go in.

**Prompt shape:**

> Task 35. Create `components/shared/ProductCard.tsx`. Props: `product` (Medusa
> `StoreProduct`). Shows image, title (2-line truncate), `PriceDisplay`, `StarRating`, and a
> `Badge` when `compare_at_price` exists. Import `Badge` from `components/ui`. Colours and
> spacing from `tailwind.config` — no inline hex. Mobile-first, 2 columns at 360px.

Name the file path, name the imports, name the constraint. Nothing else.

---

## Block map

| Block | Tasks | What you have at the end |
|---|---|---|
| A — Backend groundwork | 1–11 | Medusa configured, catalogue imported, store API answering |
| B — Storefront foundation | 12–21 | Next.js app, tokens, SDK, data layer, test runner |
| C — Primitives | 22–32 | 11 `ui/` components on a styleguide page |
| D — Shared product components | 33–37 | `ProductCard` and the two containers that hold it |
| E — Layout shell | 38–49 | Header, mega menu, mobile nav, footer — real category tree |
| F — Home page | 50–56 | **Live home page with real products** |
| G — Category + filtering | 57–74 | Faceted, URL-driven, shareable filtered listings |
| H — Search | 75–78 | Search results and typeahead |
| I — Collections | 79–80 | Sale / New In pages |
| J — Product detail | 81–92 | Gallery, variants, specs |
| K — Cart | 93–101 | Add, edit, persist, drawer |
| L — Checkout | 102–114 | **A real order in the Medusa admin** |
| M — Confirmation + tracking | 115–121 | The receipt page and `/track` |
| N — Reviews | 122–136 | Custom module, moderation, stars on cards |
| O — Static pages | 137–143 | 7 policy pages + error states |
| P — SEO | 144–150 | Metadata, sitemap, JSON-LD with ratings |
| Q — Hardening | 151–158 | Launch-ready |

**Three natural stopping points** where you have something real to look at: task 56 (home page),
task 114 (orders working), task 158 (launch).

---

## Locked constants — every session must respect these

**Colours** — from `tailwind.config`, never inline hex.

```ts
colors: {
  cream:  "#F6F4EF",   // page background
  paper:  "#FFFFFF",   // cards, panels, modals
  brand:  { DEFAULT: "#0F1E3D", light: "#1E3A6B" },  // ALL text, headings, prices
  action: { DEFAULT: "#F2A007", hover: "#D98906", ink: "#1A1408" },  // CTAs only
  sale:    "#C2410C",  // discount badges, savings
  success: "#15803D",  // in-stock, confirmed — NEVER a CTA
  muted:   "#6B7280",  // breadcrumbs, labels, strikethrough
  line:    "#E6E2DA",  // borders, dividers
}
```

Navy replaces black for text — never `#000`, `#333`, `text-gray-900`. Amber means "act on
this" and nothing else, ~2% of the page. Dark ink on amber, never white (§2.3).

**Import direction is one-way.** `page/` → `shared/` → `layout/` → `ui/`. `ui/` imports nothing
from the component tree. Never import across two `page/` folders — if `checkout/` needs
something from `cart/`, promote it to `shared/` (§4.11).

**One data layer.** Every route fetches through `lib/data/*`. No component calls the Medusa SDK
directly (§3).

**Phone is the identity key.** `normalizePhone()` runs at the API boundary. Cart email is
always `{normalised}@nomail.kprime.pk` (§2.2). Frozen format.

**Filter state lives in the URL**, not React state (§4.4).

**Mobile-first.** Assume 80%+ mobile. Design at 360px, then widen.

---

# Block A — Backend groundwork (1–11)

Admin work, mostly no code. Tasks 8 and 9 are the expensive-to-reverse ones — do them
carefully, before any product is imported.

### Task 1 — Confirm the backend runs
**Do** Start the Medusa backend and admin. Record the exact version in `CLAUDE.md` later
(task 15). Confirm it is v2.16 or higher — option-value filtering is required (§2.1).
**Verify** Admin dashboard loads. `GET /health` returns 200. `npx medusa --version` printed
and noted.

### Task 2 — Region
**Do** Create one region: Pakistan, currency PKR. Confirm tax settings match how you actually
invoice.
**Verify** Region visible in Admin → Settings → Regions with PKR as currency.

### Task 3 — Sales channel + publishable key
**Do** Create the storefront sales channel. Create a publishable API key and link it to that
channel.
**Verify** `curl -H "x-publishable-api-key: pk_..." $BACKEND/store/regions` returns 200 with
your Pakistan region.

### Task 4 — Stock location + fulfillment set
**Do** Stock location: Peshawar. One fulfillment set named "Delivery". Link the location to the
sales channel.
**Verify** Location and fulfillment set both appear in Admin → Settings → Locations.

### Task 5 — Service zones (four price tiers)
**Do** Create four service zones under the Delivery set: `Local`, `Metro`, `Other cities`,
`Remote`. Add cities as geo zones inside each. Zones are **price tiers, not cities** — Metro
holds ten cities in one zone (§5.1). Take the worse case where TCS and Leopards disagree.
**Verify** Four zones exist, every courier-served city sits in exactly one, no duplicates.

### Task 6 — Shipping options
**Do** Standard and Express per zone, `manual` provider, flat rate, rates from the courier
sheets (higher of TCS/Leopards). No Express on Remote. Put the SLA in the option **name**:
`Standard Delivery (3–5 days)`.
**Verify** ~7 options exist. `GET /store/shipping-options?cart_id=...` after task 112 will
return them — for now, confirm each shows a non-zero PKR amount in admin.

### Task 7 — COD payment provider
**Do** Enable the `manual` payment provider on the Pakistan region. This is COD.
**Verify** Provider listed under the region in admin.

### Task 8 — Lock the option sheet ⚠️
**Do** Produce a reference sheet: every allowed option **title** and every allowed **value**,
per category. Title Case, no trailing spaces, units glued to the number (`128GB`, never
`128 GB`). This is a document, not code. Freeze it (§2.1).
**Verify** The sheet exists and contains zero near-duplicates — no `Color`/`Colour`, no
`Red`/`Bright Red`. Read it once more before task 10.

### Task 9 — Category tree ⚠️
**Do** Build the real taxonomy in admin. Handles **globally unique** — `mobile-accessories`,
not `accessories`. Set `rank` on every category. Max 3 levels. Apply the taxonomy rule: if two
products in a leaf can't be compared on the same filters, split the leaf (§2.1.1).
**Verify** `GET /store/product-categories?limit=100` returns your tree. Every handle unique
across the whole list. Every category has a rank.

### Task 10 — Seed products
**Do** Import 20–30 real products spread across all top-level categories, with images,
variants, and options spelled exactly per task 8. Assign to **leaf categories only** (§2.1.1).
**Verify** `GET /store/products?limit=30` returns them with `options` populated. Spot-check
three products for option spelling against the sheet.

### Task 11 — `shipping-cities` backend route
**Do** Add `src/api/store/shipping-cities/route.ts`. Reads geo zones from the fulfillment
module, returns cities grouped by province. ~40 lines. This keeps admin as the single source of
truth for the checkout city dropdown (§5.1).
**Verify** `curl $BACKEND/store/shipping-cities` returns provinces with city arrays. Add a city
in admin, re-curl, it appears without a code change.

---

# Block B — Storefront foundation (12–21)

### Task 12 — Scaffold the Next.js app
**Do** `create-next-app` — App Router, TypeScript, Tailwind, ESLint, `src/` dir. Delete the
boilerplate page content. Add `.env.local` with `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
**Verify** `npm run dev` serves a blank page at `/` with no console errors. `npm run build`
passes.

### Task 13 — Design tokens
**File** `tailwind.config.ts`
**Do** The palette above, verbatim. Plus: type scale, spacing base (pick 4px or 8px, write it
down), border radius scale, container max-width. Nothing below works without this.
**Verify** A throwaway div with `bg-cream text-brand` renders cream-on-navy. `npm run build`
passes.

### Task 14 — Fonts and base layout
**Files** `app/layout.tsx`, `app/globals.css`
**Do** One geometric sans via `next/font` (Poppins, Outfit, or Manrope). Body background
`cream`, body text `brand`. Set `lang="en"`, viewport meta, and default text sizing for mobile.
**Verify** View source shows the font preloaded. Page background is `#F6F4EF`, not white.

### Task 15 — `CLAUDE.md`
**File** `CLAUDE.md` at repo root
**Do** Stack and versions (Next.js, Medusa from task 1), folder structure and the one-way
import rule, the colour tokens, the filtering approach (options not metadata, price in the
server layer), the phone-first identity rule, "no inline hex", "mobile-first at 360px". This is
read at the start of every session and is the main lever on output quality.
**Verify** Under 200 lines, and a stranger could infer the conventions from it alone.

### Task 16 — Medusa SDK client + health probe
**Files** `lib/sdk.ts`, `app/dev/health/page.tsx`
**Do** SDK client with base URL and publishable key from env. A `/dev/health` server component
that fetches the region and prints its name and currency.
**Verify** `/dev/health` shows "Pakistan · PKR". Break the key deliberately — you get a clear
error, not a blank page. Restore it.

### Task 17 — Test runner
**Files** `vitest.config.ts`, `lib/utils/__tests__/smoke.test.ts`
**Do** Install Vitest. One trivial passing test. Add `npm test` to scripts. Pure functions in
this build (phone normalisation, price filtering, facet coverage) are load-bearing enough to
deserve real unit tests.
**Verify** `npm test` runs and passes in under 5 seconds.

### Task 18 — Formatting utilities
**Files** `lib/utils/format.ts`, tests
**Do** `formatPKR(amount)` — correct minor-unit handling for PKR, thousands separators, `Rs`
prefix. `cn()` class merger. Nothing else.
**Verify** Tests cover zero, a 3-digit price, a 7-digit price, and a null. All pass.

### Task 19 — Category data layer
**File** `lib/data/categories.ts`, `app/dev/categories/page.tsx`
**Do** `getCategoryTree()` — fetch the whole tree once, cache with `unstable_cache`.
`getDescendantIds(handle)` — resolve descendants **from the cached tree in memory**, not via a
per-record API call (§2.1.1). `getCategoryByHandle(handle)`.
**Verify** `/dev/categories` prints the tree indented by depth. `getDescendantIds` on a
top-level category returns every leaf beneath it. Second page load hits cache (log it).

### Task 20 — Product data layer, first pass
**File** `lib/data/products.ts`, `app/dev/products/page.tsx`
**Do** `getProduct(handle)` and a minimal `searchProducts({ categoryId, limit, offset })`. No
filtering yet — that's task 58. Trim `fields` to only what `ProductCard` needs. Everything goes
through this file (§2.1).
**Verify** `/dev/products` lists 20 products with title, thumbnail URL, and price. Response
payload per product is under ~1KB.

### Task 21 — Styleguide page
**File** `app/dev/styleguide/page.tsx`
**Do** An empty sectioned page on the cream background, with headings ready for each primitive.
Every task in Block C adds its component here.
**Verify** `/dev/styleguide` loads with the cream background and your heading font.

---

# Block C — Primitives (22–32)

`components/ui/`. Each takes colours and spacing from `tailwind.config`. A hex code inside any
of these means a token is missing. Each task adds a live instance to `/dev/styleguide`.

### Task 22 — `Button`
**File** `components/ui/Button.tsx`
**Do** Variants: `primary` (amber bg, `action.ink` text — never white), `secondary` (navy
outline), `ghost`. Sizes sm/md/lg. States: default, hover, disabled, loading. `asChild` support
for link buttons.
**Verify** Styleguide shows all 3 variants × 4 states. Amber button text contrast is 8:1 or
better in DevTools.

### Task 23 — `Input`
**File** `components/ui/Input.tsx`
**Do** Label, placeholder, error message slot, disabled state. `inputMode` and `type` pass
through — checkout needs `inputMode="tel"`. 16px minimum font size so iOS doesn't zoom.
**Verify** Styleguide shows default, focused, error, disabled. Focus ring visible on cream.

### Task 24 — `Select`
**File** `components/ui/Select.tsx`
**Do** Native `<select>` styled to match `Input`. Label, error, disabled. Must work as a
dependent dropdown later (province → city).
**Verify** Styleguide instance with 5 options opens natively on mobile viewport.

### Task 25 — `Checkbox`
**File** `components/ui/Checkbox.tsx`
**Do** Label, checked/unchecked/indeterminate, disabled. Touch target at least 44px even when
the box is smaller — filter groups are tapped on phones.
**Verify** Styleguide shows all states. Tap target measures ≥44px in DevTools.

### Task 26 — `RadioGroup`
**File** `components/ui/RadioGroup.tsx`
**Do** Used by shipping method selection later. Group label, options with description slot,
selected/disabled.
**Verify** Styleguide instance with 2 options; keyboard arrow keys move selection.

### Task 27 — `Badge`
**File** `components/ui/Badge.tsx`
**Do** Variants: `sale` (sale red), `success`, `neutral` (muted). Small, rounded per token.
**Verify** Styleguide shows all three. Sale red is visibly distinct from brand navy.

### Task 28 — `Skeleton`
**File** `components/ui/Skeleton.tsx`
**Do** Pulse block, accepts width/height/radius via className. No layout shift when swapped for
real content.
**Verify** Styleguide shows a text-line skeleton and a card-shaped skeleton, both animating.

### Task 29 — `Drawer`
**File** `components/ui/Drawer.tsx`
**Do** Slide-in panel. Sides: left (MobileNav), right (CartDrawer), bottom (FilterDrawer).
Backdrop, Escape to close, focus trap, body scroll lock.
**Verify** Styleguide button opens each of the three sides. Escape closes. Background doesn't
scroll while open.

### Task 30 — `Modal`
**File** `components/ui/Modal.tsx`
**Do** Centred dialog, backdrop, Escape, focus trap. Mobile: full-width with margin.
**Verify** Styleguide button opens it. Tab cycles inside only.

### Task 31 — `Toast`
**File** `components/ui/Toast.tsx` + provider
**Do** Bottom-positioned on mobile, top-right on desktop. Success and error variants,
auto-dismiss, stackable. Fires on add-to-cart later.
**Verify** Styleguide button fires one; a second fires while the first is up and they stack.

### Task 32 — `Accordion`
**File** `components/ui/Accordion.tsx`
**Do** Single and multiple open modes. Used by `MobileNav`, `ProductTabs`, FAQ, and checkout
steps — four places, so it's a primitive, not a one-off. Must support nesting (mobile nav goes
3 deep).
**Verify** Styleguide shows a 3-level nested accordion expanding correctly.

**Block C done when** `/dev/styleguide` renders all 11 primitives in every state on the cream
background, and `npm run build` passes.

---

# Block D — Shared product components (33–37)

`components/shared/`. These land before any page, because five pages inherit them.

### Task 33 — `PriceDisplay`
**File** `components/shared/PriceDisplay.tsx`
**Do** Props: price, optional compare-at price. Renders current price in brand navy, compare-at
struck through in muted, and the saving in sale red. Uses `formatPKR` from task 18. Size
variants for card / detail page / cart line.
**Verify** Styleguide shows it with and without a compare-at price, in all three sizes. No
layout shift between the two states.

### Task 34 — `StarRating`
**File** `components/shared/StarRating.tsx`
**Do** Display-only for now — value 0–5 with half stars, optional count text. The interactive
version for the review form comes in task 130. Accepts `size` so it works at card scale.
**Verify** Styleguide shows 0, 2.5, 4.7, and 5 stars. Half star renders correctly at card size,
not just at large size.

### Task 35 — `ProductCard` ⚠️ highest-leverage component in the build
**File** `components/shared/ProductCard.tsx`
**Do** Props: `product` (Medusa `StoreProduct`). Image with fixed aspect ratio via `next/image`,
title with 2-line truncation, `PriceDisplay`, `StarRating`, `Badge` when `compare_at_price`
exists, out-of-stock state. Whole card is one link. Mobile-first: two per row at 360px.
**Spend real time here.** Five pages inherit it and it's most of what a mobile visitor ever
sees. Get the aspect ratio, truncation, and badge position right now.
**Verify** Styleguide renders 6 real products from task 20 at 360px, 768px, 1280px. No layout
shift on image load. Long titles truncate at exactly 2 lines. A product without a discount has
no empty badge gap.

### Task 36 — `ProductGrid`
**File** `components/shared/ProductGrid.tsx`
**Do** Responsive grid of `ProductCard`. 2 columns at 360px, 3 at tablet, 4 at desktop. Loading
state renders `Skeleton` cards at the same dimensions.
**Verify** Styleguide shows 12 products gridded at all three breakpoints, and the skeleton state
occupies identical space.

### Task 37 — `ProductRail`
**File** `components/shared/ProductRail.tsx`
**Do** Horizontally scrolling row of `ProductCard` with a section heading and optional "view
all" link. Snap scrolling, momentum on touch, arrow buttons on desktop only. Reused on home and
product detail.
**Verify** Styleguide rail with 10 products scrolls by touch on a mobile viewport and by arrows
on desktop. Cards don't half-clip at the right edge.

---

# Block E — Layout shell (38–49)

`components/layout/`. Build the shell once; it appears on 14 of the 16 pages.

### Task 38 — `Container`
**File** `components/layout/Container.tsx`
**Do** Max-width and horizontal gutters from the token scale. Everything else sits inside it.
**Verify** Styleguide content is centred with correct gutters at 360px and 1440px.

### Task 39 — `Breadcrumbs`
**File** `components/layout/Breadcrumbs.tsx`
**Do** Props: array of `{ label, href }`. Muted text, current page not a link. Truncates the
middle on mobile rather than wrapping. Not used on home, but unblocks pages 2–6.
**Verify** Styleguide shows a 4-level trail at 360px on one line without overflow.

### Task 40 — `AnnouncementBar`
**File** `components/layout/AnnouncementBar.tsx`
**Do** Top strip, navy background, cream text. Static copy for now — delivery and COD
messaging. **No free-delivery claim** (§5.1). Dismissible is optional; if added, don't persist.
**Verify** Renders full-bleed above the header at all widths.

### Task 41 — `SearchBar`
**File** `components/layout/SearchBar.tsx`
**Do** Input plus submit, navigating to `/search?q=`. **No typeahead yet** — that's task 78.
Collapses to an icon on mobile that expands over the header.
**Verify** Typing and pressing Enter navigates to `/search?q=shirt`. Mobile icon expands and
takes focus.

### Task 42 — `CartButton`
**File** `components/layout/CartButton.tsx`
**Do** Icon with item-count badge. Count reads from a cart context that returns 0 for now —
wired to real data in task 93. Links to `/cart`.
**Verify** Renders with no badge at count 0, and with a badge at a hardcoded count of 3.

### Task 43 — `CategoryMegaMenu`
**File** `components/layout/CategoryMegaMenu.tsx`
**Do** Desktop hover panel over the cached tree from task 19. Level 2 as column headings, level
3 as links beneath. **Render recursively** — whatever depth the tree returns, not hardcoded two
levels. Links go to `/categories/[handle]`, single segment (§2.1.1).
**Verify** Hovering a top-level category shows your real subcategories in columns. Add a third
level in admin, reload, it appears with no code change.

### Task 44 — `MobileNav`
**File** `components/layout/MobileNav.tsx`
**Do** `Drawer` (left) + `Accordion`, recursive over the same tree. Tapping a parent expands;
tapping its name row navigates. Close on navigation.
**Verify** Drawer opens at 360px, expands 3 levels, and navigating closes it.

### Task 45 — `Header`
**File** `components/layout/Header.tsx`
**Do** Composes logo, `SearchBar`, `CartButton`, `CategoryMegaMenu` (desktop), `MobileNav`
trigger (mobile). Sticky, shrinks on scroll. Logo lockup: KARKHANO small above PRIME large,
~1:3 cap height, KARKHANO letterspaced ~0.35em so widths match (§2.3).
⚠️ **No "Login" or "Create account" anywhere** — accounts are v2 and a dead link is worse than
absence (§2.2).
**Verify** Sticky on scroll with the shrink transition, at 360px and 1440px. No auth links
anywhere in the DOM.

### Task 46 — `TrustStrip`
**File** `components/layout/TrustStrip.tsx`
**Do** Three or four icon+label items: COD available, delivery time, easy returns, WhatsApp
support. Used on home, cart, and the checkout layout.
**Verify** Renders as a row on desktop, 2×2 grid at 360px, icons aligned.

### Task 47 — `Footer`
**File** `components/layout/Footer.tsx`
**Do** Navy background, reversed logo, category links, policy links (routes exist from task
137 — link them now, they'll 404 until then), contact block with WhatsApp number, copyright.
**Verify** Renders at all widths, policy links present, contrast passes on navy.

### Task 48 — `WhatsAppFloatButton`
**File** `components/layout/WhatsAppFloatButton.tsx`
**Do** Fixed bottom-right, opens `wa.me` with your number and a prefilled message. Must not
cover the `StickyMobileBuyBar` (task 92) — decide the z-index and offset now.
**Verify** Tapping opens WhatsApp on a real phone. Doesn't overlap the bottom nav area on iOS
Safari.

### Task 49 — Shop layout
**File** `app/(shop)/layout.tsx`
**Do** Assemble: `AnnouncementBar` → `Header` → `MobileNav` → `Container` → children →
`TrustStrip` → `Footer` → `WhatsAppFloatButton`. Route group parentheses mean `(shop)` never
appears in a URL (§3).
**Verify** A stub page inside `(shop)` shows the full shell. URL has no `/shop` segment.

**Block E done when** navigation renders your real Medusa category tree at every depth, on both
desktop and mobile.

---

# Block F — Home page (50–56)

`components/page/home/`. Finish line one.

### Task 50 — `HeroCarousel`
**File** `components/page/home/HeroCarousel.tsx`
**Do** Full-width slides: image, heading, subheading, one `Button`. Auto-advance with pause on
interaction, swipe on touch, dots. First slide image is `priority` — it's the LCP element.
Content hardcoded for now.
**Verify** Swipes at 360px, auto-advances, and the first slide image has `priority` in the DOM.

### Task 51 — `CategoryGrid`
**File** `components/page/home/CategoryGrid.tsx`
**Do** Tiles for top-level categories from the cached tree — image, name, link. 2 columns at
360px, up to 5 or 6 on desktop.
**Verify** Shows your real top-level categories, each linking to a working `/categories/[handle]`
stub.

### Task 52 — `PromoBannerPair`
**File** `components/page/home/PromoBannerPair.tsx`
**Do** Two side-by-side promo cards on desktop, stacked at 360px. Image, heading, link.
**Verify** Stacks at 360px, sits side by side at 1024px, images don't distort at either.

### Task 53 — `BrandStrip`
**File** `components/page/home/BrandStrip.tsx`
**Do** Logo row of brands you stock, each linking to a filtered listing (`?brand=` — the param
lands in task 57; link to the category page for now). Greyscale, colour on hover.
**Verify** Renders 6–8 logos in a row, wrapping cleanly at 360px.

### Task 54 — `NewsletterSignup`
**File** `components/page/home/NewsletterSignup.tsx`
**Do** Email input + `Button`. Posts to your existing Brevo list. Success and error states via
`Toast`. Keep it honest — no promise of a discount you won't send.
**Verify** A real submission appears in Brevo. Invalid email shows an inline error, not a toast.

### Task 55 — `HomeSkeleton`
**File** `components/page/home/HomeSkeleton.tsx`
**Do** Skeleton mirroring the home layout: hero block, category tiles, three rails. Same
dimensions as the real thing so nothing jumps.
**Verify** `app/(shop)/loading.tsx` renders it; throttle to Slow 3G and confirm no layout shift
when real content arrives.

### Task 56 — Home page assembly 🏁
**File** `app/(shop)/page.tsx`
**Do** `HeroCarousel` → `CategoryGrid` → `ProductRail` ×3 (New In / Best Sellers / Sale, fed by
collection or tag queries through `lib/data`) → `PromoBannerPair` → `BrandStrip` → `TrustStrip`
→ `NewsletterSignup`. Static + `revalidate` (§3).
**Verify** Real products in all three rails. Mega menu shows the real tree. Lighthouse mobile
performance ≥ 80 on a throttled run. Loads acceptably on a mid-range Android over 4G.

**You now have a live home page.** The next 18 tasks are the hardest part of the build.

---

# Block G — Category listing and filtering (57–74)

The most complex page. Filtering runs in the **Next.js server layer**, inside RSCs — never in
the browser (§2.1).

### Task 57 — URL filter state
**File** `lib/filters/url-state.ts` + tests
**Do** Parse and serialise `?color=red,blue&brand=x&price=1000-5000&sort=price_asc&page=2`.
Helpers to add, remove, and clear a value while preserving the rest. Use `nuqs` or hand-rolled
`useSearchParams` helpers — decide now, before the sidebar exists (§4.4).
**Verify** Tests: round-trip a 4-filter URL, remove one value from a multi-value group, clear
all, and confirm changing a filter resets `page` to 1.

### Task 58 — `searchProducts()` full implementation
**File** `lib/data/products.ts`
**Do** Fetch the **full result set** for a category with `fields` trimmed to `ProductCard`
needs, cache with `unstable_cache`, then filter and paginate **in server memory**. Medusa
handles `category_id`, `option_value_id`, `tag_id`, `q`, `order`. You cannot let Medusa
paginate *and* post-filter or the counts go wrong (§2.1).
**Verify** A 200-product category returns in under 500ms warm. Log the cached payload size —
should be roughly 500 bytes per product, ~100KB, never shipped to the browser.

### Task 59 — Price filtering in the server layer
**File** `lib/filters/price.ts` + tests
**Do** Filter the in-memory set by min/max. Compute the true min and max of the result set for
the slider bounds. Prices are calculated at query time, so this cannot be a Medusa param (§2.1).
**Verify** Tests: inclusive bounds, min-only, max-only, empty result, and a product whose
variants span the boundary.

### Task 60 — Facet derivation + coverage threshold
**File** `lib/filters/facets.ts` + tests
**Do** From the in-memory set, group option values by their **string** (option values are
per-product records with different IDs) and collect every matching ID per group. Produce counts.
**Render a group only if it covers ≥25% of the result set** (§2.1.2). Semantics: OR within a
group, AND across groups; when a group is active, products lacking that option are excluded.
**Verify** Tests: a group at 24% is dropped and at 26% is kept; two products with `Red` produce
one group holding two IDs; AND across groups narrows correctly.

### Task 61 — `config/filters.ts`
**File** `config/filters.ts`
**Do** `filterOrder` array and `filterHidden` array only. Order and exclusion — nothing else.
Filters are derived from data, not declared here (§2.1.2).
**Verify** Reordering the array reorders the sidebar. Adding a title to `filterHidden` removes
it.

### Task 62 — Verify option grouping against real data ⚠️
**Do** Not a component. Run the facet derivation over your full imported catalogue and print
every derived option title and value with its count. Hunt for near-duplicates that the sheet in
task 8 was supposed to prevent.
**Verify** Zero unexpected groups. If `Colour` and `Color` both appear, or `128GB` and
`128 GB`, **stop and fix the data in admin now** — it is far cheaper here than after 300 more
products.

### Task 63 — Category route shell
**File** `app/(shop)/categories/[handle]/page.tsx`
**Do** Resolve handle → category (task 19), collect descendant IDs, call `searchProducts`,
render `ProductGrid`. `notFound()` on an unknown handle. Dynamic rendering — it reads
`searchParams` (§3).
**Verify** `/categories/laptops` shows real products. A junk handle renders the 404. Parent
categories show products from their leaves, not an empty page.

### Task 64 — `CategoryHeader`
**File** `components/page/catalog/CategoryHeader.tsx`
**Do** Title, description, subcategory chips linking one level down, result count.
**Verify** Parent category shows child chips; a leaf shows none, with no empty gap.

### Task 65 — `SortDropdown`
**File** `components/page/catalog/SortDropdown.tsx`
**Do** Options: Newest, Price low→high, Price high→low, Name. ("Highest Rated" is added in task
136.) Writes to the URL, never local state. Preserves other params.
**Verify** Changing sort updates the URL and reorders the grid. Back button restores the
previous order.

### Task 66 — `PaginationControls`
**File** `components/page/catalog/PaginationControls.tsx`
**Do** Page numbers with prev/next, condensed at 360px. Writes `?page=`. Preserves filters.
**Verify** Page 2 keeps active filters in the URL. Reload on page 2 shows the same products.

### Task 67 — `CheckboxFilterGroup`
**File** `components/page/catalog/CheckboxFilterGroup.tsx`
**Do** Collapsible group with counts, "show more" past 8 values. Used for brand and spec
attributes. Multi-select, OR within the group. Passes **every matching option-value ID** for the
selected string (task 60).
**Verify** Selecting two brands shows products from both. Counts match the visible result count.

### Task 68 — `ColorSwatchFilter`
**File** `components/page/catalog/ColorSwatchFilter.tsx`
**Do** Swatch grid mapping colour names to hex via a lookup in `config/`. Unknown names fall
back to a labelled chip rather than a blank square. Selected state clearly visible on cream.
**Verify** Every colour value in your catalogue either maps to a swatch or renders a readable
fallback. No invisible white-on-white swatch.

### Task 69 — `PriceRangeFilter`
**File** `components/page/catalog/PriceRangeFilter.tsx`
**Do** Min/max inputs plus a slider, bounded by the true range from task 59. Debounced URL
write. PKR formatting.
**Verify** Dragging updates the URL once after settling, not per pixel. Bounds match the actual
cheapest and dearest product in the category.

### Task 70 — `ActiveFilterChips`
**File** `components/page/catalog/ActiveFilterChips.tsx`
**Do** One chip per active value with an × , plus "Clear all". Reads entirely from the URL.
**Verify** Removing a chip removes only that value. Clear all returns to the unfiltered URL.

### Task 71 — `FilterSidebar`
**File** `components/page/catalog/FilterSidebar.tsx`
**Do** Desktop, sticky. Renders the derived groups in `filterOrder`, using tasks 67–69.
Desktop applies on change.
**Verify** Sticks on scroll past the header. Only groups above the 25% threshold appear. Leaf
categories show spec filters; parents show only cross-cutting ones.

### Task 72 — `FilterDrawer`
**File** `components/page/catalog/FilterDrawer.tsx`
**Do** Mobile bottom sheet from `Drawer`, **same children** as the sidebar. Staged state with an
Apply button and a live result count — mobile does not apply on change. Active filter count on
the trigger.
**Verify** At 360px: open, select three filters, count updates before applying, Apply closes and
updates the grid and URL. Dismissing without Apply changes nothing.

### Task 73 — `EmptyState` + `EmptyResults`
**Files** `components/shared/EmptyState.tsx`, `components/page/catalog/EmptyResults.tsx`
**Do** Generic empty state in `shared/` (used later by cart and track). Catalog version suggests
filter relaxation: name which filter to drop and how many results that would return.
**Verify** A filter combination with zero results shows the message and a working "remove price
filter → 14 results" suggestion.

### Task 74 — Category loading state
**File** `app/(shop)/categories/[handle]/loading.tsx`
**Do** Skeleton sidebar plus skeleton grid at the real dimensions, so navigation streams instead
of blocking.
**Verify** On Slow 3G, navigating to a category paints the skeleton immediately, then swaps with
no layout shift.

**Block G done when** filters work, survive a refresh, are shareable as a URL, and the back
button behaves.

---

# Block H — Search (75–78)

Mostly assembly — same components as the category page.

### Task 75 — Search in the data layer
**File** `lib/data/products.ts`
**Do** Extend `searchProducts` to take `q`, passed through to Medusa. Same server-layer
filtering afterwards, so search results are filterable exactly like a category.
**Verify** `/dev/products?q=shirt` returns matches. An empty query returns everything, not an
error.

### Task 76 — `SearchResultHeader`
**File** `components/page/catalog/SearchResultHeader.tsx`
**Do** Result count and the echoed query, with a "no results for X" variant. Replaces
`CategoryHeader`; no breadcrumbs on search (§3).
**Verify** Shows the correct count and echoes the query safely — try a query containing `<`.

### Task 77 — `/search` page
**File** `app/(shop)/search/page.tsx`
**Do** Identical to the category page with the header swapped and breadcrumbs dropped. Same
filters, grid, pagination. Dynamic.
**Verify** `/search?q=shirt&color=blue` filters correctly and the URL is shareable.

### Task 78 — Typeahead
**File** `components/layout/SearchBar.tsx`
**Do** Debounced suggestions: up to 5 products with thumbnails plus matching category names.
Keyboard navigable. Enter without a selection goes to the full results page.
**Verify** Typing three characters shows suggestions within ~300ms. Arrow keys and Enter select.
Escape closes without navigating.

---

# Block I — Collections (79–80)

### Task 79 — Collection data layer
**File** `lib/data/collections.ts`
**Do** `getCollection(handle)` and products by `collection_id`, cached. Reuses the same
server-layer pagination.
**Verify** `/dev/products` variant lists your Sale collection.

### Task 80 — `/collections/[handle]` page
**File** `app/(shop)/collections/[handle]/page.tsx`
**Do** `Breadcrumbs` · `CategoryHeader` · `SortDropdown` · `ProductGrid` · `PaginationControls`.
**Deliberately no faceted filters** — merchandised sets don't need them (§4.10). Static +
revalidate, `generateStaticParams` over collection handles.
**Verify** `/collections/sale` renders and sorts. Unknown handle 404s. Page is statically
generated (check the build output).

---

# Block J — Product detail (81–92)

### Task 81 — Product detail data + static params
**File** `lib/data/products.ts`, `app/(shop)/products/[handle]/page.tsx`
**Do** `getProduct(handle)` returning full variants, options, images, and metadata.
`generateStaticParams` over product handles, `revalidate` on a timer, `notFound()` on unknown
(§3). Page renders title and price only for now.
**Verify** A product page is statically generated at build. Unknown handle 404s. Build time is
acceptable with your product count.

### Task 82 — `ProductGallery`
**File** `components/page/product/ProductGallery.tsx`
**Do** Desktop main image with zoom on hover. Fixed aspect ratio matched to `ProductCard` so
supplier images of mixed quality composite cleanly on cream. `priority` on the first image.
**Verify** No layout shift on load. A portrait and a landscape source image both render without
distortion.

### Task 83 — `GalleryThumbnails`
**File** `components/page/product/GalleryThumbnails.tsx`
**Do** Desktop thumbnail column or row, selected state, keyboard navigable. Selecting swaps the
main image.
**Verify** 6 thumbnails render; clicking each swaps the main image; active state is clear.

### Task 84 — `MobileGallerySwiper`
**File** `components/page/product/MobileGallerySwiper.tsx`
**Do** Full-width swipeable images with dots at 360px. Snap scroll, no arrows.
**Verify** Swipes between 5 images on a mobile viewport; dot index tracks correctly.

### Task 85 — `ProductTitleBlock`
**File** `components/page/product/ProductTitleBlock.tsx`
**Do** Title, brand (from tag), SKU, and `StarRating` that anchor-links down to the reviews
block. Rating renders as "no reviews yet" until Block N.
**Verify** Clicking the stars scrolls to the reviews anchor. No-review state doesn't show
"0 stars".

### Task 86 — `VariantOptionSelector`
**File** `components/page/product/VariantOptionSelector.tsx`
**Do** One control per **variant-defining** option (Colour, Size, Storage). Single-value spec
options must **not** render here — they belong in the specs tab (§2.1). Unavailable
combinations disabled, not hidden. Selecting resolves the variant and updates price, image, and
stock.
**Verify** Switching colour updates price, image, and stock together. An out-of-stock
combination is visibly disabled. A product whose only option has one value shows no selector.

### Task 87 — `StockIndicator`
**File** `components/page/product/StockIndicator.tsx`
**Do** In stock (success green), low stock, out of stock. Green is a **status colour, never a
CTA** (§2.3).
**Verify** All three states render. The green label sits next to the amber button without the
two competing.

### Task 88 — `QuantityStepper`
**File** `components/shared/QuantityStepper.tsx`
**Do** −/+ with a typed input. Min 1, max from inventory. 44px touch targets. Shared — cart uses
it too.
**Verify** Typing `0`, `-3`, `abc`, and `9999` all clamp correctly without crashing.

### Task 89 — `DeliveryEstimateBox`
**File** `components/page/product/DeliveryEstimateBox.tsx`
**Do** COD availability, delivery window, returns note. Copy comes from the shipping option
names where possible (§5.1). Reused on the confirmation page.
**Verify** Renders with your real delivery windows, and doesn't claim free delivery.

### Task 90 — `ProductTabs`
**File** `components/page/product/ProductTabs.tsx`
**Do** Description / Specifications / Shipping & Returns, using `Accordion` on mobile and tabs
on desktop. **Specifications renders the single-value options** — this is where Fabric, RAM,
Warranty surface.
**Verify** Specs tab lists every single-value option for a real product. Empty tabs don't
render.

### Task 91 — Product page assembly
**File** `app/(shop)/products/[handle]/page.tsx`
**Do** `Breadcrumbs` · gallery (desktop pair / mobile swiper) · `ProductTitleBlock` ·
`PriceDisplay` · `VariantOptionSelector` · `StockIndicator` · `QuantityStepper` ·
`DeliveryEstimateBox` · `ProductTabs` · `ProductRail` for related. Add-to-cart button lands in
task 94.
**Verify** Full page renders at 360px and 1440px with correct breadcrumbs from the real category
tree.

### Task 92 — `StickyMobileBuyBar`
**File** `components/page/product/StickyMobileBuyBar.tsx`
**Do** Appears at 360px once the main buy area scrolls out of view. Price + add to cart. Must
not collide with `WhatsAppFloatButton` (task 48) — resolve the z-index and offset here.
**Verify** Appears on scroll at 360px, hides at desktop width, and the WhatsApp button is still
tappable.

---

# Block K — Cart (93–101)

### Task 93 — Cart data layer + server actions
**File** `lib/data/cart.ts`
**Do** Create cart with the region and sales channel, add/update/remove line, retrieve. Cart ID
in an httpOnly cookie. Server actions, `revalidateTag` on mutation. Built **before**
`AddToCartButton` so the button has something real to call.
**Verify** A cart is created and its ID persists across a full browser restart. Adding the same
variant twice increments quantity rather than creating a second line.

### Task 94 — `AddToCartButton`
**File** `components/page/product/AddToCartButton.tsx`
**Do** Amber primary `Button`, loading state during the action, disabled when out of stock or no
variant is selected. Fires a success `Toast` and opens `CartDrawer` (task 100 — navigate to
`/cart` until then).
**Verify** Adding from the product page increases the header count. Double-clicking adds one
item, not two.

### Task 95 — `CartSummary`
**File** `components/shared/CartSummary.tsx`
**Do** Subtotal, shipping (shows "calculated at checkout" pre-address), total. Shared — checkout
and the confirmation page reuse it.
**Verify** Totals match the Medusa cart exactly, including minor units. No hardcoded shipping
figure.

### Task 96 — `CartLineItem`
**File** `components/page/cart/CartLineItem.tsx`
**Do** Desktop row: image, title, variant options, `QuantityStepper`, `PriceDisplay`, remove.
Optimistic update with rollback on failure.
**Verify** Quantity change updates the line and the summary. A forced network failure rolls the
UI back and shows an error toast.

### Task 97 — `CartLineItemMobile`
**File** `components/page/cart/CartLineItemMobile.tsx`
**Do** Stacked card layout for 360px. Same actions, thumb-reachable controls.
**Verify** Renders without horizontal overflow at 360px with a long product title.

### Task 98 — `EmptyCart`
**File** `components/page/cart/EmptyCart.tsx`
**Do** Uses `EmptyState`. Message plus a `Button` to the home page or a top category.
**Verify** An empty cart shows it — no empty table headers or a zero-total summary.

### Task 99 — `/cart` page
**File** `app/(shop)/cart/page.tsx`
**Do** `Breadcrumbs` · line items (desktop/mobile variants) · `CartSummary` · `TrustStrip` ·
checkout CTA · `EmptyCart`. Dynamic — depends on the cart cookie.
**Verify** Full flow: add two products, edit a quantity, remove one, land on empty state.

### Task 100 — `CartDrawer`
**File** `components/page/cart/CartDrawer.tsx`
**Do** Right `Drawer` opened by add-to-cart. Line items, subtotal, "view cart" and "checkout"
buttons. Drawer converts better than navigating away (§4.6).
**Verify** Adding from a product page opens the drawer with the new item at the top. Closing
returns focus to the button that opened it.

### Task 101 — Cart edge cases
**Do** Not a component. Handle: a stale cart ID whose cart no longer exists, a variant that went
out of stock while in the cart, a deleted product, and quantity exceeding inventory at checkout
time.
**Verify** Each of the four cases shows a clear message and a recoverable cart. None produces a
blank page or a stuck spinner.

---

# Block L — Checkout (102–114)

The highest-stakes code in the app. Budget more time than feels reasonable. Task 102 comes
first because everything after depends on it and it is the most expensive thing to retrofit.

### Task 102 — `normalizePhone()` + synthetic email ⚠️
**File** `lib/identity/phone.ts` + tests
**Do** `normalizePhone(raw)` accepting `03xxxxxxxxx`, `+923xxxxxxxxx`, `00923…`, with spaces or
dashes, returning digits only: `923001234567`. `syntheticEmail(normalised)` returning
`{normalised}@nomail.kprime.pk`. **Runs at the API boundary, never in a component.** Nothing
else may touch a raw phone string (§2.2).
⚠️ **Freeze the email format.** It's the lookup key that lets v2 accounts claim guest history.
**Verify** Tests cover all four input shapes plus spaces, dashes, a leading `+`, a too-short
number, and non-digits. Every valid variant of one number produces the identical output string.

### Task 103 — Provinces and cities data
**File** `lib/data/shipping.ts`
**Do** Fetch from `/store/shipping-cities` (task 11), cached. Returns provinces with their
cities.
**Verify** Returns your real zone cities grouped by province. Adding a city in admin appears
after cache expiry with no code change.

### Task 104 — Checkout layout + `CheckoutStepper`
**Files** `app/(checkout)/layout.tsx`, `components/page/checkout/CheckoutStepper.tsx`
**Do** Stripped shell: logo → `CheckoutStepper` → children → `TrustStrip`. **No nav, no search,
no footer links.** Removing the exits measurably reduces drop-off (§4.10). Stepper shows 4
steps with completed/current/upcoming states.
**Verify** `/checkout` shows no header nav, no mega menu, no footer. The logo links home and is
the only way out.

### Task 105 — `ContactStep`
**File** `components/page/checkout/ContactStep.tsx`
**Do** Name (required), phone (required, `inputMode="tel"`), email (**optional**). On submit,
normalise the phone and set `cart.email` to the synthetic address **always, even when a real
email was typed**; the real one goes to `cart.metadata.contact_email` (§2.2).
**Verify** Submit with a real email — the Medusa cart shows the synthetic address in `email` and
the typed one in `metadata.contact_email`. Submit `0300 123 4567` and `+923001234567` in two
separate carts; both produce the same `email`.

### Task 106 — `ProvinceCitySelect`
**File** `components/page/checkout/ProvinceCitySelect.tsx`
**Do** Dependent dropdowns from task 103. City resets when province changes.
⚠️ **City must be a dropdown, never free text** — geo zone matching is on the city string, and
a typed `pindi` silently returns zero shipping options with no error (§5.1).
**Verify** No free-text city input exists in the DOM. Selecting a province filters cities.
Changing province clears a previously selected city.

### Task 107 — `ShippingAddressStep`
**File** `components/page/checkout/ShippingAddressStep.tsx`
**Do** Street address, `ProvinceCitySelect`, optional delivery phone, optional landmark note.
**No postal code field** (§2.2). Writes the shipping address to the cart.
**Verify** Address saves to the Medusa cart with the correct city string. No postal code
anywhere. A delivery phone different from the contact phone is preserved as-is.

### Task 108 — `ShippingMethodStep`
**File** `components/page/checkout/ShippingMethodStep.tsx`
**Do** `RadioGroup` of live shipping options for the cart's address, with price and the SLA from
the option name. **This step must not render until the address is complete** — options resolve
against the city (§5.1).
**Verify** A Metro city shows Standard and Express at the right prices; a Remote city shows
Standard only. Zero options renders a clear "we can't deliver to this city — contact us on
WhatsApp" message, never a blank list.

### Task 109 — `PaymentStep`
**File** `components/page/checkout/PaymentStep.tsx`
**Do** COD display only — no card fields, no provider choice. Initialises the `manual` payment
session. Short copy explaining pay-on-delivery.
**Verify** Payment collection is created on the cart with the manual provider.

### Task 110 — `OrderSummaryPanel`
**File** `components/page/checkout/OrderSummaryPanel.tsx`
**Do** Reuses `OrderItemsList` (task 115 — inline a simple list for now) and `CartSummary`.
Sticky sidebar on desktop, collapsed accordion at the top on mobile.
**Verify** Total updates when the shipping method changes. Collapsed by default at 360px.

### Task 111 — `OrderReviewStep`
**File** `components/page/checkout/OrderReviewStep.tsx`
**Do** Read-only recap of contact, address, method, and totals, each with an edit link back to
its step.
**Verify** Every edit link opens the right step with values preserved.

### Task 112 — `PlaceOrderButton` + cart completion
**File** `components/page/checkout/PlaceOrderButton.tsx`
**Do** Completes the cart, handles the failure path without losing the cart, disables during
submission, redirects to `/order/confirmed/[id]`. Copy stays soft — "we've received your order,
we'll be in touch" rather than "confirmed and dispatching", so the verification call doesn't
contradict it (§2.2).
**Verify** 🏁 **A real order appears in the Medusa admin** with the correct address, shipping
method, and total. Double-clicking places one order, not two. An induced failure keeps the cart
intact.

### Task 113 — Customer record + verification flag
**File** `lib/data/checkout.ts`
**Do** During checkout, write the normalised phone and name onto the **Customer record** —
`phone` is a native field, so it becomes a real admin column rather than JSON (§2.2). Set
`metadata.phone_verified = false` on the order at placement.
**Verify** 🏁 **A second order from the same phone lands under the same customer record.**
Searching that phone in Admin → Customers shows both orders. `phone_verified` is `false` on
both.

### Task 114 — Checkout hardening
**Do** Not a component. Handle: back-button mid-checkout, refresh mid-checkout, session
expiry, an item going out of stock between cart and placement, and a network failure during
completion.
**Verify** Each case leaves a recoverable cart and a clear message. None double-charges,
double-orders, or empties the cart silently.

---

# Block M — Confirmation and tracking (115–121)

### Task 115 — `OrderItemsList`
**File** `components/shared/OrderItemsList.tsx`
**Do** Image, title, variant, quantity, line total. Shared by the confirmation page, `/track`,
and the checkout summary. Retrofit task 110 to use it.
**Verify** Renders identically on both pages at 360px.

### Task 116 — `OrderConfirmationHero`
**File** `components/page/order-confirmed/OrderConfirmationHero.tsx`
**Do** Order number — large, prominent, copyable with one tap. Success-green confirmation
marker. Soft copy per task 112.
**Verify** Tapping the number copies it on a real phone and shows a toast. The number is the
largest text on the page.

### Task 117 — `/order/confirmed/[id]` ⚠️ the only receipt
**File** `app/(shop)/order/confirmed/[id]/page.tsx`
**Do** `OrderConfirmationHero` · `OrderItemsList` · `CartSummary` totals · `DeliveryEstimateBox`
· WhatsApp contact block · an explicit **"screenshot this page"** prompt · `Button` back to
shopping. With no email and no SMS, a customer who closes this tab has nothing —
**over-design it** relative to its apparent importance (§2.2).
**Verify** Screenshot the page on a phone: order number, items, total, delivery window, and
WhatsApp number are all legible in that one image. Reloading the URL still works.

### Task 118 — `/store/track` backend route ⚠️
**File** backend `src/api/store/track/route.ts`
**Do** Accepts order number **and** normalised phone together, both required, returns the order
only on an exact match of both. Rate-limited per IP. Uses the same `normalizePhone` logic.
⚠️ **Never build phone-only lookup.** `03XX` is an enumerable space — an open endpoint hands a
stranger's address and purchase history to anyone with a number in their contacts (§2.2).
**Verify** Correct pair returns the order. Correct phone with a wrong order number returns 404,
not a list. 20 rapid requests get rate-limited. There is no code path that accepts a phone
alone.

### Task 119 — `TrackOrderForm`
**File** `components/page/track/TrackOrderForm.tsx`
**Do** Order number and phone, **both required**. Normalises the phone client-side for display
but sends it through the API boundary. Generic error on a no-match — never reveal whether the
order number exists.
**Verify** Missing either field blocks submission. A wrong pair shows the same message as a
non-existent order.

### Task 120 — `OrderStatusTimeline`
**File** `components/page/track/OrderStatusTimeline.tsx`
**Do** Placed → Confirmed → Shipped → Delivered, with the current step marked. Shows **carrier
name, tracking number, and tracking URL** when a fulfillment exists — the carrier differs per
order because booking is manual (§5.1).
**Verify** An order with a manually entered TCS tracking number shows the carrier, the number,
and a working link. An unfulfilled order shows the timeline without an empty tracking block.

### Task 121 — `/track` page
**File** `app/(shop)/track/page.tsx`
**Do** `TrackOrderForm` → on match: `OrderStatusTimeline` · `OrderItemsList` · tracking block.
`EmptyResults` on no match. Dynamic.
**Verify** A real order from task 112 is retrievable by number + phone, and the phone works in
all four input formats.

---

# Block N — Reviews (122–136)

Medusa v2 has no reviews module — this is custom backend code plus storefront components. Built
after checkout because the verified-buyer check queries the customer ledger that checkout
creates (§2.4).

### Task 122 — Review module scaffold + model
**File** backend `src/modules/review/models/review.ts`
**Do** Fields: `id`, `product_id`, `customer_id`, `rating` (1–5), `title`, `body`,
`status` (`pending` | `approved` | `rejected`), `parent_id`, `created_at`. Add `parent_id` even
though replies are the only nesting you'll render — flat now, deeper stays possible (§2.4).
**Verify** Module registers and the model compiles.

### Task 123 — Migration + product link
**File** backend module migration + `src/links/product-review.ts`
**Do** Generate and run the migration. Define the module link to Product.
**Verify** Table exists in the database. A review row can be created and queried with its
product through the link.

### Task 124 — Review service
**File** backend `src/modules/review/service.ts`
**Do** `list(productId, { status, limit, offset })`, `create()`, `approve()`, `reject()`,
`reply()`. Default status on create is `pending` (§2.4).
**Verify** A unit test or console script creates a review and it comes back with status
`pending`.

### Task 125 — Store GET route
**File** backend `src/api/store/products/[id]/reviews/route.ts`
**Do** Returns **approved only**, paginated, newest first. Never leaks pending or rejected.
**Verify** Create one pending and one approved review; the endpoint returns exactly one.

### Task 126 — Store POST route + verified buyer ⚠️
**File** same route, POST handler
**Do** Accepts rating, title, body, and phone. Normalises the phone, resolves the customer, and
checks: **does a delivered order exist under this phone containing this product?** Rejects
otherwise. One review per phone per product. Status `pending` on create (§2.4).
**Verify** A phone with a delivered order for that product succeeds. A phone with no order is
rejected. A second submission from the same phone for the same product is rejected. All three
tested against real orders from Block L.

### Task 127 — Denormalised aggregate
**File** backend service + subscriber
**Do** Store `average_rating` and `review_count` on the product side, recomputed on approve,
reject, and delete. Without it, a 24-product grid fires 24 aggregate queries (§2.4).
**Verify** Approving a review updates the product's stored average. A 24-product category page
fires one query for ratings, not 24 — check the query log.

### Task 128 — Admin routes + moderation screen
**Files** backend `src/api/admin/reviews/*`, admin UI extension
**Do** List with a status filter, approve, reject, and reply. Moderation is **mandatory** — a
public review form on a COD store here attracts spam within a week (§2.4).
**Verify** A pending review appears in the admin queue, approving it makes it public, rejecting
it hides it permanently.

### Task 129 — Cache invalidation
**File** storefront `lib/data/reviews.ts`
**Do** Product pages are static + revalidate, but reviews change. Render the **first page** of
reviews into the static payload and call `revalidateTag` on approval; fetch further pages
client-side (§2.4).
**Verify** Approving a review in admin makes it appear on the live product page without a
rebuild.

### Task 130 — `StarRating` interactive mode
**File** `components/shared/StarRating.tsx`
**Do** Extend task 34 with an `interactive` prop: hover preview, click to set, keyboard
accessible. Display mode unchanged.
**Verify** Styleguide shows both modes. Display instances elsewhere are visually unchanged.

### Task 131 — `ReviewSummary`
**File** `components/page/review/ReviewSummary.tsx`
**Do** Average with stars, total count, and a 5→1 distribution bar chart. Bars are clickable to
filter the list.
**Verify** Distribution matches the raw counts. Zero-review state shows a prompt, not empty
bars.

### Task 132 — `ReviewList` + `ReviewCard`
**Files** `components/page/review/ReviewList.tsx`, `ReviewCard.tsx`
**Do** Card: stars, title, body, masked reviewer name, date, verified-buyer badge. List: first
page server-rendered, "load more" fetches client-side. **Flat, no indentation** — threading is
unreadable at 360px (§2.4).
**Verify** First page is in the HTML source. Load more appends without re-rendering the page.
Names are masked (`Ahmed K.`), never full phone numbers.

### Task 133 — `MerchantReply`
**File** `components/page/review/MerchantReply.tsx`
**Do** One optional reply beneath a review, visually distinct, labelled as from the store.
Single level only.
**Verify** A review with a reply shows it indented once; a review without one shows nothing.

### Task 134 — `ReviewForm`
**File** `components/page/review/ReviewForm.tsx`
**Do** Interactive `StarRating`, title, body, phone. Submits to task 126. On success, a clear
"your review is awaiting approval" message — not a fake instant appearance.
**Verify** Non-buyer phone shows the rejection message. Valid submission shows the pending
message and the review does **not** appear on the page.

### Task 135 — Wire reviews into the product page
**File** `app/(shop)/products/[handle]/page.tsx`
**Do** `ReviewSummary` → `ReviewList` → `ReviewCard` → `MerchantReply`, plus `ReviewForm`.
Anchor target for the `StarRating` link from task 85. Also prompt for a review on the order
detail view — there's no confirmation message to put an invite link in (§2.4).
**Verify** Full round trip: submit from a verified phone → approve in admin → it appears on the
product page and the product's average updates on `ProductCard` in the category grid.

### Task 136 — `RatingFilter` + rating sort
**Files** `components/page/catalog/RatingFilter.tsx`, `lib/filters/rating.ts` + tests
**Do** "4 stars and up" style filter, run in the **Next.js server layer** — same place as price,
for the same reason: not natively queryable (§2.4). Add "Highest Rated" to `SortDropdown`.
**Verify** `?rating=4` filters correctly and combines with price and brand filters. "Highest
Rated" orders by the denormalised average, with unrated products last.

---

# Block O — Static pages (137–143)

`Container` plus prose. Nothing clever.

### Task 137 — `/about`
**Do** Who you are, where you ship from, why COD. Short.
**Verify** Renders inside the shop shell, readable at 360px.

### Task 138 — `/contact`
**Do** WhatsApp block (primary), phone, email, hours, plus a simple contact form posting to
your inbox.
**Verify** WhatsApp link opens on a real phone. Form submission arrives.

### Task 139 — `/faq`
**Do** `Accordion` over question groups: ordering, COD, delivery, returns.
**Verify** Accordion expands. Every answer is factually consistent with the shipping and
returns pages.

### Task 140 — `/shipping-and-delivery`
**Do** Zone table, delivery windows, COD explanation, the verification-call note so customers
expect it (§2.2).
**Verify** Prices and windows match the shipping options configured in tasks 5 and 6 exactly.

### Task 141 — `/returns-and-refunds`
**Do** Window, condition requirements, process (WhatsApp/phone for v1 — no returns portal),
who pays return shipping.
**Verify** Consistent with the FAQ and with what `DeliveryEstimateBox` claims.

### Task 142 — `/privacy` and `/terms`
**Do** Two routes. Cover the phone and address data you actually collect, and the synthetic
email.
**Verify** Both render and are linked from the footer.

### Task 143 — Error and system pages
**Files** `app/not-found.tsx`, `app/error.tsx`, `app/(checkout)/error.tsx`
**Do** 404 with search and top categories. Root error boundary. A **separate checkout error
boundary** that preserves the cart and offers WhatsApp (§3).
**Verify** A bad URL shows the 404 with working links. A thrown error in checkout shows the
checkout boundary, and the cart survives a reload.

---

# Block P — SEO (144–150)

### Task 144 — Metadata defaults and Open Graph
**File** `app/layout.tsx`
**Do** Title template, description, `metadataBase`, default OG image, Twitter card, favicon and
the square `P` mark (needed for WhatsApp link previews — the dominant sharing channel).
**Verify** Paste the home URL into WhatsApp; the preview shows your logo, title, and
description.

### Task 145 — Per-route metadata
**Do** `generateMetadata` on product, category, collection, and search. Product titles include
the brand; category descriptions come from admin.
**Verify** Three different product URLs produce three distinct titles and OG images.

### Task 146 — Sitemap
**File** `app/sitemap.ts`
**Do** All products, categories, collections, and static pages. Excludes cart, checkout,
confirmation, track, and `/dev/*`.
**Verify** `/sitemap.xml` lists every product and no checkout URL.

### Task 147 — Robots
**File** `app/robots.ts`
**Do** Allow the catalogue, disallow `/cart`, `/checkout`, `/order/*`, `/track`, `/dev/*`.
Sitemap reference.
**Verify** `/robots.txt` renders with the sitemap line and correct disallows.

### Task 148 — Product JSON-LD
**Do** `Product` schema with offers, availability, price in PKR, and **`AggregateRating` from
the denormalised average** (task 127). Star ratings in Google results have a measurable
click-through effect (§2.4).
**Verify** Google's Rich Results Test passes on a product with reviews, and shows the star
rating.

### Task 149 — Breadcrumb and organisation JSON-LD
**Do** `BreadcrumbList` on category and product pages, `Organization` on the home page with your
logo and WhatsApp contact point.
**Verify** Rich Results Test passes for both, with no warnings.

### Task 150 — Image optimisation pass
**Do** Audit every `next/image`: correct `sizes`, `priority` only on LCP images, AVIF/WebP
enabled, remote patterns configured for your Medusa image host.
**Verify** Lighthouse shows no "properly size images" or "next-gen formats" warnings on home,
category, and product.

---

# Block Q — Pre-launch hardening (151–158)

### Task 151 — Lighthouse pass
**Do** Run mobile Lighthouse on home, category, product, cart, checkout. Fix anything under 80
performance or under 95 accessibility.
**Verify** All five pages meet those numbers on a throttled mobile run.

### Task 152 — Real-device testing ⚠️
**Do** A mid-range Android on 3G/4G, not an emulator. Walk the full path: home → category →
filter → product → add → cart → checkout → order. Note every place you had to wait or squint.
**Verify** The whole path completes on a real device on a real network. Every tap target is
reachable one-handed.

### Task 153 — Form validation pass
**Do** Bad input into every form: checkout, review, contact, track, newsletter. Empty, too long,
emoji, `<script>`, SQL-ish strings, wrong phone formats, pasted whitespace.
**Verify** Nothing crashes, nothing renders unescaped input, and every error message says what
to do rather than what went wrong.

### Task 154 — Stock and race conditions
**Do** Item goes out of stock between add and checkout. Two tabs checking out the same cart.
Quantity above inventory. Placing an order twice from a stale page.
**Verify** Each produces a clear message and a correct cart. No order is ever placed for
unavailable stock.

### Task 155 — Security pass
**Do** Confirm: no phone-only lookup path exists anywhere (§2.2), `/track` is rate-limited,
`/dev/*` is blocked in production, the publishable key is the only key exposed to the browser,
and no admin API is reachable from the storefront.
**Verify** Each of the five checked explicitly. `/dev/styleguide` 404s on the production build.

### Task 156 — Order emails via Brevo
**Do** For the minority who supplied a real email in `cart.metadata.contact_email`: order
confirmation and order shipped, the latter carrying **carrier name, tracking number, and
tracking URL** (§5.1). Never send to a synthetic address.
**Verify** An order with a real email gets both emails. An order without one triggers no send
and no error. No mail is ever addressed to `@nomail.kprime.pk`.

### Task 157 — Smoke test suite
**File** `e2e/`
**Do** Playwright, five tests: home loads with products; category filter changes results; add to
cart persists across reload; checkout places an order; `/track` finds it. Run against a seeded
backend.
**Verify** `npx playwright test` passes all five headless.

### Task 158 — Launch checklist 🏁
**Do** Real content in hero, promos, and policy pages. Real WhatsApp number everywhere. Analytics
installed. `metadata.phone_verified` filter usable in admin. **Confirmation-call script written
and the dispatch point decided** (§8). Zone rates matching the current courier sheets. Backup
and rollback plan.
**Verify** Place a real order as a customer, take the confirmation call yourself, and dispatch
it. If that works end to end, launch.

---

## Still unanswered — decide before you reach the task that needs it

| Open question | Needed by |
|---|---|
| Final option title/value list per category, spelling locked | **Task 8** |
| Final category tree contents and globally-unique handle list | **Task 9** |
| Actual zone rates from the TCS and Leopards sheets | **Task 6** |
| Font pairing, type scale, spacing base, radius | **Task 13** |
| Logo files: full colour, reversed, square `P` mark | **Task 45** |
| `nuqs` or hand-rolled URL helpers | **Task 57** |
| Hosting — affects caching and image strategy | **Task 150** |
| Review moderation policy: who approves, how fast, what's rejected | **Task 128** |
| Confirmation-call script and the dispatch point it happens at | **Task 158** |

---

## What moved, and why

Against the phase-based plan, six things changed order:

1. **Backend admin config runs first (1–11)** rather than sitting in §5. The publishable key is
   needed by task 16 and the category tree by task 19, so it was never really parallel work.
2. **All 11 primitives are built consecutively (22–32).** The original deferred `RadioGroup`,
   `Modal`, and `Toast` to phases 4–5. They're small, and coming back to `components/ui/` twice
   costs more context-switching than it saves.
3. **`lib/data/cart.ts` (93) comes before `AddToCartButton` (94).** The original put the button
   in Phase 3 and the cart layer in Phase 4, which means building a button against nothing.
4. **`normalizePhone()` is the first checkout task (102)**, before any checkout UI. It's the
   identity key and the most expensive thing in the build to retrofit.
5. **`RatingFilter` moved from the catalog block to the reviews block (136).** It can't work
   before `average_rating` exists.
6. **A verification task (62) was added** between facet derivation and the sidebar. The original
   said "verify the grouping behaviour against real data in Phase 2" without giving it a slot —
   so it would have been skipped.

Vitest (task 17) is new. Four things in this build are pure functions whose failure modes are
silent — phone normalisation, the synthetic email, price filtering, and the coverage threshold.
Those are worth real tests; nothing else here is.
