import type { InputHTMLAttributes } from "react"
import { useId } from "react"

import { cn } from "@/lib/utils/format"

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  /** Shown under the field when there is no error. */
  hint?: string
}

/**
 * Text field. `type` and `inputMode` pass straight through — checkout needs
 * inputMode="tel" so a phone keypad opens rather than a full keyboard.
 *
 * Font size is text-base (16px) and must stay there. Below 16px, iOS Safari
 * zooms the viewport on focus and does not zoom back out, which strands the
 * customer mid-form on the most important page in the app.
 */
export function Input({
  label,
  error,
  hint,
  id,
  className,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-medium text-brand">
          {label}
        </label>
      )}

      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "h-11 w-full rounded-md border bg-paper px-3 text-base text-brand",
          "placeholder:text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-cream",
          error
            ? "border-sale focus-visible:ring-sale"
            : "border-line focus-visible:ring-brand",
          "disabled:cursor-not-allowed disabled:bg-cream disabled:text-muted",
          className
        )}
        {...props}
      />

      {/* One slot for both, so the field never changes height between an error
          and a hint — a form that reflows as you type is hard to fill in. */}
      {(error || hint) && (
        <span id={messageId} className={error ? "text-sale" : "text-muted"}>
          {error ?? hint}
        </span>
      )}
    </div>
  )
}
