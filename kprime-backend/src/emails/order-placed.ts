/**
 * Order confirmation email.
 *
 * Lives outside src/subscribers because Medusa scans that directory for
 * subscriber files and would try to register this as one.
 *
 * Deliberately plain HTML with inline styles: email clients strip <style>
 * blocks and support almost no modern CSS, so a table layout with inline
 * attributes is the thing that actually renders in Gmail and Outlook.
 */

import {
  escapeHtml,
  formatAddress,
  money,
  type OrderEmailAddress,
  type OrderEmailAmount,
} from "./format";

export type { OrderEmailAddress, OrderEmailAmount };

export type OrderEmailItem = {
  title?: string | null;
  variant_title?: string | null;
  quantity?: number | string | null;
  total?: OrderEmailAmount;
};

export type OrderEmailInput = {
  /** query.graph types this as a string even though it reads as a number. */
  display_id?: string | number | null;
  email?: string | null;
  currency_code?: string | null;
  /** query.graph allows null entries in the list, so they are filtered on read. */
  items?: (OrderEmailItem | null)[] | null;
  shipping_address?: OrderEmailAddress | null;
  subtotal?: OrderEmailAmount;
  shipping_total?: OrderEmailAmount;
  tax_total?: OrderEmailAmount;
  discount_total?: OrderEmailAmount;
  total?: OrderEmailAmount;
  /**
   * Storefront origin, e.g. http://localhost:8000. Used to build the order
   * tracking link. Omitted rather than guessed if unset — a broken link in a
   * confirmation email is worse than no link.
   */
  storefront_url?: string | null;
  /** Region prefix in storefront URLs. */
  country_code?: string | null;
};

export const renderOrderPlacedEmail = (order: OrderEmailInput) => {
  const currency = order.currency_code ?? "pkr";
  const orderNumber = order.display_id ?? "—";
  const items = (order.items ?? []).filter(
    (item): item is OrderEmailItem => Boolean(item)
  );
  const address = formatAddress(order.shipping_address);

  // Most buyers check out as guests and have no account to log into, so the
  // tracking link is their only route back to this order.
  const trackingUrl = order.storefront_url
    ? `${order.storefront_url.replace(/\/$/, "")}/${
        order.country_code ?? "pk"
      }/order/track`
    : null;

  const subject = `KPrime order #${orderNumber} confirmed — pay ${money(
    order.total,
    currency
  )} on delivery`;

  const itemRows = items
    .map((item) => {
      const name = [item.title, item.variant_title]
        .filter(Boolean)
        .join(" — ");
      return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(
    name
  )}<br><span style="color:#666;font-size:13px;">Qty ${item.quantity ?? 0}</span></td>
  <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${money(
    item.total,
    currency
  )}</td>
</tr>`;
    })
    .join("\n");

  const totalRow = (label: string, amount: OrderEmailAmount, bold = false) => {
    if (amount === null || amount === undefined) {
      return "";
    }
    const weight = bold ? "font-weight:600;" : "";
    return `<tr>
  <td style="padding:4px 0;${weight}">${escapeHtml(label)}</td>
  <td style="padding:4px 0;text-align:right;white-space:nowrap;${weight}">${money(
    amount,
    currency
  )}</td>
</tr>`;
  };

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;">
    <tr><td>
      <h1 style="margin:0 0 4px;font-size:20px;">Thanks for your order</h1>
      <p style="margin:0 0 20px;color:#555;font-size:14px;">
        Order <strong>#${orderNumber}</strong> is confirmed. We will contact you to arrange delivery.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        ${itemRows}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
        ${totalRow("Subtotal", order.subtotal)}
        ${order.discount_total ? totalRow("Discount", -Number(order.discount_total)) : ""}
        ${totalRow("Shipping", order.shipping_total)}
        ${order.tax_total ? totalRow("Tax", order.tax_total) : ""}
        ${totalRow("Total", order.total, true)}
      </table>

      <div style="margin-top:20px;padding:12px;background:#f3f7ff;border-radius:6px;font-size:14px;">
        <strong>Cash on Delivery.</strong> Please keep
        <strong>${money(order.total, currency)}</strong> ready for the courier.
      </div>

      ${
        address
          ? `<div style="margin-top:20px;font-size:14px;">
        <div style="color:#666;margin-bottom:4px;">Delivering to</div>
        <div style="white-space:pre-line;">${escapeHtml(address)}</div>
      </div>`
          : ""
      }

      ${
        trackingUrl
          ? `<div style="margin-top:20px;font-size:14px;">
        <a href="${trackingUrl}" style="color:#3b82f6;">Track this order</a>
        <span style="color:#666;"> — order #${orderNumber} and this email address are all you need.</span>
      </div>`
          : ""
      }

      <p style="margin:24px 0 0;color:#888;font-size:12px;">
        Karkhano Prime — replies to this email reach our team.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Thanks for your order`,
    ``,
    `Order #${orderNumber} is confirmed. We will contact you to arrange delivery.`,
    ``,
    ...items.map((item) => {
      const name = [item.title, item.variant_title].filter(Boolean).join(" — ");
      return `  ${name} x${item.quantity ?? 0}  ${money(item.total, currency)}`;
    }),
    ``,
    `Subtotal: ${money(order.subtotal, currency)}`,
    ...(order.discount_total
      ? [`Discount: -${money(order.discount_total, currency)}`]
      : []),
    `Shipping: ${money(order.shipping_total, currency)}`,
    ...(order.tax_total ? [`Tax: ${money(order.tax_total, currency)}`] : []),
    `Total: ${money(order.total, currency)}`,
    ``,
    `Cash on Delivery — please keep ${money(
      order.total,
      currency
    )} ready for the courier.`,
    ...(address ? [``, `Delivering to:`, address] : []),
    ...(trackingUrl
      ? [
          ``,
          `Track this order: ${trackingUrl}`,
          `You need only order #${orderNumber} and this email address.`,
        ]
      : []),
    ``,
    `Karkhano Prime`,
  ].join("\n");

  return { subject, html, text };
};
