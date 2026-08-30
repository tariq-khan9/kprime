# kprime Storefront — Build Plan

Medusa v2 backend (existing) + fresh Next.js App Router storefront.
Single region: Pakistan. Currency PKR. COD only. English only. Guest checkout only.

---

## At a glance

| § | Section | What it settles |
|---|---|---|
| 1 | **Scope** | 16 routes, guest-only COD checkout, reviews in. Accounts, OTP, messaging, Urdu and free delivery are all v2 |
| 2 | **Four decisions** | The four things that shape everything downstream — filtering, checkout identity, colour, reviews |
| 2.1 | Filtering | Native option filtering on Medusa v2.19; price and facet counts in the Next.js server layer. Filterable specs are **product options, not metadata** |
| 2.1.1 | Category tree | One self-referencing table, leaf-only product assignment, flat single-segment URLs so the tree stays restructurable |
| 2.1.2 | Per-category filters | Derived from the data, ordered by config. A filter renders only if it covers ≥25% of results |
| 2.2 | Checkout | Guest only. Name, phone, address required; email synthesised from phone. That synthetic email is the identity key. Verification is a phone call, not an OTP |
| 2.3 | Design tokens | Navy text, amber action, red sale, green success, cream page. Every colour has exactly one job |
| 2.4 | Reviews | Flat with one merchant reply, moderated, verified buyer via the phone's customer record |
| 3 | **Page inventory** | 16 routes and how each renders — static, dynamic, or static-plus-revalidate |
| 4 | **Components** | 63 components across `ui/`, `layout/`, `shared/` and `page/` |
| 4.10 | Page → component map | Which components appear on which of the 16 pages |
| 4.11 | Folder structure | The full tree, file by file, with the one-way import rule |
| 5 | **Backend config** | Eight admin tasks. Do the category tree and option spelling **before importing products** |
| 5.1 | Shipping zones | Four price tiers, not 150 cities. Courier-agnostic. City must be a dropdown or checkout silently dead-ends |
| 6 | **Build phases** | Ten phases, 6–9 weeks solo. Checkout and filtering are over half of it |
| 6.1 | Build sequence | The numbered 1–36 session order to a working home page |
| 7 | **Working method** | One component per session, read every diff, keep `CLAUDE.md` current |
| 8 | **Open questions** | What's still unanswered before Phase 2 |

**The five things most expensive to get wrong**

1. **Option title and value spelling** (§2.1) — a typo silently splits a filter, or creates a
   phantom one. Lock the sheet before importing a single product.
2. **Category handles** (§2.1.1) — globally unique, locked before import. Renaming breaks every
   link already shared on WhatsApp.
3. **`normalizePhone()` at the API boundary** (§2.2) — it's the identity key. An unnormalised
   phone forks a customer's history in two, silently, and you find out months later.
4. **The synthetic email format** (§2.2) — freeze it. It's what lets v2 accounts claim guest
   order history.
5. **`ProductCard`** (§6.1, step 16) — five pages inherit it and it's most of what a mobile
   visitor ever sees.

---

## 1. Scope

**In scope for v1**

- Multi-level categories and subcategories
- Faceted filtering per category (price, colour, brand, and category-specific specs)
- Search
- Product detail with variants
- Cart (guest, persisted)
- Checkout: guest only — name, phone, address → shipping method → COD → place order
- Order confirmation + order tracking by order number and phone
- Product reviews (rating + text, moderated, verified buyer)
- Static policy pages

**Deliberately out of scope for v1**

- Online payment (COD only)
- Multi-region / multi-currency
- **Customer accounts — v2.** Nothing in v1 depends on them, so they layer on top of a
  working checkout rather than threading through it (section 2.2)
- **Order history lookup by phone.** Without OTP there's nothing proving the person typing
  a number owns it. `/track` covers the real need
- **OTP / SMS / WhatsApp messaging.** Phone verification is a call, not a feature
  (section 2.2)
- Wishlists, coupons, loyalty
- Urdu localisation — **English only for v1**
- Free delivery threshold — every order pays shipping in v1 (section 5.1)
- Returns portal (handle over WhatsApp/phone initially)

Each of these is easier to add later than to carry unfinished now.

---

## 2. Four decisions to make before writing components

These shape everything downstream. Getting them wrong means rework, not tweaks.

### 2.1 How filtering works

**Backend confirmed on Medusa v2.19.0.** Option-value filtering landed in v2.16, so most of
what you need is native. No search engine required for v1.

**Native in v2.19 — `/store/products`**

| Capability | Parameter |
|---|---|
| Category / subcategory | `category_id` |
| Collection | `collection_id` |
| Tag | `tag_id` |
| Product type | `type_id` |
| Option value (colour, size, shade, storage…) | `option_value_id` |
| Has option at all | `option_id` |
| Keyword search | `q` |
| Sorting | `order` |
| Pagination | `limit` / `offset` |

Build the sidebar itself from `/store/product-options`, which returns each option with its
values.

**Still not native**

- **Price range** — prices are calculated at query time by the pricing module, so no
  `min_price` / `max_price`
- **Metadata filtering** — product metadata is JSONB and the store API won't query it
- **Facet counts** — no "Red (24)" numbers

**Consequence: model filterable specs as product options, not metadata.**

Metadata is a dead end for filtering. Options are natively queryable. The variant-explosion
worry doesn't apply — an option with a **single value** adds no variants. A shirt that's only
ever cotton gets a `Fabric` option with one value `Cotton`, every variant carries it, variant
count unchanged, and it becomes filterable for free.

⚠️ **Naming convention — decide before importing any products.** Options belong to individual
products, so `Cotton` on product A and `Cotton` on product B are separate records with
different IDs. The sidebar groups values by their string and passes every matching ID. So
option titles and values must be spelled *identically* across the whole catalogue:

- `Color` — never `Colour`, `color`, `COLOR`
- `Red` — never `red`, `Bright Red`, `Red.`
- Title Case for both titles and values, no trailing spaces
- Units always in the value, always the same form: `128GB` not `128 GB` or `128gb`

Verify the grouping behaviour against real data in Phase 2 before building the whole sidebar.

**Where each filter runs**

| Filter | Runs in |
|---|---|
| Category, subcategory | Medusa |
| Colour, size, shade, storage, fabric, material | Medusa (`option_value_id`) |
| Brand | Medusa (tag, `brand:samsung`) |
| Keyword | Medusa (`q`) |
| Sort | Medusa (`order`) |
| **Price range** | **Next.js server layer** |
| **Facet counts** | **Next.js server layer** |

The constraint: you can't let Medusa paginate *and* post-filter, or counts go wrong. For a
category, fetch the full result set with `fields` trimmed to what `ProductCard` needs, cache
it with `unstable_cache`, then filter and paginate in server memory. Trimmed, each product is
roughly 500 bytes — 500 products is ~250KB held server-side, never shipped to the browser.
Comfortable to 500–1000 products per category.

To be explicit: this is **server-layer** filtering inside an RSC, not client-side filtering in
React. Never ship the catalogue to the browser to filter it — that kills mobile performance,
SEO, and shareable filter URLs.

Put everything behind one function, `lib/data/products.ts → searchProducts(params)`. If you
later add MeiliSearch for better search and real facet counts, you rewrite that one file
instead of the listing page, sidebar, and URL handling.

**Attribute mapping for your categories**

| Category | Variant options | Single-value options (specs) | Tags |
|---|---|---|---|
| Electronics | Colour, Storage | RAM, Screen Size, Warranty | brand |
| Cosmetics | Shade, Size/Volume | Skin Type, Formulation | brand |
| Dresses | Size, Colour | Fabric, Sleeve, Fit, Occasion | brand |
| Kitchen | Colour, Capacity | Material, Pieces in Set | brand |
| Bed sheets | Bed Size, Colour | Material, Thread Count, Pieces | brand |

### 2.1.1 Category tree

**One table.** `product_category` is self-referencing via `parent_category_id`, with no depth
limit. A subcategory is a row with a parent set — no separate table, no schema work. Products
link many-to-many, so a product can sit in several categories. 5 top-level × ~8 children = ~45
rows, all managed in the admin.

⚠️ **Parent categories don't inherit their children's products.** Querying
`category_id = Electronics` returns only products *explicitly* assigned to Electronics, not
ones sitting in Mobiles.

**Assignment rule: leaf only.** A cookware set goes in `Kitchen > Cookware` and nothing else.
For a parent page, fetch the category with `include_descendants_tree=true`, collect the
descendant IDs, and pass the array. One assignment per product, no duplication, and moving a
subcategory carries its products with it.

The descendants call runs an extra query per record, so fetch the whole tree once, cache it
with `unstable_cache`, and resolve descendants from memory. Trivial at 45 categories.

**Handles are globally unique.** No `accessories` under both Electronics and Cosmetics — use
`mobile-accessories` and `makeup-accessories`. Lock the full handle list before importing;
renaming later breaks URLs and any links already shared on WhatsApp.

**Set `rank` on every category.** Otherwise nav order follows creation date.

**Flat URLs — `/categories/[handle]`, single segment.** Handles are globally unique, so path
segments carry no extra information. This is what makes the tree restructurable after launch:
inserting a middle level (`Electronics > Computers > Laptops` where it was
`Electronics > Laptops`) changes no URL, breaks no shared WhatsApp link, and needs no
redirects. Breadcrumbs still display the full hierarchy — they just link to short URLs.

**Build the nav recursively.** Render whatever depth the tree returns rather than hardcoding
two levels. Costs nothing in Phase 1; means adding a middle level post-launch is an admin task
rather than a header rewrite.

**Depth: 3 levels maximum for v1**, varying per branch — Electronics may go 3 deep
(`Electronics > Computers > Laptops`) while Bed sheets stays at 2 (`Bed sheets > Double`).
This is a *content* ceiling, not a code one: the nav renders whatever the tree returns, so
going deeper later needs no changes.

At 3 levels the desktop mega menu uses level 2 as column headings with level 3 as links
beneath — the standard pattern, and it reads better than a flat list. Mobile uses nested
accordions in the drawer.

### 2.1.2 Per-category filters

Medusa has no concept of category attributes — categories are a naming tree and own nothing.
Every product carries its own options. So subcategories can have completely different
attributes with no schema work, and **`config/filters.ts` is effectively your category schema.**

**Preferred approach: derive filters from the data, use config only for order and exclusion.**
The category page already fetches the full result set for server-layer filtering, so it can see
which option titles are actually present. Render those, ordered by config.

```ts
export const filterOrder = [
  "Price", "Brand", "Color", "Size", "Material",
  "Storage", "RAM", "Shade", "Bed Size", "Thread Count",
]
export const filterHidden = ["Warranty", "Country of Origin"]
```

Three wins: new subcategories need no config change, filters never render with zero values, and
new options added in admin appear automatically.

The trade-off: option naming becomes load-bearing in a new way. A typo no longer just splits a
filter — it creates an entirely new one in the sidebar. Another reason to lock the option value
sheet before importing.

Parent pages naturally end up showing only cross-cutting filters (price, brand, colour), since
those are the only options common to all descendants. Leaf pages get their specific specs. That
falls out of the data-driven approach without extra work.

**Coverage threshold.** A parent page pulls in all descendants, so its result set can contain
options that apply to only a slice of it — Electronics holding both laptops (RAM, Storage) and
blenders (Wattage, Capacity). Rule:

> Render a filter group only if it covers ≥ 25% of the current result set.

RAM covers ~15% of Electronics and is hidden; it covers 100% of Laptops and shows. Price and
Brand always clear the bar. Fully automatic, no per-category config, self-correcting as the
catalogue grows. Coverage counts are free — the full result set is already in server memory for
price filtering.

**Filter semantics:** OR within a group, AND across groups. When a group is active, products
lacking that option are excluded — filtering RAM on Electronics correctly drops every blender.

**Taxonomy rule of thumb:** if two products in a leaf category can't sensibly be compared on the
same filters, they belong in different leaves. Laptop vs blender fails; laptop vs laptop passes.
This usually means Electronics needs a middle level:

```
Electronics
├── Laptops          → RAM, Storage, Processor, Screen Size
├── Mobiles          → Storage, RAM, Screen Size, Battery
├── Home appliances  → Wattage, Capacity, Warranty
└── Accessories      → Type, Compatibility
```

### 2.2 Phone-first guest checkout — settled

**Guest checkout is the only path in v1.** No accounts, no login, no OTP, no messaging.

**Required fields:** name, phone, province, city, street address. Email is optional.

Medusa requires an email on every cart. Many Pakistani COD customers don't use email, and
demanding one costs you orders — so the email is synthesised rather than requested.

**No postal codes.** Pakistan doesn't have reliable ones — use province + city dropdowns and
drive shipping zones off city, not zip (section 5.1).

#### The identity rule

Phone is the identity key for every order. Three pieces make that work, and all three are
cheap now and expensive to retrofit:

**1. `normalizePhone()` runs at the API boundary, not in the component.**
Accepts `03xxxxxxxxx`, `+923xxxxxxxxx`, `00923…`, with spaces or dashes. Returns digits only:
`923001234567`. Nothing else may touch a raw phone string.

**2. The guest cart email is always the phone-derived synthetic address.**
`cart.email = "{normalised}@nomail.kprime.pk"` — always, even when the customer typed a real
email. That real email goes to `cart.metadata.contact_email` and carries to the order.

