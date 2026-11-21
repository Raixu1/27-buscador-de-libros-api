import { z } from "zod";
import { db } from "@/lib/firebase";
import { HttpError } from "@/lib/errors";

export const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function parseId(id: string): string {
  if (!ID_REGEX.test(id)) throw new HttpError(400, "Identificador inválido");
  return id;
}

const camposLectura = z.object({
  titulo: z.string().trim().min(1).max(300),
  autores: z.array(z.string().trim().min(1).max(200)).max(20),
  portada_url: z
    .url({ protocol: /^https$/ })
    .max(500)
    .nullable()
    .default(null),
  anio: z.number().int().min(0).max(3000).nullable().default(null),
  estado: z.enum(["quiero", "leyendo", "leido"]),
  calificacion: z.number().int().min(1).max(5).nullable().default(null),
  nota: z.string().max(2000).nullable().default(null),
});

/** Solo estos campos se guardan; el resto se descarta. */
export const lecturaSchema = camposLectura.refine((v) => v.calificacion === null || v.estado === "leido", {
  path: ["calificacion"],
  message: "La calificación solo aplica si el estado es «leido»",
});

export type LecturaInput = z.infer<typeof lecturaSchema>;

/** Documento tal como queda en Firestore (campos base puestos por el servidor). */
const docGuardadoSchema = camposLectura.extend({
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
const metaSchema = z.object({ created_at: z.string().optional(), deleted_at: z.string().nullable().optional() });

export type LecturaDoc = z.infer<typeof docGuardadoSchema> & { id: string };

/** Aislamiento entre usuarios: la ruta contiene el uid del token verificado. */
export const lecturaCol = (uid: string) => db().collection("usuarios").doc(uid).collection("lectura");

export async function upsertLectura(uid: string, id: string, input: LecturaInput): Promise<LecturaDoc> {
  const ref = lecturaCol(uid).doc(id);
  const now = new Date().toISOString();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref); // todas las lecturas antes de escribir
    const prev = metaSchema.safeParse(snap.data() ?? {}).data;
    const doc = { ...input, created_at: prev?.created_at ?? now, updated_at: now, deleted_at: null };
    tx.set(ref, doc);
    return { id, ...doc };
  });
}

export async function borrarLectura(uid: string, id: string): Promise<void> {
  const ref = lecturaCol(uid).doc(id);
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const meta = metaSchema.safeParse(snap.data() ?? {}).data;
    if (!snap.exists || meta?.deleted_at) throw new HttpError(404, "No existe");
    tx.update(ref, { deleted_at: now, updated_at: now });
  });
}

/** Cambios desde `since` (incluye borrados lógicos). Los documentos con forma inválida se omiten. */
export async function listarLectura(uid: string, since: string | null): Promise<LecturaDoc[]> {
  let query = lecturaCol(uid).orderBy("updated_at");
  if (since) query = query.where("updated_at", ">", since);
  const snap = await query.limit(500).get();
  return snap.docs.flatMap((d) => {
    const r = docGuardadoSchema.safeParse(d.data());
    return r.success ? [{ id: d.id, ...r.data }] : [];
  });
}
