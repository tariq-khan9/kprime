import { ImageResponse } from "next/og"

/**
 * The default social preview.
 *
 * 1200x630 is what Twitter's `summary_large_image` and Facebook expect, and
 * WhatsApp crops from the same image — so one asset covers every channel.
 *
 * Generated at build rather than designed as a PNG so the copy can never drift
 * from the site's own claims. It states cash on delivery and the honest
 * delivery window, both of which are the reason someone taps a shared link.
 */
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Karkhano Prime — cash on delivery across Pakistan"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0F1E3D",
          color: "#F6F4EF",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 34, letterSpacing: 8, opacity: 0.85 }}>
            KARKHANO
          </div>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>
            PRIME
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 40, lineHeight: 1.3 }}>
          Cash on delivery across Pakistan
        </div>

        <div style={{ marginTop: 12, fontSize: 30, opacity: 0.8 }}>
          Electronics · Cosmetics · Kitchenware · Bedding
        </div>

        {/* Amber only ever means "act on this", so it is a thin rule here rather
            than a fake button on an image nobody can click. */}
        <div
          style={{
            marginTop: 48,
            width: 220,
            height: 8,
            background: "#F2A007",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    size
  )
}
