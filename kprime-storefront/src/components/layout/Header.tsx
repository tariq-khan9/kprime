"use client"

import { useEffect, useState } from "react"

import { CartButton } from "@/components/layout/CartButton"
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu"
import { Logo } from "@/components/layout/Logo"
import { MobileNav } from "@/components/layout/MobileNav"
import { SearchBar } from "@/components/layout/SearchBar"
import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

/**
 * Sticky header.
 *
 * ⚠️ There is deliberately no "Login" or "Create account" here. Accounts are v2
 * and checkout is guest-only — a dead link promising an account is worse than
 * no link at all.
 *
 * Mobile is one 56px row: burger, logo, search icon, cart. Search expands over
 * the row when tapped rather than living in it, because a permanent input at
 * 360px leaves nothing for the logo.
 */
export function Header({ tree }: { tree: CategoryNode[] }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-line bg-header",
        scrolled && "shadow-sm"
      )}
    >
      {/* relative: the mobile search overlay and the mega menu panel both
          position against this row. */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center gap-2 transition-[height] duration-200",
            // Shrinks on scroll at desktop only — 56px on mobile is already
            // the floor, and animating it there just makes the page jump.
            "h-14",
            scrolled ? "lg:h-14" : "lg:h-[72px]"
          )}
        >
          {/* -ml-2.5 does for the burger what -mr-2.5 does for the cart:
              aligns the icon with the container edge rather than its hit
              area. */}
          <MobileNav tree={tree} className="-ml-2.5" />

          <Logo compact={scrolled} className="lg:mr-6" />

          {/* Desktop: search takes the middle. Mobile: this collapses to an
              icon pushed right by ml-auto. */}
          <div className="ml-auto flex flex-1 items-center justify-end gap-1 lg:ml-0 lg:max-w-xl">
            <SearchBar />
          </div>

          {/*
            -mr-2.5 pulls the button's 44px hit area past the container padding
            so the ICON — not the invisible tap target around it — lines up with
            the container's right edge, and with the content below.

            lg:ml-auto, not a fixed margin: the search box is capped at max-w-xl,
            so on a wide screen a fixed margin left the cart sitting just after
            the search with hundreds of pixels of empty space to its right. The
            auto margin absorbs that space and keeps the cart pinned to the
            right edge at every width, matching mobile.
          */}
          <CartButton className="-mr-2.5 lg:ml-auto" />
        </div>
      </div>

      {/* Second row, desktop only. Below lg the same tree is in MobileNav. */}
      <div className="hidden border-t border-line lg:block">
        <div className="mx-auto max-w-7xl px-8">
          <CategoryMegaMenu tree={tree} />
        </div>
      </div>
    </header>
  )
}
