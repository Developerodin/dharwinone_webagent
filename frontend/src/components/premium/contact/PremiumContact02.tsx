import { useId } from "react";
import type { SectionComponentProps } from "../registry";
import {
  getPrimaryAsset,
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { useContactForm } from "@/components/shared/useContactForm";
import { FormStatusBanner } from "@/components/shared/FormStatusBanner";
import { AddressActions } from "@/components/shared/AddressActions";
import { HairlineFacts } from "@/components/shared/HairlineFacts";
import { getRestaurantEmail, getRestaurantName } from "@/lib/restaurantEmail";
import { readCoord } from "@/lib/googleMapsLinks";

/**
 * Premium atmospheric contact section with dark backdrop and white reservation card.
 */
export function PremiumContact02({ content, assets }: SectionComponentProps) {
  const formId = useId();
  const headline = getString(content, "headline", "Contact / Reservation");
  const body = getString(
    content,
    "body",
    "Reserve an intimate tasting table, a celebratory dinner, or an unhurried night of cocktails.",
  );
  const address = getString(content, "address", "15 Copper Lane, Jaipur 302001");
  const phone = getString(content, "phone", "+91 98765 43210");
  const email = getString(content, "email");
  const hours = getStringArray(content, "hours", []);
  const submitLabel = getString(content, "ctaLabel", "Request Reservation");
  const imagePath = getPrimaryAsset(assets);
  const form = useContactForm({
    kind: "reservation",
    toEmail: getRestaurantEmail(content),
    businessName: getRestaurantName(content),
  });
  const point = {
    address,
    lat: readCoord(content.lat),
    lng: readCoord(content.lng),
  };

  return (
    <section aria-label="Contact and reservation" className="relative overflow-hidden bg-[var(--theme-bg-dark)]">
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--theme-accent)_16%,transparent),transparent_34%),linear-gradient(135deg,color-mix(in_srgb,var(--theme-bg-dark)_96%,transparent),color-mix(in_srgb,var(--theme-bg-alt)_88%,transparent),color-mix(in_srgb,var(--theme-bg-dark)_96%,transparent))]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-18 @min-[768px]:px-10 @min-[768px]:py-24">
        <div className="grid gap-8 @min-[1024px]:grid-cols-[0.95fr_1.05fr] @min-[1024px]:items-start">
          <div>
            <h2 className={`max-w-lg ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
            <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>
            <HairlineFacts
              className="mt-8"
              inkClass="text-[var(--theme-ink)]"
              mutedClass="text-[var(--theme-muted)]"
              lineClass="divide-white/10"
              facts={[
                {
                  label: "Address",
                  value: (
                    <>
                      {address}
                      <AddressActions point={point} />
                    </>
                  ),
                },
                {
                  label: "Phone",
                  value: (
                    <a href={toTelHref(phone)} className={pm.footerLink}>
                      {phone}
                    </a>
                  ),
                },
                ...(email
                  ? [
                      {
                        label: "Email",
                        value: (
                          <a href={toMailHref(email)} className={`${pm.footerLink} break-all`}>
                            {email}
                          </a>
                        ),
                      },
                    ]
                  : []),
                ...(hours.length > 0
                  ? [
                      {
                        label: "Hours",
                        value: (
                          <div className="space-y-1">
                            {hours.map((entry) => (
                              <p key={entry}>{entry}</p>
                            ))}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          <div className={`${pm.panel} px-6 py-8 @min-[640px]:p-8 @min-[768px]:p-10`}>
            <h3 className={`text-[1.75rem] leading-tight ${pm.heading}`}>
              Save your table
            </h3>
            <p className={`mt-3 text-sm ${pm.body}`}>
              Date, party size, and anything the floor should know.
            </p>

            <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit}>
              <div className="grid gap-5 @min-[640px]:grid-cols-2">
                <div>
                  <label htmlFor={`${formId}-name`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Name
                  </label>
                  <input
                    id={`${formId}-name`}
                    name="name"
                    autoComplete="name"
                    value={form.values.name}
                    onChange={(event) => form.setField("name", event.target.value)}
                    onBlur={() => form.blurField("name")}
                    className={`mt-2 ${pm.input}`}
                    aria-invalid={Boolean(form.errors.name)}
                    aria-describedby={form.errors.name ? `${formId}-name-error` : undefined}
                    placeholder="Your full name"
                  />
                  {form.errors.name ? (
                    <p id={`${formId}-name-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-email`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Email
                  </label>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.values.email}
                    onChange={(event) => form.setField("email", event.target.value)}
                    onBlur={() => form.blurField("email")}
                    className={`mt-2 ${pm.input}`}
                    aria-invalid={Boolean(form.errors.email)}
                    aria-describedby={form.errors.email ? `${formId}-email-error` : undefined}
                    placeholder="name@example.com"
                  />
                  {form.errors.email ? (
                    <p id={`${formId}-email-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-phone`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Phone
                  </label>
                  <input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.values.phone}
                    onChange={(event) => form.setField("phone", event.target.value)}
                    onBlur={() => form.blurField("phone")}
                    className={`mt-2 ${pm.input}`}
                    aria-invalid={Boolean(form.errors.phone)}
                    aria-describedby={form.errors.phone ? `${formId}-phone-error` : undefined}
                    placeholder="+91 98765 43210"
                  />
                  {form.errors.phone ? (
                    <p id={`${formId}-phone-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.phone}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-partySize`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Party Size
                  </label>
                  <input
                    id={`${formId}-partySize`}
                    name="partySize"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={form.values.partySize}
                    onChange={(event) => form.setField("partySize", event.target.value)}
                    onBlur={() => form.blurField("partySize")}
                    className={`mt-2 ${pm.input}`}
                    aria-invalid={Boolean(form.errors.partySize)}
                    aria-describedby={form.errors.partySize ? `${formId}-partySize-error` : undefined}
                    placeholder="2"
                  />
                  {form.errors.partySize ? (
                    <p id={`${formId}-partySize-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.partySize}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 @min-[640px]:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <label htmlFor={`${formId}-date`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Preferred Date
                  </label>
                  <input
                    id={`${formId}-date`}
                    name="date"
                    type="date"
                    value={form.values.date}
                    onChange={(event) => form.setField("date", event.target.value)}
                    onBlur={() => form.blurField("date")}
                    className={`mt-2 ${pm.input}`}
                    aria-invalid={Boolean(form.errors.date)}
                    aria-describedby={form.errors.date ? `${formId}-date-error` : undefined}
                  />
                  {form.errors.date ? (
                    <p id={`${formId}-date-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.date}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-message`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs">
                    Occasion / Notes
                  </label>
                  <textarea
                    id={`${formId}-message`}
                    name="message"
                    rows={4}
                    value={form.values.message}
                    onChange={(event) => form.setField("message", event.target.value)}
                    onBlur={() => form.blurField("message")}
                    className={`mt-2 ${pm.input} resize-y`}
                    aria-invalid={Boolean(form.errors.message)}
                    aria-describedby={form.errors.message ? `${formId}-message-error` : undefined}
                    placeholder="Birthday dinner, tasting menu, allergies..."
                  />
                  {form.errors.message ? (
                    <p id={`${formId}-message-error`} className="mt-2 text-sm text-red-400">
                      {form.errors.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
                <p className={`text-sm ${pm.body}`}>Reservations are confirmed manually.</p>
                <button type="submit" className={pm.primaryButton} disabled={form.isSubmitting}>
                  {form.isSubmitting ? "Sending..." : submitLabel}
                </button>
              </div>

              <FormStatusBanner
                success={form.isSubmitted}
                successMessage={form.successMessage}
                error={form.submitError}
              />
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
