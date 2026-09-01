"use client"

import * as RadixCheckbox from "@radix-ui/react-checkbox"
import { useId } from "react"

import { cn } from "@/lib/utils/format"

export type CheckboxProps = {
  label?: string
  /** `"indeterminate"` renders a dash — used by parent filter groups. */
  checked?: boolean | "indeterminate"
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean | "indeterminate") => void
  disabled?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
  /** Right-aligned count, e.g. the "(12)" beside a filter value. */
  count?: number
}

export function Checkbox({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  name,
  value,
  id,
  className,
  count,
}: CheckboxProps) {
  const generatedId = useId()
  const boxId = id ?? generatedId

  return (
    // The whole row is the hit area and is 44px tall, even though the box is
    // 20px. Filter groups are tapped repeatedly on a phone; a 20px target there
    // is a miss every few taps. -mx-2 px-2 keeps the padding from shifting
    // alignment against the text above it.
    <div
      className={cn(
        "flex min-h-11 items-center gap-3 -mx-2 px-2 rounded-md",
        disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-brand/5",
        className
      )}
    >
      <RadixCheckbox.Root
        id={boxId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        name={name}
        value={value}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-sm border",
          "border-line bg-paper",
          "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
          "data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
          "disabled:cursor-not-allowed disabled:bg-cream disabled:border-muted"
        )}
      >
        <RadixCheckbox.Indicator className="text-cream">
          {checked === "indeterminate" ? (
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
              <path
                d="M3.5 8h9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
              <path
                d="M3 8.5l3.5 3.5L13 4.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>

      {label && (
        <label
          htmlFor={boxId}
          className={cn(
            "flex flex-1 items-center justify-between gap-2",
            disabled ? "cursor-not-allowed text-muted" : "cursor-pointer"
          )}
        >
          <span>{label}</span>
          {count !== undefined && <span className="text-muted">{count}</span>}
        </label>
      )}
    </div>
  )
}
