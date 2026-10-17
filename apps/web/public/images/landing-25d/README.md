# VERGO 2.5D landing artwork

Six illustrations generated individually with the built-in imagegen tool from the approved VERGO 2.5D mockup. These are transparent artwork assets, not screenshots of a webpage. All headings, labels, buttons, status examples and actual map data remain HTML or the existing interactive map.

`hero.webp` is the unified environmental evidence scene; `scan.webp`, `report.webp`, `review.webp`, `map.webp` and `community.webp` are separate reusable illustrations. The status timeline uses native HTML and Lucide icons rather than raster text.

`prompts.json` records the full generation prompts. `manifest.json` records dimensions, alpha, size and SHA-256 for each optimized WebP. Only technical resize/format conversion was applied after generation; original generated PNGs were preserved outside the repository. The existing VERGO logo and original photographic assets were not replaced.

Illustrated maps and example reports are explicitly labelled as illustrations in the UI. The public map still consumes the existing area API and its Mapbox/Leaflet fallbacks; no mock counts are used as live data.

## FAQ illustration

`faq-illustration.webp` is a separate 1200 x 800 transparent illustration generated from the approved FAQ mockup using built-in imagegen. The clipboard, shield, folded map and speech bubbles form one decorative scene. All seven question icons use the existing Lucide library; the questions, answers, workflow link and native details/summary controls remain HTML. The new CSS is scoped to the FAQ component and includes mobile and reduced-motion styles.
