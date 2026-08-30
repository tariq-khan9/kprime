import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Star } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type AdminReview = {
  id: string
  product_id: string
  rating: number
  title: string | null
  content: string | null
  email: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  product: { id: string; title: string; handle: string } | null
}

const STATUS_COLOURS = {
  pending: "orange",
  approved: "green",
  rejected: "red",
} as const

/**
 * Review moderation.
 *
 * Nothing a customer writes reaches the storefront until it is approved here,
 * so this queue is the publish step rather than a tidying-up screen.
 *
 * Uses plain fetch with the session cookie rather than the JS SDK: the admin is
 * served from the same origin as the API, and adding a client library for four
 * requests would be a dependency the project does not otherwise need.
 */
const ReviewsPage = () => {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [status, setStatus] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/reviews?status=${status}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const { reviews } = await res.json()
      setReviews(reviews)
    } catch (error) {
      toast.error("Could not load reviews")
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const moderate = async (id: string, next: "approved" | "rejected") => {
    setBusyId(id)
    try {
      const res = await fetch(`/admin/reviews/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      toast.success(next === "approved" ? "Review published" : "Review rejected")
      await load()
    } catch (error) {
      toast.error("Could not update the review")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Reviews</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Customers only see a review once it is approved.
          </Text>
        </div>
        <div className="w-full md:w-56">
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger>
              <Select.Value placeholder="Filter by status" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending">Awaiting review</Select.Item>
              <Select.Item value="approved">Published</Select.Item>
              <Select.Item value="rejected">Rejected</Select.Item>
              <Select.Item value="all">All</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Loading…</Text>
        </div>
      ) : reviews.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">
            {status === "pending"
              ? "Nothing waiting. The queue is clear."
              : "No reviews with that status."}
          </Text>
        </div>
      ) : (
        // Wide content scrolls in its own container rather than pushing the
        // page sideways on a narrow screen.
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Rating</Table.HeaderCell>
                <Table.HeaderCell>Review</Table.HeaderCell>
                <Table.HeaderCell>From</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reviews.map((review) => (
                <Table.Row key={review.id}>
                  <Table.Cell>
                    <Text size="small" weight="plus">
                      {review.product?.title ?? review.product_id}
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {new Date(review.created_at).toLocaleDateString("en-GB")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="whitespace-nowrap">
                      {"★".repeat(review.rating)}
                      <span className="text-ui-fg-disabled">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell className="max-w-sm">
                    {review.title && (
                      <Text size="small" weight="plus">
                        {review.title}
                      </Text>
                    )}
                    <Text size="small" className="text-ui-fg-subtle">
                      {review.content || "— no text —"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {review.email}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={STATUS_COLOURS[review.status]} size="small">
                      {review.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      {review.status !== "approved" && (
                        <Button
                          size="small"
                          variant="secondary"
                          isLoading={busyId === review.id}
                          onClick={() => moderate(review.id, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {review.status !== "rejected" && (
                        <Button
                          size="small"
                          variant="danger"
                          isLoading={busyId === review.id}
                          onClick={() => moderate(review.id, "rejected")}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reviews",
  icon: Star,
})

export default ReviewsPage
