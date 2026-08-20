import type { SectionComponentProps } from "@/components/premium/registry";
import { getString } from "@/components/premium/contentHelpers";
import { getContactFacts } from "@/components/familyKit/sections/shared";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";
import { bd } from "../shared/boldTokens";

/**
 * Bold location — Demo9 Find Us map panel with crimson frame.
 */
export function BoldLocation01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Find Us");
  const note = getString(
    content,
    "directionsNote",
    "Look for the red awning — if you can smell the grill, you're close.",
  );
  const facts = getContactFacts(content);
  const address = facts.find((f) => f.label === "Address")?.value ?? "";
  const point = {
    address: address || null,
    lat: readCoord(content.lat),
    lng: readCoord(content.lng),
  };

  return (
    <section aria-label="Location" className={`${bd.sectionPad} ${bd.sectionAlt}`}>
      <div className="mx-auto grid max-w-6xl gap-8 @min-[768px]:grid-cols-2 @min-[768px]:gap-12">
        <div className="min-w-0">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
            Location
          </p>
          <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-[var(--theme-ink)] @min-[640px]:text-[2.75rem]">
            {headline}
          </h2>
          {address ? (
            <p className="mt-5 text-base font-medium uppercase tracking-[0.04em] text-[var(--theme-ink)] @min-[640px]:text-lg">
              {address}
            </p>
          ) : null}
          {address ? <AddressActions point={point} /> : null}
          <p className={`mt-3 max-w-md text-sm uppercase tracking-[0.04em] @min-[640px]:text-base ${bd.body}`}>
            {note}
          </p>
          <dl className="mt-8 space-y-4">
            {facts
              .filter((f) => f.label !== "Address")
              .map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--bold-hero-red)]">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--theme-ink)] @min-[640px]:text-base">
                    {fact.href ? (
                      <a href={fact.href} className="hover:text-[var(--bold-hero-red)]">
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
        <div className="min-h-[16rem] overflow-hidden border-4 border-[var(--bold-hero-red)] @min-[640px]:min-h-[22rem]">
          <LocationMapEmbed
            point={point}
            label="Restaurant location map"
            className="h-full min-h-[16rem] @min-[640px]:min-h-[22rem]"
          />
        </div>
      </div>
    </section>
  );
}
