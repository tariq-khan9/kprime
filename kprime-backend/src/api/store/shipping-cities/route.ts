import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { OTHER, provinceName } from "../../../lib/provinces";

const otherLast = (a: string, b: string) =>
  Number(a === OTHER) - Number(b === OTHER) || a.localeCompare(b);

/**
 * The cities KPrime delivers to, grouped by province.
 *
 *   GET /store/shipping-cities
 *
 * Checkout's city field is a dropdown, never free text. Geo-zone matching is on
 * the exact city string, so a typed "pindi" returns zero shipping options and
 * dead-ends the order with no error to explain it.
 *
 * The one exception is a province covered by a province-type zone ("Other").
 * That zone matches on province code alone, so any typed city resolves, and
 * the province comes back with `any_city: true` and no city list.
 *
 * The list is read back out of the delivery zones rather than kept in the
 * storefront, so the zones stay the single source of truth: move a city between
 * tiers and checkout follows with no storefront change.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fulfillment = req.scope.resolve(Modules.FULFILLMENT);

  // Country-type zones are left out: a null `city` would otherwise put a blank
  // entry in the dropdown.
  const geoZones = await fulfillment.listGeoZones({
    type: ["city", "province"],
  });

  const byProvince = new Map<string, Set<string>>();
  const anyCity = new Set<string>();

  for (const zone of geoZones) {
    if (!zone.province_code) {
      continue;
    }

    if (zone.type === "province") {
      anyCity.add(zone.province_code);
      continue;
    }

    if (!zone.city) {
      continue;
    }

    const cities = byProvince.get(zone.province_code) ?? new Set<string>();
    // A Set because the same city can legitimately appear more than once if it
    // is ever served by two zones; the dropdown must still list it once.
    cities.add(zone.city);
    byProvince.set(zone.province_code, cities);
  }

  const codes = new Set([...byProvince.keys(), ...anyCity]);

  const provinces = Array.from(codes, (code) => ({
    code,
    name: provinceName(code),
    any_city: anyCity.has(code),
    cities: anyCity.has(code)
      ? []
      : Array.from(byProvince.get(code) ?? []).sort(otherLast),
  })).sort((a, b) => otherLast(a.name, b.name));

  return res.json({ provinces });
}
