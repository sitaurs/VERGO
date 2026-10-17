/** Explicit leading markers identify synthetic QA reports kept in private accounts. */
export const SYNTHETIC_QA_DESCRIPTION_PATTERN =
  '^[[:space:]]*(\\[[[:space:]]*DATA[[:space:]]+UJI[[:space:]]+QA[[:space:]]*\\]|QA[[:space:]]+TEST([[:space:]]|$))';

const syntheticQaDescription = /^\s*(?:\[\s*DATA\s+UJI\s+QA\s*\]|QA\s+TEST(?:\s|$))/i;

export function isSyntheticQaDescription(description: unknown): boolean {
  return typeof description === 'string' && syntheticQaDescription.test(description);
}
