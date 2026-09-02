import { cn } from "@/lib/utils/format"

export type SearchResultHeaderProps = {
  /** The raw query from the URL. */
  query: string | null
  count: number
  className?: string
}

/**
 * Heading for search results. Replaces `CategoryHeader`; there are no
 * breadcrumbs on search (§3) because there is no trail to show.
 *
 * The query is rendered as JSX text, which React escapes — a query containing
 * `<script>` appears as characters on the page rather than executing. It is
 * never passed through `dangerouslySetInnerHTML`, and must not be.
 */
export function SearchResultHeader({
  query,
  count,
  className,
}: SearchResultHeaderProps) {
  const trimmed = query?.trim() ?? ""

  // A blank submission is a real state — someone hits Enter on an empty box.
  // Showing every product is more useful than "No results for ''".
  if (!trimmed) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <h1 className="text-2xl font-bold sm:text-3xl">All products</h1>
        <p className="text-muted">
          {count} {count === 1 ? "product" : "products"}
        </p>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <h1 className="text-2xl font-bold sm:text-3xl">
          No results for &ldquo;{trimmed}&rdquo;
        </h1>
        <p className="text-muted">
          Check the spelling, or try a shorter or more general word.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <h1 className="text-2xl font-bold sm:text-3xl">
        Results for &ldquo;{trimmed}&rdquo;
      </h1>
      <p className="text-muted">
        {count} {count === 1 ? "product" : "products"}
      </p>
    </div>
  )
}
