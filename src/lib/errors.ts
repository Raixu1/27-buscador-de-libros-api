import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type Detalle = { campo: string; mensaje: string };

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalles?: Detalle[],
  ) {
    super(message);
  }
}

export function errorBody(error: string, detalles?: Detalle[]) {
  return detalles ? { error, detalles } : { error };
}

export function zodDetalles(err: ZodError): Detalle[] {
  return err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message }));
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Envuelve un handler: formato de error uniforme y 500 sin detalles internos. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(errorBody(err.message, err.detalles), { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(errorBody("Datos inválidos", zodDetalles(err)), { status: 400 });
      }
      // Solo el nombre del error: nunca mensajes que puedan contener datos personales.
      process.stderr.write(`Error interno: ${err instanceof Error ? err.name : "desconocido"}\n`);
      return NextResponse.json(errorBody("Error interno"), { status: 500 });
    }
  };
}

/** Lee un cuerpo JSON limitado en tamaño y tipo. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new HttpError(415, "Se requiere application/json");
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, "Cuerpo demasiado grande");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}
