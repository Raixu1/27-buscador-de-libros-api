import { HttpError } from "@/lib/errors";
import { adminAuth } from "@/lib/firebase";

export type Usuario = { uid: string; email: string | null; rol: string | null };

/** Verifica el ID token. El uid sale SIEMPRE del token verificado. */
export async function requireUser(req: Request): Promise<Usuario> {
  const header = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (!token) throw new HttpError(401, "No autenticado");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      rol: typeof decoded.rol === "string" ? decoded.rol : null,
    };
  } catch {
    throw new HttpError(401, "No autenticado");
  }
}

/** Para rutas de administración: exige el custom claim rol = "admin". */
export async function requireAdmin(req: Request): Promise<Usuario> {
  const user = await requireUser(req);
  if (user.rol !== "admin") throw new HttpError(403, "Acceso denegado");
  return user;
}
