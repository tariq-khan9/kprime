/**
 * "Shop by category" tiles on the home page.
 *
 * **Curated, not derived.** The rail used to render whatever `getCategoryTree`
 * returned, which meant every category the shop had ever created — nineteen of
 * them, including empty demo ones — competed for the most valuable strip on the
 * site. This is a hand-picked six instead: the ones worth sending a first-time
 * visitor to.
 *
 * The trade is that adding a category in admin no longer changes this rail. That
 * is deliberate — it is a shop window, not an index. The full tree is still in
 * the header's mega menu and the footer, both of which stay live.
 *
 * Each `href` must be a real category handle or the tile 404s.
 *
 * There is no `alt` field: the title is rendered as text on the tile, so the
 * image is decorative and carries `alt=""`. A screen reader announcing the
 * category name twice would be worse than saying it once.
 */

export type CategoryTile = {
  /** Shown on the tile. Does not have to match the category's name in admin. */
  title: string
  /** Path under `public/`, e.g. `/category/electronics.jpg`. */
  image: string
  /** Must be a real category handle. */
  href: string
}

export const CATEGORY_TILES: CategoryTile[] = [
  {
    title: "Electronics",
    image: "/category/electronics.jpg",
    href: "/categories/electronics",
  },
  {
    title: "Mobile Accessories",
    image: "/category/mobile-accessories.jpg",
    href: "/categories/mobile-accessories",
  },
  {
    title: "Audio",
    image: "/category/audio.jpg",
    href: "/categories/audio",
  },
  {
    title: "Cosmetics",
    image: "/category/cosmetics.jpg",
    href: "/categories/cosmetics",
  },
  {
    title: "Kitchenware",
    image: "/category/kitchenware.jpg",
    href: "/categories/kitchenware",
  },
  {
    title: "Home & Bedding",
    image: "/category/home-and-bedding.jpg",
    href: "/categories/home-and-bedding",
  },
]
