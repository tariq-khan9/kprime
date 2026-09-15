import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useState } from "react"

/**
 * Must match PRODUCT_VIDEO_KEY in kprime-storefront/src/lib/data/products.ts —
 * the storefront reads the product video from this metadata key.
 */
const VIDEO_KEY = "video_url"

const ID = /^[A-Za-z0-9_-]{11}$/

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

/**
 * Same rules as `youtubeIdFrom` in the storefront (lib/utils/youtube.ts). The
 * two repos share no code, so it is repeated here to refuse, at save time, a
 * link the product page would silently ignore.
 */
function youtubeIdFrom(input: string): string | null {
  let url: URL

  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null
  }

  const host = url.hostname.toLowerCase()

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.slice(1).split("/")[0]
    return ID.test(id) ? id : null
  }

  if (!HOSTS.has(host)) {
    return null
  }

  const v = url.searchParams.get("v")

  if (v && ID.test(v)) {
    return v
  }

  const [first, second] = url.pathname.split("/").filter(Boolean)

  if ((first === "embed" || first === "shorts" || first === "v") && second) {
    return ID.test(second) ? second : null
  }

  return null
}

/**
 * Optional YouTube video for a product.
 *
 * Medusa's create form has no stable way to add a field of our own, so this
 * lives on the product page instead: create the product, then paste the link
 * here. It is written to `metadata.video_url`, which the storefront turns into
 * the video player on the product page.
 */
const ProductVideoWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const saved =
    typeof product.metadata?.[VIDEO_KEY] === "string"
      ? (product.metadata[VIDEO_KEY] as string)
      : ""

  const [value, setValue] = useState(saved)
  const [current, setCurrent] = useState(saved)
  const [saving, setSaving] = useState(false)

  const trimmed = value.trim()
  const id = trimmed ? youtubeIdFrom(trimmed) : null
  const invalid = trimmed !== "" && !id
  const unchanged = trimmed === current

  const save = async (next: string) => {
    setSaving(true)

    try {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // The whole metadata object is sent so other keys survive. An empty
        // string clears the video; the storefront treats it as no video.
        body: JSON.stringify({
          metadata: { ...(product.metadata ?? {}), [VIDEO_KEY]: next },
        }),
      })

      if (!res.ok) {
        throw new Error(String(res.status))
      }

      setCurrent(next)
      setValue(next)
      toast.success(next ? "Video saved" : "Video removed")
    } catch {
      toast.error("Could not save the video")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Product video</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Optional. Paste a YouTube link to show a video on the product page.
        </Text>
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Input
          placeholder="https://www.youtube.com/watch?v=…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={invalid}
        />

        {invalid && (
          <Text size="small" className="text-ui-fg-error">
            Not a YouTube video link.
          </Text>
        )}

        {id && (
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="aspect-video w-full rounded-md object-cover"
          />
        )}

        <div className="flex justify-end gap-x-2">
          {current && (
            <Button
              size="small"
              variant="secondary"
              disabled={saving}
              onClick={() => save("")}
            >
              Remove
            </Button>
          )}
          <Button
            size="small"
            disabled={saving || invalid || unchanged}
            isLoading={saving}
            onClick={() => save(trimmed)}
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductVideoWidget
