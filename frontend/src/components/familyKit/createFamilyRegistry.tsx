import type { SectionComponent } from "@/components/premium/registry";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { createAboutServicesStatsSections } from "./sections/AboutServicesStatsSections";
import { createHeaderContactFooter } from "./sections/HeaderContactFooter";
import {
  createHeroSections,
  createReservationSections,
} from "./sections/HeroReservationSections";
import { createMenuGalleryLocationSections } from "./sections/MenuGalleryLocationSections";
import { createTestimonialsTeamSections } from "./sections/TestimonialsTeamSections";

/**
 * Creates the shared header/contact/footer subset for a component family.
 */
export { createHeaderContactFooter } from "./sections/HeaderContactFooter";

/**
 * Creates a full section registry for a family using shared section factories.
 */
export function createFamilyRegistry(
  family: string,
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  const heroSections = createHeroSections(tokens);
  const reservationSections = createReservationSections(tokens);
  const aboutServicesStatsSections = createAboutServicesStatsSections(tokens);
  const menuGalleryLocationSections = createMenuGalleryLocationSections(tokens);
  const testimonialsTeamSections = createTestimonialsTeamSections(tokens);
  const shellSections = createHeaderContactFooter(family, tokens);

  return {
    ...shellSections,
    [`${family}-hero-01`]: heroSections.hero01,
    [`${family}-hero-02`]: heroSections.hero02,
    [`${family}-about-01`]: aboutServicesStatsSections.about01,
    [`${family}-about-02`]: aboutServicesStatsSections.about02,
    [`${family}-services-01`]: aboutServicesStatsSections.services01,
    [`${family}-services-02`]: aboutServicesStatsSections.services02,
    [`${family}-menu-01`]: menuGalleryLocationSections.menu01,
    [`${family}-menu-02`]: menuGalleryLocationSections.menu02,
    [`${family}-stats-01`]: aboutServicesStatsSections.stats01,
    [`${family}-stats-02`]: aboutServicesStatsSections.stats02,
    [`${family}-gallery-01`]: menuGalleryLocationSections.gallery01,
    [`${family}-gallery-02`]: menuGalleryLocationSections.gallery02,
    [`${family}-testimonials-01`]: testimonialsTeamSections.testimonials01,
    [`${family}-testimonials-02`]: testimonialsTeamSections.testimonials02,
    [`${family}-team-01`]: testimonialsTeamSections.team01,
    [`${family}-team-02`]: testimonialsTeamSections.team02,
    [`${family}-reservation-01`]: reservationSections.reservation01,
    [`${family}-reservation-02`]: reservationSections.reservation02,
    [`${family}-location-01`]: menuGalleryLocationSections.location01,
    [`${family}-location-02`]: menuGalleryLocationSections.location02,
  };
}
