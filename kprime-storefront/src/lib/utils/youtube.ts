/**
 * Turns whatever URL someone pasted into admin into a YouTube video id.
 *
 * The id is the only thing that reaches the DOM. Building an embed by
 * interpolating the stored URL straight into an `src` would make a product's
 * metadata field an injection point, since anyone with admin access could store
 * a `javascript:` or arbitrary third-party URL there. Extracting an 11-character
 * id and rebuilding the URL ourselves means a malformed or hostile value can
 * only ever produce `null`, which renders nothing.
 *
 * Accepts the four forms people actually paste — watch, youtu.be, embed and
 * shorts — on any youtube.com subdomain. Everything else returns null.
 */
const ID = /^[A-Za-z0-9_-]{11}$/

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

export function youtubeIdFrom(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim()) {
    return null
  }

  let url: URL

  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  // Bare ids are rejected on purpose: a field holding "abc" is far more likely
  // to be a mistake than an id, and silently embedding it would be worse than
  // showing nothing.
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

/** Privacy-mode embed. No YouTube cookie is set until the viewer hits play. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
}

/**
 * `hqdefault` rather than `maxresdefault`: maxres does not exist for every
 * video and 404s silently, leaving a blank poster. hq always exists.
 */
export function youtubePosterUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