Because the mapping is deterministic, one phone always produces one customer record. Keying on
a supplied email instead would fragment the same person across records.

⚠️ **Freeze this format.** It's the lookup key that lets v2 account registration find a
customer's guest history in one exact-match query. Changing the domain or shape later orphans
every earlier record.

**3. The normalised phone is written onto the Customer record.**
`phone` is a native field on Medusa's Customer model, so it becomes a real admin column rather
than something buried in JSON. Do this during checkout, along with the name.

#### What this gets you for free

When a guest places an order, Medusa creates a Customer record with `has_account: false`. Since
the email is phone-derived, **that record is your per-phone ledger** — every order from that
number, its addresses, its delivery outcomes, its lifetime value. Search the phone in Admin →
Customers and it's all there. No custom module, no shadow table, works from your first order.

That same record is what the verified-buyer check on reviews queries (section 2.4).

Note this is why the phone must live on the Customer record and not in `order.metadata` —
metadata is JSONB and unqueryable through the API, same constraint as section 2.1.

One judgement call: the contact phone and `shipping_address.phone` may legitimately differ
(someone sending a gift). Let them differ, and use the **contact** phone as identity. Grouping
by delivery phone would merge a buyer with everyone they've ever sent something to.

#### COD verification — manual, by decision

v1 accepts all COD orders with no cap and no advance payment. **The number is verified by a
phone call before dispatch**, not by OTP.

At launch volumes this is strictly better than an OTP. A 30-second call confirms intent to pay
on delivery; an OTP only confirms the phone exists and someone is holding it. Fake and impulse
COD orders with high return-to-origin rates are the main margin killer for Pakistani stores,
and intent is the thing that predicts them.

**Log the outcome.** Set `metadata.phone_verified = false` at placement and flip it true on the
call. Costs nothing today, and gives you an admin filter for "not yet called" plus — after a
few hundred orders — a comparison of RTO rates between called and uncalled orders. That's the
evidence that tells you whether automated verification is worth buying.

**Reversal cost, if RTO becomes a problem.** Short-code SMS OTP runs ~Rs 4.70–4.80 per message
with a Rs 10,000 minimum package (1-year validity), and needs NTN, CNIC and an app-specific PTA
authorization form that takes weeks. WhatsApp is *not* the cheap option here — Meta's
authentication conversation rate in Pakistan is ~Rs 21.50, roughly 4.5× the SMS route.

Build `src/modules/otp/` behind a two-provider interface (real aggregator + console stub that
accepts a fixed code) if and when you need it. Checkout calls one function; switching it on is
an env var. Not in v1.

#### Order lookup

`/track` — **order number and phone together**, rate-limited. The order number is the shared
secret.

⚠️ **Never build phone-only lookup on the storefront.** Phone numbers aren't secret and
`03XX` is an enumerable space. An open endpoint hands a stranger's home address, purchase
history and prices to anyone with a number in their contacts. The rich per-phone lookup stays
admin-side only.

#### The confirmation page is the only receipt

With no email and no SMS, a customer who closes that tab has nothing. The page must carry the
order number prominently, items, total, delivery estimate and your WhatsApp number, and tell
them to screenshot it. Over-design it relative to its apparent importance.

Keep the copy soft — "we've received your order, we'll be in touch if we need anything" rather
than "your order is confirmed and dispatching" — so the confirmation call doesn't contradict it.

#### Accounts in v2

Nothing above needs to change. Registration will use stock `emailpass`; the synthetic email is
the join key for claiming guest history, and `cart.metadata.contact_email` is your invite list.

⚠️ Medusa does **not** merge guest orders into a newly registered account — it creates a second
Customer record with `has_account: true` and the old orders stay behind. Fix it with a
subscriber on `order.placed` that reassigns orders to a registered customer with a matching
normalised phone, rather than a one-time merge at registration — the same person can check out
as a guest again next month.

**In v1, don't put "Login" or "Create account" anywhere in the header or checkout.** A dead
link promising a feature is worse than its absence.

### 2.3 Design tokens — settled

**Palette: navy brand, amber action, red sale, green success, on a light page.**

Every colour has exactly one job. That discipline is what makes a small palette read as
designed rather than sparse.

| Role | Hex | Used for |
|---|---|---|
| Page | `#F6F4EF` | Page background (cream, not pure white) |
| Card | `#FFFFFF` | Product cards, panels, modals |
| **Brand** | `#0F1E3D` | All body text, headings, prices, logo, header/footer, secondary button borders, icons, active nav |
| Brand light | `#1E3A6B` | Hover states on navy surfaces |
| **Action** | `#F2A007` | Add to cart, primary CTA — **always with `#1A1408` text** |
| Action hover | `#D98906` | |
| **Sale** | `#C2410C` | Discount badges, savings amounts |
| **Success** | `#15803D` | In stock, order confirmed — **never a CTA** |
| Muted | `#6B7280` | Breadcrumbs, labels, strikethrough prices, metadata |
| Line | `#E6E2DA` | Borders, dividers |

```ts
colors: {
  cream:  "#F6F4EF",
  paper:  "#FFFFFF",
  brand:  { DEFAULT: "#0F1E3D", light: "#1E3A6B" },
  action: { DEFAULT: "#F2A007", hover: "#D98906", ink: "#1A1408" },
  sale:    "#C2410C",
  success: "#15803D",
  muted:   "#6B7280",
  line:    "#E6E2DA",
}
```

**Non-negotiable rules**

1. **Navy replaces black for text.** Never `#000`, `#333`, or `text-gray-900`. The faint blue
   cast in every paragraph is what ties the page to the brand.
2. **Amber only ever means "act on this."** Buttons and nothing else. It should cover ~2% of
   the page. Decorative amber destroys the signal.
3. **Dark text on amber, never white.** White on `#F2A007` is 2.1:1 and fails WCAG; `#1A1408`
   is 8.1:1. This is the most common contrast mistake in ecommerce.
4. **Green is reserved for success states.** Never a call to action — a green button beside a
   green "in stock" label makes both meaningless.
5. **Sale red is distinct from brand.** Discount visibility drives COD conversion, so the sale
   colour must never be the brand colour. (This is why navy, not terracotta or crimson.)
6. **Light page, always.** Product photography is shot on white and composites cleanly onto
   light backgrounds. Supplier images of mixed quality look far worse on dark pages.

**Logo lockup.** `KARKHANO` small above `PRIME` large, roughly 1:3 cap height. KARKHANO in all
caps with ~0.35em letterspacing so its width matches PRIME's — that alignment is what makes it
look intentional. PRIME tight-spaced and heavy. One geometric sans for both (Poppins, Outfit,
or Manrope). PRIME in navy, KARKHANO in navy or amber.

Three files needed before Phase 1: full-colour on light, reversed on navy for the footer, and
a square `P` mark in cream on navy for favicon and WhatsApp.

**Still to decide in Phase 0:** font pairing and type scale, spacing base (4px or 8px), border
radius, density. Collect 2–3 reference screenshots to anchor these.

### 2.4 Reviews — settled

**Medusa v2 has no reviews module.** This is custom code: a model, a service, a link to product,
store routes for read and submit, and admin routes for moderation. Budget 4–6 days including the
approval screen, and build it *after* checkout works.

**Flat, not nested.** One review, plus an optional merchant reply beneath it. Add a `parent_id`
column anyway so deeper nesting stays possible, but don't render it. Threading is worse for you
in three concrete ways: moderation queues get ambiguous, pagination breaks (do replies count?),
and indentation is unreadable at 360px — which is most of your traffic.

**Reviews, not Q&A.** A review is a rating plus text, one per phone per product, and drives your
star display. A discussion thread ("does this ship to Gilgit?") is a different feature with
different moderation. Not in v1.

**Verified buyer via the phone's Customer record.** The check is "does a delivered order exist
under this phone containing this product" — one query against the ledger from section 2.2.
Restricting reviews to verified buyers solves most of the spam problem structurally rather than
through moderation effort.

**Moderation is mandatory.** Default status `pending`, nothing renders until approved. A public
review form on a COD store here will attract spam within a week.

**Denormalise the aggregate.** Store `average_rating` and `review_count` on the product side and
recompute on approve or delete. Without it a 24-product grid fires 24 aggregate queries.

**Rating filter and sort run in the Next.js server layer** — same place as price, for the same
reason: not a natively queryable field on `/store/products`. Consistent with section 2.1 rather
than a new pattern. `RatingFilter` in section 4.4 is now a real component, and sort gains
"Highest Rated".

**Caching.** Product pages are static + revalidate but reviews change. Render the first page of
reviews into the static payload, call `revalidateTag` on approval, and fetch further pages
client-side.

**SEO is the real payoff.** `AggregateRating` in the JSON-LD puts star ratings into Google
results, which has a measurable click-through effect. Belongs in the SEO phase.

**Defer photo reviews** — storage cost plus a much heavier moderation burden.

**Prompt for reviews on the order detail page**, since there's no confirmation message to put an
invite link in.

---

## 3. Page inventory

16 routes. Mobile-first throughout — assume 80%+ mobile traffic.

### Storefront

| # | Route | Purpose | Rendering |
|---|---|---|---|
| 1 | `/` | Home | Static + revalidate |
| 2 | `/categories/[handle]` | Category & subcategory listing, filters | Dynamic (searchParams) |
| 3 | `/products/[handle]` | Product detail + reviews | Static + revalidate |
| 4 | `/search` | Search results, same filter UI | Dynamic |
| 5 | `/collections/[handle]` | Merchandised sets (Sale, New In) | Static + revalidate |
| 6 | `/cart` | Cart | Dynamic |
| 7 | `/checkout` | Contact, address, shipping, COD, review | Dynamic |
| 8 | `/order/confirmed/[id]` | Thank you + order summary — the only receipt | Dynamic |
| 9 | `/track` | Order lookup by order number **and** phone | Dynamic |

### Static / system

| # | Route |
|---|---|
| 10 | `/about` |
| 11 | `/contact` |
| 12 | `/faq` |
| 13 | `/shipping-and-delivery` |
| 14 | `/returns-and-refunds` |
| 15 | `/privacy` + `/terms` |
| 16 | `not-found.tsx`, `error.tsx`, `loading.tsx` |

### How the routing works

**Three dynamic segments, all keyed on handle or id.** `[handle]` for categories, products and
collections; `[id]` for the order confirmation. Handles come from Medusa and are globally
unique (section 2.1.1), so a single path segment is enough — `/categories/laptops`, never
`/categories/electronics/computers/laptops`. That flatness is what lets you restructure the
category tree after launch without breaking a shared WhatsApp link.

**Rendering splits three ways.**

*Static + revalidate* — home, product detail, collections. Content changes when you change it in
admin, not per visitor. Use `generateStaticParams` over the product and collection handles,
`revalidate` on a timer, and `revalidateTag` when a review is approved.

*Dynamic* — category, search, cart, checkout, confirmation, track. These depend on
`searchParams` or on the cart cookie, so they render per request. Category pages are dynamic
because the filter state lives in the URL (section 4.4) — that's what makes filtered views
shareable and back-button-correct.

*Static* — the seven policy pages. Plain MDX or hardcoded content, no data fetching.

**Route groups for layout, not URLs.** `(shop)` for anything with the full header, mega menu and
footer; `(checkout)` for a stripped layout with logo, step indicator and trust strip only —
removing the nav from checkout measurably reduces drop-off. Parentheses mean the group name
never appears in the URL.

**File conventions.** `loading.tsx` per dynamic route so navigation streams a skeleton rather
than blocking, `error.tsx` at the root and around checkout, `not-found.tsx` triggered by
`notFound()` when a handle doesn't resolve.

**One data layer.** Every route fetches through `lib/data/*` and nothing calls the Medusa SDK
directly from a component. That's what makes the filtering swap in section 2.1 a one-file
rewrite instead of a page-by-page one.

---

## 4. Component inventory

Roughly 63 components. Anything marked **(shared)** is used on 3+ pages — build these first.

### 4.1 Primitives — build before anything else (11)

`components/ui/`

Button, Input, Select, Checkbox, RadioGroup, Badge, Skeleton, Drawer, Modal, Toast, Accordion

`Accordion` is used by `MobileNav`, `ProductTabs`, the FAQ page and the checkout steps — four
places, so it's a primitive, not a one-off.

Every one of these should take its colours and spacing from the Tailwind config, never from
inline values. If you find yourself writing a hex code in a component, a token is missing.

### 4.2 Layout (11) — **(shared)**

`components/layout/`

- `Header` — sticky, shrinks on scroll
- `CategoryMegaMenu` — desktop hover panel, full category tree
- `MobileNav` — drawer with accordion category tree
- `SearchBar` — with typeahead suggestions
- `CartButton` — icon with item count badge
- `AnnouncementBar` — promos and delivery messaging (no free-delivery threshold in v1)
- `Footer`
- `Breadcrumbs`
- `Container`
- `TrustStrip` — COD, delivery time, returns icons
- `WhatsAppFloatButton` — dominant support channel locally

### 4.3 Home (7)

`components/home/`

HeroCarousel, CategoryGrid, ProductRail **(shared)**, PromoBannerPair, BrandStrip,
NewsletterSignup, HomeSkeleton

`ProductRail` is a horizontally scrolling product row reused on home and product detail.

### 4.4 Category listing (13) — the most complex page

