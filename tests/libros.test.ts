import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeIsbn } from "@/lib/isbn";
import { extractDescription, normalizeDoc } from "@/lib/openlibrary";

vi.mock("@/lib/firebase", () => import("./helpers/fakeFirebase"));

const { GET: buscar } = await import("@/app/api/libros/buscar/route");
const { GET: porIsbn } = await import("@/app/api/libros/isbn/[isbn]/route");
const { GET: detalle } = await import("@/app/api/libros/detalle/[id]/route");

const req = (url: string) => new Request(url, { headers: { authorization: "Bearer token-a" } });

afterEach(() => vi.unstubAllGlobals());

describe("proxy de Open Library", () => {
  it("normaliza la respuesta: solo los campos usados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          numFound: 45,
          docs: [
            {
              key: "/works/OL45883W",
              title: "Dune",
              author_name: ["Frank Herbert"],
              cover_i: 99,
              first_publish_year: 1965,
              edition_count: 300,
              ia: ["secreto"],
            },
            { key: "/authors/OL1A", title: "Ignorado" },
          ],
        }),
      ),
    );
    const res = await buscar(req("http://x/api/libros/buscar?q=dune&pagina=1"), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      resultados: [
        {
          id: "OL45883W",
          titulo: "Dune",
          autores: ["Frank Herbert"],
          portada_url: "https://covers.openlibrary.org/b/id/99-M.jpg",
          anio: 1965,
        },
      ],
      total: 45,
      pagina: 1,
      hay_mas: true,
    });
  });

  it("rechaza búsquedas de menos de 3 caracteres (400)", async () => {
    const res = await buscar(req("http://x/api/libros/buscar?q=ab"), undefined);
    expect(res.status).toBe(400);
  });

  it("responde 504 si el servicio externo no responde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("timeout"))));
    const res = await buscar(req("http://x/api/libros/buscar?q=dune"), undefined);
    expect(res.status).toBe(504);
  });

  it("valida el ISBN y responde 404 si no hay libro", async () => {
    const ctx = (isbn: string) => ({ params: Promise.resolve({ isbn }) });
    expect((await porIsbn(req("http://x"), ctx("123"))).status).toBe(400);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ numFound: 0, docs: [] })));
    expect((await porIsbn(req("http://x"), ctx("9780306406157"))).status).toBe(404);
  });
});

describe("ISBN", () => {
  it("acepta ISBN-10 y ISBN-13 válidos", () => {
    expect(normalizeIsbn("978-0-306-40615-7")).toBe("9780306406157");
    expect(normalizeIsbn("0-306-40615-2")).toBe("0306406152");
    expect(normalizeIsbn("080442957X")).toBe("080442957X");
  });
  it("rechaza dígito de control incorrecto o formato inválido", () => {
    expect(normalizeIsbn("9780306406158")).toBeNull();
    expect(normalizeIsbn("abc")).toBeNull();
  });
});

describe("sinopsis", () => {
  it("acepta descripción como texto o como { value } y la recorta", () => {
    expect(extractDescription("  Hola ")).toBe("Hola");
    expect(extractDescription({ type: "/type/text", value: "Mundo" })).toBe("Mundo");
    expect(extractDescription("x".repeat(3000))).toHaveLength(2000);
    expect(extractDescription(undefined)).toBeNull();
  });

  it("devuelve solo id y descripcion", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ description: "Una novela", otros: [1, 2] })));
    const res = await detalle(req("http://x"), { params: Promise.resolve({ id: "OL45883W" }) });
    expect(await res.json()).toEqual({ id: "OL45883W", descripcion: "Una novela" });
  });
});

describe("normalizeDoc", () => {
  it("descarta documentos sin clave de obra", () => {
    expect(normalizeDoc({ key: "/books/OL1M", title: "x" })).toBeNull();
  });
});
