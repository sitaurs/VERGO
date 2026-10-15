# VERGO landing hero assets

Independent WebP assets reconstructed from the approved dimensional-icon mockup using the built-in imagegen tool. These are illustrations; the bottle is a sample scan and the map does not represent real incident data. Text, navigation, buttons, card surfaces, decorative paths, and responsive layout remain native web components.

| Asset | Purpose |
| --- | --- |
| `camera.webp` | Transparent cobalt camera with scanning brackets |
| `report.webp` | Transparent emerald document and location pin |
| `map.webp` | Transparent blue location pin and folded map |
| `bottle.webp` | Portrait sample photograph for the scan result |
| `map-preview.webp` | Illustrative map and three emerald markers |

The three icons retain their alpha channels. The shipped assets total approximately 132 KiB. Dimensions, byte sizes, and SHA-256 checksums are recorded in `manifest.json`. Original generated images remain outside the public application bundle.

Generation brief: isolate each approved icon with its original palette, geometry and restrained 2.5D material; remove the UI tile and all text onto a true transparent background. Reconstruct the bottle photograph and map thumbnail without the surrounding card or baked-in rotation. Export optimized WebP variants for the actual display sizes.
