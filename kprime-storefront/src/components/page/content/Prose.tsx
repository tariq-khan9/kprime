import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { cn } from "@/lib/utils/format"

export type ProseProps = {
  title: string
  /** One line under the heading. Optional. */
  intro?: string
  children: React.ReactNode
  className?: string
}

/**
 * The shell every policy and information page uses.
 *
 * **`max-w-2xl`, not the full container.** Prose is read, not scanned, and a
 * line of body text running the width of a 1440px screen is measurably harder
 * to follow. Around 70 characters is the target; the grid pages keep the wide
 * container because a product grid is scanned.
 *
 * Headings and spacing are set here rather than per page, so seven pages
 * written at different times cannot end up with seven different rhythms.
 */
export function Prose({ title, intro, children, className }: ProseProps) {
  return (
    <Container className="py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />

      <article className={cn("mx-auto mt-4 max-w-2xl", className)}>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>

        {intro && <p className="mt-2 text-lg text-muted">{intro}</p>}

        <div
          className={cn(
            "mt-6 flex flex-col gap-4 text-brand",
            // Typographic defaults for plain prose children, so each page can
            // be written as ordinary markup without repeating classes.
            "[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold",
            "[&_h3]:mt-2 [&_h3]:font-medium",
            "[&_p]:leading-relaxed",
            "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5",
            "[&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:pl-5",
            "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2"
          )}
        >
          {children}
        </div>
      </article>
    </Container>
  )
}
