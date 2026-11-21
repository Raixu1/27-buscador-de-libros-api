import { z } from "zod";
import { db } from "@/lib/firebase";
import { HttpError } from "@/lib/errors";

export const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function parseId(id: string): string {
  if (!ID_REGEX.test(id)) throw new HttpError(400, "Identificador inválido");
  return id;
}

/** Solo estos campos se guardan; el resto se descarta. */
export const lecturaSchema = z
  .object({
    titulo: z.string().trim().min(1).max(300),
    autores: z.array(z.string().trim().min(1).max(200)).max(20),
    portada_url: z.url({ protocol: /^https$/ }).max(500).nullable().default(null),
    anio: z.number().int().min(0).max(3000).nullable().default(null),
    estado: z.enum(["quiero", "leyendo", "leido"]),
    calificacion: z.number().int().min(1).max(5).nullable().default(null),
    nota: z.string().max(2000).nullable().default(null),
  })
  .refine((v) => v.calificacion === null || v.estado === "leido", {
    path: ["calificacion"],
    message: "La calificación solo aplica si el estado es «leido»",
  });

export type LecturaInput = z.infer<typeof lecturaSchema>;

/** Aislamiento entre usuarios: la ruta contiene el uid del token verificado. */
export const lecturaCol = (uid: string) => db().collection("usuarios").doc(uid).collection("lectura");

export type LecturaDoc = LecturaInput & {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function upsertLectura(uid: string, id: string, input: LecturaInput): Promise<LecturaDoc> {
  const ref = lecturaCol(uid).doc(id);
  const now = new Date().toISOString();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref); // todas las lecturas antes de escribir
    const prev = snap.exists ? (snap.data() as Partial<LecturaDoc>) : null;
    const doc = {
      ...input,
      created_at: prev?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    tx.set(ref, doc);
    return { id, ...doc };
  });
}

export async function borrarLectura(uid: string, id: string): Promise<void> {
  const ref = lecturaCol(uid).doc(id);
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as Partial<LecturaDoc> | undefined;
    if (!snap.exists || data?.deleted_at) throw new HttpError(404, "No existe");
    tx.update(ref, { deleted_at: now, updated_at: now });
  });
}

export async function listarLectura(uid: string, since: string | null) {
  let query = lecturaCol(uid).orderBy("updated_at");
  if (since) query = query.where("updated_at", ">", since);
  const snap = await query.limit(500).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LecturaDoc, "id">) }));
}
