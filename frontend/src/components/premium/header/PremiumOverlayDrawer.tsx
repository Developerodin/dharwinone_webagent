import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { NavItem } from "@/components/shared/contentExtras";
import { premiumOverlayDrawerCta } from "./premiumHeaderChrome";

export type OverlaySocialLink = {
  label: string;
  href: string;
  network: "instagram" | "facebook";
};

export type PremiumOverlayDrawerProps = {
  open: boolean;
  menuId: string;
  navItems: NavItem[];
  ctaLabel: string;
  onNavigate: (target: string) => void;
  onCta: () => void;
  onClose: () => void;
  socials?: OverlaySocialLink[];
};

const drawerLink =
  "w-full text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-[#1c2430] transition-colors duration-200 hover:text-[var(--theme-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)] @min-[640px]/page:text-sm";

const drawerLinkActive = "text-[var(--theme-accent)]";

/**
 * Reads optional public social URLs from header content.
 */
export function getOverlaySocials(
  content: Record<string, unknown>,
): OverlaySocialLink[] {
  const links: OverlaySocialLink[] = [];
  const instagram = readHref(content.instagram);
  const facebook = readHref(content.facebook);
  if (instagram) {
    links.push({ label: "Instagram", href: instagram, network: "instagram" });
  }
  if (facebook) {
    links.push({ label: "Facebook", href: facebook, network: "facebook" });
  }
  return links;
}

/**
 * Returns a trimmed http(s) URL, or null when the value is not a link.
 */
function readHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!/^https?:\/\//i.test(href)) return null;
  return href;
}

/**
 * Brand mark for an overlay-drawer social link (Lucide dropped brand icons).
 */
function OverlaySocialIcon({ network }: { network: OverlaySocialLink["network"] }) {
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4V10c0-.6.4-1 1-1Z" />
    </svg>
  );
}

/**
 * Light left off-canvas menu used by the transparent overlay header.
 */
export function PremiumOverlayDrawer({
  open,
  menuId,
  navItems,
  ctaLabel,
  onNavigate,
  onCta,
  onClose,
  socials = [],
}: PremiumOverlayDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  return (
    <div
      className={open ? "" : "pointer-events-none"}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        className={`absolute inset-x-0 top-0 z-10 h-[100svh] bg-black/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close navigation menu"
        onClick={onClose}
      />

      <div
        id={menuId}
        role="dialog"
        aria-modal={open}
        aria-label="Site navigation"
        inert={open ? undefined : true}
        className={`absolute inset-y-0 left-0 z-30 flex h-[100svh] w-[min(22rem,86%)] max-w-[32rem] flex-col overflow-y-auto bg-[#f4f2ee] shadow-[12px_0_40px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out @min-[768px]/page:w-[min(24rem,32%)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end px-5 pt-5">
          <button
            ref={closeRef}
            type="button"
            tabIndex={open ? 0 : -1}
            className="inline-flex size-10 items-center justify-center text-[#1c2430] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <X className="size-5" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-4">
          <ul className="flex flex-col gap-5" role="list">
            {navItems.map((item) => {
              const active = item.target === "hero";
              return (
                <li key={`${item.target}-${item.label}`}>
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    className={`${drawerLink} ${active ? drawerLinkActive : ""}`}
                    onClick={() => onNavigate(item.target)}
                    aria-current={active ? "page" : undefined}
                    aria-label={`Scroll to ${item.label}`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              className={premiumOverlayDrawerCta}
              onClick={onCta}
              aria-label={ctaLabel}
            >
              {ctaLabel}
            </button>
          </div>

          {socials.length > 0 ? (
            <ul
              className="mt-auto flex items-center gap-4 pt-10"
              role="list"
              aria-label="Social links"
            >
              {socials.map((social) => (
                <li key={social.network}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={open ? 0 : -1}
                    className="inline-flex size-9 items-center justify-center text-[#3a4454] transition-colors hover:text-[var(--theme-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
                    aria-label={`${social.label} (opens in a new tab)`}
                  >
                    <OverlaySocialIcon network={social.network} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
