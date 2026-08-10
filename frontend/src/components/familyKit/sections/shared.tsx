import { SectionMedia } from "@/components/shared/SectionMedia";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import {
  getAssetPaths,
  getPrimaryAsset,
  getString,
} from "@/components/premium/contentHelpers";
import type { PageAsset } from "@/types/page";

type SectionIntroProps = {
  eyebrow: string;
  title: string;
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
  const alignClass = align === "center" ? "text-center" : "text-left";
  const ruleClass = align === "center" ? "mx-auto" : "";
  const eyebrowClass = onDark ? tokens.eyebrowOnDark : tokens.eyebrow;
  const ruleTone = onDark ? tokens.ruleOnDark : tokens.rule;
  const bodyClass = onDark ? tokens.mutedOnDark : tokens.body;
  // Inherit section text color on dark bands; force ink only on light surfaces.
  const titleClass = onDark
    ? `${tokens.heading} ${tokens.headingSection}`
    : `${tokens.heading} ${tokens.headingSection} text-[var(--theme-ink)]`;

  return (
    <div className={alignClass}>
      <p className={eyebrowClass}>{eyebrow}</p>
      <span aria-hidden="true" className={`mt-3 block ${ruleClass} ${ruleTone}`} />
      <h2 className={`mt-4 ${titleClass}`}>{title}</h2>
      {body ? (
        <p
          className={`mt-4 text-sm @min-[640px]:mt-5 @min-[640px]:text-base @min-[768px]:text-lg ${bodyClass}`}
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
 * Reads a section headline with a sensible default.
 */
export function getHeadline(
  content: Record<string, unknown>,
  fallback: string,
): string {
  return getString(content, "headline", fallback);
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

/**
 * Reads address, phone, email, and hours from content for contact surfaces.
 */
export function getContactFacts(content: Record<string, unknown>): Array<{
  label: string;
  value: string;
  href?: string;
}> {
  const address = getString(content, "address");
  const phone = getString(content, "phone");
  const email = getString(content, "email");
  const hours = getHoursText(content);

  return [
    address ? { label: "Address", value: address } : null,
    phone
      ? {
          label: "Phone",
          value: phone,
          href: `tel:${phone.replace(/\D/g, "")}`,
        }
      : null,
    email ? { label: "Email", value: email, href: `mailto:${email}` } : null,
    hours ? { label: "Hours", value: hours } : null,
  ].filter((item): item is { label: string; value: string; href?: string } => Boolean(item));
}

/**
 * Reads hours from either a string field or an array of lines.
 */
export function getHoursText(content: Record<string, unknown>): string {
  const directHours = getString(content, "hours");
  if (directHours) return directHours;

  const lines = getStringList(content, "hours");
  if (lines.length > 0) return lines.join(" | ");

  return "Mon-Sun | 12:00 PM - 10:30 PM";
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
