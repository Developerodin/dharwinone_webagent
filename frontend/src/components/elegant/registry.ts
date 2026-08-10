import type { SectionComponent } from "../premium/registry";
import { ElegantAbout01 } from "./about/ElegantAbout01";
import { ElegantAbout02 } from "./about/ElegantAbout02";
import { ElegantContact01 } from "./contact/ElegantContact01";
import { ElegantContact02 } from "./contact/ElegantContact02";
import { ElegantFooter01 } from "./footer/ElegantFooter01";
import { ElegantFooter02 } from "./footer/ElegantFooter02";
import { ElegantGallery01 } from "./gallery/ElegantGallery01";
import { ElegantGallery02 } from "./gallery/ElegantGallery02";
import { ElegantHeader01 } from "./header/ElegantHeader01";
import { ElegantHero01 } from "./hero/ElegantHero01";
import { ElegantHero02 } from "./hero/ElegantHero02";
import { ElegantHero03 } from "./hero/ElegantHero03";
import { ElegantLocation01 } from "./location_map/ElegantLocation01";
import { ElegantLocation02 } from "./location_map/ElegantLocation02";
import { ElegantMenu01 } from "./menu/ElegantMenu01";
import { ElegantMenu02 } from "./menu/ElegantMenu02";
import { ElegantReservation01 } from "./reservation/ElegantReservation01";
import { ElegantReservation02 } from "./reservation/ElegantReservation02";
import { ElegantServices01 } from "./services/ElegantServices01";
import { ElegantServices02 } from "./services/ElegantServices02";
import { ElegantStats01 } from "./stats/ElegantStats01";
import { ElegantStats02 } from "./stats/ElegantStats02";
import { ElegantTeam01 } from "./team/ElegantTeam01";
import { ElegantTeam02 } from "./team/ElegantTeam02";
import { ElegantTestimonials01 } from "./testimonials/ElegantTestimonials01";
import { ElegantTestimonials02 } from "./testimonials/ElegantTestimonials02";

export type { SectionComponentProps } from "../premium/registry";

/**
 * Elegant component registry — Caverta-inspired variants per section.
 */
export const elegantRegistry: Record<string, SectionComponent> = {
  "elegant-header-01": ElegantHeader01,
  "elegant-hero-01": ElegantHero01,
  "elegant-hero-02": ElegantHero02,
  "elegant-hero-03": ElegantHero03,
  "elegant-menu-01": ElegantMenu01,
  "elegant-menu-02": ElegantMenu02,
  "elegant-about-01": ElegantAbout01,
  "elegant-about-02": ElegantAbout02,
  "elegant-gallery-01": ElegantGallery01,
  "elegant-gallery-02": ElegantGallery02,
  "elegant-location-01": ElegantLocation01,
  "elegant-location-02": ElegantLocation02,
  "elegant-services-01": ElegantServices01,
  "elegant-services-02": ElegantServices02,
  "elegant-stats-01": ElegantStats01,
  "elegant-stats-02": ElegantStats02,
  "elegant-testimonials-01": ElegantTestimonials01,
  "elegant-testimonials-02": ElegantTestimonials02,
  "elegant-team-01": ElegantTeam01,
  "elegant-team-02": ElegantTeam02,
  "elegant-reservation-01": ElegantReservation01,
  "elegant-reservation-02": ElegantReservation02,
  "elegant-contact-01": ElegantContact01,
  "elegant-contact-02": ElegantContact02,
  "elegant-footer-01": ElegantFooter01,
  "elegant-footer-02": ElegantFooter02,
};
