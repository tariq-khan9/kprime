import type { ReactNode } from "react"

import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { ProductCard } from "@/components/shared/ProductCard"
import { ProductGrid } from "@/components/shared/ProductGrid"
import { ProductRail } from "@/components/shared/ProductRail"
import { StarRating } from "@/components/shared/StarRating"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Skeleton } from "@/components/ui/Skeleton"
import { searchProducts, type ProductSummary } from "@/lib/data/products"

import {
  AccordionDemo,
  CheckboxDemo,
  DrawerDemo,
  ModalDemo,
  RadioGroupDemo,
  ToastDemo,
} from "./demos"

/**
 * Component workbench.
 *
 * Every task in Block C and D adds a live instance to its section below. The
 * point is seeing a component in states a real page rarely triggers — disabled,
 * loading, empty, error — side by side on the actual cream background.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */

/** Rendered as chips so a missing token shows up as an unstyled square. */
const COLOUR_TOKENS = [
  { name: "cream", className: "bg-cream", job: "Page background" },
  { name: "paper", className: "bg-paper", job: "Cards, panels, modals" },
  { name: "brand", className: "bg-brand", job: "All text, headings, prices" },
  { name: "brand-light", className: "bg-brand-light", job: "Hover on navy" },
  { name: "action", className: "bg-action", job: "Primary CTA only" },
  { name: "action-hover", className: "bg-action-hover", job: "CTA hover" },
  { name: "action-ink", className: "bg-action-ink", job: "Text on amber" },
  { name: "sale", className: "bg-sale", job: "Discount badges, savings" },
  { name: "success", className: "bg-success", job: "In stock, confirmed" },
  { name: "muted", className: "bg-muted", job: "Breadcrumbs, labels" },
  { name: "line", className: "bg-line", job: "Borders, dividers" },
]

const RADIUS_TOKENS = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
]

type SectionSpec = { id: string; name: string; task: number; note: string }

const PRIMITIVES: SectionSpec[] = [
  { id: "button", name: "Button", task: 22, note: "3 variants x 4 states" },
  { id: "input", name: "Input", task: 23, note: "default, focused, error, disabled" },
  { id: "select", name: "Select", task: 24, note: "native select, 5 options" },
  { id: "checkbox", name: "Checkbox", task: 25, note: "all states, 44px target" },
  { id: "radio-group", name: "RadioGroup", task: 26, note: "2 options, keyboard nav" },
  { id: "badge", name: "Badge", task: 27, note: "sale, success, neutral" },
  { id: "skeleton", name: "Skeleton", task: 28, note: "text line and card" },
  { id: "drawer", name: "Drawer", task: 29, note: "left, right, bottom" },
  { id: "modal", name: "Modal", task: 30, note: "backdrop, focus trap" },
  { id: "toast", name: "Toast", task: 31, note: "stacking, success and error" },
  { id: "accordion", name: "Accordion", task: 32, note: "3-level nesting" },
]

const SHARED: SectionSpec[] = [
  { id: "price-display", name: "PriceDisplay", task: 33, note: "with and without compare-at" },
  { id: "star-rating", name: "StarRating", task: 34, note: "0, 2.5, 4.7, 5 stars" },
  { id: "product-card", name: "ProductCard", task: 35, note: "6 real products, 3 breakpoints" },
  { id: "product-grid", name: "ProductGrid", task: 36, note: "12 products + skeleton state" },
  { id: "product-rail", name: "ProductRail", task: 37, note: "10 products, snap scroll" },
]

/** A row of examples with a label, so states are comparable side by side. */
function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const VARIANTS = ["primary", "secondary", "ghost"] as const

/**
 * Live instances, keyed by section id. Each Block C task adds one entry; a
 * section with no entry still renders its "not built yet" placeholder.
 */
