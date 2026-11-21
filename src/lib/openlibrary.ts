import { HttpError } from "@/lib/errors";

const BASE = "https://openlibrary.org";
const FIELDS = "key,title,author_name,cover_i,first_publish_year";
const PAGE_SIZE = 20;

export type LibroResumen = {
  id: string;
  titulo: string;
  autores: string[];
  portada_url: string | null;
  anio: number | null;
};

type OpenLibraryDoc = {
  key?: unknown;
  title?: unknown;
  author_name?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
};

/** Devuelve solo los campos que usa la app. */
export function normalizeDoc(doc: OpenLibraryDoc): LibroResumen | null {
  if (typeof doc.key !== "string" || typeof doc.title !== "string") return null;
  const id = doc.key.split("/").pop() ?? "";
  if (!/^OL\w+W$/.test(id)) return null;
  const autores = Array.isArray(doc.author_name)
    ? doc.author_name.filter((a): a is string => typeof a === "string").slice(0, 10)
    : [];
  return {
    id,
    titulo: doc.title.slice(0, 300),
    autores,
    portada_url:
      typeof doc.cover_i === "number" ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    anio: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
  };
}

async function fetchSearch(params: Record<string, string>) {
  const url = `${BASE}/search.json?${new URLSearchParams({ ...params, fields: FIELDS, limit: String(PAGE_SIZE) })}`;
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "buscador-de-libros-api (proyecto academico)" },
    });
  } catch {
    throw new HttpError(504, "El servicio de libros no responde");
  }
  if (!res.ok) throw new HttpError(502, "El servicio de libros falló");
  const data = (await res.json().catch(() => null)) as { numFound?: unknown; docs?: unknown } | null;
  if (!data || !Array.isArray(data.docs)) throw new HttpError(502, "Respuesta inválida del servicio de libros");
  const resultados = data.docs.map((d) => normalizeDoc(d as OpenLibraryDoc)).filter((l) => l !== null);
  const total = typeof data.numFound === "number" ? data.numFound : resultados.length;
  return { resultados, total };
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
