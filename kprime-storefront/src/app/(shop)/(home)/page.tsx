import { Container } from "@/components/layout/Container"
import { BrandStrip } from "@/components/page/home/BrandStrip"
import { CategoryRail } from "@/components/page/home/CategoryRail"
import { HeroCarousel } from "@/components/page/home/HeroCarousel"
import { NewsletterSignup } from "@/components/page/home/NewsletterSignup"
import { PromoBannerPair } from "@/components/page/home/PromoBannerPair"
import { ProductRail } from "@/components/shared/ProductRail"
import { getCategoryTree } from "@/lib/data/categories"
import { getCollectionByHandle } from "@/lib/data/collections"
import { getTagIdsByValue, searchProducts } from "@/lib/data/products"

/**
 * Home page.
 *
 * Static with revalidation (§3): the catalogue changes rarely, so every visitor
 * gets prerendered HTML rather than a database round trip.
 *
 * TrustStrip is NOT here despite task 56 listing it — task 49 put it in
 * (shop)/layout.tsx, so it already renders below this content on every page.
 * Adding it again would show it twice.
 */
export const revalidate = 3600

/**
 * The three rails task 56 names.
 *
 * Sale was held back until it had data to stand on — a rail of full-price
 * products under a Sale heading would be a lie on the shop's most-visited page.
 * It now sources from the Sale collection, whose products carry a real
 * compare-at price from the "Demo sale" price list, so the cards show a genuine
 * saving.
 *
 * Sale leads: it is the strongest reason to keep scrolling, and below the hero
 * is the only place on a 360px screen where that is true.
 */
type Rail =
  | { title: string; tag: string; viewAllHref: string }
  | { title: string; collection: string; viewAllHref: string }

const RAILS: Rail[] = [
  { title: "Sale", collection: "sale", viewAllHref: "/collections/sale" },
  // A tag-sourced rail has no page of its own to land on, so these point at
  // search rather than a route that does not exist.
  { title: "New In", tag: "New Arrival", viewAllHref: "/search" },
  { title: "Best Sellers", tag: "Bestseller", viewAllHref: "/search" },
]

export default async function HomePage() {
  const tree = await getCategoryTree()

  const rails = await Promise.all(
    RAILS.map(async (rail) => {
      // Every branch below resolves to a SCOPE or to null, and null means an
      // empty rail. Falling through to an unscoped searchProducts would render
      // the whole catalogue under a "Sale" or "New In" heading — worse than a
      // rail that is simply absent, which ProductRail already handles by
      // returning null for an empty list.
      let scope: Parameters<typeof searchProducts>[0] | null = null

      if ("collection" in rail) {
        // Undefined when the collection is renamed or deleted in admin.
        const collection = await getCollectionByHandle(rail.collection)
        scope = collection ? { collectionIds: [collection.id] } : null
      } else {
        const tagIds = await getTagIdsByValue([rail.tag])
        scope = tagIds.length ? { tagIds } : null
      }

      const { products } = scope
        ? await searchProducts({ ...scope, pageSize: 12 })
        : { products: [] }

      return { title: rail.title, products, viewAllHref: rail.viewAllHref }
    })
  )

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Full-bleed: outside Container on purpose. */}
      <HeroCarousel />

      {/* Sale sits between the hero and the category rail; the rest follow it.
          `priority` tracks index 0 rather than a named rail, so it stays on
          whichever rail is first if this order changes again. */}
      <Container>
        <ProductRail
          title={rails[0].title}
          products={rails[0].products}
          viewAllHref={rails[0].viewAllHref}
          // Only the first rail's images are LCP candidates.
          priority
        />
      </Container>

      <Container>
        <CategoryRail categories={tree} />
      </Container>

      {rails.slice(1).map((rail) => (
        <Container key={rail.title}>
          <ProductRail
            title={rail.title}
            products={rail.products}
            viewAllHref={rail.viewAllHref}
          />
        </Container>
      ))}

      <Container>
        <PromoBannerPair />
      </Container>

      <Container>
        <BrandStrip />
      </Container>

      <Container>
        <NewsletterSignup />
      </Container>
    </div>
  )
}
