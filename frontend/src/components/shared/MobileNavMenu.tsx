"use client";

import { Menu, X } from "lucide-react";
import type { NavItem } from "@/components/shared/contentExtras";

export type MobileNavToggleProps = {
  open: boolean;
  menuId: string;
  onToggle: () => void;
  className: string;
};

/**
 * Hamburger / close button for mobile navigation.
 * Hidden by default; shown only below the `/page` desktop breakpoint.
 */
export function MobileNavToggle({
  open,
  menuId,
  onToggle,
  className,
}: MobileNavToggleProps) {
  return (
    <button
      type="button"
      className={`hidden size-11 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 @max-[1023px]/page:!inline-flex ${className}`}
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      aria-controls={menuId}
      onClick={onToggle}
    >
      {open ? (
        <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}

export type MobileNavPanelProps = {
  open: boolean;
  menuId: string;
  navItems: NavItem[];
  onNavigate: (target: string) => void;
  panelClassName: string;
  linkClassName: string;
  /** Optional mobile CTA shown under the nav links. */
  ctaLabel?: string;
  onCta?: () => void;
  ctaClassName?: string;
};

/**
 * Expandable mobile nav panel with section links.
 * Only participates in layout below the `/page` desktop breakpoint.
 */
export function MobileNavPanel({
  open,
  menuId,
  navItems,
  onNavigate,
  panelClassName,
  linkClassName,
  ctaLabel,
  onCta,
  ctaClassName,
}: MobileNavPanelProps) {
  return (
    <div
      id={menuId}
      className={`hidden overflow-hidden transition-[grid-template-rows] duration-200 ease-out @max-[1023px]/page:grid ${
        open ? "grid-rows-[1fr]" : "pointer-events-none grid-rows-[0fr]"
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0">
        <nav
          aria-label="Primary"
          className={`border-t pt-3 ${panelClassName}`}
        >
          <ul className="flex flex-col gap-0.5" role="list">
            {navItems.map((item) => (
              <li key={`${item.target}-${item.label}`}>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  className={`${linkClassName} w-full justify-start rounded-xl px-3 py-3`}
                  onClick={() => onNavigate(item.target)}
                  aria-label={`Scroll to ${item.label}`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          {ctaLabel && onCta && ctaClassName ? (
            <div className="mt-3 pb-1">
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                className={`${ctaClassName} w-full max-w-none`}
                onClick={onCta}
                aria-label={ctaLabel}
              >
                {ctaLabel}
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
