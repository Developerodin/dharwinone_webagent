import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium location section with address and phone from brief.
 */
export function PremiumLocation01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Visit Us");
  const directionsNote = getString(content, "directionsNote");
  const address =
    typeof content.address === "string" ? content.address : null;
  const phone = typeof content.phone === "string" ? content.phone : null;

  return (
    <section aria-label="Location" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-3xl min-w-0 text-center">
        <p className={pm.eyebrow}>Find Us</p>
        <h2 className={`mt-3 @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {directionsNote ? (
          <p className={`mx-auto mt-4 max-w-xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
            {directionsNote}
          </p>
        ) : null}
        <dl className="mt-10 space-y-6 text-left @min-[640px]:mt-12 @min-[640px]:space-y-8 @min-[768px]:text-center">
          {address ? (
            <div className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)] @min-[640px]:text-xs">
                Address
              </dt>
              <dd className="mt-2 break-words text-base text-[var(--ink)] @min-[640px]:text-lg">
                {address}
              </dd>
            </div>
          ) : null}
          {phone ? (
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)] @min-[640px]:text-xs">
                Phone
              </dt>
              <dd className="mt-2">
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="break-all text-base text-[var(--accent)] hover:underline @min-[640px]:text-lg"
                >
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
          {!address && !phone ? (
            <p className={`text-center ${pm.body}`}>
              Location details will appear when included in the brief.
            </p>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
