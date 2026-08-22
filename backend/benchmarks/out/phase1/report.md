# Generation benchmark — `phase1`

Cases: 7 · generated 2026-08-22T14:18:17.259Z

## Scorecard

| Metric | phase1 | baseline | Target |
|---|---|---|---|
| Distinct section orders | 4 / 7 | 4 / 7 | ≥ 6 / 7 |
| Distinct layout signatures | 7 / 7 | 4 / 7 | ≥ 5 / 7 |
| Distinct surface rhythms | 5 / 7 | 1 / 7 | ≥ 5 / 7 |
| Distinct spacing rhythms | 5 / 7 | 4 / 7 | ≥ 4 / 7 |
| Distinct families | 3 | 3 | ≥ 3 |
| Distinct accents | 6 / 7 | 6 / 7 | ≥ 6 / 7 |
| Distinct display fonts | 5 / 7 | 2 / 7 | ≥ 4 / 7 |
| Distinct hero images | 6 / 7 | 6 / 7 | ≥ 6 / 7 |
| Image reuse rate | 36.2% | 36.2% | < 10% |
| Mean pairwise text Jaccard | 0.352 | 0.352 | < 0.30 |
| CTA contrast passing AA | 100.0% | 100.0% | 100% |
| Duplicate images on a page | 0 | 0 | 0 |

## Cases

### Modern cafe — `modern-cafe`

- **family** `premium` · **archetype** `neighbourhood` · **sections** 10
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-02, premium-hero-03, premium-about-02, premium-menu-03, premium-stats-01, premium-gallery-01, premium-reservation-02, premium-location-02, premium-contact-01, premium-footer-02`
- **layout** `band>full_bleed>split_right>editorial_columns>grid>marquee>split_right>split_left>centered>band`
- **surface** `base>image>base>base>alt>alt>base>dark>base>dark`
- **spacing** `tight>roomy>roomy>roomy>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#3d4a52` · bg `#eef1f3` · ink `#15181a`
- **type** display `"DM Sans", system-ui, sans-serif` · body `"Work Sans", system-ui, sans-serif`
- **CTA contrast** 9.13 PASS
- **images** 11 (11 unique, 0 duplicated)
- **longest constrained copy** `footer.tagline` 34 chars — “Thank you for visiting Rowan & Rye”

### Luxury restaurant — `luxury-restaurant`

