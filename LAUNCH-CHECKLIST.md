# Launch checklist

Task 158. Everything that must be true before the shop is publicly reachable.

Items marked **BLOCKER** will visibly break something for a real customer.
Items marked *deferred* are known gaps carried from earlier blocks, listed here
so none of them is discovered by a customer first.

---

## 1. Content and identity

- [ ] **BLOCKER — Real WhatsApp number.** `NEXT_PUBLIC_WHATSAPP_NUMBER` is still
      the placeholder `923000000000`. It appears on the float button, the
      confirmation receipt, the contact page, the returns page and every "message
      us" link. The `Organization` structured data deliberately omits the contact
      point while it is a placeholder, so setting the real number also switches
      that on.
- [ ] **BLOCKER — `NEXT_PUBLIC_BASE_URL`** is `http://localhost:8000`. Canonical
      URLs, the sitemap, and every Open Graph image point at localhost, so a link
      shared on WhatsApp previews as broken.
- [ ] Real hero slides, promo banners and brand logos. The copy in
      `config/site.ts` is honest but marked PLACEHOLDER; swapping it needs no
      component changes.
- [ ] Read the policy pages as the shop owner and correct anything that is not
      true of how you actually work: `/about`, `/faq`,
      `/shipping-and-delivery`, `/returns-and-refunds`, `/privacy`, `/terms`.
- [ ] *deferred* — **Task 10: real product photography.** Every product currently
      carries generated placeholders from `static/placeholder/`. Replace them and
      delete the folder.

## 2. Catalogue

- [ ] *deferred* — **Task 8: the option sheet.** Option titles and values are
      load-bearing and unforgiving: `Colour` never `Colour`/`Color` mixed, `Red`
      never `red`, `128GB` never `128 GB`. A typo creates a phantom filter.
- [ ] *deferred* — **Task 9: the real category tree** and its globally unique
      handles. The four demo categories from `add-demo-categories.ts` carry no
      products and should be deleted.
- [ ] Remove demo data: `add-demo-collections.ts`, `seed-sale-prices.ts`
      ("Demo sale" price list), the 7 seeded reviews, and any test orders.

## 3. Shipping and money

- [ ] **BLOCKER — Zone rates match the current TCS / Leopards sheets.**
      `STANDARD_RATE` is Rs 250 and `EXPRESS_RATE` Rs 600 in
      `setup-shipping-options.ts`. These are placeholders.
- [ ] `config/policies.ts` in the storefront **mirrors** those rates and windows;
      it does not read them. Change one and change the other, or the shipping
      page will promise a price checkout does not charge.
- [ ] Confirm every city you actually deliver to has a geo zone. A city with no
      zone returns zero shipping options and dead-ends checkout — the delivery
      step handles it with a WhatsApp escape, but it is still a lost sale.

## 4. Operations — the part that is not code

- [ ] **BLOCKER — Confirmation-call script written**, and everyone who makes the
      call has read it. Every order is placed with
      `metadata.phone_verified = false`; the call is what changes that in
      practice.
- [ ] **BLOCKER — The dispatch point decided.** Who marks an order fulfilled,
      when, and with which courier. Nothing ships itself.
- [ ] Enter the **carrier name in `fulfillment.metadata.carrier`** and the
      tracking number on the label when booking. `/track` and the shipped email
      both read those, and both degrade to "we will send the tracking number
      soon" without them.
- [ ] Mark orders **delivered** in admin. Reviews are gated on a delivered order,
      so an order never marked delivered can never be reviewed.
- [ ] Review moderation: decide who approves, how quickly, and what gets
      rejected. Nothing reaches the storefront until someone approves it.

## 5. Technical

- [ ] `ADMIN_NOTIFICATION_EMAIL` and SMTP set in production. The contact form
      returns an honest "not available, use WhatsApp" if the address is missing.
- [ ] `BREVO_API_KEY` / `BREVO_LIST_ID` if the newsletter is wanted. Without
      them the form refuses rather than silently discarding sign-ups.
- [ ] Rotate `MEDUSA_ADMIN_PASSWORD` out of `kprime-backend/.env`. It is
      gitignored, but a shared test password is still a real password.
- [ ] Image storage: still local disk. **Medusa bakes absolute URLs into `image`
      rows at upload time**, so moving to S3/R2 after real photos are uploaded
      means re-uploading them. Decide before task 10.
- [ ] Analytics installed.
- [ ] Backup and rollback plan for the database.

## 6. Known gaps carried into launch

- **Cache revalidation.** Nothing calls `revalidateReviews()` from the backend,
  and no webhook revalidates the `products` tag. An approved review or an admin
  price change is invisible to listings until the hourly revalidation turns over.
  Repeatedly observed during development: clearing `.next` was the only reliable
  fix.
- **`/track` rate limiting is per-process, in memory.** Fine on one instance;
  behind two it must move to Redis, which the project already runs.
- **Lighthouse (task 151) and real-device testing (task 152) have not been run.**
  Both need a browser and a physical mid-range Android on a real network.
- **Playwright smoke tests (task 157)** are written but the dependency is not
  installed.

## 7. The final test

Place a real order as a customer, on a phone, on mobile data. Take the
confirmation call yourself. Dispatch it. Track it. If that works end to end,
launch.
