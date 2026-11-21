import { HttpError } from "@/lib/errors";
import { webApiKey } from "@/lib/firebase";

const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const SECURETOKEN = "https://securetoken.googleapis.com/v1/token";

export const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos";

export type Sesion = { token: string; refreshToken: string; expiraEnSeg: number };

/** Traduce códigos de Firebase a HTTP. El mensaje de credenciales es el mismo exista o no el correo. */
export function mapFirebaseError(code: string): HttpError {
  if (code === "EMAIL_EXISTS") return new HttpError(409, "El correo ya está registrado");
  if (code.startsWith("WEAK_PASSWORD")) return new HttpError(400, "Contraseña débil");
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return new HttpError(429, "Demasiados intentos. Intente más tarde.");
  if (code === "INVALID_REFRESH_TOKEN" || code === "TOKEN_EXPIRED" || code === "USER_NOT_FOUND") {
    return new HttpError(401, "Sesión inválida");
  }
  if (["INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED"].includes(code)) {
    return new HttpError(401, MENSAJE_CREDENCIALES);
  }
  if (code === "INVALID_EMAIL") return new HttpError(400, "Correo inválido");
  return new HttpError(500, "Error interno");
}

async function call(url: string, body: unknown, asForm = false) {
  let res: Response;
  try {
    res = await fetch(`${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(webApiKey())}`, {
      method: "POST",
      headers: { "Content-Type": asForm ? "application/x-www-form-urlencoded" : "application/json" },
      body: asForm ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new HttpError(504, "El servicio de autenticación no responde");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (data.error as { message?: string } | undefined)?.message ?? "";
    throw mapFirebaseError(message.split(" : ")[0]);
  }
  return data;
}

export async function signUp(email: string, password: string) {
  const d = await call(`${IDENTITY}/accounts:signUp`, { email, password, returnSecureToken: true });
  return toSesion(d, "idToken", "refreshToken", "expiresIn", d.localId as string, email);
}

export async function signIn(email: string, password: string) {
  const d = await call(`${IDENTITY}/accounts:signInWithPassword`, { email, password, returnSecureToken: true });
  return toSesion(d, "idToken", "refreshToken", "expiresIn", d.localId as string, email);
}

export async function refreshSession(refreshToken: string): Promise<Sesion> {
  const d = await call(SECURETOKEN, { grant_type: "refresh_token", refresh_token: refreshToken }, true);
  return {
    token: String(d.id_token),
    refreshToken: String(d.refresh_token),
    expiraEnSeg: Number(d.expires_in) || 3600,
  };
}

function toSesion(
  d: Record<string, unknown>,
  t: string,
  r: string,
  e: string,
  id: string,
  email: string,
): Sesion & { usuario: { id: string; email: string } } {
  return {
    token: String(d[t]),
    refreshToken: String(d[r]),
    expiraEnSeg: Number(d[e]) || 3600,
    usuario: { id, email },
  };
}
