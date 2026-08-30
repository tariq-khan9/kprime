import { renderOrderPlacedEmail } from "../order-placed";

/**
 * The money formatting here is not cosmetic: these strings are what a customer
 * is told to hand the courier. Postgres returns numeric columns as strings like
 * "5000.0000000000000000", and an early version of this template called
 * toLocaleString on that string — a no-op — so the raw value reached the
 * subject line. These tests pin that down.
 */

const baseOrder = {
  display_id: 42,
  email: "buyer@example.com",
  currency_code: "pkr",
  items: [
    { title: "Wireless Earbuds", variant_title: "Black", quantity: 1, total: 6500 },
  ],
  subtotal: 6500,
  shipping_total: 250,
  total: 6750,
};

describe("renderOrderPlacedEmail", () => {
  it("formats Postgres numeric strings as clean amounts", () => {
    const { subject, html, text } = renderOrderPlacedEmail({
      ...baseOrder,
      subtotal: "6500.0000000000000000",
      shipping_total: "250.0000000000000000",
      total: "6750.0000000000000000",
    });

    expect(subject).toContain("PKR 6,750");
    expect(subject).not.toMatch(/\.\d{4,}/);
    expect(html).not.toMatch(/\.\d{4,}/);
    expect(text).not.toMatch(/\.\d{4,}/);
  });

  it("formats plain numbers the same way", () => {
    const { subject } = renderOrderPlacedEmail(baseOrder);
    expect(subject).toContain("PKR 6,750");
  });

  it("never renders NaN when totals are missing", () => {
    const { subject, html, text } = renderOrderPlacedEmail({
      display_id: 1,
      currency_code: "pkr",
      items: [{ title: "Thing", quantity: 1, total: null }],
    });

    for (const output of [subject, html, text]) {
      expect(output).not.toContain("NaN");
      expect(output).not.toContain("undefined");
    }
  });

  it("survives a garbage amount without printing NaN", () => {
    const { subject } = renderOrderPlacedEmail({
      ...baseOrder,
      total: "not-a-number",
    });
    expect(subject).not.toContain("NaN");
    expect(subject).toContain("PKR 0");
  });

  it("drops null line items rather than throwing", () => {
    const { text } = renderOrderPlacedEmail({
      ...baseOrder,
      items: [null, { title: "Cable", quantity: 2, total: 1600 }, null],
    });

    expect(text).toContain("Cable");
    expect(text).toContain("PKR 1,600");
  });

  it("escapes HTML in customer-supplied values", () => {
    const { html } = renderOrderPlacedEmail({
      ...baseOrder,
      shipping_address: {
        first_name: "<script>alert(1)</script>",
        last_name: "Buyer",
        address_1: "12 Zamzama",
        city: "Karachi",
        country_code: "pk",
      },
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("states the cash-on-delivery amount", () => {
    const { html, text } = renderOrderPlacedEmail(baseOrder);
    expect(html).toContain("Cash on Delivery");
    expect(text).toContain("Cash on Delivery — please keep PKR 6,750");
  });

  it("shows the order number", () => {
    const { subject, html } = renderOrderPlacedEmail(baseOrder);
    expect(subject).toContain("#42");
    expect(html).toContain("#42");
  });
});

describe("order tracking link", () => {
  const withUrl = {
    ...baseOrder,
    storefront_url: "http://localhost:8000",
    country_code: "pk",
  }

  it("links to the tracking page when a storefront URL is known", () => {
    const { html, text } = renderOrderPlacedEmail(withUrl)
    expect(html).toContain("http://localhost:8000/pk/order/track")
    expect(text).toContain("http://localhost:8000/pk/order/track")
  })

  it("tolerates a trailing slash on the storefront URL", () => {
    const { html } = renderOrderPlacedEmail({
      ...withUrl,
      storefront_url: "http://localhost:8000/",
    })
    expect(html).toContain("http://localhost:8000/pk/order/track")
    expect(html).not.toContain("8000//pk")
  })

  it("omits the link entirely rather than emitting a broken one", () => {
    const { html, text } = renderOrderPlacedEmail(baseOrder)
    expect(html).not.toContain("order/track")
    expect(text).not.toContain("order/track")
    expect(html).not.toContain("undefined")
  })
})
