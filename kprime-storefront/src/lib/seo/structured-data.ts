import {
  BASE_URL,
  SITE,
  WHATSAPP_IS_PLACEHOLDER,
  WHATSAPP_NUMBER,
} from "@/config/site"
import type { ProductDetail } from "@/lib/data/products"

/**
 * Structured data builders.
 *
 * Kept out of the components so the shapes can be read in one place and checked
 * against schema.org without hunting through JSX.
 */

export type Crumb = { name: string; path: string }

/**
 * `BreadcrumbList` for category and product pages.
 *
 * Positions are 1-based and must be contiguous — Google drops the whole list if
 * they are not, which is a silent failure.
 */
export function breadcrumbList(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  }
}

/** `Organization` for the home page, with the WhatsApp contact point. */
export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: BASE_URL,
    logo: `${BASE_URL}/icon`,
    description: SITE.tagline,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Peshawar",
      addressCountry: "PK",
    },
    // Omitted while the number is still the placeholder. Publishing
    // +923000000000 as structured data would put a fake contact number into
    // search results and Google's knowledge panel — worse than having none,
    // and slow to undo once indexed.
    ...(WHATSAPP_IS_PLACEHOLDER
      ? {}
      : {
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer service",
              // Schema wants E.164. Our stored form is already digits-only
              // with the country code, so it only needs the plus.
              telephone: `+${WHATSAPP_NUMBER}`,
              areaServed: "PK",
              availableLanguage: ["en", "ur"],
            },
          ],
        }),
  }
}

export type ProductSchemaInput = {
  product: ProductDetail
  /** From the denormalised aggregate (task 127). Null when unrated. */
  averageRating: number | null
  reviewCount: number
  inStock: boolean
}

/**
 * `Product` schema with offers and, when there are reviews, `AggregateRating`.
 *
 * **The rating is only included when reviews actually exist.** Emitting an
 * aggregate with `reviewCount: 0` is a structured-data error in Google's
 * validator and can cost the rich result entirely — worse than having no stars.
 *
 * Price is the cheapest variant, which is the figure the page shows as "from".
 * Quoting a different number here than the one on screen is the kind of
 * mismatch that gets rich results suppressed.
 */
export function productSchema({
  product,
  averageRating,
  reviewCount,
  inStock,
}: ProductSchemaInput) {
  const url = `${BASE_URL}/products/${product.handle}`

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.subtitle ?? product.title,
    image: product.images.map((image) => image.url),
    sku: product.variants[0]?.sku ?? undefined,
    ...(product.type ? { category: product.type } : {}),
    ...(product.tags.length ? { keywords: product.tags.join(", ") } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: product.currencyCode.toUpperCase(),
      price: product.price ?? 0,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      // COD only: nothing is taken online, so the seller is who you pay.
      seller: { "@type": "Organization", name: SITE.name },
    },
    ...(averageRating !== null && reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}