`components/catalog/`

- `CategoryHeader` — title, description, subcategory chips
- `FilterSidebar` — desktop, sticky
- `FilterDrawer` — mobile, bottom sheet with Apply button
- `PriceRangeFilter`
- `CheckboxFilterGroup` — brand, spec attributes; collapsible with "show more"
- `ColorSwatchFilter`
- `RatingFilter` — server-layer, same as price (section 2.4)
- `ActiveFilterChips` — with clear-all
- `SortDropdown`
- `ProductGrid` **(shared)**
- `ProductCard` **(shared)** — image, title, price, discount badge, stock state
- `PaginationControls`
- `EmptyResults` — with filter-relaxation suggestions

**Filter state lives in the URL**, not React state. `?color=red&brand=x&price=1000-5000`.
This gives you shareable links, working back button, and server-side rendering for free.
Use `nuqs` or hand-rolled `useSearchParams` helpers. Decide this before building the sidebar.

### 4.5 Product detail (12)

`components/product/`

ProductGallery, GalleryThumbnails, MobileGallerySwiper, ProductTitleBlock, PriceDisplay **(shared)**,
VariantOptionSelector, QuantityStepper **(shared)**, AddToCartButton, StockIndicator,
DeliveryEstimateBox, ProductTabs (description / specifications / shipping & returns),
StickyMobileBuyBar

Plus `ProductRail` again for related products.

### 4.6 Cart (5)

`components/cart/`

CartLineItem, CartLineItemMobile, CartSummary **(shared)**, EmptyCart, CartDrawer

Decide: does "add to cart" open a drawer or navigate to `/cart`? Drawer converts better.

### 4.7 Checkout (9) — highest-stakes code in the app

`components/checkout/`

CheckoutStepper, ContactStep (phone-first), ShippingAddressStep,
ProvinceCitySelect (dependent dropdowns), ShippingMethodStep,
PaymentStep (COD-only display), OrderReviewStep, PlaceOrderButton, OrderSummaryPanel

Single page with accordion steps beats multi-page for COD — fewer navigations, less drop-off.

### 4.8 Order (4)

`components/order/`

OrderConfirmationHero, OrderItemsList **(shared)**, OrderStatusTimeline, TrackOrderForm

Account components are gone with accounts (section 2.2). `TrackOrderForm` takes order number
**and** phone, both required.

### 4.9 Reviews (6)

`components/review/`

StarRating **(shared)**, ReviewSummary (average + distribution bars), ReviewList, ReviewCard,
ReviewForm, MerchantReply

`StarRating` is shared because it appears on `ProductCard`, the product detail page and each
review. Build it with the primitives in Phase 0 even though the rest of the module comes late.

### 4.10 Page → component map

Every page below sits inside one of two layouts. Build the shell once and it appears on all of
them; only the middle changes.

**The shop shell** — `app/(shop)/layout.tsx`, on pages 1–6 and 8–15:

`AnnouncementBar` → `Header` (which contains `CategoryMegaMenu`, `SearchBar`, `CartButton`) →
`MobileNav` → `Container` → *page content* → `Footer` → `WhatsAppFloatButton`

**The checkout shell** — `app/(checkout)/layout.tsx`, on page 7 only:

Logo → `CheckoutStepper` → *page content* → `TrustStrip`

No nav, no search, no footer links. Stripping the exits is the point.

---

**1. `/` — Home**

`HeroCarousel` · `CategoryGrid` · `ProductRail` ×3 (New In / Best Sellers / Sale) ·
`PromoBannerPair` · `BrandStrip` · `TrustStrip` · `NewsletterSignup`

Each `ProductRail` is filled with `ProductCard`, which itself contains `PriceDisplay`,
`StarRating` and `Badge`. Loading state is `HomeSkeleton`.

**2. `/categories/[handle]` — Category listing**

`Breadcrumbs` · `CategoryHeader` (title, description, subcategory chips) · `ActiveFilterChips` ·
`SortDropdown` · `ProductGrid` · `PaginationControls` · `EmptyResults`

Filters render twice from the same children — `FilterSidebar` on desktop, `FilterDrawer` on
mobile. Both contain `PriceRangeFilter`, `CheckboxFilterGroup` (brand and specs),
`ColorSwatchFilter` and `RatingFilter`.

`ProductGrid` is filled with `ProductCard`.

**3. `/products/[handle]` — Product detail**

`Breadcrumbs` · `ProductGallery` + `GalleryThumbnails` on desktop, `MobileGallerySwiper` on
mobile · `ProductTitleBlock` · `StarRating` (anchors down to reviews) · `PriceDisplay` ·
`VariantOptionSelector` · `StockIndicator` · `QuantityStepper` · `AddToCartButton` ·
`DeliveryEstimateBox` · `ProductTabs` · `StickyMobileBuyBar`

Reviews block: `ReviewSummary` → `ReviewList` → `ReviewCard` → `MerchantReply`, plus
`ReviewForm`.

Then `ProductRail` for related products. Adding to cart opens `CartDrawer` and fires a `Toast`.

**4. `/search` — Search results**

Identical to the category page with `CategoryHeader` swapped for a result-count header and
`Breadcrumbs` dropped. Same filter components, same grid, same pagination. Build it after
category and it's mostly assembly.

**5. `/collections/[handle]` — Sale, New In**

`Breadcrumbs` · `CategoryHeader` · `SortDropdown` · `ProductGrid` · `PaginationControls`

Deliberately simpler than category — merchandised sets don't need faceted filters.

**6. `/cart`**

`Breadcrumbs` · `CartLineItem` on desktop, `CartLineItemMobile` on mobile (each containing
`QuantityStepper` and `PriceDisplay`) · `CartSummary` · `TrustStrip` · `Button` (checkout CTA) ·
`EmptyCart` when the cart is empty

**7. `/checkout`** — highest-stakes page in the app

`ContactStep` (name, phone, optional email) · `ShippingAddressStep` containing
`ProvinceCitySelect` · `ShippingMethodStep` · `PaymentStep` (COD display only) ·
`OrderReviewStep` · `PlaceOrderButton` · `OrderSummaryPanel` (which reuses `OrderItemsList` and
`CartSummary`)

Single page with accordion steps, driven by `CheckoutStepper` in the layout. The address step
must complete before the shipping step renders — shipping options resolve against the city
(section 5.1).

**8. `/order/confirmed/[id]` — the only receipt**

`OrderConfirmationHero` (order number, large and copyable) · `OrderItemsList` · `CartSummary`
(totals) · `DeliveryEstimateBox` · a WhatsApp contact block · a "screenshot this" prompt ·
`Button` back to shopping

No email, no SMS. If the customer closes this tab with nothing saved, they have nothing.

**9. `/track`**