function buildDemos(
  products: ProductSummary[]
): Partial<Record<string, ReactNode>> {
  return {
  button: (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <Demo key={variant} label={variant}>
          <Button variant={variant}>Default</Button>
          {/* Hover has no static state; forced here so it is comparable. */}
          <Button variant={variant} className="bg-action-hover">
            Hover
          </Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
        </Demo>
      ))}

      <Demo label="sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Demo>

      <Demo label="asChild — renders an <a>, not a button inside a link">
        <Button asChild>
          <a href="/dev/products">Go to products</a>
        </Button>
      </Demo>
    </div>
  ),

  input: (
    <div className="flex max-w-sm flex-col gap-4">
      <Input label="Full name" placeholder="Ahmed Khan" />
      <Input
        label="Phone"
        type="tel"
        inputMode="tel"
        placeholder="0300 1234567"
        hint="We call to confirm every order."
      />
      <Input
        label="Phone"
        defaultValue="0300"
        error="That number is too short."
      />
      <Input label="Email" placeholder="Optional" disabled />
    </div>
  ),

  select: (
    <div className="flex max-w-sm flex-col gap-4">
      <Select
        label="Province"
        placeholder="Choose a province"
        defaultValue=""
        options={[
          { value: "kp", label: "Khyber Pakhtunkhwa" },
          { value: "pb", label: "Punjab" },
          { value: "sd", label: "Sindh" },
          { value: "ba", label: "Balochistan" },
          { value: "is", label: "Islamabad Capital Territory" },
        ]}
      />
      <Select
        label="City"
        error="Select a province first."
        options={[{ value: "peshawar", label: "Peshawar" }]}
      />
      <Select
        label="City"
        disabled
        options={[{ value: "peshawar", label: "Peshawar" }]}
      />
    </div>
  ),

  checkbox: <CheckboxDemo />,
  "radio-group": <RadioGroupDemo />,

  badge: (
    <div className="flex flex-col gap-4">
      <Demo label="variants">
        <Badge variant="sale">20% off</Badge>
        <Badge variant="success">In stock</Badge>
        <Badge variant="neutral">Imported</Badge>
      </Demo>
      <Demo label="on a card, against a price">
        <div className="flex items-center gap-3 rounded-md border border-line p-3">
          <span className="text-lg font-bold">Rs 2,200</span>
          <span className="text-muted line-through">Rs 2,750</span>
          <Badge variant="sale">Save Rs 550</Badge>
        </div>
      </Demo>
    </div>
  ),

  skeleton: (
    <div className="flex flex-col gap-4">
      <Demo label="text lines">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Demo>
      <Demo label="card — same dimensions as a real ProductCard">
        <div className="flex w-40 flex-col gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </Demo>
    </div>
  ),

  drawer: <DrawerDemo />,
  modal: <ModalDemo />,
  toast: <ToastDemo />,
  accordion: <AccordionDemo />,

  "price-display": (
    <div className="flex flex-col gap-6">
      {(["card", "detail", "line"] as const).map((size) => (
        <Demo key={size} label={size}>
          <div className="rounded-md border border-line p-3">
            <PriceDisplay price={2200} size={size} />
          </div>
          <div className="rounded-md border border-line p-3">
            <PriceDisplay price={2200} originalPrice={2750} size={size} />
          </div>
        </Demo>
      ))}
      <Demo label="null price">
        <div className="rounded-md border border-line p-3">
          <PriceDisplay price={null} />
        </div>
      </Demo>
      <p className="text-muted">
        Both boxes in each row are the same height — the compare-at line is
        reserved whether or not there is a discount.
      </p>
    </div>
  ),

  "star-rating": (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Demo key={size} label={size}>
          {[0, 2.5, 4.7, 5].map((v) => (
            <span key={v} className="flex items-center gap-2">
              <StarRating value={v} size={size} />
              <span className="text-muted">{v}</span>
            </span>
          ))}
        </Demo>
      ))}
      <Demo label="with count">
        <StarRating value={4.5} count={128} />
      </Demo>
      <Demo label="null — renders nothing, not zero stars">
        <span className="rounded-md border border-dashed border-line px-3 py-1">
          <StarRating value={null} />
        </span>
      </Demo>
    </div>
  ),

  "product-card": (
    <div className="flex flex-col gap-6">
      <p className="text-muted">
        {products.length} real products. None have photography yet, so every
        card shows the placeholder — that is the current state of the
        catalogue, not a broken image.
      </p>

      <Demo label="360px — two per row">
        <div className="w-[360px] rounded-md border border-dashed border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        </div>
      </Demo>

      <Demo label="768px — three per row">
        <div className="w-[768px] max-w-full rounded-md border border-dashed border-line p-3">
          <div className="grid grid-cols-3 gap-4">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </Demo>

      <Demo label="with a discount and a rating — simulated, no data yet">
        <div className="w-[360px] rounded-md border border-dashed border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 2).map((p, i) => (
              <ProductCard
                key={p.id}
                product={
                  i === 0
                    ? {
                        ...p,
                        originalPrice: p.price ? Math.round(p.price * 1.3) : null,
                      }
                    : p
                }
                rating={i === 0 ? 4.5 : undefined}
                reviewCount={i === 0 ? 23 : undefined}
              />
            ))}
          </div>
        </div>
      </Demo>
      <p className="text-muted">
        Left card has a badge and stars, right card has neither — both are the
        same height, and the undiscounted one has no empty badge gap.
      </p>
    </div>
  ),

  "product-grid": (
    <div className="flex flex-col gap-6">
      <p className="text-muted">
        Resize the window: 2 columns below 640px, 3 to 1024px, 4 above.
      </p>

      <Demo label="live — fills the available width">
        <div className="w-full">
          <ProductGrid products={products} />
        </div>
      </Demo>

      <Demo label="360px — two per row">
        <div className="w-[360px] max-w-full rounded-md border border-dashed border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </Demo>

      <Demo label="loading — same dimensions, nothing shifts">
        <div className="w-full">
          <ProductGrid products={[]} loading skeletonCount={8} />
        </div>
      </Demo>
    </div>
  ),

  "product-rail": (
    <div className="flex flex-col gap-6">
      <ProductRail
        title="New In"
        products={products}
        viewAllHref="/dev/products"
      />

      <p className="text-muted">
        Scroll by touch, or by the arrows — which appear only at 640px and up.
        Part of the next card stays visible on purpose: on a phone that is what
        signals there is more to the right.
      </p>

      <Demo label="360px — inside a phone-width container">
        <div className="w-[360px] max-w-full overflow-hidden rounded-md border border-dashed border-line p-3">
          <ProductRail title="Best Sellers" products={products.slice(0, 8)} />
        </div>
      </Demo>
    </div>
  ),
  }
}

