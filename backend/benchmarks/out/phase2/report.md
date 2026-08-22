# Generation benchmark — `phase2`

Cases: 7 · generated 2026-08-22T14:52:43.968Z

## Scorecard

| Metric | phase2 | phase11 | Target |
|---|---|---|---|
| Catalog-driven selections | 47.1% | n/a | > 0% |
| Section type mismatches | 0 | n/a | 0 |
| Media contract breaches | 0 | n/a | 0 |
| Compatibility penalties applied | 15 | n/a | informational |
| Page structure correct | 7 / 7 | 7 / 7 | 7 / 7 |
| Multi-page sites | 1 | 1 | 1 |
| Distinct section orders | 3 / 7 | 3 / 7 | ≥ 6 / 7 |
| Distinct layout signatures | 7 / 7 | 7 / 7 | ≥ 5 / 7 |
| Distinct surface rhythms | 6 / 7 | 6 / 7 | ≥ 5 / 7 |
| Distinct spacing rhythms | 4 / 7 | 4 / 7 | ≥ 4 / 7 |
| Distinct families | 3 | 3 | ≥ 3 |
| Distinct accents | 6 / 7 | 6 / 7 | ≥ 6 / 7 |
| Distinct display fonts | 5 / 7 | 5 / 7 | ≥ 4 / 7 |
| Distinct hero images | 6 / 7 | 6 / 7 | ≥ 6 / 7 |
| Image reuse rate | 31.3% | 35.3% | < 10% |
| Mean pairwise text Jaccard | 0.317 | 0.317 | < 0.30 |
| CTA contrast passing AA | 100.0% | 100.0% | 100% |
| Duplicate images on a page | 0 | 0 | 0 |

## Cases

### Modern cafe — `modern-cafe`

- **family** `premium` · **archetype** `neighbourhood` · **sections** 10
- **site** `single_page` · pages `home` OK
- **selection** 7 catalog / 3 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-02, premium-hero-01, premium-about-01, premium-menu-01, premium-stats-03, premium-gallery-01, premium-reservation-01, premium-location-01, premium-contact-01, premium-footer-02`
- **layout** `band>full_bleed>split_right>editorial_columns>grid>marquee>split_right>split_left>centered>band`
- **surface** `base>image>base>base>alt>alt>base>dark>base>dark`
- **spacing** `tight>roomy>roomy>roomy>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#3d4a52` · bg `#eef1f3` · ink `#15181a`
- **type** display `"DM Sans", system-ui, sans-serif` · body `"Work Sans", system-ui, sans-serif`
- **CTA contrast** 9.13 PASS
- **images** 6 (6 unique, 0 duplicated)
- **longest constrained copy** `footer.tagline` 34 chars — “Thank you for visiting Rowan & Rye”

### Luxury restaurant — `luxury-restaurant`

