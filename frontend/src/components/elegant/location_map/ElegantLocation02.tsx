import { MapPin, Phone } from "lucide-react";
import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Elegant location variant — centered invite with gold contact strip.
 */
export function ElegantLocation02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Visit Us");
  const directionsNote = getString(content, "directionsNote");
  const address =
    typeof content.address === "string" ? content.address : null;
  const phone = typeof content.phone === "string" ? content.phone : null;

  return (
    <section
      aria-label="Location and reservations"
      className={`${eg.sectionPad} ${eg.section}`}
    >
      <div className="mx-auto max-w-4xl min-w-0 text-center">
        <div className="animate-section-enter">
          <p className={eg.eyebrow}>Join Us</p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3 @min-[640px]:mt-5">
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
            <span
              aria-hidden="true"
              className="size-1.5 rotate-45 bg-[var(--eg-gold)]"
            />
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
          </div>
          <h2 className={`mt-5 @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>
            {headline}
          </h2>
          {directionsNote ? (
            <p
              className={`mx-auto mt-4 max-w-xl text-sm leading-relaxed @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}
            >
              {directionsNote}
            </p>
          ) : null}
          <div className="mt-8 flex justify-center @min-[640px]:mt-10">
            <button type="button" className={eg.goldButton}>
              Book a Table
            </button>
          </div>
        </div>

        <div className="mt-12 border border-[var(--eg-gold)]/30 px-5 py-8 @min-[640px]:mt-16 @min-[640px]:px-10 @min-[640px]:py-10">
          <dl className="grid gap-8 @min-[640px]:grid-cols-2 @min-[640px]:gap-10">
            {address ? (
              <div className="min-w-0 @min-[640px]:text-left">
                <dt className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--eg-gold)] @min-[640px]:justify-start @min-[640px]:text-xs">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  Address
                </dt>
                <dd className={`mt-3 break-words ${eg.body}`}>{address}</dd>
              </div>
            ) : null}
            {phone ? (
              <div className="min-w-0 @min-[640px]:text-left">
                <dt className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--eg-gold)] @min-[640px]:justify-start @min-[640px]:text-xs">
                  <Phone aria-hidden="true" className="size-3.5" />
                  Phone
                </dt>
                <dd className="mt-3">
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="break-all text-[var(--eg-cream)] transition duration-200 hover:text-[var(--eg-gold)]"
                  >
                    {phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {!address && !phone ? (
              <p className={`col-span-full ${eg.body}`}>
                Location details will appear when included in the brief.
              </p>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
