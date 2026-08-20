import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Elegant location variant — centered invite with gold contact strip.
 */
export function ElegantLocation02({ content }: SectionComponentProps) {
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
      className={`${eg.sectionPad} ${eg.section}`}
    >
      <div className="mx-auto max-w-4xl min-w-0 text-center">
        <div className="animate-section-enter">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>
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
            <button
              type="button"
              className={eg.goldButton}
              onClick={() => scrollToSection("reservation")}
            >
              Book a Table
            </button>
          </div>
        </div>

        <div className="mt-12 border border-[var(--eg-gold)]/30 px-5 py-8 @min-[640px]:mt-16 @min-[640px]:px-10 @min-[640px]:py-10">
          <dl className="grid gap-8 @min-[640px]:grid-cols-2 @min-[640px]:gap-10">
            {address ? (
              <div className="min-w-0 @min-[640px]:text-left">
                <dt className="text-sm text-[var(--eg-muted)] @min-[640px]:text-left">
                  Address
                </dt>
                <dd className={`mt-3 break-words ${eg.body}`}>
                  {address}
                  <AddressActions point={point} />
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div className="min-w-0 @min-[640px]:text-left">
                <dt className="text-sm text-[var(--eg-muted)] @min-[640px]:text-left">
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
          <div className="mt-8 overflow-hidden border border-[var(--eg-gold)]/25">
            <LocationMapEmbed point={point} label="Restaurant location map" />
          </div>
        </div>
      </div>
    </section>
  );
}