- **family** `elegant` · **archetype** `reservation_first` · **sections** 10
- **site** `single_page` · pages `home` OK
- **selection** 1 catalog / 9 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>reservation>menu>about>stats>gallery>location_map>contact>footer`
- **components** `elegant-header-03, elegant-hero-01, elegant-reservation-03, elegant-menu-01, elegant-about-03, elegant-stats-02, elegant-gallery-02, elegant-location-03, elegant-contact-02, elegant-footer-03`
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
- **site** `single_page` · pages `home` OK
- **selection** 7 catalog / 3 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-01, premium-hero-02, premium-about-03, premium-menu-02, premium-stats-01, premium-gallery-03, premium-reservation-01, premium-location-01, premium-contact-01, premium-footer-03`
- **layout** `band>split_right>overlap>editorial_columns>centered>full_bleed>split_right>split_left>centered>band`
- **surface** `base>base>alt>alt>base>base>dark>base>base>dark`
- **spacing** `tight>normal>tight>tight>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#5c7a3a` · bg `#eef1e8` · ink `#222018`
- **type** display `"Playfair Display", Georgia, serif` · body `"EB Garamond", Georgia, serif`
- **CTA contrast** 4.88 PASS
- **images** 6 (6 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 36 chars — “Casual Italian trattoria in NY 11201”

### Fine dining restaurant — `fine-dining`

- **family** `minimal` · **archetype** `reservation_first` · **sections** 10
- **site** `single_page` · pages `home` OK
- **selection** 0 catalog / 10 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>reservation>menu>about>stats>gallery>location_map>contact>footer`
- **components** `minimal-header-03, minimal-hero-01, minimal-reservation-03, minimal-menu-01, minimal-about-03, minimal-stats-02, minimal-gallery-02, minimal-location-01, minimal-contact-01, minimal-footer-02`
- **layout** `band>split_right>band>editorial_columns>overlap>centered>full_bleed>split_right>split_left>band`
- **surface** `base>base>alt>alt>base>accent>base>alt>base>dark`
- **spacing** `tight>roomy>roomy>roomy>roomy>tight>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>major>compact>standard>standard>standard>compact`
- **palette** accent `#1c1c1c` · bg `#f6f5f3` · ink `#1c1c1c`
- **type** display `"Cormorant Garamond", Georgia, serif` · body `"Karla", system-ui, sans-serif`
- **CTA contrast** 15.91 PASS
- **images** 9 (9 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 40 chars — “Japanese kaiseki fine dining in CA 94109”

### Bakery — `bakery`

- **family** `premium` · **archetype** `story_led` · **sections** 10
- **site** `single_page` · pages `home` OK
- **selection** 7 catalog / 3 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-02, premium-hero-01, premium-about-02, premium-menu-03, premium-stats-01, premium-gallery-01, premium-reservation-01, premium-location-01, premium-contact-01, premium-footer-02`
- **layout** `band>centered>editorial_columns>grid>centered>marquee>band>split_left>centered>band`
- **surface** `base>image>base>alt>base>base>alt>base>base>dark`
- **spacing** `tight>normal>tight>tight>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#c4a484` · bg `#1c1612` · ink `#f3ebe3`
- **type** display `"Spectral", Georgia, serif` · body `"Source Sans 3", system-ui, sans-serif`
- **CTA contrast** 8.08 PASS
- **images** 6 (6 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 36 chars — “Artisan sourdough bakery in OR 97214”

### Coffee shop — `coffee-shop`

- **family** `premium` · **archetype** `neighbourhood` · **sections** 10
- **site** `single_page` · pages `home` OK
- **selection** 7 catalog / 3 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>about>menu>stats>gallery>reservation>location_map>contact>footer`
- **components** `premium-header-03, premium-hero-01, premium-about-01, premium-menu-01, premium-stats-02, premium-gallery-01, premium-reservation-01, premium-location-01, premium-contact-01, premium-footer-03`
- **layout** `band>full_bleed>split_right>editorial_columns>grid>full_bleed>split_right>band>split_left>band`
- **surface** `base>image>base>base>alt>alt>base>dark>base>dark`
- **spacing** `tight>normal>tight>tight>tight>normal>normal>normal>normal>tight`
- **emphasis** `compact>hero>major>major>compact>standard>standard>standard>standard>compact`
- **palette** accent `#3d4a52` · bg `#eef1f3` · ink `#15181a`
- **type** display `"DM Sans", system-ui, sans-serif` · body `"Work Sans", system-ui, sans-serif`
- **CTA contrast** 9.13 PASS
- **images** 6 (6 unique, 0 duplicated)
- **longest constrained copy** `footer.tagline` 38 chars — “Thank you for visiting The Daily Grind”

### Multi-page restaurant — `multi-page-restaurant`

- **family** `premium` · **archetype** `story_led` · **sections** 7
- **site** `multi_page` · pages `home, menu, about, services, gallery, contact` OK
- **selection** 11 catalog / 14 legacy · mismatches 0 · media breaches 0
- **order** `header>hero>about>gallery>menu>reservation>footer`
- **components** `premium-header-01, premium-hero-01, premium-about-02, premium-gallery-03, premium-menu-02, premium-reservation-01, premium-footer-03`
- **layout** `band>centered>editorial_columns>marquee>grid>split_right>band`
- **surface** `base>image>base>base>alt>dark>dark`
- **spacing** `tight>roomy>roomy>normal>roomy>normal>tight`
- **emphasis** `compact>hero>major>standard>major>standard>compact`
- **palette** accent `#E0A23A` · bg `#F2F3EA` · ink `#1B2A2E`
- **type** display `"Cormorant", Georgia, serif` · body `"Urbanist", system-ui, sans-serif`
- **CTA contrast** 8.45 PASS
- **images** 6 (6 unique, 0 duplicated)
- **longest constrained copy** `header.tagline` 38 chars — “Coastal seafood restaurant in ME 04101”
