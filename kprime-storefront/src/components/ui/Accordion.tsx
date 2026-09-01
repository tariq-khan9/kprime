"use client"

import * as RadixAccordion from "@radix-ui/react-accordion"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type AccordionItemSpec = {
  value: string
  trigger: ReactNode
  content: ReactNode
}

export type AccordionProps = {
  /** `single` closes the open panel when another opens; `multiple` does not. */
  type?: "single" | "multiple"
  items: AccordionItemSpec[]
  defaultValue?: string | string[]
  /** Only meaningful when type is "single". */
  collapsible?: boolean
  className?: string
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="size-5 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Four consumers, which is why this is a primitive and not a one-off: MobileNav
 * (task 44), ProductTabs on mobile (task 90), the FAQ (task 139) and checkout
 * steps.
 *
 * Nesting matters — the mobile nav goes three levels deep. It works because
 * `content` takes arbitrary children, so an Accordion can hold another one.
 */
export function Accordion({
  type = "single",
  items,
  defaultValue,
  collapsible = true,
  className,
}: AccordionProps) {
  // The two Radix variants have incompatible prop types, so they are branched
  // rather than spread from one object.
  const content = items.map((item) => (
    <RadixAccordion.Item
      key={item.value}
      value={item.value}
      className="border-b border-line last:border-b-0"
    >
      <RadixAccordion.Header>
        <RadixAccordion.Trigger
          className={cn(
            // 44px minimum: this is the mobile nav's tap target.
            "group flex min-h-11 w-full items-center justify-between gap-3 py-3",
            "text-left font-medium text-brand hover:text-brand-light",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          )}
        >
          {item.trigger}
          <Chevron />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>

      <RadixAccordion.Content className="overflow-hidden">
        <div className="pb-3 pl-3">{item.content}</div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  ))

  if (type === "multiple") {
    return (
      <RadixAccordion.Root
        type="multiple"
        defaultValue={
          Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : undefined
        }
        className={cn("w-full", className)}
      >
        {content}
      </RadixAccordion.Root>
    )
  }

  return (
    <RadixAccordion.Root
      type="single"
      collapsible={collapsible}
      defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : defaultValue}
      className={cn("w-full", className)}
    >
      {content}
    </RadixAccordion.Root>
  )
}
