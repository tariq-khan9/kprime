"use client"

import { useState, type ReactNode } from "react"

import { DeliveryEstimateBox } from "@/components/page/product/DeliveryEstimateBox"
import { specOptions } from "@/components/page/product/VariantOptionSelector"
import { Accordion } from "@/components/ui/Accordion"
import type { ProductDetail } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

type Panel = { value: string; label: string; content: ReactNode }

function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex gap-4 border-b border-line py-2 last:border-b-0"
        >
          <dt className="w-40 shrink-0 text-muted">{row.label}</dt>
          <dd className="min-w-0 text-brand">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Description / Specifications / Shipping & Returns.
 *
 * **Accordion on mobile, tabs on desktop.** Tabs at 360px force either a
 * horizontal scroll or three-character labels; an accordion stacks and lets
 * someone open only what they care about. Both render the same panels, so there
 * is one source of content and no risk of the two drifting.
 *
 * **Specifications is where single-value options surface (§2.1)** — the ones
 * `VariantOptionSelector` deliberately refuses to render, because a control with
 * one unchangeable choice is not a control. Product type and non-brand tags join
 * them, since they are the same kind of fact.
 *
 * A panel with nothing in it is not rendered. An empty "Specifications" tab is
 * worse than three tabs where the third is absent.
 */
export function ProductTabs({
  product,
  className,
}: {
  product: ProductDetail
  className?: string
}) {
  const specs: { label: string; value: string }[] = [
    ...specOptions(product).map((option) => ({
      label: option.title,
      value: option.values[0]?.value ?? "",
    })),
    ...(product.type ? [{ label: "Type", value: product.type }] : []),
    ...(product.tags.length
      ? [{ label: "Tags", value: product.tags.join(", ") }]
      : []),
  ].filter((row) => row.value)

  const panels: Panel[] = ([
    product.description
      ? {
          value: "description",
          label: "Description",
          content: (
            <p className="whitespace-pre-line text-brand">
              {product.description}
            </p>
          ),
        }
      : null,
    specs.length
      ? {
          value: "specifications",
          label: "Specifications",
          content: <SpecTable rows={specs} />,
        }
      : null,
    {
      value: "shipping",
      label: "Shipping & Returns",
      content: <DeliveryEstimateBox />,
    },
  ] as (Panel | null)[]).filter((panel): panel is Panel => panel !== null)

  const [active, setActive] = useState(panels[0]?.value ?? "")

  if (panels.length === 0) {
    return null
  }

  const current = panels.find((panel) => panel.value === active) ?? panels[0]

  return (
    <div className={cn("text-sm", className)}>
      {/* Mobile */}
      <Accordion
        type="single"
        collapsible
        defaultValue={panels[0].value}
        items={panels.map((panel) => ({
          value: panel.value,
          trigger: panel.label,
          content: panel.content,
        }))}
        className="lg:hidden"
      />

      {/* Desktop */}
      <div className="hidden lg:block">
        <div role="tablist" aria-label="Product details" className="flex gap-1 border-b border-line">
          {panels.map((panel) => {
            const selected = panel.value === current.value

            return (
              <button
                key={panel.value}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${panel.value}`}
                id={`tab-${panel.value}`}
                onClick={() => setActive(panel.value)}
                className={cn(
                  "-mb-px min-h-11 border-b-2 px-4 font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  selected
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:text-brand"
                )}
              >
                {panel.label}
              </button>
            )
          })}
        </div>

        {/* Every panel is rendered and the inactive ones hidden, rather than
            mounting only the active one. The description and specifications are
            the page's real content — leaving them out of the HTML until someone
            clicks hides them from search engines too. */}
        {panels.map((panel) => (
          <div
            key={panel.value}
            role="tabpanel"
            id={`panel-${panel.value}`}
            aria-labelledby={`tab-${panel.value}`}
            hidden={panel.value !== current.value}
            className="py-4"
          >
            {panel.content}
          </div>
        ))}
      </div>
    </div>
  )
}
