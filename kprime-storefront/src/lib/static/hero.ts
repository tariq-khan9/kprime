/**
 * Home page carousel slides.
 *
 * Plain data, kept out of `config/site.ts` so the copy and artwork for the
 * biggest thing on the site can be edited without opening a file full of
 * unrelated shop settings.
 *
 * The type lives here with the data rather than in `config/site.ts`, which
 * re-exports both. That avoids a circular import — the config file imports this
 * one — and means a misspelled or missing field is a build error rather than a
 * slide that silently renders wrong.
 *
 * Gradients stay in the navy family on purpose. Amber means "act on this" and
 * belongs to the button alone; sale red means a discount. Using either as a
 * full-bleed background here would spend a colour that carries meaning
 * elsewhere in the shop.
 */

export type HeroSlide = {
  /** One line: the promise. */
  heading: string
  /** One line: the detail. */
  subheading: string
  ctaLabel: string
  /** Must be a real category handle, or the button 404s. */
  ctaHref: string
  /**
   * Tailwind gradient classes.
   *
   * Required even on a slide that has an image: it shows through until the
   * photograph paints, so a slow connection never sees a white box, and it is
   * the whole slide for any entry without one.
   */
  gradient: string
  /**
   * Path under `public/`, e.g. `/hero/electronics.jpg`. Omit for a gradient.
   *
   * A navy scrim is drawn over every image so the heading stays legible
   * whatever the photograph looks like behind those particular words.
   */
  image?: string
  /** Describes the photograph. Required whenever `image` is set. */
  imageAlt?: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    heading: "Cash on delivery, nationwide",
    subheading: "Pay when your order reaches you. No card, no advance.",
    ctaLabel: "Start shopping",
    ctaHref: "/categories/electronics",
    gradient: "from-brand to-brand-light",
    image: "/hero/cash-on-delivery.jpg",
    imageAlt: "A rider handing a parcel to a customer at their door",
  },
  {
    heading: "Electronics that last",
    subheading: "Chargers, cables and audio, with a warranty.",
    ctaLabel: "Browse electronics",
    ctaHref: "/categories/electronics",
    gradient: "from-brand-light to-brand",
    image: "/hero/electronics.jpg",
    imageAlt: "A desk with a charger, braided cable and wireless earbuds",
  },
  {
    heading: "For the home",
    subheading: "Bedding and pillows, delivered in 1–5 days to most cities.",
    ctaLabel: "Browse home",
    ctaHref: "/categories/home-and-bedding",
    gradient: "from-brand to-action-ink",
    image: "/hero/home.jpg",
    imageAlt: "A made bed with folded cotton sheets and pillows",
  },
  {
    heading: "Everyday cosmetics",
    subheading: "Skincare, makeup and fragrance you already use.",
    ctaLabel: "Browse cosmetics",
    ctaHref: "/categories/cosmetics",
    gradient: "from-brand-light to-action-ink",
    image: "/hero/cosmetics.jpg",
    imageAlt: "Skincare bottles and a lipstick arranged on a plain surface",
  },
  {
    heading: "Kitchen essentials",
    subheading: "Cookware, kettles and storage for a working kitchen.",
    ctaLabel: "Browse kitchenware",
    ctaHref: "/categories/kitchenware",
    gradient: "from-action-ink to-brand",
    image: "/hero/kitchen.jpg",
    imageAlt: "A frying pan and storage containers on a kitchen counter",
  },
]
