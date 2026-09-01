import { fetchRegion } from "@/lib/data/regions"

/**
 * Storefront -> backend connectivity check.
 *
 * Medusa fails quietly: a wrong publishable key returns an empty list rather
 * than an error, so a broken connection looks exactly like an empty catalogue —
 * on every page at once. This page turns that into one obvious message.
 *
 * If this is green, a blank product grid is a query problem, not a connection
 * problem. Dev only; task 155 blocks /dev/* in production.
 */

// A diagnostic answering from cache tells you about the past, not about now.
// This alone is not enough — it stops the page being cached, but not the data
// cache underneath it, which is why this page calls the uncached fetchRegion
// rather than getRegion. With the cached one, a revoked key still showed green.
export const dynamic = "force-dynamic"

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "(unset)"

/** Enough of the key to tell which one is loaded, not enough to reuse it. */
const maskedKey = (() => {
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  if (!key) {
    return "(unset)"
  }

  return `${key.slice(0, 11)}…${key.slice(-4)}`
})()

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  )
}

export default async function HealthPage() {
  let region: Awaited<ReturnType<typeof fetchRegion>> = null
  let error: string | null = null

  try {
    region = await fetchRegion()

    if (!region) {
      // A successful call returning nothing is its own failure: the key is
      // valid but the store has no region, so nothing will ever be priced.
      error = "Connected, but the backend returned no regions."
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  const ok = Boolean(region) && !error

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Backend health</h1>
          <p className="mt-1 text-muted">
            Storefront to Medusa connectivity. Not part of the shop.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-paper p-6">
          {ok && region ? (
            <p className="text-3xl font-bold text-success">
              {region.name} · {region.currencyCode.toUpperCase()}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xl font-bold text-sale">Cannot reach the backend</p>
              <p className="break-all">{error}</p>
              <p className="text-muted">
                Check that the backend is running, that the publishable key
                matches one in Admin &rarr; Settings &rarr; Publishable API Keys,
                and that this origin is listed in STORE_CORS.
              </p>
            </div>
          )}
        </div>

        {/* Printed on success too — a call that succeeds against the wrong
            backend is otherwise invisible. */}
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-6">
          <Row label="Backend URL" value={backendUrl} />
          <Row label="Publishable key" value={maskedKey} />
          <Row label="Region ID" value={region?.id ?? "—"} />
        </div>
      </div>
    </main>
  )
}
