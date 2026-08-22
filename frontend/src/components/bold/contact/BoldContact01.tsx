import type { SectionComponentProps } from "@/components/premium/registry";
import { getString } from "@/components/premium/contentHelpers";
import {
  ContactFactValue,
  getContactFacts,
} from "@/components/familyKit/sections/shared";
import { createScrollHandler } from "@/lib/scrollToSection";
import { FormStatusBanner } from "@/components/shared/FormStatusBanner";
import { useContactForm } from "@/components/shared/useContactForm";
import { getRestaurantEmail, getRestaurantName } from "@/lib/restaurantEmail";
import { bd } from "../shared/boldTokens";

/**
 * Bold contact — Demo9 “Find Us”: crimson accents, sharp info stack + order CTA.
 */
export function BoldContact01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Find Us");
  const introText = getString(
    content,
    "introText",
    "Walk in hungry. Leave louder. Hours, address, and a line straight to the kitchen.",
  );
  const facts = getContactFacts(content);
  const ctaLabel = getString(content, "ctaLabel", "Order Online");
  const form = useContactForm({
    kind: "contact",
    toEmail: getRestaurantEmail(content),
    businessName: getRestaurantName(content),
  });

  return (
    <section aria-label="Contact" className={`${bd.sectionPad} ${bd.sectionAlt}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] gap-10 @min-[768px]:grid-cols-[1.05fr_0.95fr] @min-[768px]:gap-14">
        <div className="min-w-0">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
            Visit
          </p>
          <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-[var(--theme-ink)] @min-[640px]:text-[2.75rem] @min-[768px]:text-[3.25rem]">
            {headline}
          </h2>
          <p className={`mt-4 max-w-md text-sm uppercase tracking-[0.04em] @min-[640px]:text-base ${bd.body}`}>
            {introText}
          </p>

          <dl className="mt-8 grid gap-0 border border-[var(--theme-line)]">
            {facts.length === 0 ? (
              <div className="p-5">
                <p className={`text-sm ${bd.body}`}>Contact details appear from the brief.</p>
              </div>
            ) : (
              facts.map((fact) => (
                <div
                  key={fact.label}
                  className="border-b border-[var(--theme-line)] p-5 last:border-b-0"
                >
                  <dt className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--bold-hero-red)]">
                    {fact.label}
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-[var(--theme-ink)] @min-[640px]:text-base">
                    <ContactFactValue fact={fact} />
                  </dd>
                </div>
              ))
            )}
          </dl>

          <button
            type="button"
            onClick={createScrollHandler("reservation")}
            className="mt-8 inline-flex min-h-11 items-center bg-[var(--bold-hero-red)] px-7 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bold-hero-red)]"
          >
            {ctaLabel}
          </button>
        </div>

        <form
          className="flex flex-col gap-4 border border-[var(--theme-line)] bg-[var(--theme-card)] p-6 @min-[640px]:p-8"
          noValidate
          onSubmit={(event) => void form.handleSubmit(event)}
          aria-label="Contact form"
        >
          <p className="font-[family-name:var(--theme-font-display)] text-lg font-bold uppercase text-[var(--theme-ink)]">
            Send a note
          </p>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bold-hero-red)]">
              Name
            </span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={form.values.name}
              onChange={(event) => form.setField("name", event.target.value)}
              onBlur={() => form.blurField("name")}
              aria-invalid={Boolean(form.errors.name)}
              className="min-h-11 w-full border border-[var(--theme-line)] bg-[var(--theme-bg)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none placeholder:text-[var(--theme-muted)] focus:border-[var(--bold-hero-red)]"
              placeholder="Your name"
            />
            {form.errors.name ? (
              <p className="mt-2 text-sm text-[var(--bold-hero-red)]">{form.errors.name}</p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bold-hero-red)]">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.values.email}
              onChange={(event) => form.setField("email", event.target.value)}
              onBlur={() => form.blurField("email")}
              aria-invalid={Boolean(form.errors.email)}
              className="min-h-11 w-full border border-[var(--theme-line)] bg-[var(--theme-bg)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none placeholder:text-[var(--theme-muted)] focus:border-[var(--bold-hero-red)]"
              placeholder="you@email.com"
            />
            {form.errors.email ? (
              <p className="mt-2 text-sm text-[var(--bold-hero-red)]">{form.errors.email}</p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bold-hero-red)]">
              Message
            </span>
            <textarea
              name="message"
              rows={4}
              value={form.values.message}
              onChange={(event) => form.setField("message", event.target.value)}
              onBlur={() => form.blurField("message")}
              aria-invalid={Boolean(form.errors.message)}
              className="min-h-28 w-full border border-[var(--theme-line)] bg-[var(--theme-bg)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none placeholder:text-[var(--theme-muted)] focus:border-[var(--bold-hero-red)]"
              placeholder="How can we help?"
            />
            {form.errors.message ? (
              <p className="mt-2 text-sm text-[var(--bold-hero-red)]">{form.errors.message}</p>
            ) : null}
          </label>
          <button
            type="submit"
            disabled={form.isSubmitting}
            className="mt-1 inline-flex min-h-11 items-center justify-center bg-[var(--bold-hero-red)] px-7 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bold-hero-red)] disabled:opacity-60"
          >
            {form.isSubmitting ? "Sending..." : "Send message"}
          </button>
          <FormStatusBanner
            success={form.isSubmitted}
            successMessage={form.successMessage}
            error={form.submitError}
          />
        </form>
      </div>
    </section>
  );
}
