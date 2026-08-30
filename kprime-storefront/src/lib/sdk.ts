import Medusa from "@medusajs/js-sdk"

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

/**
 * Fail at module load rather than at query time.
 *
 * Without the publishable key Medusa answers /store requests with an empty
 * product list rather than an error, so a missing env var looks exactly like an
 * empty catalogue — and it looks that way on every page at once. Better to
 * refuse to start.
 */
if (!backendUrl) {
  throw new Error(
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set. Copy it from .env.local."
  )
}

if (!publishableKey) {
  throw new Error(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set. Find it in Admin > Settings > " +
      "Publishable API Keys, or in the output of `pnpm seed`."
  )
}

export const sdk = new Medusa({
  baseUrl: backendUrl,
  publishableKey,
})