`TrackOrderForm` (order number **and** phone, both required) · `OrderStatusTimeline` ·
`OrderItemsList` · carrier name + tracking number + tracking URL (section 5.1) ·
`EmptyResults` for a no-match

**10–15. Static pages** — `/about`, `/contact`, `/faq`, `/shipping-and-delivery`,
`/returns-and-refunds`, `/privacy`, `/terms`

`Container` plus prose. `/contact` adds a form and a WhatsApp block; `/faq` uses `Accordion`.
Nothing else.

**16. System files**

`not-found.tsx` (fired by `notFound()` when a handle doesn't resolve) · `error.tsx` at root and
around checkout · `loading.tsx` per dynamic route, rendering `Skeleton` or `HomeSkeleton`

---

**Reading the map for build order.** Anything appearing under three or more pages above is a
shared component and belongs in Phase 0 or 1: `ProductCard`, `ProductGrid`, `PriceDisplay`,
`StarRating`, `QuantityStepper`, `CartSummary`, `OrderItemsList`, `ProductRail`, `Breadcrumbs`,
`Container`, `TrustStrip`. Build those before any page that uses them and each later page is
mostly composition.


### 4.11 Folder structure

63 components. Three top-level groups: `ui/` (primitives), `shared/` (3+ pages),
`page/` (one page only).

```
components/
│
├── ui/                                 # 11 primitives — Phase 0
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── RadioGroup.tsx
│   ├── Badge.tsx
│   ├── Skeleton.tsx
│   ├── Drawer.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── Accordion.tsx
│
├── layout/                             # 11 — the shell, Phase 1
│   ├── Header.tsx
│   ├── CategoryMegaMenu.tsx
│   ├── MobileNav.tsx
│   ├── SearchBar.tsx
│   ├── CartButton.tsx
│   ├── AnnouncementBar.tsx
│   ├── Footer.tsx
│   ├── Breadcrumbs.tsx
│   ├── Container.tsx
│   ├── TrustStrip.tsx
│   └── WhatsAppFloatButton.tsx
│
├── shared/                             # 9 — used on 3+ pages, Phase 0–2
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ProductRail.tsx
│   ├── PriceDisplay.tsx
│   ├── StarRating.tsx
│   ├── QuantityStepper.tsx
│   ├── CartSummary.tsx
│   ├── OrderItemsList.tsx
│   └── EmptyState.tsx
│
└── page/                               # 32 — one page only
    │
    ├── home/                           # 6 → page 1
    │   ├── HeroCarousel.tsx
    │   ├── CategoryGrid.tsx
    │   ├── PromoBannerPair.tsx
    │   ├── BrandStrip.tsx
    │   ├── NewsletterSignup.tsx
    │   └── HomeSkeleton.tsx
    │
    ├── catalog/                        # 11 → pages 2, 4, 5
    │   ├── CategoryHeader.tsx
    │   ├── SearchResultHeader.tsx
    │   ├── FilterSidebar.tsx
    │   ├── FilterDrawer.tsx
    │   ├── PriceRangeFilter.tsx
    │   ├── CheckboxFilterGroup.tsx
    │   ├── ColorSwatchFilter.tsx
    │   ├── RatingFilter.tsx
    │   ├── ActiveFilterChips.tsx
    │   ├── SortDropdown.tsx
    │   └── PaginationControls.tsx
    │
    ├── product/                        # 10 → page 3
    │   ├── ProductGallery.tsx
    │   ├── GalleryThumbnails.tsx
    │   ├── MobileGallerySwiper.tsx
    │   ├── ProductTitleBlock.tsx
    │   ├── VariantOptionSelector.tsx
    │   ├── AddToCartButton.tsx
    │   ├── StockIndicator.tsx
    │   ├── DeliveryEstimateBox.tsx
    │   ├── ProductTabs.tsx
    │   └── StickyMobileBuyBar.tsx
    │
    ├── review/                         # 5 → page 3
    │   ├── ReviewSummary.tsx
    │   ├── ReviewList.tsx
    │   ├── ReviewCard.tsx
    │   ├── ReviewForm.tsx
    │   └── MerchantReply.tsx
    │
    ├── cart/                           # 4 → page 6
    │   ├── CartLineItem.tsx
    │   ├── CartLineItemMobile.tsx
    │   ├── CartDrawer.tsx
    │   └── EmptyCart.tsx
    │
    ├── checkout/                       # 9 → page 7
    │   ├── CheckoutStepper.tsx
    │   ├── ContactStep.tsx
    │   ├── ShippingAddressStep.tsx
    │   ├── ProvinceCitySelect.tsx
    │   ├── ShippingMethodStep.tsx
    │   ├── PaymentStep.tsx
    │   ├── OrderReviewStep.tsx
    │   ├── PlaceOrderButton.tsx
    │   └── OrderSummaryPanel.tsx
    │
    ├── order-confirmed/                # 1 → page 8
    │   └── OrderConfirmationHero.tsx
    │
    └── track/                          # 2 → page 9
        ├── TrackOrderForm.tsx
        └── OrderStatusTimeline.tsx
```

**Counts**

| Folder | Files |
|---|---|
| `ui/` | 11 |
| `layout/` | 11 |
| `shared/` | 9 |
| `page/home/` | 6 |
| `page/catalog/` | 11 |
| `page/product/` | 10 |
| `page/review/` | 5 |
| `page/cart/` | 4 |
| `page/checkout/` | 9 |
| `page/order-confirmed/` | 1 |
| `page/track/` | 2 |
| **Total** | **79** |

The 79 vs 63 gap is deliberate: the plan counted `ProductCard` once, this counts the file once
per place it lives. Same components, finer granularity — a few (`EmptyState`,
`SearchResultHeader`) are splits that fell out of the mapping.

**Rules**

**Import direction is one-way.** `page/` may import from `shared/`, `layout/` and `ui/`.
`shared/` may import from `ui/`. `ui/` imports nothing from this tree. Never import across
two `page/` folders — if `checkout/` needs something from `cart/`, that thing belongs in
`shared/`.

**Promotion, not duplication.** A component starts in its page folder. The moment a second
page needs it, move it to `shared/` and update the imports. Copy-pasting it is how the last
codebase happened.

**`catalog/` covers three pages** — category, search, collections — because they're the same
page with different headers. That's why the folder is named for the function, not the route.

**`review/` is separate from `product/`** even though it only renders on the product page.
It's a self-contained feature built in a later phase against its own backend module, so it
stays isolated.

**Colours and spacing come from `tailwind.config`, never inline.** A hex code inside any file
above means a token is missing.


---

## 5. Backend configuration required

All in the Medusa admin — no code, but do it before building checkout or nothing will work.

1. **Region** — Pakistan, PKR, and confirm tax settings
2. **Sales channel + publishable key** — the storefront key must be linked to the channel
3. **Stock location + fulfillment set** — location is Peshawar, one fulfillment set ("Delivery")
4. **Service zones** — see section 5.1 below. Zones are *price tiers*, each holding many
   cities as geo zones. Not one zone per city.
5. **Shipping options** — Standard and Express per zone, `manual` provider, flat rate
6. **Payment provider** — enable `manual` (this is your COD)
7. **Category tree** — build the real taxonomy before importing products
8. **Option titles and values** — lock the exact spelling per section 2.1, then create a
   reference sheet listing every allowed option title and value per category

Reviews are the one piece that isn't admin config — it's a custom module in the backend
(section 2.4), built in Phase 7.

Do #7 and #8 carefully, before importing products. Inconsistent option spelling silently
splits filters (`Red` and `red` become two separate checkboxes) and is tedious to fix once a
few hundred products are in.

### 5.1 Shipping zones — settled

**Model.** Medusa's structure is `Fulfillment Set → Service Zone → Geo Zones (cities)`, with
shipping options attached to the service zone. The service zone is a **price tier**, not a
city. Four zones and ~7 options, rather than 150 zones and 300 options — one price change
updates 40 cities at once, and the customer experience is identical.

**Couriers.** TCS and Leopards, both booked manually. Shipping options stay
**courier-agnostic** — the customer picks Standard or Express, admin picks the carrier at
dispatch. Build one zone map covering both: take the *worse* case per city (if either courier
treats it as remote, it's remote) and price at the *higher* of the two rates.

**Zones** — fill rates from the current courier sheets:

| Zone | Cities | Standard | Express |
|---|---|---|---|
| Local | Peshawar | TBD | TBD |
| Metro | Islamabad, Rawalpindi, Lahore, Karachi, Faisalabad, Multan, Gujranwala, Sialkot, Hyderabad, Quetta | TBD | TBD |
| Other cities | remaining courier-served cities | TBD | TBD |
| Remote | AJK, Gilgit-Baltistan, interior Balochistan | TBD | not offered |

**No free delivery threshold in v1.** Every order pays the zone rate. Adding one later is a
shipping option rule in the admin, not a storefront change — decide before you start marketing.

**Delivery estimates** live in the shipping option **name** — `Standard Delivery (3–5 days)`,
`Express Delivery (1–2 days)`. Admin-editable in the dashboard, renders straight to the
storefront, no code. Move to structured metadata only if you later need the estimate separate
from the label.

**City must be a dropdown, never free text.** Geo zone matching is on the city string. A
customer typing `pindi` or `rawalpindi` matches nothing and sees *zero* shipping options with
no obvious error — a silent checkout dead-end.

To keep the admin as single source of truth, add `src/api/store/shipping-cities/route.ts` to
the backend: reads geo zones from the fulfillment module, returns cities grouped by province.
The storefront `ProvinceCitySelect` populates from it. ~40 lines, and new cities added in the
dashboard appear in checkout automatically. Without it you hardcode a city list that silently
drifts.

**Checkout ordering constraint.** Shipping options resolve against the address, so the address
step must complete *before* the shipping method step renders. Reflected in the Phase 5
component order.

**Manual fulfillment implications.** Tracking numbers are entered by hand per fulfillment. The
carrier differs per order, so store carrier name alongside `tracking_number` and
`tracking_url`, and surface both on `/track`, on the account order detail, and in the Brevo
"order shipped" email. Design this into the order display in Phase 6 rather than retrofitting.

---

## 6. Build phases

Each phase ends with something you can open in a browser and check.

**Phase 0 — Foundations (2–3 days)**
SDK client, `lib/data/*` fetch layer, design tokens, all 10 primitives.
Palette is settled (section 2.3) — remaining token work is font pairing, type scale, spacing
base, and radius.
Done when: a styleguide page at `/dev/styleguide` renders every primitive in every state.

**Phase 1 — Shell (3–4 days)**
Header, mega menu, mobile nav, footer, breadcrumbs, container.
Done when: navigation reflects your real category tree from Medusa.

**Phase 2 — Browse (1–1.5 weeks)**
Category page, product grid, product card, full filter system, sort, pagination, search.
Done when: filters work, survive refresh, and are shareable as URLs.

**Phase 3 — Product detail (3–4 days)**
Gallery, variant selection, specs, related products, sticky mobile bar.
Done when: variant switching updates price, image, and stock correctly.

**Phase 4 — Cart (2–3 days)**
Add, update, remove, persist across refresh, drawer.
Done when: cart survives a browser restart and quantity edge cases behave.

**Phase 5 — Checkout (1–1.5 weeks)**
The whole flow through order placement — guest only. Budget more time than feels reasonable.
`normalizePhone()` and the synthetic email land here and are load-bearing (section 2.2).
Done when: a real order appears in the Medusa admin with correct address, shipping and total,
**and** a second order from the same phone lands under the same customer record.

**Phase 6 — Order confirmation & tracking (1–2 days)**
Confirmation page, `/track`, order status display. Carrier name alongside tracking number
(section 5.1). No account work.
Done when: an order is retrievable by number + phone, and the confirmation page works as a
standalone receipt.

**Phase 7 — Reviews (4–6 days)**
Custom Medusa module, store and admin routes, moderation screen, storefront components,
denormalised aggregate, server-layer rating filter and sort (section 2.4).
Done when: a review submitted from a verified phone appears only after admin approval, and the
product's average updates on the card and the detail page.

**Phase 8 — Static pages, SEO, polish (3–4 days)**
Metadata, Open Graph, sitemap, robots, JSON-LD product schema **including AggregateRating**,
404/error states, image optimisation.

**Phase 9 — Pre-launch hardening (3–5 days)**
Real-device testing on mid-range Android over 3G/4G, Lighthouse, form validation on bad input,
out-of-stock and race conditions, order confirmation emails via your existing Brevo setup for
the customers who did supply an email.

Realistic total for a careful solo build: **6–9 weeks**. Checkout and filtering are over half of
it. Dropping accounts and messaging paid for reviews at roughly break-even.

### 6.1 Build sequence to a working home page

One component per session, in this order. Each is buildable because everything it imports
already exists.

**Before any component — Phase 0 setup (not components)**

1. `tailwind.config.ts` — the palette from section 2.3, plus type scale, spacing base, radius
2. `lib/sdk.ts` — Medusa JS SDK client with the publishable key
3. `lib/data/products.ts` — `searchProducts()`, `getProduct()`
4. `lib/data/categories.ts` — cached category tree
5. `app/(shop)/layout.tsx` — empty shell, filled in step 26

Nothing below works without the tokens in step 1. Build it first even though it isn't a
component.

**Primitives — `components/ui/` (11)**

| # | Component | Why here |
|---|---|---|
| 6 | `Button` | Every page. Variants: primary (amber), secondary (navy outline), ghost |
| 7 | `Input` | Search, checkout, review form |
| 8 | `Select` | Sort, province/city |
| 9 | `Checkbox` | Filter groups |
| 10 | `Badge` | Discount badge on `ProductCard` |
| 11 | `Skeleton` | Every loading state |
| 12 | `Drawer` | `MobileNav`, `FilterDrawer`, `CartDrawer` |
| 13 | `Accordion` | `MobileNav`, `ProductTabs`, FAQ, checkout steps |

`RadioGroup`, `Modal` and `Toast` aren't needed for the home page — defer to Phase 4–5.

**Done when** `/dev/styleguide` renders all eight in every state, on the cream page background.

**Shared — `components/shared/` (5 of 9)**

| # | Component | Imports |
|---|---|---|
| 14 | `PriceDisplay` | — (price, compare-at, strikethrough, PKR formatting) |
| 15 | `StarRating` | — (display-only for now; interactive version in Phase 7) |
| 16 | `ProductCard` | `Badge`, `PriceDisplay`, `StarRating`, `next/image` |
| 17 | `ProductGrid` | `ProductCard`, `Skeleton` |
| 18 | `ProductRail` | `ProductCard` (horizontal scroll) |

`QuantityStepper`, `CartSummary`, `OrderItemsList` and `EmptyState` come in Phases 3–6.

⚠️ `ProductCard` is the highest-leverage component in the build — it appears on five pages and
is most of what a mobile visitor ever sees. Spend real time on it. Get the image aspect ratio,
title truncation, and the discount badge right here and four later pages inherit it.

**Layout — `components/layout/` (11)**

| # | Component | Notes |
|---|---|---|
| 19 | `Container` | Max-width and gutters. Everything else sits inside it |
| 20 | `Breadcrumbs` | Not on home, but trivial and unblocks pages 2–6 |
| 21 | `AnnouncementBar` | Top strip |
| 22 | `SearchBar` | Input + typeahead. Can ship without typeahead initially |
| 23 | `CartButton` | Icon + count badge |
| 24 | `CategoryMegaMenu` | Desktop. Needs the cached category tree from step 4 |
| 25 | `MobileNav` | `Drawer` + `Accordion`, recursive over the tree |
| 26 | `Header` | Composes 22–25. Sticky, shrinks on scroll |
| 27 | `TrustStrip` | COD, delivery, returns icons |
| 28 | `Footer` | |
| 29 | `WhatsAppFloatButton` | |

**Done when** navigation renders your real Medusa category tree at every depth, on both
desktop and mobile.

**Home — `components/page/home/` (6)**

| # | Component |
|---|---|
| 30 | `HeroCarousel` |
| 31 | `CategoryGrid` |
| 32 | `PromoBannerPair` |
| 33 | `BrandStrip` |
| 34 | `NewsletterSignup` |
| 35 | `HomeSkeleton` |

**36 — `app/(shop)/page.tsx`** — assemble: hero, category grid, `ProductRail` ×3, promo pair,
brand strip, trust strip, newsletter.

**Home page done when** it renders real products from Medusa, the mega menu shows the real
tree, and it loads acceptably on a mid-range Android over 4G.

---

**36 sessions to a live home page.** The first 29 are foundation — after that, the category
page in Phase 2 is mostly assembly, because its filters are the only genuinely new work.

**Session prompt shape** (per section 7):

> Create `components/shared/ProductCard.tsx`. Props: `product` (Medusa `StoreProduct`).
> Shows image, title (2-line truncate), `PriceDisplay`, `StarRating`, and a `Badge` when
> `compare_at_price` exists. Use `Badge` from `components/ui`, colours and spacing from
> `tailwind.config` — no inline hex. Mobile-first, 2 columns at 360px.

Name the file path, name the imports, name the constraint. Then read the diff before accepting.


---

## 7. Working method with Claude Code

The point of this rebuild is that you understand the result. That only happens if you enforce
these:

1. **One component per session.** Name the file path in the prompt.
2. **Reference the tokens.** "Use Button from components/ui, spacing scale from tailwind.config,
   match the layout in this screenshot."
3. **Read every diff before accepting.** If you can't explain what it does, it doesn't go in.
4. **Run it after each step.** Broken states are cheap to fix immediately, expensive later.
5. **Commit per component**, with a message you'd understand in a month.
6. **Keep `CLAUDE.md` current** — stack, conventions, folder structure, the filtering approach,
   the phone-first rule. It's read at the start of every session and is the main lever on
   output quality.
7. **Never say "make it better" or "clean this up."** Unbounded prompts produced the last
   codebase. Specific, bounded tasks with a visible result.

---

## 8. Open questions to answer before Phase 2

- [x] ~~Filtering approach~~ — settled: native option filtering on v2.19, price + facet counts
      in the Next.js server layer
- [x] ~~SKU count~~ — under 200 per category at launch. Server-layer filtering has ~3–5x
      headroom. MeiliSearch not needed.
- [ ] Confirm the option title/value list per category and lock the spelling convention
- [x] ~~Category tree structure~~ — settled: single self-referencing table, leaf-only product
      assignment, descendant IDs resolved from a cached tree (section 2.1.1)
- [ ] Final category tree contents and the globally-unique handle list — lock before importing
- [x] ~~Express delivery cities and SLA~~ — settled: 4 zones, courier-agnostic, express in all
      but Remote (section 5.1)
- [ ] Actual rates per zone from the TCS and Leopards sheets (take the higher of the two)
- [x] ~~Free delivery threshold~~ — settled: **none in v1**. Every order pays shipping. It's a
      Medusa shipping option rule, not storefront architecture, so adding one later is config
      not rework (section 5.1)
- [x] ~~COD risk controls~~ — settled: manual confirmation call before dispatch, logged to
      `metadata.phone_verified`. No OTP, no cap, no advance payment (section 2.2)
- [x] ~~Customer accounts~~ — deferred to v2. Guest-only checkout; nothing in v1 depends on
      them. Preserve the synthetic email format and `normalizePhone()` and the migration is
      additive (section 2.2)
- [x] ~~Order history lookup~~ — settled: `/track` by order number + phone only. Phone-only
      lookup is an enumeration hole and is not built
- [x] ~~Reviews~~ — settled: flat with one merchant reply, moderated, verified buyer via the
      phone's customer record, rating filter in the server layer (section 2.4)
- [ ] Review moderation policy — who approves, how fast, what gets rejected. Operational, but
      decide before the review form goes live
- [ ] Confirmation-call script and the point in dispatch where it happens
- [x] ~~English only for v1?~~ — settled: English only. Urdu is a v2 item (section 1)
- [ ] Where is this hosted? (affects caching and image strategy)
