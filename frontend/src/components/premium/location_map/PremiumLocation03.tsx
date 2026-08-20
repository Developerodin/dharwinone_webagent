import type { SectionComponentProps } from "../registry";
import { getString, getStringArray, toTelHref } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";

/**
 * Premium location 03 — address as the thesis, map sitting underneath.
 */
export function PremiumLocation03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Visit Us");
  const directionsNote = getString(content, "directionsNote");
  const address = typeof content.address === "string" ? content.address : "";
  const phone = typeof content.phone === "string" ? content.phone : "";
  const hours = getStringArray(content, "hours", []);
  const point = {
    address: address || null,
    lat: readCoord(content.lat),
    lng: readCoord(content.lng),
  };

  return (
    <section aria-label="Location" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="relative mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <h2 className={`${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          {address ? (
            <p className={`mt-6 wrap-break-word text-2xl leading-snug @min-[640px]:text-3xl ${pm.heading}`}>
              {address}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {phone ? (
              <a href={toTelHref(phone)} className={pm.footerLink}>
                {phone}
              </a>
            ) : null}
            {address ? <AddressActions point={point} /> : null}
          </div>
          {hours.length > 0 ? (
            <p className={`mt-8 text-xl leading-snug @min-[640px]:text-2xl ${pm.heading}`}>
              {hours.join(" · ")}
            </p>
          ) : null}
          {directionsNote ? (
            <p className={`mt-4 max-w-xl text-sm ${pm.body}`}>{directionsNote}</p>
          ) : null}
        </header>
        <div className="mt-10 overflow-hidden @min-[640px]:mt-12">
          <LocationMapEmbed point={point} label="Restaurant location map" />
        </div>
      </div>
    </section>
  );
}
