import type { SelectHTMLAttributes } from "react"
import { useId } from "react"

import { cn } from "@/lib/utils/format"

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  /** Shown as a disabled first entry when nothing is selected. */
  placeholder?: string
}

/**
 * A native <select>, styled to match Input.
 *
 * Native on purpose. On a phone this opens the OS picker — a scroll wheel the
 * customer already knows, which beats any custom listbox on a 360px screen.
 * Checkout's province -> city dependency (task 106) is just two of these, with
 * the second's options driven by the first's value.
 */
export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  id,
  className,
  disabled,
  value,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const messageId = `${selectId}-message`

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="font-medium text-brand">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            // pr-10 leaves room for the chevron; appearance-none removes the
            // platform arrow so the two do not stack.
            "h-11 w-full appearance-none rounded-md border bg-paper pl-3 pr-10",
            "text-base text-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-cream",
            error
              ? "border-sale focus-visible:ring-sale"
              : "border-line focus-visible:ring-brand",
            "disabled:cursor-not-allowed disabled:bg-cream disabled:text-muted",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted"
        >
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {(error || hint) && (
        <span id={messageId} className={error ? "text-sale" : "text-muted"}>
          {error ?? hint}
        </span>
      )}
    </div>
  )
}
