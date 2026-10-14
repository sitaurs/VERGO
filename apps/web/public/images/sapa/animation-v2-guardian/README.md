# SAPA Leaf Guardian v2

The eight original transparent PNGs and their manifest are copied byte for byte from the user-supplied `design/sapa-animation-v2-guardian.zip` (14 October 2026). The manifest records SHA-256 hashes, source rectangles, timing, character heights and estimated foot anchors. Original design references, generation prompts and inspection scripts are not needed at runtime.

`components/sapa-motion-data.ts` selects this version for both desktop and mobile. `SapaSprite` keeps the existing 128 × 128 canvas and launcher hit area. All six motions use a 100 px canonical character height with the same foot baseline, preserving the authored jump. Each 4 × 2 sheet uses fractional 443.5 px source cells.

The chat avatar uses `sapa-launcher-icon.png`; the greeting, sprite fallback and account settings use `sapa-master.png`. Chat requests, activity callbacks, dragging, saved preferences and mobile navigation keep their existing behavior. Playback still pauses during dragging, in hidden tabs and under reduced motion.

The v1 files remain available for rollback and old cached pages. Runtime components use v2 paths exclusively. `tests/sapa-guardian.spec.ts` verifies file hashes, pose bounds, loading fallback, chat states, keyboard focus and reduced-motion behavior.
