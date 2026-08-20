import type { ComponentType } from "react";
import type { PageAsset, SectionLayout } from "../../types/page";
import { PremiumAbout01 } from "./about/PremiumAbout01";
import { PremiumAbout02 } from "./about/PremiumAbout02";
import { PremiumAbout03 } from "./about/PremiumAbout03";
import { PremiumContact01 } from "./contact/PremiumContact01";
import { PremiumContact02 } from "./contact/PremiumContact02";
import { PremiumFooter01 } from "./footer/PremiumFooter01";
import { PremiumFooter02 } from "./footer/PremiumFooter02";
import { PremiumFooter03 } from "./footer/PremiumFooter03";
import { PremiumGallery01 } from "./gallery/PremiumGallery01";
import { PremiumGallery02 } from "./gallery/PremiumGallery02";
import { PremiumGallery03 } from "./gallery/PremiumGallery03";
import { PremiumHeader01 } from "./header/PremiumHeader01";
import { PremiumHeader02 } from "./header/PremiumHeader02";
import { PremiumHeader03 } from "./header/PremiumHeader03";
import { PremiumHero01 } from "./hero/PremiumHero01";
import { PremiumHero02 } from "./hero/PremiumHero02";
import { PremiumHero03 } from "./hero/PremiumHero03";
import { PremiumLocation01 } from "./location_map/PremiumLocation01";
import { PremiumLocation02 } from "./location_map/PremiumLocation02";
import { PremiumLocation03 } from "./location_map/PremiumLocation03";
import { PremiumMenu01 } from "./menu/PremiumMenu01";
import { PremiumMenu02 } from "./menu/PremiumMenu02";
import { PremiumMenu03 } from "./menu/PremiumMenu03";
import { PremiumReservation01 } from "./reservation/PremiumReservation01";
import { PremiumReservation02 } from "./reservation/PremiumReservation02";
import { PremiumReservation03 } from "./reservation/PremiumReservation03";
import { PremiumServices01 } from "./services/PremiumServices01";
import { PremiumServices02 } from "./services/PremiumServices02";
import { PremiumServices03 } from "./services/PremiumServices03";
import { PremiumStats01 } from "./stats/PremiumStats01";
import { PremiumStats02 } from "./stats/PremiumStats02";
import { PremiumStats03 } from "./stats/PremiumStats03";
import { PremiumTeam01 } from "./team/PremiumTeam01";
import { PremiumTeam02 } from "./team/PremiumTeam02";
import { PremiumTeam03 } from "./team/PremiumTeam03";
import { PremiumTestimonials01 } from "./testimonials/PremiumTestimonials01";
import { PremiumTestimonials02 } from "./testimonials/PremiumTestimonials02";
import { PremiumTestimonials03 } from "./testimonials/PremiumTestimonials03";

export type SectionComponentProps = {
  content: Record<string, unknown>;
  assets: PageAsset[];
  /** Parameterised layout from Creative Director (optional on legacy pages). */
  layout?: SectionLayout;
};

export type SectionComponent = ComponentType<SectionComponentProps>;

/**
 * Premium section component registry (multiple variants per section type).
 */
export const componentRegistry: Record<string, SectionComponent> = {
  "premium-header-01": PremiumHeader01,
  "premium-header-02": PremiumHeader02,
  "premium-header-03": PremiumHeader03,
  "premium-hero-01": PremiumHero01,
  "premium-hero-02": PremiumHero02,
  "premium-hero-03": PremiumHero03,
  "premium-menu-01": PremiumMenu01,
  "premium-menu-02": PremiumMenu02,
  "premium-menu-03": PremiumMenu03,
  "premium-about-01": PremiumAbout01,
  "premium-about-02": PremiumAbout02,
  "premium-about-03": PremiumAbout03,
  "premium-gallery-01": PremiumGallery01,
  "premium-gallery-02": PremiumGallery02,
  "premium-gallery-03": PremiumGallery03,
  "premium-location-01": PremiumLocation01,
  "premium-location-02": PremiumLocation02,
  "premium-location-03": PremiumLocation03,
  "premium-services-01": PremiumServices01,
  "premium-services-02": PremiumServices02,
  "premium-services-03": PremiumServices03,
  "premium-stats-01": PremiumStats01,
  "premium-stats-02": PremiumStats02,
  "premium-stats-03": PremiumStats03,
  "premium-testimonials-01": PremiumTestimonials01,
  "premium-testimonials-02": PremiumTestimonials02,
  "premium-testimonials-03": PremiumTestimonials03,
  "premium-team-01": PremiumTeam01,
  "premium-team-02": PremiumTeam02,
  "premium-team-03": PremiumTeam03,
  "premium-reservation-01": PremiumReservation01,
  "premium-reservation-02": PremiumReservation02,
  "premium-reservation-03": PremiumReservation03,
  "premium-contact-01": PremiumContact01,
  "premium-contact-02": PremiumContact02,
  "premium-footer-01": PremiumFooter01,
  "premium-footer-02": PremiumFooter02,
  "premium-footer-03": PremiumFooter03,
};