function Section({
  spec,
  demos,
}: {
  spec: SectionSpec
  demos: Partial<Record<string, ReactNode>>
}) {
  const demo = demos[spec.id]

  return (
    <section id={spec.id} className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-lg font-bold">{spec.name}</h3>
        <span className="text-muted">task {spec.task}</span>
      </div>

      <div
        className={
          demo
            ? "rounded-lg border border-line bg-paper p-6"
            : "rounded-lg border border-dashed border-line bg-paper p-6 text-muted"
        }
      >
        {demo ?? <>Not built yet — {spec.note}</>}
      </div>
    </section>
  )
}

function JumpNav({ specs }: { specs: SectionSpec[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {specs.map((spec) => (
        <a key={spec.id} href={`#${spec.id}`} className="text-muted underline">
          {spec.name}
        </a>
      ))}
    </div>
  )
}

export default async function StyleguidePage() {
  // Real catalogue rather than fixtures: ProductCard's whole job is surviving
  // the titles, prices and missing images the actual data has.
  const { products } = await searchProducts({ pageSize: 12 })
  const demos = buildDemos(products)

  return (
    <main className="min-h-screen bg-cream px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div>
          <h1 className="text-2xl font-bold">Styleguide</h1>
          <p className="mt-1 text-muted">
            11 primitives and 5 shared components. Each section fills in as its
            task lands.
          </p>
        </div>

        <section className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-6">
          <h2 className="text-lg font-bold">Tokens</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COLOUR_TOKENS.map((token) => (
              <div key={token.name} className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 shrink-0 rounded-md border border-line ${token.className}`}
                />
                <div className="flex flex-col">
                  <code>{token.name}</code>
                  <span className="text-muted">{token.job}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
            {RADIUS_TOKENS.map((token) => (
              <div key={token.name} className="flex flex-col items-center gap-1">
                <div
                  className={`h-12 w-12 border border-line bg-brand ${token.className}`}
                />
                <code className="text-muted">{token.name}</code>
              </div>
            ))}
          </div>

          {/* Amber is the one pairing that fails if it drifts: white on #F2A007
              is 2.1:1. Shown here so a regression is visible, not theoretical. */}
          <div className="flex flex-wrap gap-3 border-t border-line pt-4">
            <span className="rounded-md bg-action px-4 py-2 text-action-ink">
              Dark ink on amber — correct
            </span>
            <span className="rounded-md bg-brand px-4 py-2 text-cream">
              Cream on navy — correct
            </span>
          </div>
        </section>

        <nav className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-6">
          <div>
            <h2 className="mb-2 font-bold">Primitives</h2>
            <JumpNav specs={PRIMITIVES} />
          </div>
          <div className="border-t border-line pt-3">
            <h2 className="mb-2 font-bold">Shared</h2>
            <JumpNav specs={SHARED} />
          </div>
        </nav>

        <div className="flex flex-col gap-8">
          <h2 className="text-xl font-bold">Primitives — components/ui</h2>
          {PRIMITIVES.map((spec) => (
            <Section key={spec.id} spec={spec} demos={demos} />
          ))}
        </div>

        <div className="flex flex-col gap-8">
          <h2 className="text-xl font-bold">Shared — components/shared</h2>
          {SHARED.map((spec) => (
            <Section key={spec.id} spec={spec} demos={demos} />
          ))}
        </div>
      </div>
    </main>
  )
}
