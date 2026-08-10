import type { Brief, MenuItem } from "../schemas/brief.schema.js";

const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;

/**
 * Normalizes text for loose source matching.
 * Strips currency symbols and thousands separators so ₹1,295 matches 1295.
 */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[₹$€£,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true when the phone digits appear in the source chat text.
 */
function phoneInSource(phone: string, chatText: string): boolean {
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7) return false;

  const sourceDigits = chatText.replace(/\D/g, "");
  return sourceDigits.includes(phoneDigits);
}

/**
 * Returns true when enough of the address appears in the source chat text.
 */
function addressInSource(address: string, chatText: string): boolean {
  const normalizedSource = normalizeForMatch(chatText);
  const normalizedAddress = normalizeForMatch(address);
  if (normalizedSource.includes(normalizedAddress)) return true;

  const significant = normalizedAddress.slice(0, Math.min(20, normalizedAddress.length));
  return significant.length >= 8 && normalizedSource.includes(significant);
}

/**
 * Builds price strings that may appear in the source for a menu item price.
 */
function priceVariants(price: number): string[] {
  const intPart = Math.trunc(price);
  const withCommas = intPart.toLocaleString("en-US");
  const variants = [
    String(price),
    String(intPart),
    price.toFixed(2),
    `$${price}`,
    `$${price.toFixed(2)}`,
    `₹${price}`,
    `₹${intPart}`,
    `₹${withCommas}`,
    withCommas,
  ];
  if (Number.isInteger(price)) {
    variants.push(`${price}.00`);
  }
  return variants.map(normalizeForMatch);
}

/**
 * Returns true when menu item name and price are supported by the source text.
 */
function menuItemInSource(item: MenuItem, chatText: string): boolean {
  const normalizedSource = normalizeForMatch(chatText);
  const name = normalizeForMatch(item.name);
  if (!normalizedSource.includes(name)) return false;

  return priceVariants(item.price).some((variant) =>
    normalizedSource.includes(variant),
  );
}

/**
 * Strips brief fields that cannot be verified against the original chat dump.
 */
export function verifyBriefAgainstSource(brief: Brief, chatText: string): Brief {
  const verified: Brief = {
    ...brief,
    phone: brief.phone && phoneInSource(brief.phone, chatText) ? brief.phone : null,
    address:
      brief.address && addressInSource(brief.address, chatText)
        ? brief.address
        : null,
    menuItems: brief.menuItems.filter((item) => menuItemInSource(item, chatText)),
    photos: [],
  };

  return verified;
}
