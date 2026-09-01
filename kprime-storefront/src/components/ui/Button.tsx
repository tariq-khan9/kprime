"use client"

import { Slot, Slottable } from "@radix-ui/react-slot"
import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type ButtonVariant = "primary" | "secondary" | "ghost"
export type ButtonSize = "sm" | "md" | "lg"

/**
 * Amber is the only "act on this" colour in the palette, so this is the only
 * component allowed to use it — roughly 2% of any page.
 *
 * Primary text is `action-ink`, never white. Measured: ink on amber is 8.55:1,
 * white on amber is 2.14:1, which fails WCAG outright. The rule exists because
 * white looks fine at a glance and is wrong.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-action-ink hover:bg-action-hover " +
    "disabled:bg-action/50 disabled:text-action-ink/60",
  secondary:
    "border border-brand text-brand bg-transparent hover:bg-brand hover:text-cream " +
    "disabled:border-muted disabled:text-muted disabled:bg-transparent",
  ghost:
    "text-brand bg-transparent hover:bg-brand/5 " +
    "disabled:text-muted disabled:bg-transparent",
}

/**
 * md and lg clear 44px. 80% of traffic is mobile and these are thumb targets;
 * sm is for dense desktop rows only, never a primary action on a phone.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-base gap-2",
  lg: "h-12 px-7 text-base gap-2",
}

const BASE =
  "inline-flex items-center justify-center rounded-md font-medium " +
  "transition-colors cursor-pointer select-none " +
  // focus-visible, not focus: a mouse click should not leave a ring behind.
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-cream " +
  "disabled:cursor-not-allowed"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Render the child element instead of a <button>, keeping these styles. */
  asChild?: boolean
  children?: ReactNode
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  // Slot merges these props onto the child, so `<Button asChild><Link/></Button>`
  // renders a single <a> rather than a button wrapping a link — which is invalid
  // HTML and breaks middle-click and "open in new tab".
  const Component = asChild ? Slot : "button"

  return (
    <Component
      // Loading disables as well as spins. Task 94's add-to-cart relies on this:
      // without it a double-click submits twice and creates two line items.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading && <Spinner />}
      {/* Slottable marks which child Slot should merge into. Without it,
          `asChild` with a spinner alongside is two children and Slot throws
          "Expected a single React element child". Outside a Slot it is a
          plain fragment, so the <button> path is unaffected. */}
      <Slottable>{children}</Slottable>
    </Component>
  )
}
