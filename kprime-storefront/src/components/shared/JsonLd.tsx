/**
 * Emits a JSON-LD block.
 *
 * `JSON.stringify` output is injected through `dangerouslySetInnerHTML`, which
 * is the only way to write a `<script type="application/ld+json">` in React.
 * That is safe here for one specific reason: everything passed in is a
 * structured object we built, serialised by JSON.stringify — not a string
 * anyone typed. The `<` escape below covers the remaining case, a product title
 * containing `</script>`, which would otherwise close the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  )
}
