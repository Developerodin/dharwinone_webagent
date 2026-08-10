import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Elegant sticky header with a restrained gold-accent navigation bar.
 */
export function ElegantHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Caverta House"));
  const tagline = getString(
    content,
    "tagline",
    getString(content, "subheading", "Refined tasting menus, cellar pours, and candlelit service"),
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve");
  const navItems = getNavItems(content);

  return (
    <header
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/15 bg-[#101010]/88 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 @min-[640px]:px-6 @min-[768px]:gap-5 @min-[768px]:px-10">
        <div className="flex flex-col gap-4 @min-[768px]:flex-row @min-[768px]:items-center @min-[768px]:justify-between">
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
            aria-label="Scroll to hero section"
          >
            <span className={eg.eyebrow}>Elegant Collection</span>
            <div className="mt-2 flex items-center gap-3">
              <span className={`${eg.goldRule} w-10`} aria-hidden="true" />
              <span className="font-[family-name:var(--eg-font-display)] text-2xl tracking-[0.08em] text-[var(--eg-cream)] @min-[640px]:text-[2rem]">
                {brandName}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-[var(--eg-muted)]">{tagline}</p>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("reservation")}
            className={eg.goldButton}
          >
            {ctaLabel}
          </button>
        </div>

        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={eg.navLink}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
