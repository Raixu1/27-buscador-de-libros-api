/** Normaliza (quita guiones/espacios) y valida ISBN-10 o ISBN-13. Devuelve el ISBN limpio o null. */
export function normalizeIsbn(input: string): string | null {
  const clean = input.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(clean)) return isValidIsbn10(clean) ? clean : null;
  if (/^\d{13}$/.test(clean)) return isValidIsbn13(clean) ? clean : null;
  return null;
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const sum = [...isbn].reduce((acc, ch, i) => acc + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  const sum = [...isbn].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}
