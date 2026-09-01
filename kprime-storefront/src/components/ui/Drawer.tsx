"use client"

import * as Dialog from "@radix-ui/react-dialog"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type DrawerSide = "left" | "right" | "bottom"

/**
 * Three sides, three jobs: left is MobileNav (task 44), right is CartDrawer
 * (task 100), bottom is the mobile FilterDrawer (task 72).
 */
const SIDES: Record<DrawerSide, string> = {
  left: "inset-y-0 left-0 h-full w-[85%] max-w-sm border-r",
  right: "inset-y-0 right-0 h-full w-[85%] max-w-sm border-l",
  // Capped so the sheet never covers the whole screen — seeing a slice of the
  // page behind it is what tells you it is dismissible.
  bottom: "inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-lg border-t",
}

export type DrawerProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: DrawerSide
  title: string
  /** Hide the title visually but keep it for screen readers. */
  hideTitle?: boolean
  description?: string
  trigger?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
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
 * Slide-in panel.
 *
 * Radix Dialog supplies the parts that are easy to get subtly wrong by hand:
 * focus is trapped inside while open, returns to the trigger on close, Escape
 * dismisses, body scroll locks, and the rest of the page is hidden from screen
 * readers.
 */
export function Drawer({
  open,
  onOpenChange,
  side = "right",
  title,
  hideTitle,
  description,
  trigger,
  children,
  footer,
  className,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand/40" />

        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col border-line bg-paper",
            SIDES[side],
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title
                className={cn("text-lg font-bold", hideTitle && "sr-only")}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-muted">
                  {description}
                </Dialog.Description>
              ) : (
                // Radix warns without one; the panel's title is enough context.
                <Dialog.Description className="sr-only">
                  {title}
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close
              aria-label="Close"
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-md",
                "-mr-2 -mt-2 text-brand hover:bg-brand/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              )}
            >
              <CloseIcon />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {footer && (
            <div className="border-t border-line p-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
