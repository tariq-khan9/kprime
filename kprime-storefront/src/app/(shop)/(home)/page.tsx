import { Container } from "@/components/layout/Container"
import { BrandStrip } from "@/components/page/home/BrandStrip"
import { CategoryRail } from "@/components/page/home/CategoryRail"
import { HeroCarousel } from "@/components/page/home/HeroCarousel"
import { NewsletterSignup } from "@/components/page/home/NewsletterSignup"
import { PromoBannerPair } from "@/components/page/home/PromoBannerPair"
import { ProductRail } from "@/components/shared/ProductRail"
import { getCategoryTree } from "@/lib/data/categories"
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
 * Two rails, not the three task 56 names.
 *
 * "Sale" has no data to stand on: there are no collections, and no product
 * carries a compare-at price. A rail of full-price products under a Sale
 * heading would be a lie on the shop's most-visited page. It returns when there
 * is real discounted stock.
 */
const RAILS = [
  { title: "New In", tag: "New Arrival" },
  { title: "Best Sellers", tag: "Bestseller" },
]

export default async function HomePage() {
  const tree = await getCategoryTree()

  const rails = await Promise.all(
    RAILS.map(async ({ title, tag }) => {
      const tagIds = await getTagIdsByValue([tag])

      // No tag id means the tag was renamed or removed in admin. Render an
      // empty rail rather than an unfiltered one — a "New In" rail silently
      // showing the whole catalogue is worse than one that is absent.
      const { products } = tagIds.length
        ? await searchProducts({ tagIds, pageSize: 12 })
        : { products: [] }

      return { title, products }
    })
  )

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Full-bleed: outside Container on purpose. */}
      <HeroCarousel />

      <Container>
        <CategoryRail categories={tree} />
      </Container>

      {rails.map((rail, i) => (
        <Container key={rail.title}>
          <ProductRail
            title={rail.title}
            products={rail.products}
            viewAllHref="/search"
            // Only the first rail's images are LCP candidates.
            priority={i === 0}
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
