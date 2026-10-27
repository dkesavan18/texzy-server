/** Names that cannot be derived from the code by simple title-casing. */
const NAME_OVERRIDES: Record<string, string> = {
  DHOTI_VESHTI: 'Dhoti & Veshti',
  BORDERS_LACES: 'Borders & Laces',
  HOOKS_FASTENERS: 'Hooks & Fasteners',
  DHOTI_ANGAVASTRAM_SET: 'Dhoti & Angavastram Set',
  KIDS_VESHTI_SHIRT_SET: 'Kids Veshti & Shirt Set',
};

/** `KANCHIPURAM_SILK_SAREE` -> `Kanchipuram Silk Saree`. */
export function codeToName(code: string): string {
  const override = NAME_OVERRIDES[code];
  if (override) return override;
  return code
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/** `Rani Pink` -> `RANI_PINK`, `Multi-colour` -> `MULTI_COLOUR`. */
export function nameToCode(name: string): string {
  return name
    .trim()
    .replace(/&/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function assertUnique(label: string, codes: string[]): void {
  const seen = new Set<string>();
  for (const code of codes) {
    if (seen.has(code)) {
      throw new Error(`Duplicate code "${code}" in ${label}`);
    }
    seen.add(code);
  }
}
