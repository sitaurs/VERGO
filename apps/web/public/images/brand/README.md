# VERGO · Verify and Go

`vergo-logo.png` is the approved transparent artwork, preserved byte for byte
(2172 × 724 RGBA; SHA-256
`36f21a9a4936cce7eae1edb523b562bd48c09422103a52ae5fed97b335a0cd7f`).

The shared `BrandLogo` component frames its empty margins with CSS. Browser and
Apple icons frame just the original emblem; the Open Graph card uses the complete
logo on white. These variants are rendered through Next.js metadata routes in
`app/icon.tsx`, `app/apple-icon.tsx`, and `app/opengraph-image.tsx`.

`lib/brand.ts` defines the public identity. Static interface copy and its English
translation aliases use VERGO. Existing user content, service names, API/storage
identifiers, the current site domain, and previously generated media keep their
original values. The assistant display name is VERA; existing `sapa*` preference
fields and artwork paths stay compatible. The legacy logo asset remains available
for cached clients.
