# Promo banner images

Photographs for the two promo cards on the home page (`src/static/promo.ts`).

## These are TEST PHOTOS — replace before launch

`kitchen.jpg` and `cosmetics.jpg` are stock photographs downloaded from Unsplash
(unsplash.com) for layout testing only — not our photography. Replace each with a
real photograph of the same name and update its `imageAlt` in
`src/static/promo.ts`.

## What the slot expects

- **Landscape**, around 1600×1067 or larger. The card is 2:1 on a phone and 5:2
  from `sm`, with `object-cover`, so the top and bottom are cropped. Keep the
  subject in the middle band.
- **The copy sits bottom-left** over a navy scrim that is darkest at the bottom.
  Avoid photos whose subject lives in that corner.
- JPEG for photographs. Next converts to AVIF or WebP per request.
