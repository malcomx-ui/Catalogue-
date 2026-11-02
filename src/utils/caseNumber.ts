/**
 * Case Number Sanitation & Preservation Utility
 *
 * Rules:
 * 1. If an original Excel record had NO case number (empty cell, whitespace, dashes, "N/A", "None", "Nil", etc.),
 *    NEVER invent, auto-generate, or display an artificial case number or code. Keep it strictly empty ("").
 * 2. If an original Excel record DID have a file number, maintain that exact file number verbatim
 *    without tampering, reformatting, or prefixing.
 * 3. Never invent artificial case serial numbers or formats.
 */

const PLACEHOLDER_STRINGS = new Set([
  '-',
  '--',
  '---',
  '_',
  '.',
  '/',
  'n/a',
  'na',
  'n.a.',
  'n.a',
  'none',
  'nil',
  'null',
  'no number',
  'no-number',
  'no case number',
  'no case no',
  'no suit number',
  'no suit no',
  'pending',
  'unassigned',
  'not assigned',
  'auto-gen',
  'autogen',
  'auto gen',
  'auto',
  'tbd',
  'tba',
  'undefined',
  'n/k',
  'unknown',
  'blank',
  'empty',
]);

const AUTO_GENERATED_REF_PATTERN = /^MK\/[A-Z0-9]{2,4}\/LIT\/\d{4}\/\d+$/i;

/**
 * Normalizes and validates a case number.
 * Returns the exact trimmed user case number, or empty string `""` if absent or placeholder.
 */
export const cleanCaseNumber = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  const lower = str.toLowerCase();
  if (PLACEHOLDER_STRINGS.has(lower)) {
    return '';
  }

  // Purge any auto-generated pattern like MK/KLA/LIT/2026/001
  if (AUTO_GENERATED_REF_PATTERN.test(str)) {
    return '';
  }

  return str;
};

/**
 * Checks whether a case number is present and valid (non-placeholder).
 */
export const hasCaseNumber = (val: any): boolean => {
  return cleanCaseNumber(val).length > 0;
};
