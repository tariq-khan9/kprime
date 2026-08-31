import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { provinceName } from "../../../lib/provinces";

/**
 * The cities KPrime delivers to, grouped by province.
 *
 *   GET /store/shipping-cities
 *
 * Checkout's city field is a dropdown, never free text. Geo-zone matching is on
 * the exact city string, so a typed "pindi" returns zero shipping options and
 * dead-ends the order with no error to explain it.
 *
 * The list is read back out of the delivery zones rather than kept in the
 * storefront, so the zones stay the single source of truth: move a city between
 * tiers and checkout follows with no storefront change.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fulfillment = req.scope.resolve(Modules.FULFILLMENT);

  // Only city-type zones. A country- or province-type zone has a null `city`
  // and would otherwise put a blank entry in the dropdown.
  const geoZones = await fulfillment.listGeoZones({ type: "city" });

  const byProvince = new Map<string, Set<string>>();

  for (const zone of geoZones) {
    if (!zone.city || !zone.province_code) {
      continue;
    }

    const cities = byProvince.get(zone.province_code) ?? new Set<string>();
    // A Set because the same city can legitimately appear more than once if it
    // is ever served by two zones; the dropdown must still list it once.
    cities.add(zone.city);
    byProvince.set(zone.province_code, cities);
  }

  const provinces = Array.from(byProvince, ([code, cities]) => ({
    code,
    name: provinceName(code),
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
  })).sort((a, b) => a.name.localeCompare(b.name));

  return res.json({ provinces });
}
