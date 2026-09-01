"use client"

import * as RadixToast from "@radix-ui/react-toast"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils/format"

export type ToastVariant = "success" | "error"

type ToastItem = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (input: {
    title: string
    description?: string
    variant?: ToastVariant
  }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Fired from anywhere below the provider:
 *
 *   const { toast } = useToast()
 *   toast({ title: "Added to cart", variant: "success" })
 */
export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>")
  }

  return context
}

const VARIANTS: Record<ToastVariant, string> = {
  // Left border rather than a filled panel: the text stays on paper and
  // readable, and green never becomes a large coloured surface that could be
  // mistaken for a button.
  success: "border-l-4 border-l-success",
  error: "border-l-4 border-l-sale",
}

const DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "success" }) => {
      setToasts((current) => [
        ...current,
        { id: Date.now() + Math.random(), title, description, variant },
      ])
    },
    []
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={DURATION_MS} swipeDirection="right">
        {children}

        {toasts.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => {
              // Drop it from state once Radix has closed it, or the list grows
              // for the life of the page.
              if (!open) {
                setToasts((current) => current.filter((t) => t.id !== item.id))
              }
            }}
            className={cn(
              "flex flex-col gap-0.5 rounded-md border border-line bg-paper p-4",
              "data-[state=closed]:opacity-0",
              VARIANTS[item.variant]
            )}
          >
            <RadixToast.Title className="font-medium text-brand">
              {item.title}
            </RadixToast.Title>
            {item.description && (
              <RadixToast.Description className="text-muted">
                {item.description}
              </RadixToast.Description>
            )}
          </RadixToast.Root>
        ))}

        {/* Bottom on mobile — within thumb reach and clear of the header.
            Top-right on desktop, where it does not cover the buy bar. */}
        <RadixToast.Viewport
          className={cn(
            "fixed z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2",
            "bottom-4 left-1/2 -translate-x-1/2",
            "sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:translate-x-0"
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
