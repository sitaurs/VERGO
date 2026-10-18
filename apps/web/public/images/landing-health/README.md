# VERGO — environment and health artwork

Three independent transparent WebP assets adapted from the user's section mockup with the built-in imagegen tool on 2026-10-18. Text, links, cards, gradients and external-link icons are native web elements, not embedded screenshot content.

| Asset | Role | Size |
| --- | --- | --- |
| `environment.webp` | Neighbourhood, residents cleaning, sorting bins, creek and heart shield | 1280 × 960 |
| `sdg-reference.webp` | Globe, open book, foliage and heart shield beside the SDG source link | 640 × 480 |
| `who-reference.webp` | Recycling bins, foliage and heart shield beside the WHO source link | 640 × 480 |

All assets have a verified alpha channel and transparent pixels. Sharp resized and encoded the generated PNGs as WebP without changing their composition. `manifest.json` records byte sizes and SHA-256 checksums. The PNG masters remain in the local image-generation output directory.

`prompts.json` contains the generation prompt set. The images are generic illustrations; they do not contain official UN/WHO emblems. Existing source destinations and the explanation of the map's limits remain text in `health-context-section.tsx`.

Runtime URLs: `/images/landing-health/environment.webp`, `/images/landing-health/sdg-reference.webp`, `/images/landing-health/who-reference.webp`.
