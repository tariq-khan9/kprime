"use client"

import { useState } from "react"

import { Select } from "@/components/ui/Select"
import type { Province } from "@/lib/data/shipping"

export type ProvinceCitySelectProps = {
  provinces: Province[]
  defaultProvince?: string | null
  defaultCity?: string | null
  provinceError?: string
  cityError?: string
}

/**
 * Dependent province and city dropdowns.
 *
 * ⚠️ **The city is a dropdown and must never become a text input (§5.1).**
 * Shipping options resolve by matching the city string against a geo zone
 * exactly. A typed "pindi", "Rawalpindi " or "rawalpindi" matches nothing, and
 * Medusa answers with an empty option list rather than an error — so checkout
 * dead-ends at the delivery step with no explanation and no way forward. The
 * only strings that can reach the cart are ones that came from a zone.
 *
 * Both are native `<select>`s: on a phone that opens the OS picker, which
 * handles 30 cities better than any custom listbox at 360px.
 *
 * Changing province clears the city. Keeping a Punjab city selected under
 * Sindh would submit a combination that matches no zone — the same dead end,
 * reached a different way.
 */
export function ProvinceCitySelect({
  provinces,
  defaultProvince,
  defaultCity,
  provinceError,
  cityError,
}: ProvinceCitySelectProps) {
  const [province, setProvince] = useState(defaultProvince ?? "")
  const [city, setCity] = useState(defaultCity ?? "")

  const cities =
    provinces.find((entry) => entry.code === province)?.cities ?? []

  return (
    <>
      <Select
        name="province"
        label="Province"
        required
        placeholder="Choose a province"
        value={province}
        error={provinceError}
        onChange={(event) => {
          setProvince(event.target.value)
          // Cleared, not preserved: a city from the previous province would
          // match no geo zone under the new one.
          setCity("")
        }}
        options={provinces.map((entry) => ({
          value: entry.code,
          label: entry.name,
        }))}
      />

      <Select
        name="city"
        label="City"
        required
        // Disabled rather than hidden, so the field is visibly waiting on the
        // province instead of appearing from nowhere.
        disabled={!province}
        placeholder={province ? "Choose a city" : "Choose a province first"}
        value={city}
        error={cityError}
        onChange={(event) => setCity(event.target.value)}
        hint={
          province && cities.length === 0
            ? "We do not deliver to this province yet."
            : undefined
        }
        options={cities.map((name) => ({ value: name, label: name }))}
      />
    </>
  )
}
