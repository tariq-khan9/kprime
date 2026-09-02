import { AnnouncementBar } from "@/components/layout/AnnouncementBar"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { TrustStrip } from "@/components/layout/TrustStrip"
import { WhatsAppFloatButton } from "@/components/layout/WhatsAppFloatButton"
import { CartDrawer } from "@/components/page/cart/CartDrawer"
import { ToastProvider } from "@/components/ui/Toast"
import { getCategoryTree } from "@/lib/data/categories"

/**
 * The shop shell — every page except checkout, which is deliberately stripped.
 *
 * The parentheses mean `(shop)` never appears in a URL: a page at
 * `app/(shop)/cart/page.tsx` serves `/cart`.
 *
 * The tree is fetched once here rather than in each page. It is cached, so this
 * costs one backend call for the whole app, and both Header and Footer read the
 * same data — a page cannot accidentally render navigation that disagrees with
 * the footer.
 *
 * MobileNav is not listed separately: it lives inside Header, which owns the
 * breakpoint decision about which navigation is showing.
 */
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const tree = await getCategoryTree()

  return (
    // ToastProvider wraps the shell so any page below can fire one — the
    // newsletter form today, add-to-cart in task 94. Children stay server
    // components; only the provider itself is client.
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-paper">
        <AnnouncementBar />
        <Header tree={tree} />

      {/*
        Deliberately NOT wrapped in Container.

        The build sequence has full-bleed sections inside the main column — the
        hero carousel (task 50), promo banners, and rails that must run to the
        viewport edge on mobile. A Container here would force every one of them
        to escape with negative margins. Pages apply Container per section
        instead, which is why AnnouncementBar and TrustStrip constrain their own
        text rather than relying on an outer wrapper.
      */}
        <main className="flex-1">{children}</main>

        <TrustStrip />
        <Footer tree={tree} />
        <WhatsAppFloatButton />
      </div>
          {/* Mounted once for the whole shop: any add-to-cart below can open
          it, wherever it sits. */}
      <CartDrawer />

    </ToastProvider>
  )
}
