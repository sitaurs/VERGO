// Playback metadata from the supplied VERA Leaf Guardian v2 manifest.
// Original PNGs remain unchanged; fractional cells and foot anchors are preserved.
export const SAPA_ASSET_ROOT = "/images/sapa/animation-v2-guardian/";
export const SAPA_ARTWORK = {
  master: `${SAPA_ASSET_ROOT}sapa-master.png`,
  avatar: `${SAPA_ASSET_ROOT}sapa-launcher-icon.png`,
} as const;

export const SAPA_MOTIONS = {
  idle: {
    file: "sapa-idle-blink-sheet.png", loop: true,
    characterHeight: 289.0,
    durations: [3500, 160, 70, 100, 70, 200, 1600, 1800],
    anchors: [[234.07, 415.5], [235.04, 415.5], [233.17, 415.5], [232.6, 415.5], [233.78, 368.0], [233.68, 368.5], [232.22, 368.0], [231.95, 368.0]],
  },
  wave: {
    file: "sapa-wave-sheet.png", loop: false,
    characterHeight: 312.0,
    durations: [100, 90, 90, 100, 100, 100, 90, 130],
    anchors: [[241.08, 399.5], [224.7, 400.0], [224.12, 400.0], [224.54, 400.0], [239.6, 383.5], [224.72, 383.5], [224.41, 383.5], [227.41, 383.5]],
  },
  curious: {
    file: "sapa-curious-sheet.png", loop: false,
    characterHeight: 298.0,
    durations: [110, 90, 90, 120, 110, 100, 90, 150],
    anchors: [[234.7, 418.0], [233.81, 418.0], [229.31, 418.0], [226.8, 418.0], [234.27, 370.0], [234.8, 370.5], [229.11, 370.0], [226.78, 370.5]],
  },
  thinking: {
    file: "sapa-thinking-sheet.png", loop: true,
    characterHeight: 338.0,
    durations: [250, 220, 220, 220, 220, 220, 220, 250],
    anchors: [[217.84, 418.0], [217.5, 418.0], [215.78, 418.0], [217.12, 418.0], [218.01, 390.0], [216.41, 390.5], [215.64, 390.0], [217.43, 390.0]],
  },
  success: {
    file: "sapa-success-jump-sheet.png", loop: false,
    characterHeight: 294.0,
    durations: [110, 100, 80, 100, 90, 110, 110, 150],
    anchors: [[232.37, 410.5], [227.54, 413.5], [215.45, 386.5], [217.39, 386.5], [226.46, 354.5], [227.15, 371.5], [218.28, 372.5], [226.36, 373.0]],
  },
  error: {
    file: "sapa-helpful-error-sheet.png", loop: false,
    characterHeight: 323.0,
    durations: [130, 120, 120, 140, 110, 120, 120, 160],
    anchors: [[235.93, 434.5], [228.83, 435.0], [219.62, 434.5], [212.17, 435.0], [238.31, 388.0], [232.74, 388.0], [221.69, 388.0], [214.9, 388.0]],
  },
} as const;

export type SapaMotion = keyof typeof SAPA_MOTIONS;
export type SapaActivityPhase = "idle" | "thinking" | "success" | "error";
export type SapaActivity = { id: number; phase: SapaActivityPhase };
