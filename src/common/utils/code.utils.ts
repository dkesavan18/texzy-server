/** `Rani Pink` -> `RANI_PINK`; strips everything that is not A-Z / 0-9. */
export function toUpperSnakeCode(value: string): string {
  return value
    .trim()
    .replace(/&/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/** Postgres unique-violation error code. */
export const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}
