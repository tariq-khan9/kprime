import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { OTHER, PROVINCES, ProvinceCode } from "../lib/provinces";

/**
 * Task 5 — the four delivery price tiers.
 *
 * Run with: npx medusa exec ./src/scripts/setup-shipping-zones.ts
 *
 * This is a script rather than admin clicking because the admin dashboard cannot
 * express what the tiers need. Its service-zone screens only ever emit
 * `type: "country"`; the API and the `geo_zone` table both support cities, the UI
 * does not. Everything else in Block A stays admin-authoritative — zones are the
 * documented exception.
 *
 * Zones are PRICE TIERS, not cities. `Metro` is one zone holding ten cities, not
 * ten zones. `Outside Pakistan` is the fifth, covering the whole "Other" province
 * rather than listed cities. Task 6 attaches one Standard and one Express option
 * per zone.
 *
 * Idempotent, and safe to re-run after task 6: a zone that already exists has its
 * cities replaced in place, so the shipping options hanging off it survive. Only
 * zones that are not one of the four below are deleted outright — and their
 * options with them, because the options are foreign-keyed to the zone.
 */

/** Dispatch origin. `Local` is built around this. */
const ORIGIN_CITY = "Peshawar";

const COUNTRY = "pk";

type ZoneSpec = {
  name: string;
  /** Why this tier exists — printed on run so the tiering is reviewable. */
  rationale: string;
  cities: [ProvinceCode, string][];
  /**
   * Whole provinces, matched on province code alone, so any city typed at
   * checkout still resolves to this zone. Only for "Other", where there is no
   * list to choose from.
   */
  provinces?: ProvinceCode[];
};

/**
 * PROVISIONAL — tier placement only, no prices.
 *
 * Neither TCS nor Leopards publishes a city-to-zone list; both are per-account
 * and negotiated. What is public is the tier structure, and the two agree:
 * Leopards bills Same City / Same Province / Cross Province / Remote, TCS bills
 * within-city / intercity / remote with a PKR 100-150 remote surcharge, and both
 * treat Gilgit-Baltistan, interior Balochistan and the mountain districts as
 * remote.
 *
 * Correct this against the real rate sheets before task 6 attaches money to it.
 * Where TCS and Leopards disagree on a city, put it in the DEARER tier — quoting
 * under your own cost is the one error that is expensive per order.
 *
 * City spelling is load-bearing. Geo-zone matching is on the exact string, and
 * task 11 reads these back to populate the checkout dropdown, so a city spelled
 * two ways here becomes two entries a shopper can pick between, one of which
 * silently returns no shipping options. Title Case, one spelling each.
 */
