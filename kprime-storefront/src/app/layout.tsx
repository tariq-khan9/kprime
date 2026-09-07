import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

import { BASE_URL, SITE } from "@/config/site";

// One family for everything, including the logo lockup — hierarchy comes from
// size and weight, not a second face (plan §2.3).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const DESCRIPTION =
  "Electronics, cosmetics, kitchenware and bedding delivered across Pakistan. Cash on delivery.";

/**
 * Site-wide metadata.
 *
 * `metadataBase` is what turns every relative OG image path in the app into an
 * absolute URL. Without it, social previews silently fall back to no image —
 * and WhatsApp is the dominant sharing channel for this shop, so a missing
 * preview is a real cost rather than a cosmetic one.
 *
 * The title template lets each page set only its own name: "Cart" becomes
 * "Cart · Karkhano Prime" without every page repeating the suffix. The home
 * page uses `default`, which is not templated.
 */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE.name} — Cash on delivery across Pakistan`,
    template: `%s · ${SITE.name}`,
  },
  description: DESCRIPTION,
  applicationName: SITE.name,
  /**
   * **No `alternates` here on purpose.**
   *
   * This used to be `alternates: { canonical: "/" }` with a comment claiming
   * each page defaulted to its own path. Next does not work that way — it takes
   * the value literally, so every page that did not override it (about, faq,
   * contact, privacy, terms, shipping, returns, cart, track) told Google it WAS
   * the homepage. That is an instruction to drop those pages from the index.
   *
   * Each page now declares its own canonical. A page that forgets emits none,
   * and Google falls back to the request URL — wrong-and-confident is far worse
   * than absent.
   */
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_PK",
    title: `${SITE.name} — Cash on delivery across Pakistan`,
    description: DESCRIPTION,
    url: BASE_URL,
  },
  twitter: {
    // summary_large_image needs a 1200x630; the generated opengraph-image is
    // exactly that.
    card: "summary_large_image",
    title: `${SITE.name} — Cash on delivery across Pakistan`,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-brand font-sans">
        {children}
      </body>
    </html>
  );
}
