import { z } from "zod";
import { HttpError } from "@/lib/errors";

const BASE = "https://openlibrary.org";
const FIELDS = "key,title,author_name,cover_i,first_publish_year";
const PAGE_SIZE = 20;
const HEADERS = { "User-Agent": "buscador-de-libros-api (proyecto academico)" };

export type LibroResumen = {
  id: string;
  titulo: string;
  autores: string[];
  portada_url: string | null;
  anio: number | null;
};

// Respuestas de Open Library validadas con Zod: los campos inesperados se ignoran.
const docSchema = z.object({
  key: z.string(),
  title: z.string(),
  author_name: z.array(z.unknown()).optional(),
  cover_i: z.number().optional(),
  first_publish_year: z.number().optional(),
});
const busquedaSchema = z.object({ numFound: z.number().optional(), docs: z.array(z.unknown()) });
const descripcionSchema = z.union([z.string(), z.object({ value: z.string() })]);
const obraSchema = z.object({ description: z.unknown().optional() });

/** Devuelve solo los campos que usa la app; null si el documento no es una obra válida. */
export function normalizeDoc(raw: unknown): LibroResumen | null {
  const r = docSchema.safeParse(raw);
  if (!r.success) return null;
  const doc = r.data;
  const id = doc.key.split("/").pop() ?? "";
  if (!/^OL\w+W$/.test(id)) return null;
  const autores = (doc.author_name ?? []).filter((a): a is string => typeof a === "string").slice(0, 10);
  return {
    id,
    titulo: doc.title.slice(0, 300),
    autores,
    portada_url: doc.cover_i === undefined ? null : `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
    anio: doc.first_publish_year ?? null,
  };
}

/** GET con timeout de 5 s; los fallos de red o del servicio se convierten en 504/502. */
async function pedir(url: string): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(5000), headers: HEADERS });
  } catch {
    throw new HttpError(504, "El servicio de libros no responde");
  }
}

async function fetchSearch(params: Record<string, string>) {
  const query = new URLSearchParams({ ...params, fields: FIELDS, limit: String(PAGE_SIZE) });
  const res = await pedir(`${BASE}/search.json?${query}`);
  if (!res.ok) throw new HttpError(502, "El servicio de libros falló");
  const parsed = busquedaSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new HttpError(502, "Respuesta inválida del servicio de libros");
  const resultados = parsed.data.docs.map(normalizeDoc).filter((l) => l !== null);
  return { resultados, total: parsed.data.numFound ?? resultados.length };
}

/** La sinopsis puede venir como texto o como { value }. Se recorta a 2000 caracteres. */
export function extractDescription(raw: unknown): string | null {
  const r = descripcionSchema.safeParse(raw);
  if (!r.success) return null;
  const text = (typeof r.data === "string" ? r.data : r.data.value).trim();
  return text ? text.slice(0, 2000) : null;
}

export async function obtenerSinopsis(id: string): Promise<{ id: string; descripcion: string | null }> {
  const res = await pedir(`${BASE}/works/${encodeURIComponent(id)}.json`);
  if (res.status === 404) throw new HttpError(404, "Libro no encontrado");
  if (!res.ok) throw new HttpError(502, "El servicio de libros falló");
  const obra = obraSchema.safeParse(await res.json().catch(() => null));
  return { id, descripcion: extractDescription(obra.data?.description) };
}

export async function buscarLibros(q: string, pagina: number) {
  const { resultados, total } = await fetchSearch({ q, page: String(pagina) });
  return { resultados, total, pagina, hay_mas: pagina * PAGE_SIZE < total };
}

export async function buscarPorIsbn(isbn: string): Promise<LibroResumen> {
  const { resultados } = await fetchSearch({ isbn });
  const libro = resultados[0];
  if (!libro) throw new HttpError(404, "No se encontró un libro con ese ISBN");
  return libro;
}
