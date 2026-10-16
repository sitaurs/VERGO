# VERGO language switcher assets

Reference: approved ImageGen mockup `exec-8a50f587-7f63-4728-b2f6-d1938caf2b34.png`.

The design is separated into reusable, native UI assets:

| Element | Production source |
| --- | --- |
| Translate icon | Existing `Languages` SVG from `lucide-react`; 25px, 1.8 stroke |
| Current language badge | Real ID/EN text in CSS pill; hidden from screen readers because the button names the current language |
| Selected / unselected radio | CSS circles driven by `aria-checked`; 22px with 12px selected centre |
| Dropdown | Native browser popover with semantic menu and radio menu items |
| Colour / spacing / motion | `language-switcher.module.css`; emerald/mint/white, 44px trigger, 58px option, 160ms entrance |
| Interaction and language preference | `language-switcher.tsx` and existing `useI18n().setLocale` |

No screenshot or generated raster is embedded as the interface. The existing VERGO logo, profile avatar, VERA, language storage keys, translations, and account settings continue to supply their own assets/data. No new dependency is required.

The menu supports pointer selection, Arrow Up/Down, Home/End, Enter/Space, Tab, Escape, outside click and viewport changes. The selected language receives initial focus. A language change restores focus to the trigger and uses the existing dashboard feedback message. Browser popover rendering places the menu above the header's stacking context; its position is clamped to a 16px viewport inset for phones. Reduced motion retains a brief opacity fade without displacement.
