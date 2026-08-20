import type { SectionComponent } from "../premium/registry";
import { ElegantAbout01 } from "./about/ElegantAbout01";
import { ElegantAbout02 } from "./about/ElegantAbout02";
import { ElegantAbout03 } from "./about/ElegantAbout03";
import { ElegantContact01 } from "./contact/ElegantContact01";
import { ElegantContact02 } from "./contact/ElegantContact02";
import { ElegantFooter01 } from "./footer/ElegantFooter01";
import { ElegantFooter02 } from "./footer/ElegantFooter02";
import { ElegantFooter03 } from "./footer/ElegantFooter03";
import { ElegantGallery01 } from "./gallery/ElegantGallery01";
import { ElegantGallery02 } from "./gallery/ElegantGallery02";
import { ElegantGallery03 } from "./gallery/ElegantGallery03";
import { ElegantHeader01 } from "./header/ElegantHeader01";
import { ElegantHeader02 } from "./header/ElegantHeader02";
import { ElegantHeader03 } from "./header/ElegantHeader03";
import { ElegantHero01 } from "./hero/ElegantHero01";
import { ElegantHero02 } from "./hero/ElegantHero02";
import { ElegantHero03 } from "./hero/ElegantHero03";
import { ElegantLocation01 } from "./location_map/ElegantLocation01";
import { ElegantLocation02 } from "./location_map/ElegantLocation02";
import { ElegantLocation03 } from "./location_map/ElegantLocation03";
import { ElegantMenu01 } from "./menu/ElegantMenu01";
import { ElegantMenu02 } from "./menu/ElegantMenu02";
import { ElegantMenu03 } from "./menu/ElegantMenu03";
import { ElegantReservation01 } from "./reservation/ElegantReservation01";
import { ElegantReservation02 } from "./reservation/ElegantReservation02";
import { ElegantReservation03 } from "./reservation/ElegantReservation03";
import { ElegantServices01 } from "./services/ElegantServices01";
import { ElegantServices02 } from "./services/ElegantServices02";
import { ElegantServices03 } from "./services/ElegantServices03";
import { ElegantStats01 } from "./stats/ElegantStats01";
import { ElegantStats02 } from "./stats/ElegantStats02";
import { ElegantStats03 } from "./stats/ElegantStats03";
import { ElegantTeam01 } from "./team/ElegantTeam01";
import { ElegantTeam02 } from "./team/ElegantTeam02";
import { ElegantTeam03 } from "./team/ElegantTeam03";
import { ElegantTestimonials01 } from "./testimonials/ElegantTestimonials01";
import { ElegantTestimonials02 } from "./testimonials/ElegantTestimonials02";
import { ElegantTestimonials03 } from "./testimonials/ElegantTestimonials03";

export type { SectionComponentProps } from "../premium/registry";

/**
 * Elegant component registry — Caverta-inspired variants per section.
 */
export const elegantRegistry: Record<string, SectionComponent> = {
  "elegant-header-01": ElegantHeader01,
  "elegant-header-02": ElegantHeader02,
  "elegant-header-03": ElegantHeader03,
  "elegant-hero-01": ElegantHero01,
  "elegant-hero-02": ElegantHero02,
  "elegant-hero-03": ElegantHero03,
  "elegant-menu-01": ElegantMenu01,
  "elegant-menu-02": ElegantMenu02,
  "elegant-menu-03": ElegantMenu03,
  "elegant-about-01": ElegantAbout01,
  "elegant-about-02": ElegantAbout02,
  "elegant-about-03": ElegantAbout03,
  "elegant-gallery-01": ElegantGallery01,
  "elegant-gallery-02": ElegantGallery02,
  "elegant-gallery-03": ElegantGallery03,
  "elegant-location-01": ElegantLocation01,
  "elegant-location-02": ElegantLocation02,
  "elegant-location-03": ElegantLocation03,
  "elegant-services-01": ElegantServices01,
  "elegant-services-02": ElegantServices02,
  "elegant-services-03": ElegantServices03,
  "elegant-stats-01": ElegantStats01,
  "elegant-stats-02": ElegantStats02,
  "elegant-stats-03": ElegantStats03,
  "elegant-testimonials-01": ElegantTestimonials01,
  "elegant-testimonials-02": ElegantTestimonials02,
  "elegant-testimonials-03": ElegantTestimonials03,
  "elegant-team-01": ElegantTeam01,
  "elegant-team-02": ElegantTeam02,
  "elegant-team-03": ElegantTeam03,
  "elegant-reservation-01": ElegantReservation01,
  "elegant-reservation-02": ElegantReservation02,
  "elegant-reservation-03": ElegantReservation03,
  "elegant-contact-01": ElegantContact01,
  "elegant-contact-02": ElegantContact02,
  "elegant-footer-01": ElegantFooter01,
  "elegant-footer-02": ElegantFooter02,
  "elegant-footer-03": ElegantFooter03,
};
