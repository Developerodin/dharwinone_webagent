import type { SectionComponent } from "@/components/premium/registry";
import { createFamilyRegistry } from "@/components/familyKit/createFamilyRegistry";
import { BoldAbout01 } from "./about/BoldAbout01";
import { BoldContact01 } from "./contact/BoldContact01";
import { BoldFooter01 } from "./footer/BoldFooter01";
import { BoldGallery01 } from "./gallery/BoldGallery01";
import { BoldHeader01 } from "./header/BoldHeader01";
import { BoldHero01 } from "./hero/BoldHero01";
import { BoldHero02 } from "./hero/BoldHero02";
import { BoldLocation01 } from "./location_map/BoldLocation01";
import { BoldMenu01 } from "./menu/BoldMenu01";
import { BoldReservation01 } from "./reservation/BoldReservation01";
import { BoldServices01 } from "./services/BoldServices01";
import { BoldStats01 } from "./stats/BoldStats01";
import { BoldTeam01 } from "./team/BoldTeam01";
import { BoldTestimonials01 } from "./testimonials/BoldTestimonials01";
import { bd } from "./shared/boldTokens";

/**
 * Bold registry — every section slot uses Demo9 components (no family-kit fallbacks).
 */
export const boldRegistry: Record<string, SectionComponent> = {
  ...createFamilyRegistry("bold", bd),
  "bold-header-01": BoldHeader01,
  "bold-header-02": BoldHeader01,
  "bold-header-03": BoldHeader01,
  "bold-hero-01": BoldHero01,
  "bold-hero-02": BoldHero02,
  "bold-about-01": BoldAbout01,
  "bold-about-02": BoldAbout01,
  "bold-services-01": BoldServices01,
  "bold-services-02": BoldServices01,
  "bold-menu-01": BoldMenu01,
  "bold-menu-02": BoldMenu01,
  "bold-stats-01": BoldStats01,
  "bold-stats-02": BoldStats01,
  "bold-gallery-01": BoldGallery01,
  "bold-gallery-02": BoldGallery01,
  "bold-testimonials-01": BoldTestimonials01,
  "bold-testimonials-02": BoldTestimonials01,
  "bold-team-01": BoldTeam01,
  "bold-team-02": BoldTeam01,
  "bold-reservation-01": BoldReservation01,
  "bold-reservation-02": BoldReservation01,
  "bold-location-01": BoldLocation01,
  "bold-location-02": BoldLocation01,
  "bold-contact-01": BoldContact01,
  "bold-contact-02": BoldContact01,
  "bold-footer-01": BoldFooter01,
  "bold-footer-02": BoldFooter01,
};
