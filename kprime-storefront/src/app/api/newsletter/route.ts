import { NextResponse } from "next/server"

/**
 * Newsletter subscription.
 *
 * Posts to Brevo's contacts API when BREVO_API_KEY is set. Until then it
 * returns an explicit "not configured" rather than a cheerful success — a form
 * that thanks someone for subscribing while storing nothing is worse than one
 * that admits it is not wired up, because nobody ever finds out.
 *
 * Note this needs a Brevo *API key*, not the SMTP credentials the backend uses
 * for order mail. They are different things on the same account.
 */

const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts"

// Deliberately loose. Strict email regexes reject valid addresses; the real
// check is whether Brevo accepts it.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let email: unknown

  try {
    ({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    )
  }

  const apiKey = process.env.BREVO_API_KEY
  const listId = process.env.BREVO_LIST_ID

  if (!apiKey || !listId) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Newsletter is not connected yet. Set BREVO_API_KEY and BREVO_LIST_ID.",
      },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(BREVO_CONTACTS_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        listIds: [Number(listId)],
        updateEnabled: true,
      }),
    })

    // 400 with duplicate_parameter means the address is already subscribed.
    // That is a success from the visitor's point of view — they are on the
    // list — so it must not surface as an error.
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))

      if (body?.code === "duplicate_parameter") {
        return NextResponse.json({ configured: true, alreadySubscribed: true })
      }

      return NextResponse.json(
        { error: "Could not subscribe you. Please try again." },
        { status: 502 }
      )
    }

    return NextResponse.json({ configured: true })
  } catch {
    return NextResponse.json(
      { error: "Could not reach the newsletter service." },
      { status: 502 }
    )
  }
}
