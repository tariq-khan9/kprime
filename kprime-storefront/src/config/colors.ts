/**
 * Colour name → hex, for the swatch filter.
 *
 * Keys are lowercased option values, matching `valueKey()` in facets.ts.
 *
 * This is a display lookup, not a source of truth: the filter values come from
 * the catalogue. A name missing here renders a labelled chip instead of a
 * swatch, so an unmapped colour degrades to readable rather than to a blank
 * square. Add entries as the catalogue grows; nothing breaks if you do not.
 *
 * Not design tokens — these are product colours, describing physical goods, and
 * have nothing to do with the brand palette in globals.css.
 */
export const COLOR_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#FFFFFF",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  silver: "#C0C4C9",
  steel: "#7C8B99",
  blue: "#2563EB",
  navy: "#1E3A6B",
  sky: "#7DD3FC",
  teal: "#0D9488",
  green: "#16A34A",
  olive: "#65803D",
  red: "#DC2626",
  maroon: "#7F1D1D",
  pink: "#EC4899",
  purple: "#7C3AED",
  orange: "#EA580C",
  yellow: "#EAB308",
  gold: "#D4AF37",
  beige: "#E8DCC8",
  cream: "#F5EEE0",
  brown: "#78543A",
  tan: "#B08D62",
}

/**
 * Colours pale enough to disappear against the page.
 *
 * White on a white page is an invisible swatch — the exact failure task 68
 * calls out — so these get a darker border.
 */
const PALE = new Set(["white", "cream", "beige", "yellow", "gold", "sky"])

export function swatchHex(value: string): string | undefined {
  return COLOR_SWATCHES[value.trim().toLowerCase()]
}

export function isPaleSwatch(value: string): boolean {
  return PALE.has(value.trim().toLowerCase())
}
