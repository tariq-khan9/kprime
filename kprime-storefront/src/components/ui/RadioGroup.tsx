"use client"

import * as RadixRadioGroup from "@radix-ui/react-radio-group"
import { useId } from "react"

import { cn } from "@/lib/utils/format"

export type RadioOption = {
  value: string
  label: string
  /** Secondary line — shipping uses it for the price and delivery window. */
  description?: string
  disabled?: boolean
}

export type RadioGroupProps = {
  label?: string
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  className?: string
}

/**
 * Used by checkout's shipping method step (task 108), where each option carries
 * a price and an SLA, so the description slot is load-bearing rather than
 * decorative.
 *
 * Radix gives this one tab stop with arrow keys moving the selection — the
 * roving-tabindex behaviour a group of native radios only gets right when the
 * name attribute is threaded correctly.
 */
export function RadioGroup({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
}: RadioGroupProps) {
  const groupId = useId()

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span id={groupId} className="font-medium text-brand">
          {label}
        </span>
      )}

      <RadixRadioGroup.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        name={name}
        aria-labelledby={label ? groupId : undefined}
        className={cn("flex flex-col gap-2", className)}
      >
        {options.map((option) => {
          const itemId = `${groupId}-${option.value}`

          return (
            // Card rather than a bare radio: the whole block is tappable and
            // clears 44px, and the selected state is readable at arm's length.
            <label
              key={option.value}
              htmlFor={itemId}
              className={cn(
                "flex min-h-11 items-start gap-3 rounded-md border p-3",
                "has-[:checked]:border-brand has-[:checked]:bg-brand/5",
                option.disabled
                  ? "cursor-not-allowed border-line bg-cream text-muted"
                  : "cursor-pointer border-line bg-paper hover:border-brand"
              )}
            >
              <RadixRadioGroup.Item
                id={itemId}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  "border-line bg-paper data-[state=checked]:border-brand",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                  "disabled:cursor-not-allowed disabled:border-muted"
                )}
              >
                <RadixRadioGroup.Indicator className="size-2.5 rounded-full bg-brand" />
              </RadixRadioGroup.Item>

              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-muted">{option.description}</span>
                )}
              </span>
            </label>
          )
        })}
      </RadixRadioGroup.Root>
    </div>
  )
}
