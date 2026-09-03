"use server"

import { trackOrder, type TrackResult } from "@/lib/data/track"

/**
 * Order lookup, as a server action.
 *
 * An action rather than a client fetch so the publishable key and the backend
 * URL stay server-side, and so the raw phone crosses exactly one boundary on
 * its way to `normalizePhone`.
 */
export async function trackOrderAction(
  orderNumber: string,
  phone: string
): Promise<TrackResult> {
  return trackOrder(orderNumber, phone)
}
