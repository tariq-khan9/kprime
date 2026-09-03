import { cn } from "@/lib/utils/format"
import { SITE } from "@/config/site"

export type MerchantReplyProps = {
  content: string
  createdAt: string
  className?: string
}

/**
 * The shop's answer to one review.
 *
 * **Indented once, and only once (§2.4).** A reply is visually attached to its
 * review by a left border and a cream ground rather than by depth, because a
 * second level of indentation at 360px leaves about forty characters of usable
 * width. The data model allows a deeper chain; nothing renders one.
 *
 * Labelled with the shop's name, not "Admin" or "Seller" — a reply that reads
 * as coming from a person is the point, and an anonymous role name reads like
 * a support ticket.
 */
export function MerchantReply({
  content,
  createdAt,
  className,
}: MerchantReplyProps) {
  return (
    <div
      className={cn(
        "mt-3 border-l-2 border-line bg-cream px-4 py-3",
        className
      )}
    >
      <p className="text-sm font-medium text-brand">
        {SITE.name}
        <span className="ml-2 font-normal text-muted">replied</span>
        {createdAt && (
          <time
            dateTime={createdAt}
            className="ml-2 font-normal text-muted"
          >
            {new Date(createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        )}
      </p>

      <p className="mt-1 whitespace-pre-line text-sm text-brand">{content}</p>
    </div>
  )
}
