"use client"

import { useState } from "react"

import { StockIndicator } from "@/components/page/product/StockIndicator"
import { QuantityStepper } from "@/components/shared/QuantityStepper"
import { Button } from "@/components/ui/Button"
import type { ProductVariantDetail } from "@/lib/data/products"

/**
 * States the product page cannot show on load.
 *
 * The buy panel deliberately opens on a variant that is in stock, so low and
 * out-of-stock only appear after someone changes the selection. This renders
 * all three side by side, and puts the quantity stepper next to the amber
 * button so the green/amber pairing (§2.3) can be judged.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */

function variant(
  inventoryQuantity: number | null,
  overrides: Partial<ProductVariantDetail> = {}
): ProductVariantDetail {
  return {
    id: "v",
    title: "Demo",
    sku: "DEMO-1",
    price: 2500,
    originalPrice: null,
    currencyCode: "pkr",
    inventoryQuantity,
    manageInventory: true,
    allowBackorder: false,
    optionValues: {},
    ...overrides,
  }
}

const CASES: { label: string; variant: ProductVariantDetail | null }[] = [
  { label: "In stock (40)", variant: variant(40) },
  { label: "Low stock (3)", variant: variant(3) },
  { label: "Out of stock (0)", variant: variant(0) },
  { label: "Untracked inventory", variant: variant(null, { manageInventory: false }) },
  { label: "Backorderable, 0", variant: variant(0, { allowBackorder: true }) },
  { label: "No variant resolved", variant: null },
]

export default function ProductStatesPage() {
  const [qty, setQty] = useState(1)
  const [capped, setCapped] = useState(1)

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <div>
          <h1 className="text-2xl font-bold">Product states</h1>
          <p className="mt-1 text-muted">
            Task 87 stock states and task 88 quantity clamping.
          </p>
        </div>

        <section className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-6">
          <h2 className="font-bold">StockIndicator</h2>
          {CASES.map((demo) => (
            <div key={demo.label} className="flex items-center gap-4 border-b border-line py-2 last:border-b-0">
              <span className="w-52 shrink-0 text-sm text-muted">{demo.label}</span>
              <StockIndicator variant={demo.variant} />
            </div>
          ))}

          <div className="mt-2 flex items-center gap-4">
            <StockIndicator variant={variant(40)} />
            {/* The pairing §2.3 cares about: green must read as status, not as a
                second thing to click next to the amber button. */}
            <Button variant="primary">Add to cart</Button>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-6">
          <h2 className="font-bold">QuantityStepper</h2>
          <p className="text-sm text-muted">
            Type <code>0</code>, <code>-3</code>, <code>abc</code>, <code>9999</code>{" "}
            and blur or press Enter. Nothing should crash.
          </p>

          <div className="flex items-center gap-4">
            <span className="w-52 shrink-0 text-sm text-muted">min 1, no max</span>
            <QuantityStepper value={qty} onChange={setQty} id="q1" />
            <span className="text-sm">value: {qty}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-52 shrink-0 text-sm text-muted">min 1, max 12</span>
            <QuantityStepper value={capped} onChange={setCapped} max={12} id="q2" />
            <span className="text-sm">value: {capped}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-52 shrink-0 text-sm text-muted">disabled</span>
            <QuantityStepper value={1} onChange={() => {}} disabled id="q3" />
          </div>
        </section>
      </div>
    </main>
  )
}
