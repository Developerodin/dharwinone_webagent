import type { ReactNode } from "react";
import { createElement, Fragment } from "react";
import type { TextRun } from "@/types/page";

/**
 * Flattens a string or styled-runs field to plain text.
 */
export function textFieldToPlain(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { runs?: unknown }).runs)
  ) {
    return (value as { runs: TextRun[] }).runs
      .map((run) => (typeof run?.text === "string" ? run.text : ""))
      .join("");
  }
  return "";
}

/**
 * Safely reads a string field from section content (unwraps styled runs).
 */
export function getString(
  content: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const plain = textFieldToPlain(content[key]);
  return plain || fallback;
}

/**
 * Renders a content field that may be plain text or colored runs.
 */
export function renderStyledText(
  value: unknown,
  fallback = "",
): ReactNode {
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { runs?: unknown }).runs)
  ) {
    const runs = (value as { runs: TextRun[] }).runs.filter(
      (run) => typeof run?.text === "string" && run.text.length > 0,
    );
    if (runs.length === 0) return fallback;
    return createElement(
      Fragment,
      null,
      ...runs.map((run, index) =>
        run.color
          ? createElement(
              "span",
              { key: index, style: { color: run.color } },
              run.text,
            )
          : createElement(Fragment, { key: index }, run.text),
      ),
    );
  }
  if (typeof value === "string" && value) return value;
  return fallback;
}

/**
 * Safely reads a string list from section content.
 */
export function getStringArray(
  content: Record<string, unknown>,
  key: string,
  fallback: string[] = [],
): string[] {
  const value = content[key];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return fallback;
}

/**
 * Safely reads menu items from section content.
 */
export function getMenuItems(content: Record<string, unknown>): Array<{
  name: string;
  price: number;
  description?: string;
}> {
  const items = content.items;
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (item): item is { name: string; price: number; description?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { price?: unknown }).price === "number",
    )
    .map((item) => ({
      name: item.name,
      price: item.price,
      description:
        typeof item.description === "string" ? item.description : undefined,
    }));
}

/**
 * Resolves the primary asset image path for a section.
 */
export function getPrimaryAsset(
  assets: { key: string; imagePath: string }[],
): string | null {
  const primary = assets.find((a) => a.key === "primary");
  return primary?.imagePath ?? assets[0]?.imagePath ?? null;
}

/**
 * Reads ordered image paths from section assets.
 */
export function getAssetPaths(
  assets: { key: string; imagePath: string }[],
): string[] {
  return assets
    .map((asset) => asset.imagePath)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

/**
 * Safely reads service feature cards from section content.
 */
export function getServiceItems(content: Record<string, unknown>): Array<{
  title: string;
  description: string;
}> {
  const items = content.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item): item is { title: string; description: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { title?: unknown }).title === "string" &&
        typeof (item as { description?: unknown }).description === "string",
    )
    .map((item) => ({ title: item.title, description: item.description }));
}

/**
 * Safely reads stats counters from section content.
 */
export function getStatItems(content: Record<string, unknown>): Array<{
  value: string;
  label: string;
}> {
  const items = content.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item): item is { value: string; label: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { value?: unknown }).value === "string" &&
        typeof (item as { label?: unknown }).label === "string",
    )
    .map((item) => ({ value: item.value, label: item.label }));
}

/**
 * Safely reads testimonial / comment entries from section content.
 */
export function getTestimonials(content: Record<string, unknown>): Array<{
  quote: string;
  name: string;
  role: string;
}> {
  const items = content.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item): item is { quote: string; name: string; role: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { quote?: unknown }).quote === "string" &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { role?: unknown }).role === "string",
    )
    .map((item) => ({
      quote: item.quote,
      name: item.name,
      role: item.role,
    }));
}

/**
 * Safely reads team / chef members from section content.
 */
export function getTeamMembers(content: Record<string, unknown>): Array<{
  name: string;
  role: string;
  bio?: string;
}> {
  const members = content.members;
  if (!Array.isArray(members)) return [];
  return members
    .filter(
      (item): item is { name: string; role: string; bio?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { role?: unknown }).role === "string",
    )
    .map((item) => ({
      name: item.name,
      role: item.role,
      bio: typeof item.bio === "string" ? item.bio : undefined,
    }));
}

/**
 * Formats a price for display.
 * Whole amounts ≥ 100 use ₹ (typical Indian cafe menus); otherwise $.
 */
export function formatPrice(price: number): string {
  if (Number.isInteger(price) && price >= 100) {
    return `₹${price}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Returns true when a CTA label implies a reservation flow.
 */
export function isBookingCtaLabel(label: string): boolean {
  return /reserve|reservation|book/i.test(label);
}

/**
 * Converts a phone number into a safe tel: href.
 */
export function toTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized}`;
}

/**
 * Converts an email address into a safe mailto: href.
 */
export function toMailHref(email: string): string {
  return `mailto:${email.trim()}`;
}

/**
 * Even-column gallery grid classes for 1–4 images (no empty center gaps).
 */
export function galleryEvenGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 mx-auto max-w-md";
  if (count === 2) return "mx-auto max-w-3xl grid-cols-1 @min-[480px]:grid-cols-2";
  if (count === 3) return "grid-cols-1 @min-[640px]:grid-cols-3";
  return "grid-cols-2 @min-[768px]:grid-cols-4";
}

/**
 * Bento grid container classes for asymmetric 2–4 image layouts.
 */
export function galleryBentoGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 mx-auto max-w-lg";
  if (count === 2) return "mx-auto max-w-4xl grid-cols-1 @min-[480px]:grid-cols-2";
  if (count === 3) return "grid-cols-1 @min-[640px]:grid-cols-2 @min-[640px]:grid-rows-2";
  return "grid-cols-2 @min-[768px]:grid-cols-4";
}

/**
 * Per-item classes for the bento gallery (featured tile when count === 3).
 */
export function galleryBentoItemClass(count: number, index: number): string {
  if (count === 3 && index === 0) {
    return "@min-[640px]:row-span-2 aspect-[4/5] @min-[640px]:aspect-auto @min-[640px]:h-full min-h-[12rem]";
  }
  if (count === 3) {
    return "aspect-[4/3] @min-[640px]:aspect-auto @min-[640px]:h-full min-h-[8rem]";
  }
  if (count === 2) {
    return "aspect-[3/4]";
  }
  return "aspect-[3/4]";
}
