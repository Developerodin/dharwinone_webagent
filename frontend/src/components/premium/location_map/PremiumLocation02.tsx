import { MapPin, Phone } from "lucide-react";
import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium location variant — split contact panel with lucide icons.
 */
export function PremiumLocation02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Visit Us");
  const directionsNote = getString(content, "directionsNote");
  const address =
    typeof content.address === "string" ? content.address : null;
  const phone = typeof content.phone === "string" ? content.phone : null;

  return (
    <section aria-label="Location" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-6xl gap-8 overflow-hidden border border-[var(--line)] @min-[768px]:grid-cols-2 @min-[768px]:gap-0">
        <div className="animate-section-enter bg-[var(--surface)] px-5 py-10 @min-[640px]:px-8 @min-[640px]:py-14 @min-[768px]:px-10">
          <p className={pm.eyebrow}>Find Us</p>
          <h2 className={`mt-3 @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
            {headline}
          </h2>
          {directionsNote ? (
            <p className={`mt-4 max-w-md text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
              {directionsNote}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--line)] px-5 py-10 @min-[640px]:px-8 @min-[640px]:py-14 @min-[768px]:border-l @min-[768px]:border-t-0 @min-[768px]:px-10">
          <dl className="space-y-8">
            {address ? (
              <div className="flex gap-4">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-[var(--accent)]"
                />
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)] @min-[640px]:text-xs">
                    Address
                  </dt>
                  <dd className="mt-2 break-words text-base text-[var(--ink)] @min-[640px]:text-lg">
                    {address}
                  </dd>
                </div>
              </div>
            ) : null}
            {phone ? (
              <div className="flex gap-4">
                <Phone
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-[var(--accent)]"
                />
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)] @min-[640px]:text-xs">
                    Phone
                  </dt>
                  <dd className="mt-2">
                    <a
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      className="break-all text-base text-[var(--accent)] transition-colors duration-200 hover:underline @min-[640px]:text-lg"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
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
    </section>
  );
}
