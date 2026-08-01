const INTERNAL_EMAIL_DOMAIN = "users.zuhrirey.my.id";
const NIM_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizeNim(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function isValidNim(value: string): boolean {
  return NIM_PATTERN.test(normalizeNim(value));
}

export function createInternalEmail(nim: string): string {
  const normalizedNim = normalizeNim(nim);

  if (!isValidNim(normalizedNim)) {
    throw new Error("NIM tidak valid.");
  }

  return `${normalizedNim}@${INTERNAL_EMAIL_DOMAIN}`;
}
