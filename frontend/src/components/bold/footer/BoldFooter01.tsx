import type { SectionComponentProps } from "@/components/premium/registry";
import { getString } from "@/components/premium/contentHelpers";
import {
  getCopyrightLine,
  getContactFacts,
} from "@/components/familyKit/sections/shared";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";
import { bd } from "../shared/boldTokens";

/**
 * Bold footer — Demo9 crimson subscribe band + address / social / copyright.
 */
export function BoldFooter01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Grand Burger");
  const tagline = getString(
    content,
    "tagline",
    "Subscribe now to receive fresh deals & offers by email.",
  );
  const copyright = getCopyrightLine(content);
  const facts = getContactFacts(content);
  const navItems = getNavItems(content);
  const address = facts.find((f) => f.label === "Address")?.value;
  const phone = facts.find((f) => f.label === "Phone");
  const email = facts.find((f) => f.label === "Email");

  return (
    <footer aria-label="Site footer" className="bg-[var(--bold-hero-red)] text-white">
      <div className={`mx-auto max-w-6xl ${bd.sectionPad}`}>
        <div className="grid gap-12 @min-[768px]:grid-cols-2 @min-[768px]:gap-16">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-none @min-[640px]:text-[2.75rem]">
              Subscribe now
            </h2>
            <p className="mt-4 max-w-md text-sm uppercase tracking-[0.04em] text-white/85 @min-[640px]:text-base">
              {tagline}
            </p>
            <form
              className="mt-6 flex max-w-lg flex-col gap-3 @min-[480px]:flex-row"
              onSubmit={(event) => event.preventDefault()}
              aria-label="Email subscribe"
            >
              <label className="sr-only" htmlFor="bold-footer-email">
                Email address
              </label>
              <input
                id="bold-footer-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email address"
                className="min-h-11 flex-1 border border-white/35 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center border border-white bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--bold-hero-red)] transition-colors hover:bg-transparent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Join
              </button>
            </form>
          </div>

          <div className="min-w-0 @min-[768px]:text-right">
            <p className="font-[family-name:var(--theme-font-display)] text-xl font-bold uppercase tracking-[0.14em] @min-[640px]:text-2xl">
              {brandName}
            </p>
            {address ? (
              <p className="mt-4 text-sm uppercase leading-relaxed tracking-[0.04em] text-white/85 @min-[640px]:text-base">
                {address}
              </p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm uppercase tracking-[0.06em] text-white/90">
              {phone ? (
                <p>
                  T:{" "}
                  {phone.href ? (
                    <a href={phone.href} className="hover:underline">
                      {phone.value}
                    </a>
                  ) : (
                    phone.value
                  )}
                </p>
              ) : null}
              {email ? (
                <p>
                  E:{" "}
                  {email.href ? (
                    <a href={email.href} className="hover:underline">
                      {email.value}
                    </a>
                  ) : (
                    email.value
                  )}
                </p>
              ) : null}
            </div>
            <ul
              className="mt-6 flex flex-wrap gap-4 @min-[768px]:justify-end"
              aria-label="Social"
            >
              {["Twitter", "Facebook", "Instagram", "Yelp"].map((label) => (
                <li key={label}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/20 pt-6 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
            {navItems.map((item) => (
              <button
                key={`f-${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <p className="text-xs uppercase tracking-[0.08em] text-white/70">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
