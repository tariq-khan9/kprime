"use client"

import { useMemo, useRef, useState } from "react"

import { DeliveryEstimateBox } from "@/components/page/product/DeliveryEstimateBox"
import { ProductTitleBlock } from "@/components/page/product/ProductTitleBlock"
import { StickyMobileBuyBar } from "@/components/page/product/StickyMobileBuyBar"
import { StockIndicator, stockLevelOf } from "@/components/page/product/StockIndicator"
import {
  resolveVariant,
  selectionOf,
  VariantOptionSelector,
  variantDefiningOptions,
  type Selection,
} from "@/components/page/product/VariantOptionSelector"
import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { QuantityStepper } from "@/components/shared/QuantityStepper"
import { Button } from "@/components/ui/Button"
import type { ProductDetail } from "@/lib/data/products"

/**
 * The buy column: everything that reacts to choosing a variant.
 *
 * Exists because the page is a server component and this state cannot live
 * there. One owner for `selection` and `quantity` means price, image, stock and
 * the sticky bar are all reading the same resolved variant — they cannot drift
 * apart, which is exactly what task 86 asks for.
 */
export function ProductBuyPanel({ product }: { product: ProductDetail }) {
  const buyArea = useRef<HTMLDivElement>(null)

  // Opens on the first sellable variant, so a shopper does not land on a
  // combination that is already out of stock.
  const [selection, setSelection] = useState<Selection>(() => {
    const first =
      product.variants.find(
        (variant) => stockLevelOf(variant) !== "out_of_stock"
      ) ?? product.variants[0]

    return first ? selectionOf(first) : {}
  })

  const [quantity, setQuantity] = useState(1)

  const variant = useMemo(
    () => resolveVariant(product, selection),
    [product, selection]
  )

  const level = stockLevelOf(variant)
  const soldOut = level === "out_of_stock"

  // The variant's price once one is resolved; the product's "from" price while
  // a choice is still outstanding.
  const price = variant?.price ?? product.price
  const originalPrice = variant?.originalPrice ?? product.originalPrice

  const max =
    variant && variant.manageInventory && !variant.allowBackorder
      ? (variant.inventoryQuantity ?? undefined)
      : undefined

  const needsChoice = variantDefiningOptions(product).length > 0 && !variant

  return (
    <div ref={buyArea} className="flex flex-col gap-5">
      <ProductTitleBlock product={product} sku={variant?.sku} />

      <PriceDisplay price={price} originalPrice={originalPrice} size="detail" />

      <VariantOptionSelector
        product={product}
        selection={selection}
        onChange={(next) => {
          setSelection(next)
          // Reset rather than carry over: 8 of an old variant is not a
          // meaningful default for a new one whose stock may be 2.
          setQuantity(1)
        }}
      />

      <StockIndicator variant={variant} />

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={max}
          disabled={soldOut}
        />

        {/* Task 94 wires this. Disabled until then, which is also the honest
            state when the chosen combination is sold out. */}
        <Button variant="primary" disabled className="min-w-40 flex-1">
          {soldOut ? "Out of stock" : "Add to cart"}
        </Button>
      </div>

      {needsChoice && (
        <p className="text-sm text-muted">
          Choose an option to see availability.
        </p>
      )}

      <DeliveryEstimateBox />

      <StickyMobileBuyBar
        watch={buyArea}
        price={price}
        originalPrice={originalPrice}
        disabled={soldOut}
      />
    </div>
  )
}
