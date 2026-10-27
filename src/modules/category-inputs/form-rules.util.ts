import type { VisibilityRule } from '../../database/entities/category-input-mapping.entity';

/**
 * Comparable form values: single/colour selects -> option code (string), multi-selects ->
 * option codes (string[]), booleans -> boolean, numbers -> number, text -> string.
 * Must stay in sync with `evaluateRule` in the web app (`utils/dynamicForm.ts`).
 */
export type ComparableValues = Record<string, unknown>;

export function isPresent(value: unknown): boolean {
  if (value === undefined || value === null || value === '' || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

export function evaluateRule(
  rule: VisibilityRule | null | undefined,
  values: ComparableValues,
): boolean {
  if (!rule) return true;

  if ('all' in rule) return rule.all.every((child) => evaluateRule(child, values));
  if ('any' in rule) return rule.any.some((child) => evaluateRule(child, values));

  const current = values[rule.key];
  const expected = asList(rule.value);

  switch (rule.op) {
    case 'truthy':
      return isPresent(current);
    case 'falsy':
      return !isPresent(current);
    case 'eq':
      return asList(current).some((item) => expected.includes(item));
    case 'neq':
      return !asList(current).some((item) => expected.includes(item));
    case 'in':
      return asList(current).some((item) => expected.includes(item));
    case 'notIn':
      return !asList(current).some((item) => expected.includes(item));
    default:
      return true;
  }
}
