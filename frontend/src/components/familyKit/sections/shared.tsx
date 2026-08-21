import type { ReactNode } from "react";
import { SectionMedia } from "@/components/shared/SectionMedia";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import {
  getAssetPaths,
  getPrimaryAsset,
  getString,
  renderStyledText,
} from "@/components/premium/contentHelpers";
import type { PageAsset } from "@/types/page";
import { AddressActions } from "@/components/shared/AddressActions";
import { readCoord } from "@/lib/googleMapsLinks";

type SectionIntroProps = {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  tokens: ThemeTokens;
  align?: "left" | "center";
  onDark?: boolean;
};

type MediaPanelProps = {
  src: string | null;
  alt: string;
  className: string;
  fallbackClassName: string;
};

/**
 * Shared section intro block used across family-kit layouts.
 */
export function SectionIntro({
  eyebrow,
  title,
  body,
  tokens,
  align = "left",
  onDark = false,
}: SectionIntroProps) {
  const isCenter = align === "center";
  const alignClass = isCenter ? "mx-auto max-w-3xl text-center" : "text-left";
  const eyebrowClass = onDark ? tokens.eyebrowOnDark : tokens.eyebrow;
  const bodyClass = onDark ? tokens.mutedOnDark : tokens.body;
  // Inherit section text color on dark bands; force ink only on light surfaces.
  const titleClass = onDark
    ? `${tokens.heading} ${tokens.headingSection}`
    : `${tokens.heading} ${tokens.headingSection} text-[var(--theme-ink)]`;

  return (
    <div className={alignClass}>
      {eyebrow?.trim() ? <p className={eyebrowClass}>{eyebrow.trim()}</p> : null}
      <h2 className={`${eyebrow?.trim() ? "mt-3" : ""} ${isCenter ? "text-balance" : ""} ${titleClass}`}>
        {title}
      </h2>
      {body ? (
        <p
          className={`mt-4 text-sm leading-7 @min-[640px]:mt-5 @min-[640px]:text-base @min-[768px]:text-lg ${
            isCenter ? "mx-auto max-w-2xl text-pretty" : "max-w-prose"
          } ${bodyClass}`}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Displays section media with a graceful themed fallback panel.
 */
export function MediaPanel({
  src,
  alt,
  className,
  fallbackClassName,
}: MediaPanelProps) {
  if (!src) {
    return <div aria-hidden="true" className={fallbackClassName} />;
  }

  return (
    <SectionMedia
      src={src}
      alt={alt}
      className={`block max-w-full ${className}`}
    />
  );
}

/**
 * Reads the restaurant brand name from section content.
 */
export function getBrandName(content: Record<string, unknown>): string {
  return getString(content, "brandName", "Atelier Table");
}

/**
 * Reads the supporting restaurant tagline from section content.
 */
export function getTagline(content: Record<string, unknown>): string {
  return getString(content, "tagline", "Seasonal cooking, warm service, and a room made for lingering.");
}

/**
 * Reads a section headline with a sensible default (plain text).
 */
export function getHeadline(
  content: Record<string, unknown>,
  fallback: string,
): string {
  return getString(content, "headline", fallback);
}

/**
 * Reads the menu heading from copy fields (`sectionTitle` or `headline`).
 */
export function getMenuTitle(
  content: Record<string, unknown>,
  fallback: string,
): string {
  return getString(content, "sectionTitle") || getHeadline(content, fallback);
}

/**
 * Reads a section headline preserving styled color runs.
 */
export function getStyledHeadline(
  content: Record<string, unknown>,
  fallback: string,
): ReactNode {
  return renderStyledText(content.headline, fallback);
}

/**
 * Reads longer body copy using common content keys.
 */
export function getBodyCopy(
  content: Record<string, unknown>,
  fallback = "",
): string {
  return (
    getString(content, "body") ||
    getString(content, "introText") ||
    getString(content, "subheading") ||
    fallback
  );
}

export type ContactFact = {
  label: string;
  value: string;
  href?: string;
  kind?: "address" | "phone" | "email" | "hours";
  lat?: number | null;
  lng?: number | null;
};

/**
 * Reads address, phone, email, and hours from content for contact surfaces.
 */
export function getContactFacts(content: Record<string, unknown>): ContactFact[] {
  const address = getString(content, "address");
  const phone = getString(content, "phone");
  const email = getString(content, "email");
  const hours = getHoursText(content);

  const facts: ContactFact[] = [];
  if (address) {
    facts.push({
      label: "Address",
      value: address,
      kind: "address",
      lat: readCoord(content.lat),
      lng: readCoord(content.lng),
    });
  }
  if (phone) {
    facts.push({
      label: "Phone",
      value: phone,
      kind: "phone",
      href: `tel:${phone.replace(/\D/g, "")}`,
    });
  }
  if (email) {
    facts.push({
      label: "Email",
      value: email,
      kind: "email",
      href: `mailto:${email}`,
    });
  }
  if (hours) {
    facts.push({ label: "Hours", value: hours, kind: "hours" });
  }
  return facts;
}

/**
 * Renders a contact fact value, with map actions on addresses.
 */
export function ContactFactValue({
  fact,
  onDark = false,
  align = "start",
}: {
  fact: ContactFact;
  onDark?: boolean;
  align?: "start" | "center";
}) {
  const wrapClass =
    fact.kind === "email"
      ? "break-all"
      : fact.kind === "hours"
        ? "whitespace-pre-line break-words"
        : "break-words";

  return (
    <>
      {fact.href ? (
        <a href={fact.href} className={`${wrapClass} transition-opacity hover:opacity-75`}>
          {fact.value}
        </a>
      ) : (
        <span className={wrapClass}>{fact.value}</span>
      )}
      {fact.kind === "address" ? (
        <AddressActions
          point={{ address: fact.value, lat: fact.lat, lng: fact.lng }}
          onDark={onDark}
          align={align}
        />
      ) : null}
    </>
  );
}

/**
 * Stacked contact facts so long addresses/hours get a full column, not a squeezed inline run.
 */
export function ContactFactList({
  facts,
  onDark = false,
  align = "start",
  className = "grid min-w-0 gap-5",
}: {
  facts: ContactFact[];
  onDark?: boolean;
  align?: "start" | "center";
  className?: string;
}) {
  if (facts.length === 0) return null;

  const isCenter = align === "center";
  const labelClass = onDark
    ? "text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--theme-on-dark)]"
    : "text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--theme-ink)]";
  const valueClass = onDark
    ? "mt-1.5 text-sm leading-6 text-[var(--theme-on-dark)]/88"
    : "mt-1.5 text-sm leading-6 text-[var(--theme-muted)]";

  return (
    <dl className={className}>
      {facts.map((fact) => (
        <div
          key={fact.label}
          className={`min-w-0 ${isCenter ? "max-w-sm flex-1 basis-[14rem] text-center" : ""}`}
        >
          <dt className={labelClass}>{fact.label}</dt>
          <dd className={valueClass}>
            <ContactFactValue fact={fact} onDark={onDark} align={align} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Reads hours from a string or array. Pipe-separated days become separate lines.
 */
export function getHoursText(content: Record<string, unknown>): string {
  const directHours = getString(content, "hours");
  if (directHours) {
    return directHours
      .split(/\s*\|\s*|\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  const lines = getStringList(content, "hours");
  if (lines.length > 0) return lines.join("\n");

  return "";
}

/**
 * Safely reads an array of strings from section content.
 */
export function getStringList(
  content: Record<string, unknown>,
  key: string,
): string[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/**
 * Returns the first image asset or null when none exist.
 */
export function getLeadMedia(assets: PageAsset[]): string | null {
  return getPrimaryAsset(assets);
}

/**
 * Returns ordered asset image paths for gallery-style sections.
 */
export function getGalleryMedia(assets: PageAsset[]): string[] {
  return getAssetPaths(assets).slice(0, 6);
}

/**
 * Resolves a keyed asset first, then falls back to an index slot.
 */
export function getIndexedAsset(
  assets: PageAsset[],
  key: string,
  index: number,
): string | null {
  return assets.find((asset) => asset.key === key)?.imagePath ?? assets[index]?.imagePath ?? null;
}

/**
 * Reads a copyright string or produces a current-year fallback.
 */
export function getCopyrightLine(content: Record<string, unknown>): string {
  const explicit = getString(content, "copyright");
  if (explicit) return explicit;
  return `Copyright ${new Date().getFullYear()} ${getBrandName(content)}. All rights reserved.`;
}
