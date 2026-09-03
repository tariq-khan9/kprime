import Link from "next/link"

import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { getCategoryTree } from "@/lib/data/categories"

export const metadata = {
  title: "Page not found",
}

/**
 * 404.
 *
 * **Offers a way forward, not an apology.** Someone who lands here mistyped a
 * URL or followed a dead link; the useful response is search and the real
 * category list, taken from the live tree rather than a hardcoded set that
 * would rot the first time a category is renamed.
 *
 * This is the ROOT not-found, so it renders outside the shop shell — there is
 * no header or footer around it. That is deliberate: a 404 inside the shell
 * would need the layout's data, and a broken URL should not depend on a
 * successful backend call to render at all.
 */
export default async function NotFound() {
  // Cached, so this costs nothing beyond what the nav already pays. If the
  // backend is down the empty list still renders a usable page.
  const tree = await getCategoryTree().catch(() => [])

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <p className="text-5xl font-bold text-line">404</p>

        <h1 className="text-2xl font-bold text-brand sm:text-3xl">
          We could not find that page
        </h1>

        <p className="text-muted">
          The link may be out of date, or the address may have a typo in it.
        </p>

        <form action="/search" role="search" className="mt-2 flex w-full gap-2">
          <input
            type="search"
            name="q"
            placeholder="Search products"
            aria-label="Search products"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-base text-brand placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        {tree.length > 0 && (
          <nav aria-label="Categories" className="mt-4 w-full">
            <p className="mb-2 text-sm font-medium text-brand">
              Or browse a category
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {tree.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.handle}`}
                    className="flex min-h-11 items-center rounded-md border border-line px-3 text-sm text-brand hover:border-brand"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <Button variant="secondary" asChild className="mt-4">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </Container>
  )
}
