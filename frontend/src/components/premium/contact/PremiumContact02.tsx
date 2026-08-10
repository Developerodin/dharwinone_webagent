import { Clock3, Mail, MapPin, Phone } from "lucide-react";
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
  const email = getString(content, "email", "concierge@maisoncopper.com");
  const hours = getStringArray(content, "hours", [
    "Dinner service · Tue - Sun",
    "6:00 pm to 11:30 pm",
  ]);
  const submitLabel = getString(content, "ctaLabel", "Request Reservation");
  const imagePath = getPrimaryAsset(assets);
  const form = useContactForm();

  return (
    <section aria-label="Contact and reservation" className="relative overflow-hidden bg-[#120f0d]">
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,142,107,0.16),transparent_34%),linear-gradient(135deg,rgba(10,8,7,0.96),rgba(18,15,13,0.88),rgba(10,8,7,0.96))]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-18 @min-[768px]:px-10 @min-[768px]:py-24">
        <div className="grid gap-8 @min-[1024px]:grid-cols-[0.95fr_1.05fr] @min-[1024px]:items-center">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 backdrop-blur-sm @min-[640px]:p-8 @min-[768px]:p-10">
            <p className={pm.eyebrow}>Contact</p>
            <h2 className={`mt-4 max-w-lg ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
            <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>

            <div className="mt-8 space-y-4">
              <div className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#c68e6b]" />
                <div>
                  <p className={pm.inputLabel}>Address</p>
                  <p className="mt-2 text-sm leading-6 text-[#f4ede7]">{address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#c68e6b]" />
                <div>
                  <p className={pm.inputLabel}>Phone</p>
                  <a href={toTelHref(phone)} className="mt-2 block text-sm text-[#f4ede7] transition hover:text-[#c68e6b]">
                    {phone}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#c68e6b]" />
                <div>
                  <p className={pm.inputLabel}>Email</p>
                  <a
                    href={toMailHref(email)}
                    className="mt-2 block break-all text-sm text-[#f4ede7] transition hover:text-[#c68e6b]"
                  >
                    {email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] @min-[640px]:p-8 @min-[768px]:p-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#c68e6b] @min-[640px]:text-xs">
              Reservation
            </p>
            <h3 className="mt-4 font-[family-name:var(--font-display)] text-[1.9rem] leading-tight text-[#1c1713] @min-[640px]:text-[2.35rem]">
              Save your table
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#6b5a4f]">
              A bright reservation card against a moody room keeps the action unmistakable.
            </p>

            <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit}>
              <div className="grid gap-5 @min-[640px]:grid-cols-2">
                <div>
                  <label htmlFor={`${formId}-name`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
                    Name
                  </label>
                  <input
                    id={`${formId}-name`}
                    name="name"
                    autoComplete="name"
                    value={form.values.name}
                    onChange={(event) => form.setField("name", event.target.value)}
                    onBlur={() => form.blurField("name")}
                    className={`mt-2 ${pm.inputLight}`}
                    aria-invalid={Boolean(form.errors.name)}
                    aria-describedby={form.errors.name ? `${formId}-name-error` : undefined}
                    placeholder="Your full name"
                  />
                  {form.errors.name ? (
                    <p id={`${formId}-name-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-email`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
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
                    className={`mt-2 ${pm.inputLight}`}
                    aria-invalid={Boolean(form.errors.email)}
                    aria-describedby={form.errors.email ? `${formId}-email-error` : undefined}
                    placeholder="name@example.com"
                  />
                  {form.errors.email ? (
                    <p id={`${formId}-email-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-phone`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
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
                    className={`mt-2 ${pm.inputLight}`}
                    aria-invalid={Boolean(form.errors.phone)}
                    aria-describedby={form.errors.phone ? `${formId}-phone-error` : undefined}
                    placeholder="+91 98765 43210"
                  />
                  {form.errors.phone ? (
                    <p id={`${formId}-phone-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.phone}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-partySize`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
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
                    className={`mt-2 ${pm.inputLight}`}
                    aria-invalid={Boolean(form.errors.partySize)}
                    aria-describedby={form.errors.partySize ? `${formId}-partySize-error` : undefined}
                    placeholder="2"
                  />
                  {form.errors.partySize ? (
                    <p id={`${formId}-partySize-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.partySize}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 @min-[640px]:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <label htmlFor={`${formId}-date`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
                    Preferred Date
                  </label>
                  <input
                    id={`${formId}-date`}
                    name="date"
                    type="date"
                    value={form.values.date}
                    onChange={(event) => form.setField("date", event.target.value)}
                    onBlur={() => form.blurField("date")}
                    className={`mt-2 ${pm.inputLight}`}
                    aria-invalid={Boolean(form.errors.date)}
                    aria-describedby={form.errors.date ? `${formId}-date-error` : undefined}
                  />
                  {form.errors.date ? (
                    <p id={`${formId}-date-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.date}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={`${formId}-message`} className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8d674e] @min-[640px]:text-xs">
                    Occasion / Notes
                  </label>
                  <textarea
                    id={`${formId}-message`}
                    name="message"
                    rows={4}
                    value={form.values.message}
                    onChange={(event) => form.setField("message", event.target.value)}
                    onBlur={() => form.blurField("message")}
                    className={`mt-2 ${pm.inputLight} resize-y`}
                    aria-invalid={Boolean(form.errors.message)}
                    aria-describedby={form.errors.message ? `${formId}-message-error` : undefined}
                    placeholder="Birthday dinner, tasting menu, allergies..."
                  />
                  {form.errors.message ? (
                    <p id={`${formId}-message-error`} className="mt-2 text-sm text-[#a85836]">
                      {form.errors.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
                <p className="text-sm text-[#6b5a4f]">Reservations are confirmed manually.</p>
                <button type="submit" className={pm.primaryButton} disabled={form.isSubmitting}>
                  {form.isSubmitting ? "Sending..." : submitLabel}
                </button>
              </div>

              <div aria-live="polite">
                {form.isSubmitted ? (
                  <p className="rounded-2xl border border-[#d8c4b5] bg-[#f8f1eb] px-4 py-3 text-sm text-[#3b2c22]">
                    Request prepared. Expect a follow-up from the concierge team.
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 @min-[640px]:mt-10 @min-[768px]:grid-cols-3">
          <div className="bg-[#17120f]/88 px-5 py-5">
            <p className={`flex items-center gap-2 ${pm.inputLabel}`}>
              <MapPin aria-hidden="true" className="size-4" />
              Address
            </p>
            <p className="mt-3 text-sm text-[#f4ede7]">{address}</p>
          </div>
          <div className="bg-[#17120f]/88 px-5 py-5">
            <p className={`flex items-center gap-2 ${pm.inputLabel}`}>
              <Phone aria-hidden="true" className="size-4" />
              Phone
            </p>
            <a href={toTelHref(phone)} className="mt-3 block text-sm text-[#f4ede7] transition hover:text-[#c68e6b]">
              {phone}
            </a>
          </div>
          <div className="bg-[#17120f]/88 px-5 py-5">
            <p className={`flex items-center gap-2 ${pm.inputLabel}`}>
              <Clock3 aria-hidden="true" className="size-4" />
              Hours
            </p>
            <div className="mt-3 space-y-1 text-sm text-[#f4ede7]">
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
