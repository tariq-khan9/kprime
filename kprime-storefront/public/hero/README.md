# Hero images

Photographs for the home page carousel. Drop files here, then reference them in
`HERO_SLIDES` in `src/config/site.ts`:

```ts
{
  heading: "Electronics that last",
  subheading: "Chargers, audio and accessories with a warranty.",
  ctaLabel: "Browse electronics",
  ctaHref: "/categories/electronics",
  gradient: "from-brand-light to-brand",   // still required, see below
  image: "/hero/electronics.jpg",
  imageAlt: "A desk with a charger, cable and wireless earbuds",
}
```

A slide with no `image` keeps its gradient, so photography can be added one
slide at a time.

## What the slot expects

- **Landscape, full-bleed.** The slide is `78vh` tall, capped at `46rem`, and the
  image is `object-cover` — so it fills the box and crops rather than letterboxes.
- **Roughly 2400×1400 or wider.** Upload the large original; Next converts to
  AVIF or WebP per request and generates every size in the `sizes` list, so a
  big JPEG costs the visitor nothing.
- **JPEG for photographs**, PNG only if the image genuinely needs transparency.

## Two things that will bite you

**The subject must survive cropping.** `object-cover` crops to fill, and the crop
differs between a 360px phone and a 1440px monitor. Anything important near an
edge will be cut off on one of them. Keep the subject central.

**A navy scrim is drawn over every image** (`bg-brand/60`) so the heading stays
readable. Two consequences: the photo will look darker and less saturated than
the file you supplied, and there is no point picking an image for subtle detail
in its shadows. Pick for shape and colour, not fine detail.

`gradient` stays required even on an image slide — it shows through until the
photograph paints, so the slide is never a white box on a slow connection.

## Alt text

`imageAlt` describes the photograph for someone who cannot see it. Describe what
is in it, not what it is for: "A desk with a charger, cable and wireless
earbuds", not "Electronics banner". Leave it out and the image is treated as
decorative.
