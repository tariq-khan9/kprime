import {
  escapeHtml,
  formatAddress,
  money,
  type OrderEmailAmount,
  type OrderEmailAddress,
} from "./format";

/**
 * Order notification for the shop owner.
 *
 * Deliberately different from the customer email: this one is operational. It
 * leads with what is needed to actually fulfil the order — how much cash to
 * collect, where it goes, and a phone number to call — rather than thanking
 * anyone. SKUs are included because they are what you pick stock by.
 */

export type AdminOrderEmailItem = {
  title?: string | null;
  variant_title?: string | null;
  variant_sku?: string | null;
  quantity?: number | string | null;
  total?: OrderEmailAmount;
};

export type AdminOrderEmailInput = {
  id?: string | null;
  display_id?: string | number | null;
  email?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  currency_code?: string | null;
  items?: (AdminOrderEmailItem | null)[] | null;
  shipping_address?: OrderEmailAddress | null;
  shipping_methods?: ({ name?: string | null } | null)[] | null;
  subtotal?: OrderEmailAmount;
  shipping_total?: OrderEmailAmount;
  discount_total?: OrderEmailAmount;
  total?: OrderEmailAmount;
  /** Backend origin, used to link straight to the order in the admin. */
  admin_url?: string | null;
};

export type AdminOrderEvent = "placed" | "canceled";

export const renderAdminOrderEmail = (
  order: AdminOrderEmailInput,
  event: AdminOrderEvent
) => {
  const currency = order.currency_code ?? "pkr";
  const orderNumber = order.display_id ?? "—";
  const items = (order.items ?? []).filter(
    (item): item is AdminOrderEmailItem => Boolean(item)
  );
  const address = formatAddress(order.shipping_address);
  const phone = order.shipping_address?.phone ?? "";
  const shippingMethod = (order.shipping_methods ?? []).filter(Boolean)[0]?.name;

  const adminLink =
    order.admin_url && order.id
      ? `${order.admin_url.replace(/\/$/, "")}/app/orders/${order.id}`
      : null;

  const placed = event === "placed";

  const subject = placed
    ? `New order #${orderNumber} — ${money(order.total, currency)} to collect`
    : `Order #${orderNumber} cancelled — ${money(order.total, currency)}`;

  const itemRows = items
    .map((item) => {
      const name = [item.title, item.variant_title].filter(Boolean).join(" — ");
      const sku = item.variant_sku ? ` (${item.variant_sku})` : "";
      return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(
    name
  )}<span style="color:#888;font-size:12px;">${escapeHtml(sku)}</span><br>
    <span style="color:#666;font-size:13px;">Qty ${item.quantity ?? 0}</span></td>
  <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${money(
    item.total,
    currency
  )}</td>
</tr>`;
    })
    .join("\n");

  const banner = placed
    ? `<div style="padding:12px;background:#ecfdf5;border-left:4px solid #10b981;font-size:15px;">
        <strong>Collect ${money(
          order.total,
          currency
        )} in cash on delivery.</strong>
      </div>`
    : `<div style="padding:12px;background:#fef2f2;border-left:4px solid #ef4444;font-size:15px;">
        <strong>This order was cancelled.</strong> Do not dispatch it. If it has
        already gone out, contact the courier.
      </div>`;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;">
    <tr><td>
      <h1 style="margin:0 0 4px;font-size:20px;">
        ${placed ? "New order" : "Order cancelled"} #${orderNumber}
      </h1>
      <p style="margin:0 0 16px;color:#555;font-size:13px;">
        ${order.created_at ? new Date(order.created_at).toUTCString() : ""}
      </p>

      ${banner}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:14px;">
        ${itemRows}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
        <tr><td style="padding:4px 0;">Subtotal</td><td style="padding:4px 0;text-align:right;">${money(
          order.subtotal,
          currency
        )}</td></tr>
        <tr><td style="padding:4px 0;">Shipping${
          shippingMethod ? ` (${escapeHtml(shippingMethod)})` : ""
        }</td><td style="padding:4px 0;text-align:right;">${money(
          order.shipping_total,
          currency
        )}</td></tr>
        ${
          Number(order.discount_total ?? 0) > 0
            ? `<tr><td style="padding:4px 0;">Discount</td><td style="padding:4px 0;text-align:right;">-${money(
                order.discount_total,
                currency
              )}</td></tr>`
            : ""
        }
        <tr><td style="padding:4px 0;font-weight:600;">Total</td><td style="padding:4px 0;text-align:right;font-weight:600;">${money(
          order.total,
          currency
        )}</td></tr>
      </table>

      <div style="margin-top:20px;font-size:14px;">
        <div style="color:#666;margin-bottom:4px;">Deliver to</div>
        <div style="white-space:pre-line;">${escapeHtml(address)}</div>
        ${
          phone
            ? `<div style="margin-top:8px;"><a href="tel:${escapeHtml(
                phone
              )}" style="color:#3b82f6;">${escapeHtml(phone)}</a></div>`
            : ""
        }
        ${
          order.email
            ? `<div style="margin-top:4px;color:#666;">${escapeHtml(
                order.email
              )}</div>`
            : ""
        }
      </div>

      ${
        adminLink
          ? `<p style="margin:24px 0 0;font-size:14px;">
        <a href="${adminLink}" style="color:#3b82f6;">Open this order in the admin</a>
      </p>`
          : ""
      }
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${placed ? "New order" : "Order cancelled"} #${orderNumber}`,
    ``,
    placed
      ? `Collect ${money(order.total, currency)} in cash on delivery.`
      : `This order was cancelled. Do not dispatch it.`,
    ``,
    ...items.map((item) => {
      const name = [item.title, item.variant_title].filter(Boolean).join(" — ");
      const sku = item.variant_sku ? ` (${item.variant_sku})` : "";
      return `  ${name}${sku} x${item.quantity ?? 0}  ${money(
        item.total,
        currency
      )}`;
    }),
    ``,
    `Subtotal: ${money(order.subtotal, currency)}`,
    `Shipping: ${money(order.shipping_total, currency)}${
      shippingMethod ? ` (${shippingMethod})` : ""
    }`,
    ...(Number(order.discount_total ?? 0) > 0
      ? [`Discount: -${money(order.discount_total, currency)}`]
      : []),
    `Total: ${money(order.total, currency)}`,
    ``,
    `Deliver to:`,
    address,
    ...(phone ? [`Phone: ${phone}`] : []),
    ...(order.email ? [`Email: ${order.email}`] : []),
    ...(adminLink ? [``, `Open in admin: ${adminLink}`] : []),
  ].join("\n");

  return { subject, html, text };
};
