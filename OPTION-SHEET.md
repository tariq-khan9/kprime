# Option sheet — FROZEN

Task 8. Every allowed product option **title** and **value**, per category.

This is a reference document, not code. Nothing enforces it automatically — the
storefront derives its filter sidebar from whatever strings are in the database,
so a typo entered in admin becomes a live filter within the hour.

**Read this before task 10 (importing real products), and before adding any
option to any product, ever.**

---

## Why this is strict

The filter sidebar is **derived from the data**, not configured. `deriveFacets`
groups products by option *title* and lists the distinct *values* under it. That
has three consequences:

1. **A typo creates a phantom filter.** `Color` alongside `Colour` produces two
   separate groups, each with half the products. Neither is wrong enough to
   notice, and both are wrong.
2. **A reused title merges unrelated things.** Two categories that both call an
   option `Size` share one filter group.
3. **Renaming later is expensive.** Options belong to variants, and variants have
   orders against them.

### This is not hypothetical

The current seed data already has the collision. Live, today:

```
Size  →  50ml · 100ml · 24cm · 28cm · 30ml
```

Fragrances and Skincare measure `Size` in millilitres; Cookware measures it in
centimetres. They share a title, so they share a filter. It is invisible right
now only because the group covers 20% of the catalogue and the sidebar hides
anything under 25% — it would appear the moment more products are added.

**The fix is in this sheet: `Size` is retired.** Use `Volume` or `Diameter`.

---

## Rules

1. **Title Case for titles and values.** `Switch Type`, not `switch type`.
   `Black`, not `black`.
2. **Units glue to the number.** `128GB`, `45W`, `1m`, `30ml`, `24cm`. Never
   `128 GB`.
3. **No trailing or double spaces.** Paste into a plain editor before entering.
4. **One concept, one title.** If two categories mean different things, they need
   different titles — that is why `Size` is gone.
5. **A title means the same thing everywhere it appears.** `Colour` is always the
   colour of the item itself.
6. **Never invent a value that is a near-duplicate of an existing one.** No `Red`
   *and* `Bright Red`. No `Grey` *and* `Gray`. Pick the one in this sheet.
7. **Spelling is British.** `Colour`, `Grey`. This shop is not American.
8. **Single-value options are specifications, not choices.** An option with one
   value renders in the Specifications tab, never as a selector. That is
   deliberate — see §2.1.

---

## The allowed options

### Universal

| Title | Allowed values | Notes |
|---|---|---|
| `Colour` | `Black`, `White`, `Grey`, `Navy`, `Blue`, `Red`, `Green`, `Beige`, `Brown`, `Gold`, `Silver`, `Steel`, `Transparent` | Never `Color`. `Steel` is a finish, allowed only where it is genuinely the product's own finish, e.g. a kettle. |

### Electronics — Mobile Accessories

| Title | Allowed values |
|---|---|
| `Colour` | from the universal list |
| `Wattage` | `18W`, `20W`, `25W`, `30W`, `45W`, `65W`, `100W` |
| `Length` | `0.5m`, `1m`, `1.5m`, `2m`, `3m` |
| `Capacity` | `5000mAh`, `10000mAh`, `20000mAh`, `30000mAh` |
| `Connector` | `USB-C`, `Lightning`, `Micro-USB`, `USB-A` |

### Electronics — Computer Accessories

| Title | Allowed values |
|---|---|
| `Colour` | from the universal list |
| `Switch Type` | `Blue`, `Brown`, `Red`, `Silent Red` |
| `Layout` | `Full Size`, `TKL`, `60%`, `75%` |
| `Connection` | `Wired`, `Wireless`, `Bluetooth` |

> `Switch Type` values collide with `Colour` values by design — mechanical
> switches are named by colour and buyers search for them that way. They are a
> different option title, so they form a different filter group. Leave it.

### Electronics — Audio

| Title | Allowed values |
|---|---|
| `Colour` | from the universal list |
| `Connection` | `Wired`, `Wireless`, `Bluetooth` |
| `Fit` | `In-Ear`, `On-Ear`, `Over-Ear` |

### Kitchen — Cookware

