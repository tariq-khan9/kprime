/**
 * Shared formatting for order emails.
 *
 * Extracted so the customer and admin templates cannot drift — particularly
 * `money`, where a regression puts a wrong number in front of a customer or has
 * the shop owner collecting the wrong amount at the door.
 */

/** Postgres numerics arrive as strings, so every money field accepts both. */
export type OrderEmailAmount = number | string | null | undefined;

export type OrderEmailAddress = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  phone?: string | null;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const money = (amount: OrderEmailAmount, currency: string) => {
  // Postgres returns numeric columns as high-precision strings, so an order
  // total arrives as "5000.0000000000000000". Calling toLocaleString on that
  // string is a no-op and the raw value ends up in the customer's email.
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) {
    return `${currency.toUpperCase()} 0`;
  }
  // PKR is stored in whole rupees, so no minor-unit division here. Revisit if a
  // currency with subunits is ever added.
  return `${currency.toUpperCase()} ${value.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
};

export const formatAddress = (address?: OrderEmailAddress | null) => {
  if (!address) {
    return "";
  }
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const lines = [
    name,
    address.address_1,
    address.address_2,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.country_code?.toUpperCase(),
    address.phone,
  ].filter((line): line is string => Boolean(line && line.trim()));
  return lines.join("\n");
};
