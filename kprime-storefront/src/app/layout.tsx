import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// One family for everything, including the logo lockup — hierarchy comes from
// size and weight, not a second face (plan §2.3).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Karkhano Prime",
  description:
    "Electronics, cosmetics, kitchenware and bedding delivered across Pakistan. Cash on delivery.",
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
