"use client"

import type {
  ProductDetail,
  ProductOptionDetail,
  ProductVariantDetail,
} from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

/**
 * Options that actually define a variant.
 *
 * A single-value option adds no choice — every variant carries the same value —
 * so rendering it here would be a control with one button that cannot be
 * changed. Those belong in the specifications tab (§2.1, task 90), which is
 * where Fabric, RAM and Warranty surface.
 */
export function variantDefiningOptions(
  product: ProductDetail
): ProductOptionDetail[] {
  return product.options.filter((option) => option.values.length > 1)
}

/** Options with exactly one value — the specs tab's source. */
export function specOptions(product: ProductDetail): ProductOptionDetail[] {
  return product.options.filter((option) => option.values.length === 1)
}

export type Selection = Record<string, string>

/** The variant matching every chosen value, or null while a choice is missing. */
export function resolveVariant(
  product: ProductDetail,
  selection: Selection
): ProductVariantDetail | null {
  const required = variantDefiningOptions(product)

  if (required.some((option) => !selection[option.id])) {
    return null
  }

  return (
    product.variants.find((variant) =>
      required.every(
        (option) => variant.optionValues[option.id] === selection[option.id]
      )
    ) ?? null
  )
}

/** The selection implied by a variant — used to seed the initial state. */
export function selectionOf(variant: ProductVariantDetail): Selection {
  return { ...variant.optionValues }
}

function isSellable(variant: ProductVariantDetail): boolean {
  if (!variant.manageInventory || variant.allowBackorder) {
    return true
  }

  return variant.inventoryQuantity === null || variant.inventoryQuantity > 0
}

/**
 * Whether choosing `value` for `option` leads to anything buyable, holding the
 * OTHER current choices fixed.
 *
 * Deliberately ignores this option's own current value, so every swatch is
 * judged against the rest of the selection rather than against itself.
 */
function isAvailable(
  product: ProductDetail,
  selection: Selection,
  optionId: string,
  value: string
): boolean {
  const others = Object.entries(selection).filter(([id]) => id !== optionId)

  return product.variants.some(
    (variant) =>
      variant.optionValues[optionId] === value &&
      others.every(([id, chosen]) => variant.optionValues[id] === chosen) &&
      isSellable(variant)
  )
}

export type VariantOptionSelectorProps = {
  product: ProductDetail
  selection: Selection
  onChange: (selection: Selection) => void
  className?: string
}

/**
 * One control per variant-defining option.
 *
 * **Unavailable combinations are disabled, not hidden (§2.1).** Hiding them
 * makes the control silently change shape as choices are made, and a shopper
 * cannot tell whether Black was never offered or is merely sold out in this
 * size. Disabled-with-a-strike says "this exists, not in this combination".
 *
 * Selecting resolves the variant, which is what updates price, image and stock
 * — those all read the resolved variant from the parent, so they cannot drift
 * apart from each other.
 */
export function VariantOptionSelector({
  product,
  selection,
  onChange,
  className,
}: VariantOptionSelectorProps) {
  const options = variantDefiningOptions(product)

  // A product whose only option has one value shows no selector at all.
  if (options.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {options.map((option) => {
        const chosen = selection[option.id]

        return (
          <fieldset key={option.id} className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-brand">
              {option.title}
              {chosen && <span className="ml-2 text-muted">{chosen}</span>}
            </legend>

            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = chosen === value.value
                const available = isAvailable(
                  product,
                  selection,
                  option.id,
                  value.value
                )

                return (
                  <button
                    key={value.id}
                    type="button"
                    // Never disable the current choice: that would trap someone
                    // on a combination they cannot change away from.
                    disabled={!available && !active}
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ ...selection, [option.id]: value.value })
                    }
                    className={cn(
                      "flex min-h-11 items-center rounded-md border px-4 text-sm",
                      "transition-colors focus-visible:outline-none",
                      "focus-visible:ring-2 focus-visible:ring-brand",
                      active
                        ? "border-brand bg-brand text-paper"
                        : "border-line bg-paper text-brand hover:border-brand",
                      !available &&
                        !active &&
                        // Struck through as well as dimmed: colour alone does
                        // not survive a bright phone screen outdoors.
                        "cursor-not-allowed border-line bg-paper text-muted line-through opacity-60"
                    )}
                  >
                    {value.value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
