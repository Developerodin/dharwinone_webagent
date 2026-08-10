import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Premium sticky header with brand lockup, section nav, and reservation CTA.
 */
export function PremiumHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Maison Copper"));
  const tagline = getString(
    content,
    "tagline",
    getString(content, "subheading", "Seasonal tasting menus and late-night cocktails"),
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve");
  const navItems = getNavItems(content);

  return (
    <header
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-white/10 bg-[#120f0d]/85 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 @min-[640px]:px-6 @min-[768px]:gap-5 @min-[768px]:px-10">
        <div className="flex flex-col gap-4 @min-[768px]:flex-row @min-[768px]:items-center @min-[768px]:justify-between">
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c68e6b]"
            aria-label="Scroll to hero section"
          >
            <span className={pm.eyebrow}>Premium Collection</span>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-px w-10 bg-[#c68e6b]/55" aria-hidden="true" />
              <span className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[#f6efe8] @min-[640px]:text-[2rem]">
                {brandName}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-[#bfae9f]">{tagline}</p>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("reservation")}
            className={pm.primaryButton}
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
              className={pm.navLink}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
