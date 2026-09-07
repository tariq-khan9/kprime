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

**Keyed by leaf category — the deepest level, the one that holds products.**
That is not cosmetic. The storefront renders a filter group only when it covers
**60%** of a listing, and every product in a leaf carries the same option titles,
so each option sits at 100% inside its own leaf and always shows. One level up it
falls to roughly a quarter and disappears. `Wattage` is a charger fact, not a
mobile-accessory fact, and this table is where that is decided.

**Giving a leaf's product a different option set breaks it.** The group drops
below 60% and the leaf starts hiding its own filters. `buildCatalogue()` throws
on this rather than letting it ship.

### Universal

| Title | Allowed values | Notes |
|---|---|---|
| `Colour` | `Black`, `White`, `Grey`, `Navy`, `Blue`, `Red`, `Green`, `Beige`, `Brown`, `Gold`, `Silver`, `Steel`, `Transparent` | Never `Color`. `Steel` is a finish, allowed only where it is genuinely the product's own finish, e.g. a kettle. |

### Electronics › Mobile Accessories

| Leaf | Options |
|---|---|
| `Chargers` | `Wattage` (`18W`, `20W`, `25W`, `30W`, `45W`, `65W`, `100W`) + `Colour` |
| `Cables` | `Length` (`0.5m`, `1m`, `1.5m`, `2m`, `3m`) + `Colour` |
| `Power Banks` | `Capacity` (`5000mAh`, `10000mAh`, `20000mAh`, `30000mAh`) + `Colour` |
| `Mounts & Wireless` | `Colour` + `Connection` (`Wired`, `Wireless`) |

> `Colour` is on **all four** on purpose. It is the only option that survives to
> `/categories/mobile-accessories`, and without it that page would have an empty
> sidebar rather than a useful one.

### Electronics › Audio

| Leaf | Options |
|---|---|
| `Headphones & Earphones` | `Connection` (`Wired`, `Wireless`, `Bluetooth`) + `Fit` (`In-Ear`, `On-Ear`, `Over-Ear`) |
| `Speakers & Microphones` | `Connection` + `Colour` |

### Electronics › Computer Accessories

| Leaf | Options |
|---|---|
| `Keyboards` | `Switch Type` (`Blue`, `Brown`, `Red`, `Silent Red`) + `Layout` (`Full Size`, `TKL`, `60%`, `75%`) |
| `Mice` | `Connection` + `Colour` |
| `Laptop Accessories` | `Colour` + `Material` (`Aluminium`, `Fabric`, `Leather`, `Plastic`) |

> `Switch Type` values collide with `Colour` values by design — mechanical
> switches are named by colour and buyers search for them that way. Different
> title, different filter group. Leave it.

### Cosmetics › Skincare

| Leaf | Options |
|---|---|
| `Serums`, `Cleansers`, `Moisturisers`, `Sunscreens & Masks` | `Volume` (`30ml`, `50ml`, `75ml`, `100ml`, `200ml`) + `Skin Type` (`All Skin Types`, `Dry`, `Oily`, `Combination`, `Sensitive`) |

### Cosmetics › Makeup

| Leaf | Options |
|---|---|
| `Lip Makeup`, `Face Makeup`, `Eye Makeup` | `Shade` (`Nude`, `Plum`, `Ruby`, `Coral`, `Berry`, `Mauve`, `Beige`, `Gold`, `Brown`, `Black`) + `Finish` (`Matte`, `Glossy`, `Satin`) |

> `Shade`, never `Colour`, for anything applied to the body. A lipstick's shade
> and a cable's colour are not the same kind of fact and must not share a filter.
> `Beige`, `Gold`, `Brown` and `Black` are here for foundation, highlighter and
> mascara, where the sheet's original six make no sense.

### Cosmetics › Fragrances

| Leaf | Options |
|---|---|
| `Perfumes`, `Attars & Body Mists` | `Volume` |

### Kitchenware › Cookware

| Leaf | Options |
|---|---|
| `Frying Pans`, `Pots & Karahi`, `Tawa & Griddles` | `Diameter` (`20cm`, `24cm`, `26cm`, `28cm`, `30cm`) + `Material` (`Non-Stick`, `Stainless Steel`, `Cast Iron`, `Granite`) |

> **`Diameter`, not `Size`.** This is the collision described above.

### Kitchenware › Kitchen Appliances

| Leaf | Options |
|---|---|
| `Kettles`, `Blenders & Juicers`, `Cookers & Fryers` | `Capacity` (`1L`, `1.5L`, `1.7L`, `2L`) + `Colour` |

### Kitchenware › Storage & Containers

| Leaf | Options |
|---|---|
| `Food Containers`, `Jars & Canisters`, `Lunch Boxes` | `Pack Size` (`Single`, `Pack of 2`, `Pack of 3`, `Pack of 5`, `Pack of 7`) + `Material` (`Plastic`, `Glass`, `Stainless Steel`) |

### Home & Bedding › Bedsheets

| Leaf | Options |
|---|---|
| `Bed Sheet Sets`, `Duvets & Covers`, `Mattress Protectors` | `Bed Size` (`Single`, `Double`, `Queen`, `King`) + `Colour` |

### Home & Bedding › Pillows & Blankets

| Leaf | Options |
|---|---|
| `Pillows` | `Pack Size` + `Filling` (`Microfibre`, `Memory Foam`, `Cotton`) |
| `Blankets` | `Colour` + `Filling` |
| `Cushions & Inserts` | `Pack Size` + `Filling` |

> `Blankets` takes `Colour` rather than `Pack Size` so that `Colour` clears 60%
> across Home & Bedding as a whole. Without it that top-level page has no filter
> that applies to everything on it, and shows none at all.

> `Single` appears in both `Bed Size` and `Pack Size`. Acceptable: separate
> titles, separate groups, and in each the word is the ordinary term a buyer
> would use.

### The small categories

These four hold products directly and have no leaves.

| Category | Options |
|---|---|
| `Sports & Outdoors` | `Colour` + `Material` |
| `Toys & Games` | `Age Range` (`3+`, `6+`, `8+`, `12+`) + `Colour` |
| `Stationery` | `Colour` + `Pack Size` |
| `Health & Wellness` | `Volume` |

> `Age Range` is the one title that exists nowhere else. A gift for a
> four-year-old and one for a twelve-year-old are different purchases and no
> existing title carries that. Values are the plus form (`6+`), never a range
> (`6-8`), so they sort naturally and never overlap.
>
> Stationery (2 products) and Health & Wellness (1) fall below
> `MIN_PRODUCTS_FOR_FILTERS`, so their options are recorded here but no sidebar
> renders. That is deliberate — they are the test case for that rule.

---

## Retired titles — do not use

| Retired | Use instead | Why |
|---|---|---|
| `Size` | `Volume`, `Diameter`, `Bed Size`, `Pack Size` | Meant millilitres and centimetres at once |
| `Set Size` | `Pack Size` | Duplicate concept, different value format |
| `Pack` | `Pack Size` | Same |
| `Color` | `Colour` | British spelling throughout |
| `Age` | `Age Range` | Ambiguous — the product's age or the child's |
| `Set Size`, `Pack` | `Pack Size` | Already retired above; listed again because both still read naturally |

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
