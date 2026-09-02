import { getProvinces } from "@/lib/data/shipping"

/**
 * Province and city list (task 103).
 *
 * Proves the storefront sees the same city strings the geo zones use — the
 * exact-match dependency checkout rests on. Dev only; task 155 blocks /dev/*.
 */
export const dynamic = "force-dynamic"

export default async function DevShippingPage() {
  const provinces = await getProvinces()
  const total = provinces.reduce((n, p) => n + p.cities.length, 0)

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Shipping cities</h1>
          <p className="mt-1 text-muted">
            {provinces.length} provinces, {total} cities
          </p>
        </div>

        {provinces.map((province) => (
          <section
            key={province.code}
            className="rounded-lg border border-line bg-paper p-4"
          >
            <h2 className="font-bold">
              {province.name}{" "}
              <span className="font-normal text-muted">({province.code})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              {province.cities.join(" | ")}
            </p>
          </section>
        ))}
      </div>
    </main>
  )
}
