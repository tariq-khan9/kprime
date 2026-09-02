import { notFound } from "next/navigation"

import { Container } from "@/components/layout/Container"
import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { getProduct, getProductHandles } from "@/lib/data/products"

/**
 * Product detail.
 *
 * Static with revalidation (§3), unlike the listings: this page reads no
 * searchParams, so there is nothing forcing it to render per request. Every
 * product handle is prerendered at build.
 *
 * Task 81 renders the title and price only. The gallery, variant selector,
 * stock, quantity, delivery box and tabs land in tasks 82–91.
 *
 * NOTE: no `loading.tsx` in this segment. A loading file creates a Suspense
 * boundary above the page, so Next streams and sends 200 before the component
 * runs, and the `notFound()` below could never set a 404. The `(home)` group has
 * one, but it is a sibling and does not sit above this route.
 */
export const revalidate = 3600

/**
 * Prerender every product.
 *
 * `dynamicParams` stays at its default of true, so a product added in admin
 * after a build still renders — on demand, then cached — rather than 404ing
 * until the next deploy.
 */
export async function generateStaticParams() {
  const handles = await getProductHandles()

  return handles.map((handle) => ({ handle }))
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const { handle } = await params

  const product = await getProduct(handle)

  if (!product) {
    notFound()
  }

  return (
    <Container className="py-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>

      {product.subtitle && (
        <p className="mt-1 max-w-2xl text-muted">{product.subtitle}</p>
      )}

      <PriceDisplay
        price={product.price}
        originalPrice={product.originalPrice}
        size="detail"
        className="mt-4"
      />
    </Container>
  )
}