const ZONES: ZoneSpec[] = [
  {
    name: "Local",
    rationale: `${ORIGIN_CITY} and the towns reachable on the same local run`,
    cities: [
      ["kp", "Peshawar"],
      ["kp", "Nowshera"],
      ["kp", "Charsadda"],
      ["kp", "Mardan"],
      ["kp", "Risalpur"],
    ],
  },
  {
    name: "Metro",
    rationale: "high-volume destinations both couriers serve daily",
    cities: [
      ["is", "Islamabad"],
      ["pb", "Rawalpindi"],
      ["pb", "Lahore"],
      ["pb", "Faisalabad"],
      ["pb", "Multan"],
      ["pb", "Gujranwala"],
      ["pb", "Sialkot"],
      ["sd", "Karachi"],
      ["sd", "Hyderabad"],
      ["ba", "Quetta"],
    ],
  },
  {
    name: "Other cities",
    rationale: "served on standard intercity rates, lower volume",
    cities: [
      ["kp", "Abbottabad"],
      ["kp", "Mansehra"],
      ["kp", "Swabi"],
      ["kp", "Kohat"],
      ["kp", "Dera Ismail Khan"],
      ["kp", "Mingora"],
      ["kp", "Haripur"],
      ["kp", "Bannu"],
      ["kp", "Karak"],
      ["kp", "Lakki Marwat"],
      ["kp", "Hangu"],
      ["kp", "Tank"],
      ["kp", "Timergara"],
      ["kp", "Batkhela"],
      ["kp", "Batagram"],
      ["kp", "Topi"],
      ["pb", "Sargodha"],
      ["pb", "Bahawalpur"],
      ["pb", "Rahim Yar Khan"],
      ["pb", "Sahiwal"],
      ["pb", "Okara"],
      ["pb", "Jhelum"],
      ["pb", "Gujrat"],
      ["pb", "Kasur"],
      ["pb", "Sheikhupura"],
      ["pb", "Dera Ghazi Khan"],
      ["pb", "Chiniot"],
      ["pb", "Jhang"],
      ["pb", "Attock"],
      ["pb", "Chakwal"],
      ["pb", "Vehari"],
      ["pb", "Wah Cantt"],
      ["pb", "Taxila"],
      ["pb", "Hafizabad"],
      ["pb", "Mandi Bahauddin"],
      ["pb", "Narowal"],
      ["pb", "Muzaffargarh"],
      ["pb", "Khanewal"],
      ["pb", "Pakpattan"],
      ["pb", "Toba Tek Singh"],
      ["pb", "Bahawalnagar"],
      ["pb", "Khushab"],
      ["pb", "Mianwali"],
      ["pb", "Bhakkar"],
      ["pb", "Layyah"],
      ["pb", "Lodhran"],
      ["pb", "Nankana Sahib"],
      ["pb", "Rajanpur"],
      ["pb", "Kamoke"],
      ["pb", "Daska"],
      ["pb", "Murree"],
      ["pb", "Gojra"],
      ["pb", "Burewala"],
      ["pb", "Sadiqabad"],
      ["pb", "Kharian"],
      ["pb", "Wazirabad"],
      ["pb", "Pattoki"],
      ["pb", "Hasilpur"],
      ["pb", "Khanpur"],
      ["pb", "Jaranwala"],
      ["pb", "Kot Addu"],
      ["pb", "Talagang"],
      ["sd", "Sukkur"],
      ["sd", "Larkana"],
      ["sd", "Nawabshah"],
      ["sd", "Mirpur Khas"],
      ["sd", "Jacobabad"],
      ["sd", "Shikarpur"],
      ["sd", "Khairpur"],
      ["sd", "Dadu"],
      ["sd", "Thatta"],
      ["sd", "Badin"],
      ["sd", "Sanghar"],
      ["sd", "Tando Adam"],
      ["sd", "Tando Allahyar"],
      ["sd", "Tando Muhammad Khan"],
      ["sd", "Kotri"],
      ["sd", "Ghotki"],
      ["sd", "Umerkot"],
      ["sd", "Matiari"],
      ["sd", "Kandhkot"],
      ["sd", "Jamshoro"],
      ["sd", "Naushahro Feroze"],
      ["sd", "Qambar"],
      ["ba", "Hub"],
      ["jk", "Mirpur"],
      ["jk", "Muzaffarabad"],
      ["jk", "Kotli"],
      ["jk", "Bhimber"],
      ["jk", "Rawalakot"],
      ["jk", "Bagh"],
    ],
  },
  {
    name: "Remote",
    rationale: "surcharged or limited service — no Express here in task 6",
    cities: [
      ["gb", "Gilgit"],
      ["gb", "Skardu"],
      ["gb", "Hunza"],
      ["gb", "Chilas"],
      ["gb", "Khaplu"],
      ["gb", "Astore"],
      ["gb", "Gahkuch"],
      ["kp", "Chitral"],
      ["kp", "Parachinar"],
      ["kp", "Wana"],
      ["kp", "Miranshah"],
      ["kp", "Khar"],
      ["kp", "Dir"],
      ["kp", "Besham"],
      ["kp", "Kalam"],
      ["sd", "Mithi"],
      ["ba", "Gwadar"],
      ["ba", "Turbat"],
      ["ba", "Khuzdar"],
      ["ba", "Zhob"],
      ["ba", "Panjgur"],
      ["ba", "Sibi"],
      ["ba", "Chaman"],
      ["ba", "Loralai"],
      ["ba", "Dera Murad Jamali"],
      ["ba", "Nushki"],
      ["ba", "Kalat"],
      ["ba", "Mastung"],
      ["ba", "Pishin"],
      ["ba", "Kharan"],
      ["ba", "Dalbandin"],
      ["ba", "Pasni"],
      ["ba", "Ormara"],
      // A town not listed above. Billed at the dearest tier because it could be
      // anywhere in the province; the verification call settles the rest.
      ["kp", OTHER],
      ["pb", OTHER],
      ["sd", OTHER],
      ["ba", OTHER],
      ["gb", OTHER],
      ["jk", OTHER],
    ],
  },
  {
    name: "Outside Pakistan",
    rationale: "rare orders from abroad — no courier rate, charges agreed on the call",
    cities: [],
    provinces: ["ot"],
  },
];

const FULFILLMENT_SET_NAME = "Delivery";
const STOCK_LOCATION_NAME = `${ORIGIN_CITY} Warehouse`;

