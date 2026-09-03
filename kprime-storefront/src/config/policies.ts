/**
 * The facts every policy page states.
 *
 * **One place, because four pages make the same promises.** The shipping page,
 * the FAQ, the returns page and `DeliveryEstimateBox` on every product all quote
 * delivery windows, rates and the returns period. Written out four times they
 * drift, and a customer who reads two different answers on the same site stops
 * believing either.
 *
 * ⚠️ **These mirror the backend, they do not drive it.** Rates and windows are
 * configured in `setup-shipping-zones.ts` and `setup-shipping-options.ts`; the
 * store API cannot list shipping options without a cart, so the storefront
 * cannot read them live. Change one and change the other, or the page will
 * promise a price the checkout does not charge.
 */

export type DeliveryZone = {
  name: string
  /** Cities exactly as the geo zones spell them. */
  cities: string[]
  standard: string
  /** Null where no express option is configured for the zone. */
  express: string | null
}

/** Matches STANDARD_RATE and EXPRESS_RATE in setup-shipping-options.ts. */
export const STANDARD_RATE = 250
export const EXPRESS_RATE = 600

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    name: "Peshawar and nearby",
    cities: ["Peshawar", "Nowshera", "Charsadda", "Mardan", "Risalpur"],
    standard: "1–2 days",
    express: "Next day",
  },
  {
    name: "Major cities",
    cities: [
      "Islamabad",
      "Rawalpindi",
      "Lahore",
      "Faisalabad",
      "Multan",
      "Gujranwala",
      "Sialkot",
      "Karachi",
      "Hyderabad",
      "Quetta",
    ],
    standard: "2–4 days",
    express: "1–2 days",
  },
  {
    name: "Other cities",
    cities: ["Abbottabad", "Sargodha", "Bahawalpur", "Sukkur", "and more"],
    standard: "3–5 days",
    express: "2–3 days",
  },
  {
    name: "Remote areas",
    cities: ["Gilgit", "Skardu", "Hunza", "Chitral", "Gwadar", "and more"],
    standard: "5–8 days",
    // Deliberately null: no express option is attached to this zone, and
    // offering one here would be a promise checkout could not keep.
    express: null,
  },
]

/** Days from delivery in which a problem can be reported. */
export const RETURNS_WINDOW_DAYS = 7

export const ORIGIN_CITY = "Peshawar"

/** Support hours, stated once. */
export const SUPPORT_HOURS = "Monday to Saturday, 10am – 8pm"

/**
 * The headline delivery claim, for the announcement bar, trust strip and hero.
 *
 * **"Most cities", not "nationwide".** The configured zones run from 1–2 days
 * locally to 5–8 days for remote areas, so a flat nationwide figure is wrong at
 * both ends — and wrong in the direction that matters, because the person in
 * Gilgit is the one who will be disappointed. Everything except the remote zone
 * lands inside this range.
 */
export const HEADLINE_DELIVERY = "1–5 days"
export const HEADLINE_DELIVERY_SCOPE = "most cities"
