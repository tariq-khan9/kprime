"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { cn } from "@/lib/utils/format"

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M13 13l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Search input. No typeahead — that is task 78.
 *
 * On mobile this is a 44px icon that expands into a full-width overlay across
 * the header. A permanently visible input at 360px would take the space the
 * logo and cart need, and the overlay lets the field be full width once open
 * rather than squeezed into a third of the row.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus()
    }
  }, [expanded])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const query = value.trim()

    if (!query) {
      return
    }

    setExpanded(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const field = (
    <form onSubmit={submit} role="search" className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(false)}
          placeholder="Search products"
          aria-label="Search products"
          // text-base is 16px and must stay there: below it iOS Safari zooms
          // the viewport on focus and does not zoom back out.
          className={cn(
            "h-11 w-full rounded-md border border-line bg-paper pl-10 pr-3 text-base",
            "text-brand placeholder:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          )}
        />
      </div>
    </form>
  )

  return (
    <>
      {/* Desktop: always open, fills the header's middle column. */}
      <div className={cn("hidden lg:block lg:w-full", className)}>{field}</div>

      {/* Mobile: trigger only. */}
      <button
        type="button"
        aria-label="Search"
        aria-expanded={expanded}
        onClick={() => setExpanded(true)}
        className={cn(
          "flex size-11 items-center justify-center rounded-md text-brand",
          "hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-brand lg:hidden"
        )}
      >
        <SearchIcon className="size-5" />
      </button>

      {/* Mobile overlay. Covers the header row so the field gets full width. */}
      {expanded && (
        <div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-paper px-4 lg:hidden">
          {field}
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setExpanded(false)}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/5"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}
    </>
  )
}