| Title | Allowed values |
|---|---|
| `Diameter` | `20cm`, `24cm`, `26cm`, `28cm`, `30cm` |
| `Material` | `Non-Stick`, `Stainless Steel`, `Cast Iron`, `Granite` |

> **`Diameter`, not `Size`.** This is the collision described above.

### Kitchen — Appliances

| Title | Allowed values |
|---|---|
| `Colour` | from the universal list |
| `Capacity` | `1L`, `1.5L`, `1.7L`, `2L` |

### Kitchen — Storage & Containers

| Title | Allowed values |
|---|---|
| `Pack Size` | `Single`, `Pack of 2`, `Pack of 3`, `Pack of 5`, `Pack of 7` |
| `Material` | `Plastic`, `Glass`, `Stainless Steel` |

> **`Pack Size`, not `Set Size`.** The seed data uses `Set Size` with values
> `3-piece` / `5-piece`, while Pillows uses `Pack` with `Single` / `Pack of 2`.
> Two titles and two value formats for one concept. Unified here.

### Home — Bedsheets

| Title | Allowed values |
|---|---|
| `Bed Size` | `Single`, `Double`, `Queen`, `King` |
| `Colour` | from the universal list |
| `Material` | `Cotton`, `Cotton Blend`, `Satin`, `Microfibre` |

> `Single` appears in both `Bed Size` and `Pack Size`. Acceptable: they are
> separate titles, so separate filter groups, and in each the word is the
> ordinary term a buyer would use.

### Home — Pillows & Blankets

| Title | Allowed values |
|---|---|
| `Pack Size` | as above |
| `Filling` | `Microfibre`, `Memory Foam`, `Cotton` |

### Cosmetics — Makeup

| Title | Allowed values |
|---|---|
| `Shade` | `Nude`, `Plum`, `Ruby`, `Coral`, `Berry`, `Mauve` |
| `Finish` | `Matte`, `Glossy`, `Satin` |

> `Shade`, never `Colour`, for anything applied to the body. A lipstick's shade
> and a cable's colour are not the same kind of fact and must not share a filter.

### Cosmetics — Skincare · Fragrances

| Title | Allowed values |
|---|---|
| `Volume` | `30ml`, `50ml`, `75ml`, `100ml`, `200ml` |
| `Skin Type` | `All Skin Types`, `Dry`, `Oily`, `Combination`, `Sensitive` |

> **`Volume`, not `Size`.**

---

## Retired titles — do not use

| Retired | Use instead | Why |
|---|---|---|
| `Size` | `Volume`, `Diameter`, `Bed Size`, `Pack Size` | Meant millilitres and centimetres at once |
| `Set Size` | `Pack Size` | Duplicate concept, different value format |
| `Pack` | `Pack Size` | Same |
| `Color` | `Colour` | British spelling throughout |

### Migration for existing seed products

Not urgent — these are demo products that task 10 replaces. If any survive:

- `Non-Stick Frying Pan` — `Size` `24cm`/`28cm` → `Diameter`
- `Oud Eau de Parfum` — `Size` `50ml`/`100ml` → `Volume`
- `Vitamin C Brightening Serum` — `Size` `30ml`/`50ml` → `Volume`
- `Airtight Storage Container Set` — `Set Size` `3-piece`/`5-piece` → `Pack Size`
  `Pack of 3`/`Pack of 5`
- `Microfibre Pillow` — `Pack` → `Pack Size`

---

## Adding something new

Before typing a new option title or value into admin:

1. Is it already here under a different name? Use the one here.
2. Does the title mean exactly the same thing in every category that will use it?
   If not, it needs a more specific name.
3. Does it have a unit? Glue it to the number.
4. Is it a genuine choice a buyer makes, or a fact about the product? A fact with
   one value belongs in Specifications — enter it as a single-value option and it
   lands there automatically.
5. Add it to this sheet **in the same commit** as the product that introduced it.

## Checking the sheet is still true

`/dev/facets` lists every derived filter group with its values and coverage. Read
it after any import. Two titles that should be one, or one title with mixed
units, will be visible there before a customer ever sees them.
