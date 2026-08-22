import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";

/**
 * Caverta-style reservation and location block with hours-style note.
 */
export function ElegantLocation01({ content }: SectionComponentProps) {
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
    <section
      aria-label="Location and reservations"
      className={`${eg.sectionPad} ${eg.sectionAlt}`}
    >
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] gap-8 @min-[640px]:gap-10 @min-[768px]:grid-cols-2 @min-[768px]:gap-16">
        <div className="min-w-0">
          <span aria-hidden="true" className={`mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
          <h2 className={`mt-4 @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>
            {headline}
          </h2>
          {directionsNote ? (
            <p className={`mt-4 text-sm leading-relaxed @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
              {directionsNote}
            </p>
          ) : null}
          <div className="mt-6 @min-[640px]:mt-8">
            <button type="button" className={eg.goldButton}>
              Book a Table
            </button>
          </div>
        </div>

        <div className="min-w-0 border border-[var(--eg-gold)]/25 bg-[var(--eg-bg)]/60 p-5 @min-[640px]:p-8 @min-[768px]:p-10">
          <h3 className={`text-xl @min-[640px]:text-2xl ${eg.heading}`}>Location</h3>
          <dl className="mt-5 space-y-4 text-sm @min-[640px]:mt-6 @min-[640px]:space-y-5 @min-[768px]:text-base">
            {address ? (
              <div className="min-w-0">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--eg-gold)] @min-[640px]:text-xs">
                  Address
                </dt>
                <dd className={`mt-2 break-words ${eg.body}`}>
                  {address}
                  <AddressActions point={point} />
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--eg-gold)] @min-[640px]:text-xs">
                  Phone
                </dt>
                <dd className="mt-2">
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="break-all text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]"
                  >
                    {phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {!address && !phone ? (
              <p className={eg.body}>
                Location details will appear when included in the brief.
              </p>
            ) : null}
          </dl>
          <div className="mt-6 overflow-hidden border border-[var(--eg-gold)]/25">
            <LocationMapEmbed point={point} label="Restaurant location map" />
          </div>
        </div>
      </div>
    </section>
  );
}
