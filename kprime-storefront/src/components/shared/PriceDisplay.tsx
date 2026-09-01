import { cn, formatPKR } from "@/lib/utils/format"

export type PriceSize = "card" | "detail" | "line"

const SIZES: Record<PriceSize, { current: string; compare: string }> = {
  card: { current: "text-base font-bold", compare: "text-sm" },
  detail: { current: "text-2xl font-bold", compare: "text-base" },
  line: { current: "text-base font-medium", compare: "text-sm" },
}

export type PriceDisplayProps = {
  price: number | null
  /** Compare-at. Only pass it when it is genuinely higher than `price`. */
  originalPrice?: number | null
  size?: PriceSize
  className?: string
}

/**
 * Every price in the app renders through this — card, detail page, cart line,
 * checkout, receipt.
 *
 * Formatting comes from formatPKR so minor-unit handling lives in exactly one
 * place; nothing here does arithmetic on the display string.
 */
export function PriceDisplay({
  price,
  originalPrice,
  size = "card",
  className,
}: PriceDisplayProps) {
  const styles = SIZES[size]

  const discounted =
    price !== null &&
    originalPrice !== null &&
    originalPrice !== undefined &&
    originalPrice > price

  const saving = discounted ? originalPrice - price : 0

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn(styles.current, "text-brand")}>
        {formatPKR(price)}
      </span>

      {/* The row is always present, so a discounted and an undiscounted product
          are the same height. Without this a grid of mixed products renders
          ragged rows and the cards below them never line up. */}
      <span
        className={cn(styles.compare, "flex gap-2")}
        aria-hidden={!discounted}
      >
        {discounted ? (
          <>
            <span className="text-muted line-through">
              {formatPKR(originalPrice)}
            </span>
            <span className="text-sale">Save {formatPKR(saving)}</span>
          </>
        ) : (
          // Non-breaking space holds the line box open.
          <span className="invisible">&nbsp;</span>
        )}
      </span>
    </div>
  )
}
