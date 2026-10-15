import { common } from "./common";
import { landing } from "./landing";
import { scan } from "./scan";
import { reports } from "./reports";
import { activities } from "./activities";
import { volunteer } from "./volunteer";
import { community } from "./community";
import { communityDesign } from "./community-design";
import { evidence } from "./evidence";
import { impact } from "./impact";
import { instagram } from "./instagram";
import { misc } from "./misc";
import { dynamic } from "./dynamic";
import { errors } from "./errors";
const catalogue: Record<string, string> = { ...common, ...landing, ...scan, ...reports, ...activities, ...community, ...evidence, ...impact, ...instagram, ...misc, ...dynamic, ...errors, ...volunteer, ...communityDesign };
function productCopy(text: string) {
  return text.replaceAll("SAP Sustainable AI Platform", "VERGO — Verify and Go")
    .replaceAll("Sustainable AI Platform (SAP)", "VERGO")
    .replaceAll("Sustainable AI Platform", "VERGO").replace(/\bSAP\b/g, "VERGO")
    .replace(/\bSAPA\b/g, "VERA");
}
// Alias only known static UI strings. Never rewrite arbitrary reports, captions or API data.
// Legacy keys remain available to existing error adapters and cached callers.
export const english: Record<string, string> = Object.fromEntries(Object.entries(catalogue).flatMap(([source, value]) => [
  [source, productCopy(value)], [productCopy(source), productCopy(value)],
]));
