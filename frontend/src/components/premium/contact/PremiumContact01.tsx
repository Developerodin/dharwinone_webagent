import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { useId } from "react";
import type { SectionComponentProps } from "../registry";
import {
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { useContactForm } from "@/components/shared/useContactForm";

/**
 * Premium contact section with split information panel and reservation form.
 */
export function PremiumContact01({ content }: SectionComponentProps) {
  const formId = useId();
  const headline = getString(content, "headline", "Plan Your Evening");
  const body = getString(
    content,
    "body",
    "Share your preferred date, party size, and any occasion details. We'll make the evening feel effortless.",
  );
  const address = getString(content, "address", "15 Copper Lane, Jaipur 302001");
  const phone = getString(content, "phone", "+91 98765 43210");
  const email = getString(content, "email", "reservations@maisoncopper.com");
  const hours = getStringArray(content, "hours", [
    "Tue - Thu · 6:00 pm to 10:30 pm",
    "Fri - Sun · 6:00 pm to 11:30 pm",
  ]);
  const submitLabel = getString(content, "ctaLabel", "Request Reservation");
  const form = useContactForm();

  return (
    <section aria-label="Contact and reservations" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-6xl gap-8 @min-[1024px]:grid-cols-[1.05fr_0.95fr]">
        <div className={`${pm.panel} px-5 py-8 @min-[640px]:px-8 @min-[640px]:py-10 @min-[768px]:px-10`}>
          <p className={pm.eyebrow}>Contact</p>
          <span aria-hidden="true" className={`mt-4 block ${pm.accentRule}`} />
          <h2 className={`mt-5 max-w-lg ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>

          <dl className="mt-8 grid gap-5 @min-[640px]:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${pm.inputLabel}`}>
                <MapPin aria-hidden="true" className="size-4" />
                Address
              </dt>
              <dd className="mt-3 text-sm leading-6 text-[var(--theme-ink)]">{address}</dd>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${pm.inputLabel}`}>
                <Phone aria-hidden="true" className="size-4" />
                Phone
              </dt>
              <dd className="mt-3">
                <a href={toTelHref(phone)} className="text-sm text-[var(--theme-ink)] transition hover:text-[var(--theme-accent)]">
                  {phone}
                </a>
              </dd>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${pm.inputLabel}`}>
                <Mail aria-hidden="true" className="size-4" />
                Email
              </dt>
              <dd className="mt-3">
                <a href={toMailHref(email)} className="break-all text-sm text-[var(--theme-ink)] transition hover:text-[var(--theme-accent)]">
                  {email}
                </a>
              </dd>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${pm.inputLabel}`}>
                <Clock3 aria-hidden="true" className="size-4" />
                Hours
              </dt>
              <dd className="mt-3 space-y-2 text-sm text-[var(--theme-ink)]">
                {hours.map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <div className={`${pm.panel} px-5 py-8 @min-[640px]:px-8 @min-[640px]:py-10`}>
          <p className={pm.eyebrow}>Reservation Form</p>
          <h3 className={`mt-4 text-[1.75rem] leading-tight ${pm.heading}`}>
            Tell us the details
          </h3>
          <p className={`mt-3 text-sm ${pm.body}`}>
            We validate everything inline so the team receives a clean request.
          </p>

          <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit}>
            <div className="grid gap-5 @min-[640px]:grid-cols-2">
              <div>
                <label htmlFor={`${formId}-name`} className={pm.inputLabel}>
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
                  <p id={`${formId}-name-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-email`} className={pm.inputLabel}>
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
                  <p id={`${formId}-email-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-phone`} className={pm.inputLabel}>
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
                  <p id={`${formId}-phone-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.phone}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-partySize`} className={pm.inputLabel}>
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
                  placeholder="4"
                />
                {form.errors.partySize ? (
                  <p id={`${formId}-partySize-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.partySize}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 @min-[640px]:grid-cols-[0.9fr_1.1fr]">
              <div>
                <label htmlFor={`${formId}-date`} className={pm.inputLabel}>
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
                  <p id={`${formId}-date-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.date}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-message`} className={pm.inputLabel}>
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
                  placeholder="Anniversary tasting, window seating, dietary notes..."
                />
                {form.errors.message ? (
                  <p id={`${formId}-message-error`} className="mt-2 text-sm text-[#e7b39a]">
                    {form.errors.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
              <p className="text-sm text-[#aa9381]">
                Requests are reviewed during service hours.
              </p>
              <button type="submit" className={pm.primaryButton} disabled={form.isSubmitting}>
                {form.isSubmitting ? "Sending..." : submitLabel}
              </button>
            </div>

            <div aria-live="polite">
              {form.isSubmitted ? (
                <p className="rounded-2xl border border-[var(--theme-accent)]/40 bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)]">
                  Request prepared. For immediate confirmation, call the reservation desk.
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
