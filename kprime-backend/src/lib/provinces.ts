/**
 * Pakistan's provinces, keyed by lower-case ISO 3166-2 subdivision code — the
 * part after the hyphen, matching how Medusa stores `geo_zone.province_code`
 * ("AB" for Alberta, not "CA-AB").
 *
 * Shared deliberately. The zone setup script writes these codes onto geo zones
 * and /store/shipping-cities reads them back to label the checkout dropdown; two
 * copies would eventually disagree, and the symptom would be a province heading
 * that does not match the cities under it.
 */
export const PROVINCES = {
  kp: "Khyber Pakhtunkhwa",
  pb: "Punjab",
  sd: "Sindh",
  ba: "Balochistan",
  is: "Islamabad Capital Territory",
  gb: "Gilgit-Baltistan",
  jk: "Azad Jammu & Kashmir",
} as const;

export type ProvinceCode = keyof typeof PROVINCES;

/**
 * Display name for a code, falling back to the code itself.
 *
 * A city carrying a code that is not in the map still reaches the dropdown. A
 * shopper seeing "gb" as a heading is bad; a city nobody can select is worse,
 * because it silently removes a delivery destination with no error anywhere.
 */
export function provinceName(code: string): string {
  return PROVINCES[code as ProvinceCode] ?? code;
}
