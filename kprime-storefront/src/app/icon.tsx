import { ImageResponse } from "next/og"

/**
 * The favicon and the square mark.
 *
 * Generated rather than shipped as a file so it stays in step with the brand
 * tokens — navy ground, cream letter — and needs no separate asset pipeline.
 *
 * A square mark matters more here than usual: WhatsApp shows a small square
 * thumbnail beside a shared link, and the full stacked logo is illegible at
 * that size. A single P is not.
 */
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // The brand tokens, written literally: this runs in an isolated
          // renderer with no access to the Tailwind theme.
          background: "#0F1E3D",
          color: "#F6F4EF",
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 12,
        }}
      >
        P
      </div>
    ),
    size
  )
}
