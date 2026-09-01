import { WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { cn } from "@/lib/utils/format"

/**
 * Floating contact button.
 *
 * Layering, decided here so later tasks inherit it rather than re-litigate:
 *
 *   z-30  this button
 *   z-40  sticky Header, Drawer/Modal overlays, mega menu panel
 *   z-50  Drawer and Modal content
 *   z-60  Toast viewport
 *
 * Below the header and every overlay on purpose — an open cart drawer or modal
 * must not have a green circle floating on top of it.
 *
 * Vertical offset reads `--buy-bar-height`, which is 0px everywhere except the
 * product page, where task 92's StickyMobileBuyBar sets it to its own height.
 * That keeps the two from stacking on the one screen where both exist, without
 * this component needing to know which route it is on.
 */
export function WhatsAppFloatButton({ className }: { className?: string }) {
  return (
    <a
      href={whatsappLink("Hi, I have a question about a product")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      data-whatsapp-number={WHATSAPP_NUMBER}
      className={cn(
        "fixed right-4 z-30 flex size-14 items-center justify-center rounded-full",
        "bg-success text-paper shadow-lg transition-transform hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        className
      )}
      style={{
        // env() covers the iOS home indicator, which otherwise sits under the
        // button on a modern iPhone in Safari.
        bottom:
          "calc(1rem + var(--buy-bar-height, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-7">
        <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1112 20zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-.9 1.6-.6 2.6.4 1.5 1.4 2.8 2.6 3.8 1.3 1.1 2.9 1.7 4.1 1.7.6 0 1.2-.1 1.6-.5.4-.3.7-.8.8-1.3.1-.3 0-.5-.1-.6z" />
      </svg>
    </a>
  )
}
