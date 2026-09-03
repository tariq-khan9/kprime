"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/Button"
import { whatsappLink } from "@/config/site"

/**
 * The root error boundary.
 *
 * Must be a client component and must not depend on anything that could itself
 * fail — no data fetching, no shop shell. If this page throws there is nothing
 * left to catch it.
 *
 * The message says what happened without blaming the visitor and without
 * exposing a stack trace, which on a shop page is noise at best and a leak at
 * worst.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The digest is what ties this to a server log entry. Task 151 replaces
    // this with real error reporting.
    console.error("Unhandled error", error.digest ?? error.message)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-brand">Something went wrong</h1>

        <p className="text-muted">
          That is our fault, not yours. Try again — it often works second time.
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>

          <Button variant="secondary" asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted">
          Still stuck?{" "}
          <a
            href={whatsappLink("Hi, the website showed me an error.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline underline-offset-2"
          >
            Message us on WhatsApp
          </a>
          .
        </p>
      </div>
    </main>
  )
}