export default async function setupShippingZones({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const stockLocation = container.resolve(Modules.STOCK_LOCATION);

  // A city in two tiers would be billed at whichever zone Medusa matched first.
  // Cheaper to fail here than to find out from a month of underpriced orders.
  // Keyed on province too: "Other" legitimately appears once per province, and
  // Medusa matches geo zones on province_code as well as the city string.
  const seen = new Map<string, string>();
  for (const zone of ZONES) {
    for (const [province, city] of zone.cities) {
      const key = `${province}/${city}`;
      const existing = seen.get(key);
      if (existing) {
        throw new Error(
          `"${key}" is in both "${existing}" and "${zone.name}". ` +
            `Every city belongs to exactly one tier.`
        );
      }
      seen.set(key, zone.name);
    }
  }

  // ---- Stock location -----------------------------------------------------
  // The seed put this in Karachi; dispatch is actually from Peshawar, and the
  // Local tier is built around the origin. Also feeds delivery-estimate copy.
  const [location] = await stockLocation.listStockLocations({}, { take: 1 });

  if (location && location.name !== STOCK_LOCATION_NAME) {
    await stockLocation.updateStockLocations(location.id, {
      name: STOCK_LOCATION_NAME,
      address: {
        city: ORIGIN_CITY,
        country_code: COUNTRY.toUpperCase(),
        address_1: "",
      },
    });
    logger.info(`Stock location: "${location.name}" -> "${STOCK_LOCATION_NAME}"`);
  }

  // ---- Fulfillment set ----------------------------------------------------
  const [set] = await fulfillment.listFulfillmentSets(
    {},
    { relations: ["service_zones"], take: 1 }
  );

  if (!set) {
    throw new Error(
      "No fulfillment set found. Run `pnpm seed` first — this script reshapes " +
        "an existing set, it does not create the store from nothing."
    );
  }

  if (set.name !== FULFILLMENT_SET_NAME) {
    // Takes one DTO carrying its own id — unlike updateServiceZones, which is
    // (id, data). Passing (id, data) here fails with an empty "does not exists".
    await fulfillment.updateFulfillmentSets({
      id: set.id,
      name: FULFILLMENT_SET_NAME,
    });
    logger.info(`Fulfillment set: "${set.name}" -> "${FULFILLMENT_SET_NAME}"`);
  }

  const wanted = new Set(ZONES.map((z) => z.name));
  const existingZones = set.service_zones ?? [];
  const byName = new Map(existingZones.map((z) => [z.name, z]));

  // ---- Drop zones that are not one of the tiers ----------------------------
  // On a first run this is the seeded country-wide "Pakistan" zone. Its shipping
  // options must go first: they are foreign-keyed to the zone, so the delete
  // fails while they exist. Task 6 recreates options per zone — until it runs,
  // the store has NO shipping options at all. Do 5 and 6 in one sitting.
  for (const zone of existingZones) {
    if (wanted.has(zone.name)) {
      continue;
    }

    // Filtered through the relation, not a service_zone_id column. The flat form
    // works at runtime but does not typecheck, so it breaks `medusa build`.
    const options = await fulfillment.listShippingOptions({
      service_zone: { id: zone.id },
    });

    if (options.length) {
      await fulfillment.deleteShippingOptions(options.map((o) => o.id));
      logger.warn(
        `Deleted ${options.length} shipping option(s) on "${zone.name}": ` +
          options.map((o) => o.name).join(", ") +
          " — task 6 recreates these per zone."
      );
    }

    await fulfillment.deleteServiceZones(zone.id);
    logger.info(`Removed service zone "${zone.name}"`);
  }

  // ---- Create or update the tiers ------------------------------------
  for (const spec of ZONES) {
    const geo_zones = [
      ...spec.cities.map(([province_code, city]) => ({
        type: "city" as const,
        country_code: COUNTRY,
        province_code,
        city,
      })),
      ...(spec.provinces ?? []).map((province_code) => ({
        type: "province" as const,
        country_code: COUNTRY,
        province_code,
      })),
    ];

    const existing = byName.get(spec.name);

    if (existing) {
      // Replace the cities in place. Keeping the zone id is what lets task 6's
      // shipping options survive a re-run after the list is corrected.
      await fulfillment.updateServiceZones(existing.id, { geo_zones });
      logger.info(
        `Updated "${spec.name}" — ${geo_zones.length} cities (${spec.rationale})`
      );
    } else {
      await fulfillment.createServiceZones({
        name: spec.name,
        fulfillment_set_id: set.id,
        geo_zones,
      });
      logger.info(
        `Created "${spec.name}" — ${geo_zones.length} cities (${spec.rationale})`
      );
    }
  }

  const total = ZONES.reduce((n, z) => n + z.cities.length, 0);
  logger.info(
    `Done. ${ZONES.length} zones, ${total} cities across ` +
      `${Object.keys(PROVINCES).length} provinces.`
  );
  logger.info(
    "Tier placement is provisional — check it against the TCS and Leopards " +
      "rate sheets before task 6 prices anything."
  );
}
