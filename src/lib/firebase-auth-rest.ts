import { z } from "zod";
import { HttpError } from "@/lib/errors";
import { webApiKey } from "@/lib/firebase";

const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const SECURETOKEN = "https://securetoken.googleapis.com/v1/token";

export const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos";

export type Sesion = { token: string; refreshToken: string; expiraEnSeg: number };

// Respuestas de Firebase Auth validadas con Zod (no se confía en su forma).
const errorSchema = z.object({ error: z.object({ message: z.string() }).optional() });
const signInSchema = z.object({
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.coerce.number(),
  localId: z.string(),
});
const refreshSchema = z.object({ id_token: z.string(), refresh_token: z.string(), expires_in: z.coerce.number() });

const MENSAJES_CREDENCIALES = ["INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED"];
const MENSAJES_SESION = ["INVALID_REFRESH_TOKEN", "TOKEN_EXPIRED", "USER_NOT_FOUND"];

/** Traduce códigos de Firebase a HTTP. El mensaje de credenciales es el mismo exista o no el correo. */
export function mapFirebaseError(code: string): HttpError {
  if (code === "EMAIL_EXISTS") return new HttpError(409, "El correo ya está registrado");
  if (code.startsWith("WEAK_PASSWORD")) return new HttpError(400, "Contraseña débil");
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return new HttpError(429, "Demasiados intentos. Intente más tarde.");
  if (MENSAJES_SESION.includes(code)) return new HttpError(401, "Sesión inválida");
  if (MENSAJES_CREDENCIALES.includes(code)) return new HttpError(401, MENSAJE_CREDENCIALES);
  if (code === "INVALID_EMAIL") return new HttpError(400, "Correo inválido");
  return new HttpError(500, "Error interno");
}

async function post(url: string, contentType: string, body: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${url}?key=${encodeURIComponent(webApiKey())}`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new HttpError(504, "El servicio de autenticación no responde");
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = errorSchema.safeParse(data).data?.error?.message ?? "";
    throw mapFirebaseError(message.split(" : ")[0] ?? "");
  }
  return data;
}

/** Valida la respuesta; si Firebase cambió el formato, es un error interno (no se filtran detalles). */
function validar<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(500, "Error interno");
  return r.data;
}

async function conCredenciales(endpoint: string, email: string, password: string) {
  const body = JSON.stringify({ email, password, returnSecureToken: true });
  const d = validar(signInSchema, await post(`${IDENTITY}/${endpoint}`, "application/json", body));
  return {
    token: d.idToken,
    refreshToken: d.refreshToken,
    expiraEnSeg: d.expiresIn || 3600,
    usuario: { id: d.localId, email },
  };
}

export const signUp = (email: string, password: string) => conCredenciales("accounts:signUp", email, password);

export const signIn = (email: string, password: string) =>
  conCredenciales("accounts:signInWithPassword", email, password);

export async function refreshSession(refreshToken: string): Promise<Sesion> {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString();
  const d = validar(refreshSchema, await post(SECURETOKEN, "application/x-www-form-urlencoded", body));
  return { token: d.id_token, refreshToken: d.refresh_token, expiraEnSeg: d.expires_in || 3600 };
}
