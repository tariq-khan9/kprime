import { deriveFacets, facetKey, valueKey } from "@/lib/filters/facets"
import { searchProducts } from "@/lib/data/products"

/**
 * Task 62 — option spelling audit.
 *
 * Runs facet derivation over the whole catalogue and hunts for near-duplicates
 * the option sheet (task 8) is supposed to prevent: Colour vs Color, 128GB vs
 * 128 GB, Red vs red.
 *
 * Re-runnable on purpose. The real check is after task 10 imports a genuine
 * catalogue — a phantom filter is cheap to fix at 15 products and expensive at
 * 300. Reload this page after every import.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */
export const dynamic = "force-dynamic"

/**
 * Aggressive normalisation: case, spacing and punctuation all discarded.
 *
 * Two different raw strings landing on the same key means the catalogue says
 * the same thing two ways — "128GB" and "128 GB", "Bed Size" and "bed-size".
 */
const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Levenshtein, for spelling variants that survive squashing. */
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j], rows[i][j - 1], rows[i - 1][j - 1])
    }
  }

  return rows[a.length][b.length]
}

type Duplicate = { kind: "collision" | "near"; scope: string; a: string; b: string }

/** Digits removed, so numeric variants can be told apart from misspellings. */
const withoutDigits = (value: string) => value.replace(/[0-9]/g, "")

/**
 * Two passes.
 *
 * A COLLISION is certain — the strings differ only by case, spacing or
 * punctuation, so they already merge into one filter and admin is silently
 * inconsistent.
 *
 * A NEAR miss is a heuristic, and deliberately conservative after the first
 * version flagged "Bed Size" vs "Set Size" and "3-piece" vs "5-piece" on this
 * catalogue. Three rules keep it useful:
 *
 *   - distance 1, not 2. Colour/Color and Grey/Gray are one edit; Bed/Set Size
 *     is two, and is a real distinction.
 *   - at least 4 characters, so S/M and Red/Rod are not compared.
 *   - identical once digits are stripped means a numeric variant, not a typo —
 *     3-piece/5-piece and 24cm/28cm are different values, not misspellings.
 *
 * A heuristic cannot replace task 8's option sheet. It catches the accidents;
 * the sheet is what prevents them.
 */
function findDuplicates(scope: string, raws: string[]): Duplicate[] {
  const found: Duplicate[] = []
  const bySquash = new Map<string, Set<string>>()

  for (const raw of raws) {
    const key = squash(raw)
    if (!key) continue
    const set = bySquash.get(key) ?? new Set<string>()
    set.add(raw)
    bySquash.set(key, set)
  }

  for (const variants of bySquash.values()) {
    const list = [...variants]
    for (let i = 1; i < list.length; i++) {
      found.push({ kind: "collision", scope, a: list[0], b: list[i] })
    }
  }

  const keys = [...bySquash.keys()]

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const [a, b] = [keys[i], keys[j]]
      if (Math.min(a.length, b.length) < 4) continue
      if (Math.abs(a.length - b.length) > 1) continue
      // Same word, different number — a variant, not a typo.
      if (withoutDigits(a) === withoutDigits(b)) continue

      if (editDistance(a, b) <= 1) {
        found.push({
          kind: "near",
          scope,
          a: [...bySquash.get(a)!][0],
          b: [...bySquash.get(b)!][0],
        })
      }
    }
  }

  return found
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default async function FacetsAuditPage() {
  const { products, count } = await searchProducts({ pageSize: 1000 })

  // Raw strings, straight off the products — NOT off deriveFacets, which
  // already collapses case. Auditing its output would hide the very problem
  // this page exists to find.
  const rawTitles: string[] = []
  const rawValuesByTitle = new Map<string, string[]>()

  for (const product of products) {
    for (const option of product.options ?? []) {
      rawTitles.push(option.title)
      const key = facetKey(option.title)
      const list = rawValuesByTitle.get(key) ?? []
      list.push(...(option.values ?? []).map((v) => v.value))
      rawValuesByTitle.set(key, list)
    }
  }

  const duplicates = [
    ...findDuplicates("option title", rawTitles),
    ...[...rawValuesByTitle.entries()].flatMap(([key, values]) =>
      findDuplicates(`value in "${key}"`, values)
    ),
  ]

  const all = deriveFacets(products, { threshold: 0 })
  const shown = deriveFacets(products)
  const totalValues = all.reduce((n, f) => n + f.values.length, 0)

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Option audit</h1>
          <p className="mt-1 text-muted">
            Task 62. Re-run after every catalogue import — a phantom filter is
            cheap to fix now and expensive at 300 products.
          </p>
        </div>

        <section
          className={
            duplicates.length
              ? "rounded-lg border border-sale bg-cream p-6"
              : "rounded-lg border border-line bg-cream p-6"
          }
        >
          <h2 className="mb-2 font-bold">
            {duplicates.length === 0 ? (
              <span className="text-success">No near-duplicates found</span>
            ) : (
              <span className="text-sale">
                {duplicates.length} near-duplicate
                {duplicates.length === 1 ? "" : "s"} — fix in admin before
                importing more
              </span>
            )}
          </h2>

          {duplicates.length === 0 ? (
            <p className="text-muted">
              Every option title and value is spelled one way. This is the
              check task 8&apos;s option sheet exists to keep passing.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {duplicates.map((d, i) => (
                <li key={i} className="flex flex-col">
                  <span>
                    <code className="text-sale">{d.a}</code>
                    <span className="text-muted"> vs </span>
                    <code className="text-sale">{d.b}</code>
                  </span>
                  <span className="text-sm text-muted">
                    {d.scope} ·{" "}
                    {d.kind === "collision"
                      ? "differ only by case, spacing or punctuation — these already merge into one filter"
                      : "similar spelling — check whether these are the same thing"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-line bg-cream p-6">
          <h2 className="mb-3 font-bold">Summary</h2>
          <Row label="Products" value={String(count)} />
          <Row label="Option titles" value={String(all.length)} />
          <Row label="Distinct values" value={String(totalValues)} />
          <Row
            label="Shown in sidebar"
            value={`${shown.length} of ${all.length} (≥25% coverage)`}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-bold">
            Every derived group, with counts
          </h2>
          <p className="-mt-2 text-muted">
            Greyed groups fall below the 25% threshold and stay out of the
            sidebar at this level — they still appear inside their own leaf
            category, where coverage is higher.
          </p>

          {all.map((facet) => {
            const visible = shown.some((f) => f.key === facet.key)

            return (
              <div
                key={facet.key}
                className={`rounded-lg border border-line p-4 ${
                  visible ? "bg-cream" : "bg-paper opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-medium">{facet.title}</span>
                  <code className="text-muted">{facet.key}</code>
                  <span className="text-muted">
                    {facet.count}/{count} products ·{" "}
                    {(facet.coverage * 100).toFixed(0)}%
                  </span>
                  {!visible && <span className="text-sm text-muted">hidden</span>}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {facet.values.map((value) => (
                    <span key={value.key} className="text-sm">
                      {value.value}
                      <span className="text-muted">
                        {" "}
                        {value.count}p
                        {/* Id count is the tell that grouping works: nine
                            products in Black means nine ids behind one filter
                            value. A count of 1 where products is 9 means the
                            grouping silently broke. */}
                        , {value.optionValueIds.length}
                        {value.optionValueIds.length === value.count ? "" : "!"}
                        id
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        <p className="text-muted">
          Value keys used in URLs are lowercased, so{" "}
          <code>{valueKey("Black")}</code> is what appears in{" "}
          <code>?colour=black</code>.
        </p>
      </div>
    </main>
  )
}
