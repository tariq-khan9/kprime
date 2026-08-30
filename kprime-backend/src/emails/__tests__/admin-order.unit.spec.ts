import { renderAdminOrderEmail } from "../admin-order";

/**
 * The admin email is operational: the shop owner reads it to know how much cash
 * to collect and where to send the parcel. A wrong amount here costs real money
 * at the door, and a cancelled order that reads like a new one gets dispatched.
 */

const order = {
  id: "order_01ABC",
  display_id: 42,
  email: "buyer@example.com",
  currency_code: "pkr",
  created_at: "2026-08-28T10:00:00.000Z",
  items: [
    {
      title: "Wireless Earbuds",
      variant_title: "Black",
      variant_sku: "BUDS-BLACK",
      quantity: 1,
      total: 6500,
    },
  ],
  shipping_methods: [{ name: "Express Shipping" }],
  shipping_address: {
    first_name: "Ayesha",
    last_name: "Khan",
    address_1: "12 Zamzama Blvd",
    city: "Karachi",
    postal_code: "75500",
    country_code: "pk",
    phone: "+923001234567",
  },
  subtotal: 6500,
  shipping_total: 600,
  total: 7100,
};

describe("renderAdminOrderEmail", () => {
  it("leads with the cash amount to collect on a new order", () => {
    const { subject, html, text } = renderAdminOrderEmail(order, "placed")
    expect(subject).toContain("New order #42")
    expect(subject).toContain("PKR 7,100")
    expect(html).toContain("Collect PKR 7,100")
    expect(text).toContain("Collect PKR 7,100")
  })

  it("makes a cancellation unmistakable", () => {
    const { subject, html, text } = renderAdminOrderEmail(order, "canceled")
    expect(subject).toContain("cancelled")
    expect(html).toContain("Do not dispatch")
    expect(text).toContain("Do not dispatch")
    // Must not read like a new order that needs fulfilling.
    expect(html).not.toContain("Collect PKR")
  })

  it("includes the SKU, phone and address needed to fulfil", () => {
    const { html, text } = renderAdminOrderEmail(order, "placed")
    for (const output of [html, text]) {
      expect(output).toContain("BUDS-BLACK")
      expect(output).toContain("+923001234567")
      expect(output).toContain("12 Zamzama Blvd")
      expect(output).toContain("Karachi")
    }
  })

  it("deep-links the admin order page when the backend URL is known", () => {
    const { html, text } = renderAdminOrderEmail(
      { ...order, admin_url: "http://localhost:9000" },
      "placed"
    )
    expect(html).toContain("http://localhost:9000/app/orders/order_01ABC")
    expect(text).toContain("http://localhost:9000/app/orders/order_01ABC")
  })

  it("omits the admin link rather than emitting a broken one", () => {
    const { html } = renderAdminOrderEmail(order, "placed")
    expect(html).not.toContain("/app/orders/")
    expect(html).not.toContain("undefined")
  })

  it("formats Postgres numeric strings, not raw decimals", () => {
    const { subject, html } = renderAdminOrderEmail(
      { ...order, total: "7100.0000000000000000" },
      "placed"
    )
    expect(subject).toContain("PKR 7,100")
    expect(html).not.toMatch(/\.\d{4,}/)
  })

  it("escapes HTML in customer-supplied values", () => {
    const { html } = renderAdminOrderEmail(
      {
        ...order,
        shipping_address: {
          ...order.shipping_address,
          first_name: "<script>alert(1)</script>",
        },
      },
      "placed"
    )
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;")
  })

  // Without this line the totals silently stop adding up, and the owner
  // collects the pre-discount amount at the door.
  it("shows the discount so subtotal and shipping reconcile to the total", () => {
    const { html, text } = renderAdminOrderEmail(
      { ...order, discount_total: 650, total: 6450 },
      "placed"
    )
    for (const output of [html, text]) {
      expect(output).toContain("Discount")
      expect(output).toContain("650")
    }
    expect(text).toContain("Discount: -PKR 650")
  })

  it("omits the discount line entirely when nothing was discounted", () => {
    const { html, text } = renderAdminOrderEmail(order, "placed")
    expect(html).not.toContain("Discount")
    expect(text).not.toContain("Discount")
  })
})
