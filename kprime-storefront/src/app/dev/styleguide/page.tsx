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

function Section({ spec }: { spec: SectionSpec }) {
  return (
    <section id={spec.id} className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-lg font-bold">{spec.name}</h3>
        <span className="text-muted">task {spec.task}</span>
      </div>

      {/* Replaced with a live instance by that task's session. */}
      <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-muted">
        Not built yet — {spec.note}
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

export default function StyleguidePage() {
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
            <Section key={spec.id} spec={spec} />
          ))}
        </div>

        <div className="flex flex-col gap-8">
          <h2 className="text-xl font-bold">Shared — components/shared</h2>
          {SHARED.map((spec) => (
            <Section key={spec.id} spec={spec} />
          ))}
        </div>
      </div>
    </main>
  )
}
