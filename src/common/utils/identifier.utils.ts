/** Classify a single "email or phone" value the way most auth forms do. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10,15}$/;

export type ParsedIdentifier =
  | { kind: 'email'; email: string; phone: null }
  | { kind: 'phone'; email: null; phone: string };

export function parseIdentifier(raw: string): ParsedIdentifier | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.includes('@')) {
    const email = value.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return null;
    }
    return { kind: 'email', email, phone: null };
  }

  const digits = value.replace(/\D/g, '');
  if (!PHONE_PATTERN.test(digits)) {
    return null;
  }
  return { kind: 'phone', email: null, phone: digits };
}
