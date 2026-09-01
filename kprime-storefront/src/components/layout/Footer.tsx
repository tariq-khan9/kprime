import Link from "next/link"

import { Logo } from "@/components/layout/Logo"
import { HELP_LINKS, POLICY_LINKS, SITE, whatsappLink } from "@/config/site"
import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

type LinkItem = { label: string; href: string }

/**
 * A footer column.
 *
 * Uses a native <details> rather than the Accordion primitive so the group is
 * open by default from sm up with no JavaScript — `open` cannot be made
 * responsive, but `[&>summary]:hidden` plus the grid below achieves the same
 * effect without shipping a client component into every page's footer.
 */
function LinkGroup({ title, links }: { title: string; links: readonly LinkItem[] }) {
  return (
    <details
      open
      className="group border-b border-cream/15 sm:border-b-0 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between",
          "font-bold text-cream sm:pointer-events-none sm:min-h-0 sm:cursor-default sm:pb-3"
        )}
      >
        {title}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className="size-5 text-cream/60 transition-transform group-open:rotate-180 sm:hidden"
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <ul className="flex flex-col pb-3 sm:pb-0">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-11 items-center text-cream/70 hover:text-cream sm:min-h-0 sm:py-1"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function Footer({ tree }: { tree: CategoryNode[] }) {
  const categoryLinks: LinkItem[] = tree.map((node) => ({
    label: node.name,
    href: `/categories/${node.handle}`,
  }))

  return (
    <footer className="w-full bg-brand text-cream">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Stacked at 360px, 2 columns at sm, 4 at lg. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 sm:gap-y-8 lg:grid-cols-4">
          <div className="flex flex-col gap-3 pb-6 sm:pb-0">
            <Logo variant="reversed" />
            <p className="text-sm text-cream/70">{SITE.tagline}</p>
          </div>

          <LinkGroup title="Shop" links={categoryLinks} />
          <LinkGroup title="Help" links={[...HELP_LINKS, ...POLICY_LINKS.slice(0, 3)]} />
          <LinkGroup title="Policies" links={POLICY_LINKS.slice(3)} />
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-cream/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* The only support channel — this build sends no order email and no
              SMS, so the confirmation page and this link are all a customer
              has. */}
          <a
            href={whatsappLink("Hi, I need help with an order")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 text-cream hover:text-cream/80"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
              <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1112 20z" />
            </svg>
            Message us on WhatsApp
          </a>

          <p className="text-sm text-cream/60">
            © {new Date().getFullYear()} {SITE.name}. Cash on delivery across
            Pakistan.
          </p>
        </div>
      </div>
    </footer>
  )
}
