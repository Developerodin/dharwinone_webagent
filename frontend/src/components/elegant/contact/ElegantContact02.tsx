import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { useId } from "react";
import type { SectionComponentProps } from "../registry";
import {
  getPrimaryAsset,
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { useContactForm } from "@/components/shared/useContactForm";

/**
 * Elegant atmospheric contact section with editorial copy, cream card, and gold info strip.
 */
export function ElegantContact02({ content, assets }: SectionComponentProps) {
  const formId = useId();
  const headline = getString(content, "headline", "Private Dining & Reservations");
  const body = getString(
    content,
    "body",
    "For tasting menus, private dining, and celebratory evenings, send the details and the team will confirm with care.",
  );
  const address = getString(content, "address", "18 Heritage Court, New Delhi 110001");
  const phone = getString(content, "phone", "+91 98111 22334");
  const email = getString(content, "email", "concierge@cavertahouse.com");
  const hours = getStringArray(content, "hours", [
    "Dinner service · Tue - Sun",
    "6:00 pm to 11:30 pm",
  ]);
  const submitLabel = getString(content, "ctaLabel", "Send Request");
  const imagePath = getPrimaryAsset(assets);
  const form = useContactForm();

  return (
    <section aria-label="Contact and reservations" className="relative overflow-hidden bg-[var(--eg-bg-alt)]">
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.92),rgba(15,15,15,0.84),rgba(10,10,10,0.94)),radial-gradient(circle_at_top_left,rgba(201,169,98,0.16),transparent_32%)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-18 @min-[768px]:px-10 @min-[768px]:py-24">
        <div className="grid gap-8 @min-[1024px]:grid-cols-[0.9fr_1.1fr] @min-[1024px]:items-center">
          <div className="rounded-[2rem] border border-[var(--eg-gold)]/18 bg-black/18 p-6 backdrop-blur-sm @min-[640px]:p-8 @min-[768px]:p-10">
            <p className={eg.eyebrow}>Contact</p>
            <div className="mt-4 flex items-center gap-3">
              <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
              <span aria-hidden="true" className="size-1.5 rotate-45 bg-[var(--eg-gold)]" />
              <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
            </div>
            <h2 className={`mt-5 max-w-lg ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
            <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${eg.body}`}>{body}</p>

            <div className="mt-8 space-y-4">
              <div className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--eg-gold)]" />
                <div>
                  <p className={eg.inputLabel}>Address</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--eg-cream)]">{address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--eg-gold)]" />
                <div>
                  <p className={eg.inputLabel}>Phone</p>
                  <a href={toTelHref(phone)} className="mt-2 block text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
                    {phone}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--eg-gold)]" />
                <div>
                  <p className={eg.inputLabel}>Email</p>
                  <a
                    href={toMailHref(email)}
                    className="mt-2 block break-all text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]"
                  >
                    {email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[var(--eg-cream)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] @min-[640px]:p-8 @min-[768px]:p-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--eg-gold)] @min-[640px]:text-xs">
              Reservation
            </p>
            <h3 className="mt-4 font-[family-name:var(--eg-font-display)] text-[1.9rem] leading-tight text-[var(--eg-bg)] @min-[640px]:text-[2.35rem]">
              Reserve with intention
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#6f6659]">
              The cream card keeps the booking action bright while the room stays atmospheric.
            </p>

            <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit}>
              <div className="grid gap-5 @min-[640px]:grid-cols-2">
                <div>
                  <label htmlFor={`${formId}-name`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
                    Name
                  </label>
                  <input
                    id={`${formId}-name`}
                    name="name"
                    autoComplete="name"
                    value={form.values.name}
                    onChange={(event) => form.setField("name", event.target.value)}
                    onBlur={() => form.blurField("name")}
                    className={`mt-2 ${eg.inputLight}`}
                    aria-invalid={Boolean(form.errors.name)}
                    aria-describedby={form.errors.name ? `${formId}-name-error` : undefined}
                    placeholder="Your full name"
                  />
                  {form.errors.name ? (
                    <p id={`${formId}-name-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-email`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
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
                    className={`mt-2 ${eg.inputLight}`}
                    aria-invalid={Boolean(form.errors.email)}
                    aria-describedby={form.errors.email ? `${formId}-email-error` : undefined}
                    placeholder="name@example.com"
                  />
                  {form.errors.email ? (
                    <p id={`${formId}-email-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-phone`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
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
                    className={`mt-2 ${eg.inputLight}`}
                    aria-invalid={Boolean(form.errors.phone)}
                    aria-describedby={form.errors.phone ? `${formId}-phone-error` : undefined}
                    placeholder="+91 98111 22334"
                  />
                  {form.errors.phone ? (
                    <p id={`${formId}-phone-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.phone}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-partySize`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
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
                    className={`mt-2 ${eg.inputLight}`}
                    aria-invalid={Boolean(form.errors.partySize)}
                    aria-describedby={form.errors.partySize ? `${formId}-partySize-error` : undefined}
                    placeholder="2"
                  />
                  {form.errors.partySize ? (
                    <p id={`${formId}-partySize-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.partySize}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 @min-[640px]:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <label htmlFor={`${formId}-date`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
                    Preferred Date
                  </label>
                  <input
                    id={`${formId}-date`}
                    name="date"
                    type="date"
                    value={form.values.date}
                    onChange={(event) => form.setField("date", event.target.value)}
                    onBlur={() => form.blurField("date")}
                    className={`mt-2 ${eg.inputLight}`}
                    aria-invalid={Boolean(form.errors.date)}
                    aria-describedby={form.errors.date ? `${formId}-date-error` : undefined}
                  />
                  {form.errors.date ? (
                    <p id={`${formId}-date-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.date}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-message`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9c8141] @min-[640px]:text-xs">
                    Occasion / Notes
                  </label>
                  <textarea
                    id={`${formId}-message`}
                    name="message"
                    rows={4}
                    value={form.values.message}
                    onChange={(event) => form.setField("message", event.target.value)}
                    onBlur={() => form.blurField("message")}
                    className={`mt-2 ${eg.inputLight} resize-y`}
                    aria-invalid={Boolean(form.errors.message)}
                    aria-describedby={form.errors.message ? `${formId}-message-error` : undefined}
                    placeholder="Private room, wine pairing, anniversary toast..."
                  />
                  {form.errors.message ? (
                    <p id={`${formId}-message-error`} className="mt-2 text-sm text-[#9a5b2d]">
                      {form.errors.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
                <p className="text-sm text-[#6f6659]">The team confirms each table personally.</p>
                <button type="submit" className={eg.goldButton} disabled={form.isSubmitting}>
                  {form.isSubmitting ? "Sending..." : submitLabel}
                </button>
              </div>

              <div aria-live="polite">
                {form.isSubmitted ? (
                  <p className="rounded-2xl border border-[var(--eg-gold)]/24 bg-[#f3ede2] px-4 py-3 text-sm text-[#2f261d]">
                    Request prepared. The concierge will confirm availability shortly.
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-[1.75rem] border border-[var(--eg-gold)]/18 bg-[var(--eg-gold)]/15 @min-[640px]:mt-10 @min-[768px]:grid-cols-3">
          <div className="bg-[#111111]/92 px-5 py-5">
            <p className={`flex items-center gap-2 ${eg.inputLabel}`}>
              <MapPin aria-hidden="true" className="size-4" />
              Address
            </p>
            <p className="mt-3 text-sm text-[var(--eg-cream)]">{address}</p>
          </div>
          <div className="bg-[#111111]/92 px-5 py-5">
            <p className={`flex items-center gap-2 ${eg.inputLabel}`}>
              <Phone aria-hidden="true" className="size-4" />
              Phone
            </p>
            <a href={toTelHref(phone)} className="mt-3 block text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
              {phone}
            </a>
          </div>
          <div className="bg-[#111111]/92 px-5 py-5">
            <p className={`flex items-center gap-2 ${eg.inputLabel}`}>
              <Clock3 aria-hidden="true" className="size-4" />
              Hours
            </p>
            <div className="mt-3 space-y-1 text-sm text-[var(--eg-cream)]">
              {hours.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
