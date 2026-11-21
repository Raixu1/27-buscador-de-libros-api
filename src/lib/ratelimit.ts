import { HttpError } from "@/lib/errors";

// Limitador en memoria (por instancia). Complementa, no reemplaza, al Firewall de Vercel.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

export function limitAttempts(key: string, now = Date.now()): void {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    hits.set(key, recent);
    throw new HttpError(429, "Demasiados intentos. Intente más tarde.");
  }
  recent.push(now);
  hits.set(key, recent);
}

export function resetRateLimit(): void {
  hits.clear();
}
