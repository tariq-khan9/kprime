"use server"

import { sdk } from "@/lib/sdk"

export type ContactResult = { ok: boolean; message: string }

/**
 * Sends a contact enquiry.
 *
 * Goes through the backend, which owns the SMTP credentials — the storefront
 * has no mailer and giving it one would put mail secrets in a second place.
 */
export async function sendContactAction(input: {
  name: string
  phone: string
  email?: string
  message: string
}): Promise<ContactResult> {
  try {
    const response = await sdk.client.fetch<{ message?: string }>(
      "/store/contact",
      { method: "POST", body: input }
    )

    return {
      ok: true,
      message: response.message ?? "Thanks — we have your message.",
    }
  } catch (error) {
    // The backend's messages are written for shoppers, including the honest
    // "form is not available, use WhatsApp" one, so they pass through.
    const message = error instanceof Error ? error.message : ""

    return {
      ok: false,
      message:
        message.trim() ||
        "We could not send that. Please try WhatsApp instead.",
    }
  }
}
