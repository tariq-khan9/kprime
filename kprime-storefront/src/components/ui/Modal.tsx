"use client"

import * as Dialog from "@radix-ui/react-dialog"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type ModalProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  trigger?: ReactNode
  children?: ReactNode
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
 * Centred dialog. Same Radix Dialog primitive as Drawer — focus trap, Escape,
 * scroll lock and focus restore all come from there.
 *
 * On mobile it is full-width inside a margin rather than edge to edge, so it
 * still reads as a layer above the page instead of a new screen.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand/40" />

        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md",
            "-translate-x-1/2 -translate-y-1/2 flex-col",
            "max-h-[85vh] rounded-lg border border-line bg-paper",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-muted">
                  {description}
                </Dialog.Description>
              ) : (
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

          {children && (
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          )}

          {footer && <div className="border-t border-line p-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