- **family** `elegant` · **archetype** `reservation_first` · **sections** 10
- **order** `header>hero>reservation>menu>about>stats>gallery>location_map>contact>footer`
- **components** `elegant-header-03, elegant-hero-02, elegant-reservation-03, elegant-menu-01, elegant-about-03, elegant-stats-01, elegant-gallery-02, elegant-location-03, elegant-contact-02, elegant-footer-03`
- **layout** `band>centered>split_right>grid>editorial_columns>grid>full_bleed>split_left>centered>band`
- **surface** `base>image>base>alt>base>alt>base>dark>base>dark`
- **spacing** `tight>roomy>roomy>roomy>roomy>tight>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>major>compact>standard>standard>standard>compact`
- **palette** accent `#d4b896` · bg `#1a1814` · ink `#f7f2ea`
- **type** display `"Cormorant Garamond", Georgia, serif` · body `"Karla", system-ui, sans-serif`
- **CTA contrast** 9.98 PASS
- **images** 9 (9 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 52 chars — “Refined Luxury contemporary French in London W1K 3NG”

### Casual restaurant — `casual-restaurant`

- **family** `premium` · **archetype** `story_led` · **sections** 10
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-01, premium-hero-03, premium-about-02, premium-menu-01, premium-stats-02, premium-gallery-02, premium-reservation-01, premium-location-03, premium-contact-02, premium-footer-03`
- **layout** `band>split_right>overlap>editorial_columns>centered>full_bleed>split_right>split_left>centered>band`
- **surface** `base>image>base>alt>base>base>dark>base>base>dark`
- **spacing** `tight>normal>tight>tight>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#5c7a3a` · bg `#eef1e8` · ink `#222018`
- **type** display `"Playfair Display", Georgia, serif` · body `"EB Garamond", Georgia, serif`
- **CTA contrast** 4.88 PASS
- **images** 11 (11 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 36 chars — “Casual Italian trattoria in NY 11201”

### Fine dining restaurant — `fine-dining`

- **family** `minimal` · **archetype** `quick_service` · **sections** 10
- **order** `header>hero>menu>location_map>about>stats>gallery>reservation>contact>footer`
- **components** `minimal-header-03, minimal-hero-01, minimal-menu-01, minimal-location-02, minimal-about-03, minimal-stats-02, minimal-gallery-02, minimal-reservation-01, minimal-contact-02, minimal-footer-03`
- **layout** `band>split_right>editorial_columns>split_right>overlap>centered>full_bleed>band>split_left>band`
- **surface** `base>image>base>alt>base>accent>base>alt>base>dark`
- **spacing** `tight>roomy>roomy>normal>roomy>tight>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>standard>major>compact>standard>standard>standard>compact`
- **palette** accent `#1c1c1c` · bg `#f6f5f3` · ink `#1c1c1c`
- **type** display `"Cormorant Garamond", Georgia, serif` · body `"Karla", system-ui, sans-serif`
- **CTA contrast** 15.91 PASS
- **images** 9 (9 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 40 chars — “Japanese kaiseki fine dining in CA 94109”

### Bakery — `bakery`

- **family** `premium` · **archetype** `quick_service` · **sections** 10
- **order** `header>hero>menu>location_map>about>stats>gallery>reservation>contact>footer`
- **components** `premium-header-02, premium-hero-03, premium-menu-03, premium-location-01, premium-about-02, premium-stats-01, premium-gallery-01, premium-reservation-02, premium-contact-01, premium-footer-02`
- **layout** `band>centered>grid>split_left>editorial_columns>centered>marquee>band>centered>band`
- **surface** `base>image>base>alt>base>base>alt>base>base>dark`
- **spacing** `tight>normal>tight>normal>tight>tight>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>standard>major>compact>standard>standard>standard>compact`
- **palette** accent `#c4a484` · bg `#1c1612` · ink `#f3ebe3`
- **type** display `"Spectral", Georgia, serif` · body `"Source Sans 3", system-ui, sans-serif`
- **CTA contrast** 8.08 PASS
- **images** 11 (11 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 36 chars — “Artisan sourdough bakery in OR 97214”

### Coffee shop — `coffee-shop`

- **family** `premium` · **archetype** `neighbourhood` · **sections** 10
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-03, premium-hero-01, premium-about-03, premium-menu-02, premium-stats-01, premium-gallery-03, premium-reservation-01, premium-location-03, premium-contact-02, premium-footer-03`
- **layout** `band>full_bleed>split_right>editorial_columns>grid>full_bleed>split_right>band>split_left>band`
- **surface** `base>image>base>base>alt>alt>base>dark>base>dark`
- **spacing** `tight>normal>tight>tight>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#3d4a52` · bg `#eef1f3` · ink `#15181a`
- **type** display `"DM Sans", system-ui, sans-serif` · body `"Work Sans", system-ui, sans-serif`
- **CTA contrast** 9.13 PASS
- **images** 9 (9 unique, 0 duplicated)
- **longest constrained copy** `footer.tagline` 38 chars — “Thank you for visiting The Daily Grind”

### Multi-page restaurant — `multi-page-restaurant`

- **family** `premium` · **archetype** `visual_immersive` · **sections** 10
- **order** `header>hero>gallery>about>menu>stats>reservation>location_map>contact>footer`
- **components** `premium-header-01, premium-hero-02, premium-gallery-02, premium-about-03, premium-menu-01, premium-stats-03, premium-reservation-01, premium-location-02, premium-contact-02, premium-footer-03`
- **layout** `band>centered>marquee>editorial_columns>grid>band>split_right>band>centered>band`
- **surface** `base>image>base>alt>base>alt>base>dark>base>dark`
- **spacing** `tight>roomy>roomy>roomy>roomy>tight>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>major>compact>standard>standard>standard>compact`
- **palette** accent `#E0A23A` · bg `#F2F3EA` · ink `#1B2A2E`
- **type** display `"Cormorant", Georgia, serif` · body `"Urbanist", system-ui, sans-serif`
- **CTA contrast** 8.45 PASS
- **images** 9 (9 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 38 chars — “Coastal seafood restaurant in ME 04101”
