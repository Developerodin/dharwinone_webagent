import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";

/**
 * Premium location variant — split Find Us panel using theme surfaces only.
 */
export function PremiumLocation02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Visit Us");
  const directionsNote = getString(content, "directionsNote");
  const address =
    typeof content.address === "string" ? content.address : null;
  const phone = typeof content.phone === "string" ? content.phone : null;
  const point = {
    address,
    lat: readCoord(content.lat),
    lng: readCoord(content.lng),
  };

  return (
    <section aria-label="Location" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] overflow-hidden rounded-[1.75rem] border border-[var(--theme-line)] @min-[768px]:grid-cols-2">
        <div className="animate-section-enter bg-[var(--theme-bg-alt)] px-5 py-10 @min-[640px]:px-8 @min-[640px]:py-14 @min-[768px]:px-10">
          <h2 className={`mt-3 @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
            {headline}
          </h2>
          {directionsNote ? (
            <p className={`mt-4 max-w-md text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
              {directionsNote}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--theme-line)] bg-[var(--theme-card)] px-5 py-10 @min-[640px]:px-8 @min-[640px]:py-14 @min-[768px]:border-l @min-[768px]:border-t-0 @min-[768px]:px-10">
          <dl className="space-y-8">
            {address ? (
              <div>
                <dt className="text-sm text-[var(--theme-muted)]">Address</dt>
                <dd className="mt-2 break-words text-base text-[var(--theme-ink)] @min-[640px]:text-lg">
                  {address}
                  <AddressActions point={point} />
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt className="text-sm text-[var(--theme-muted)]">Phone</dt>
                <dd className="mt-2">
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="break-all text-base text-[var(--theme-accent-on-dark)] transition-colors duration-200 hover:text-[var(--theme-ink)] hover:underline @min-[640px]:text-lg"
                  >
                    {phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {!address && !phone ? (
              <p className={pm.body}>
                Location details will appear when included in the brief.
              </p>
            ) : null}
          </dl>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-[var(--sec-measure,72rem)] overflow-hidden rounded-[1.75rem] border border-[var(--theme-line)]">
        <LocationMapEmbed
          point={point}
          label="Restaurant location map"
          className="min-h-[16rem]"
        />
      </div>
    </section>
  );
}
