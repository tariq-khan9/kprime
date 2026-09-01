import { Container } from "@/components/layout/Container"
import { ProductGrid } from "@/components/shared/ProductGrid"
import { searchProducts } from "@/lib/data/products"

/**
 * Home page — a stub.
 *
 * Task 49 needs a page inside `(shop)` to prove the shell renders and that the
 * route group leaves no `/shop` segment in the URL. Task 56 replaces this
 * entirely with the real home page: hero carousel, category grid, three product
 * rails, promo banners, brand strip and newsletter.
 */
export default async function HomePage() {
  const { products } = await searchProducts({ pageSize: 8 })

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Karkhano Prime</h1>
      <p className="mt-1 text-muted">
        Shell is live. The real home page arrives in task 56.
      </p>

      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </Container>
  )
}
