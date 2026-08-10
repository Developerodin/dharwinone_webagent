import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { useId } from "react";
import type { SectionComponentProps } from "../registry";
import {
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { useContactForm } from "@/components/shared/useContactForm";

/**
 * Elegant contact section with gold-framed details and reservation form.
 */
export function ElegantContact01({ content }: SectionComponentProps) {
  const formId = useId();
  const headline = getString(content, "headline", "Arrange Your Table");
  const body = getString(
    content,
    "body",
    "Share your preferred date, party size, and any special note for a smooth, quietly luxurious arrival.",
  );
  const address = getString(content, "address", "18 Heritage Court, New Delhi 110001");
  const phone = getString(content, "phone", "+91 98111 22334");
  const email = getString(content, "email", "reservations@cavertahouse.com");
  const hours = getStringArray(content, "hours", [
    "Tue - Thu · 6:00 pm to 10:30 pm",
    "Fri - Sun · 6:00 pm to 11:30 pm",
  ]);
  const submitLabel = getString(content, "ctaLabel", "Request Reservation");
  const form = useContactForm();

  return (
    <section aria-label="Contact and reservations" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto grid max-w-6xl gap-8 @min-[1024px]:grid-cols-[0.95fr_1.05fr]">
        <div className={`${eg.panel} px-5 py-8 @min-[640px]:px-8 @min-[640px]:py-10 @min-[768px]:px-10`}>
          <p className={eg.eyebrow}>Contact</p>
          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
            <span aria-hidden="true" className="size-1.5 rotate-45 bg-[var(--eg-gold)]" />
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
          </div>
          <h2 className={`mt-5 max-w-lg ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${eg.body}`}>{body}</p>

          <dl className="mt-8 grid gap-5 @min-[640px]:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[var(--eg-gold)]/18 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${eg.inputLabel}`}>
                <MapPin aria-hidden="true" className="size-4" />
                Address
              </dt>
              <dd className="mt-3 text-sm leading-6 text-[var(--eg-cream)]">{address}</dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--eg-gold)]/18 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${eg.inputLabel}`}>
                <Phone aria-hidden="true" className="size-4" />
                Phone
              </dt>
              <dd className="mt-3">
                <a href={toTelHref(phone)} className="text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
                  {phone}
                </a>
              </dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--eg-gold)]/18 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${eg.inputLabel}`}>
                <Mail aria-hidden="true" className="size-4" />
                Email
              </dt>
              <dd className="mt-3">
                <a href={toMailHref(email)} className="break-all text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
                  {email}
                </a>
              </dd>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--eg-gold)]/18 bg-black/15 p-5">
              <dt className={`flex items-center gap-2 ${eg.inputLabel}`}>
                <Clock3 aria-hidden="true" className="size-4" />
                Hours
              </dt>
              <dd className="mt-3 space-y-2 text-sm text-[var(--eg-cream)]">
                {hours.map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <div className={`${eg.panel} px-5 py-8 @min-[640px]:px-8 @min-[640px]:py-10`}>
          <p className={eg.eyebrow}>Reservation Form</p>
          <h3 className={`mt-4 text-[1.75rem] leading-tight ${eg.heading}`}>
            Compose the details
          </h3>
          <p className={`mt-3 text-sm ${eg.body}`}>
            A polished request helps the dining room confirm faster.
          </p>

          <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit}>
            <div className="grid gap-5 @min-[640px]:grid-cols-2">
              <div>
                <label htmlFor={`${formId}-name`} className={eg.inputLabel}>
                  Name
                </label>
                <input
                  id={`${formId}-name`}
                  name="name"
                  autoComplete="name"
                  value={form.values.name}
                  onChange={(event) => form.setField("name", event.target.value)}
                  onBlur={() => form.blurField("name")}
                  className={`mt-2 ${eg.input}`}
                  aria-invalid={Boolean(form.errors.name)}
                  aria-describedby={form.errors.name ? `${formId}-name-error` : undefined}
                  placeholder="Your full name"
                />
                {form.errors.name ? (
                  <p id={`${formId}-name-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-email`} className={eg.inputLabel}>
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
                  className={`mt-2 ${eg.input}`}
                  aria-invalid={Boolean(form.errors.email)}
                  aria-describedby={form.errors.email ? `${formId}-email-error` : undefined}
                  placeholder="name@example.com"
                />
                {form.errors.email ? (
                  <p id={`${formId}-email-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-phone`} className={eg.inputLabel}>
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
                  className={`mt-2 ${eg.input}`}
                  aria-invalid={Boolean(form.errors.phone)}
                  aria-describedby={form.errors.phone ? `${formId}-phone-error` : undefined}
                  placeholder="+91 98111 22334"
                />
                {form.errors.phone ? (
                  <p id={`${formId}-phone-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.phone}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-partySize`} className={eg.inputLabel}>
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
                  className={`mt-2 ${eg.input}`}
                  aria-invalid={Boolean(form.errors.partySize)}
                  aria-describedby={form.errors.partySize ? `${formId}-partySize-error` : undefined}
                  placeholder="4"
                />
                {form.errors.partySize ? (
                  <p id={`${formId}-partySize-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.partySize}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 @min-[640px]:grid-cols-[0.9fr_1.1fr]">
              <div>
                <label htmlFor={`${formId}-date`} className={eg.inputLabel}>
                  Preferred Date
                </label>
                <input
                  id={`${formId}-date`}
                  name="date"
                  type="date"
                  value={form.values.date}
                  onChange={(event) => form.setField("date", event.target.value)}
                  onBlur={() => form.blurField("date")}
                  className={`mt-2 ${eg.input}`}
                  aria-invalid={Boolean(form.errors.date)}
                  aria-describedby={form.errors.date ? `${formId}-date-error` : undefined}
                />
                {form.errors.date ? (
                  <p id={`${formId}-date-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.date}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${formId}-message`} className={eg.inputLabel}>
                  Occasion / Notes
                </label>
                <textarea
                  id={`${formId}-message`}
                  name="message"
                  rows={4}
                  value={form.values.message}
                  onChange={(event) => form.setField("message", event.target.value)}
                  onBlur={() => form.blurField("message")}
                  className={`mt-2 ${eg.input} resize-y`}
                  aria-invalid={Boolean(form.errors.message)}
                  aria-describedby={form.errors.message ? `${formId}-message-error` : undefined}
                  placeholder="Anniversary tasting, preferred seating, dietary notes..."
                />
                {form.errors.message ? (
                  <p id={`${formId}-message-error`} className="mt-2 text-sm text-[#f0c885]">
                    {form.errors.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
              <p className="text-sm text-[var(--eg-muted)]">
                Reservations are reviewed during service hours.
              </p>
              <button type="submit" className={eg.goldButton} disabled={form.isSubmitting}>
                {form.isSubmitting ? "Sending..." : submitLabel}
              </button>
            </div>

            <div aria-live="polite">
              {form.isSubmitted ? (
                <p className="rounded-2xl border border-[var(--eg-gold)]/35 bg-white/[0.04] px-4 py-3 text-sm text-[var(--eg-cream)]">
                  Request prepared. For same-day seating, please ring the dining room directly.
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
