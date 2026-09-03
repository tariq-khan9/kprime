import { MerchantReply } from "@/components/page/review/MerchantReply"
import { StarRating } from "@/components/shared/StarRating"
import { Badge } from "@/components/ui/Badge"
import type { Review } from "@/lib/data/reviews"
import { cn } from "@/lib/utils/format"

export type ReviewCardProps = {
  review: Review
  className?: string
}

/**
 * One review.
 *
 * **The name is already masked when it arrives** — the backend sends "Ahmed K."
 * and never the full name, the email or the phone. Nothing here un-masks it,
 * and nothing here should ever be given the raw value to mask itself: a review
 * page is public, and the reviewer did not agree to publish their number.
 *
 * Every review shown has passed the delivered-purchase check to exist, so the
 * verified badge is not a per-review flag so much as a property of the whole
 * list — it is still drawn per card, because a shopper reads one card at a time.
 */
export function ReviewCard({ review, className }: ReviewCardProps) {
  return (
    <article className={cn("border-b border-line py-5 last:border-b-0", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating value={review.rating} size="sm" />

        {review.title && (
          <h3 className="font-medium text-brand">{review.title}</h3>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="text-brand">{review.author}</span>

        {review.verifiedBuyer && (
          <Badge variant="success">Verified buyer</Badge>
        )}

        {review.createdAt && (
          <time dateTime={review.createdAt}>
            {new Date(review.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        )}
      </div>

      {review.content && (
        <p className="mt-2 whitespace-pre-line text-brand">{review.content}</p>
      )}

      {review.reply && (
        <MerchantReply
          content={review.reply.content}
          createdAt={review.reply.createdAt}
        />
      )}
    </article>
  )
}
