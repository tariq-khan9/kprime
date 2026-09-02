"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { cn } from "@/lib/utils/format"

/** Long enough that a fast typist does not fire a request per letter. */
const DEBOUNCE_MS = 250
const MIN_CHARS = 2

type Suggestion =
  | { kind: "product"; title: string; handle: string; thumbnail: string | null }
  | { kind: "category"; name: string; handle: string }

function hrefOf(suggestion: Suggestion): string {
  return suggestion.kind === "product"
    ? `/products/${suggestion.handle}`
    : `/categories/${suggestion.handle}`
}

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
 * Search with typeahead.
 *
 * On mobile this is a 44px icon that expands into a full-width overlay across
 * the header — a permanent input at 360px would take the space the logo and
 * cart need.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const listId = useId()

  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [highlighted, setHighlighted] = useState(-1)
  const [showList, setShowList] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus()
    }
  }, [expanded])

  const query = value.trim()
  const longEnough = query.length >= MIN_CHARS

  // Derived, not stored. Clearing suggestions inside the effect below would be
  // a synchronous setState in an effect, which cascades renders; hiding them
  // here says the same thing with no extra write. Stale entries may linger in
  // state while the query is short, but they are never rendered and the next
  // fetch replaces them.
  const visible = longEnough ? suggestions : []

  useEffect(() => {
    if (!longEnough) {
      return
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    // One controller per scheduled request. Without it a slow early response
    // can land after a newer one and flip the list back to stale suggestions —
    // the classic typeahead race.
    const controller = new AbortController()

    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        )
        const body = await response.json()

        setSuggestions([
          ...(body.products ?? []).map((p: Omit<Suggestion, "kind">) => ({
            kind: "product" as const,
            ...p,
          })),
          ...(body.categories ?? []).map((c: Omit<Suggestion, "kind">) => ({
            kind: "category" as const,
            ...c,
          })),
        ])
        setHighlighted(-1)
      } catch {
        // Aborted or offline. An empty list is honest; a stale one is not.
        setSuggestions([])
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, longEnough])

  const close = () => {
    setShowList(false)
    setHighlighted(-1)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const query = value.trim()

    if (!query) {
      return
    }

    close()
    setExpanded(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const go = (suggestion: Suggestion) => {
    close()
    setExpanded(false)
    router.push(hrefOf(suggestion))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Closes the list without navigating; a second press closes the mobile
      // overlay. Escape must never submit.
      if (showList && visible.length) {
        close()
      } else {
        setExpanded(false)
      }
      return
    }

    if (!visible.length || !showList) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlighted((i) => (i + 1) % visible.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlighted((i) => (i <= 0 ? visible.length - 1 : i - 1))
    } else if (event.key === "Enter" && highlighted >= 0) {
      // Enter with nothing highlighted falls through to the form's submit,
      // which goes to the full results page.
      event.preventDefault()
      go(visible[highlighted])
    }
  }

  const open = showList && visible.length > 0

  const field = (
    <form onSubmit={submit} role="search" className="relative w-full">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setShowList(true)
          }}
          onFocus={() => setShowList(true)}
          // Delayed so a click on a suggestion registers before the list closes.
          onBlur={() => setTimeout(close, 150)}
          onKeyDown={onKeyDown}
          placeholder="Search products"
          aria-label="Search products"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted >= 0 ? `${listId}-${highlighted}` : undefined
          }
          autoComplete="off"
          // text-base is 16px and must stay there: below it iOS Safari zooms the
          // viewport on focus and does not zoom back out.
          className={cn(
            "h-11 w-full rounded-md border border-line bg-paper pl-10 pr-3 text-base",
            "text-brand placeholder:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          )}
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            "absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md",
            "border border-line bg-paper shadow-lg"
          )}
        >
          {visible.map((suggestion, i) => (
            <li
              key={`${suggestion.kind}-${suggestion.handle}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlighted}
              // Pointer down, not click: it fires before blur, so the list is
              // still open when the choice is registered.
              onPointerDown={(e) => {
                e.preventDefault()
                go(suggestion)
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2",
                i === highlighted ? "bg-brand/5" : "bg-paper"
              )}
            >
              {suggestion.kind === "product" ? (
                <>
                  <span className="relative size-9 shrink-0 overflow-hidden rounded border border-line bg-cream">
                    {suggestion.thumbnail && (
                      <Image
                        src={suggestion.thumbnail}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="truncate text-brand">{suggestion.title}</span>
                </>
              ) : (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded border border-line text-muted">
                    <SearchIcon className="size-4" />
                  </span>
                  <span className="truncate text-brand">
                    {suggestion.name}
                    <span className="ml-2 text-sm text-muted">in categories</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  )

  return (
    <>
      {/* Desktop: always open, fills the header's middle column. */}
      <div className={cn("hidden lg:block lg:w-full", className)}>{field}</div>

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
        <div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-header px-4 lg:hidden">
          {field}
          <button
            type="button"
            aria-label="Close search"
            onClick={() => {
              close()
              setExpanded(false)
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/5"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}
    </>
  )
}
