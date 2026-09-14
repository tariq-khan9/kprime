# Category tiles

Images for the "Shop by category" rail on the home page.

## These are TEST PHOTOS — replace before launch

`electronics.jpg`, `cosmetics.jpg`, `kitchenware.jpg` and `home-and-bedding.jpg`
are stock photographs downloaded from Unsplash (images.unsplash.com) for layout
testing only — not our photography. Replace each with a real photograph of the
same name and nothing else needs changing — the tiles in
`src/static/category.ts` already point at these filenames.

`audio.jpg` and `mobile-accessories.jpg` are old generated placeholders for
categories that no longer exist; nothing references them.

## What the slot expects

- **3:2 landscape**, around 1200×800 or larger. The tile is `object-cover`, so
  anything wider is cropped top and bottom, not letterboxed.
- **Deliberately the inverse of a product card's 3:4 portrait**, so a category is
  never mistaken for a product at a glance. Keep that ratio.
- JPEG for photographs. Next converts to AVIF or WebP per request.

## Two things to watch

**A navy scrim covers every tile** (`bg-brand/50`) so the category name stays
readable. The photo will look darker and less saturated than the file you supply
— pick for shape and colour, not fine detail in the shadows.

**The tile is small.** At 360px it is roughly 160px wide. A busy photograph
turns to mush at that size; one clear subject reads.

## Changing which categories appear

Edit `src/static/category.ts`. Six is what the rail is designed around — three
visible on desktop with a second screenful behind the arrows. `href` must be a
real category handle or the tile 404s.
