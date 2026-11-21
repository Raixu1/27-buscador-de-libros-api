import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => import("./helpers/fakeFirebase"));

const { GET: buscar } = await import("@/app/api/libros/buscar/route");
const { GET: detalle } = await import("@/app/api/libros/detalle/[id]/route");
const { GET: porIsbn } = await import("@/app/api/libros/isbn/[isbn]/route");

const req = (url = "http://x") => new Request(url, { headers: { authorization: "Bearer token-a" } });
const ctxIsbn = (isbn: string) => ({ params: Promise.resolve({ isbn }) });
const ctxId = (id: string) => ({ params: Promise.resolve({ id }) });
const responde = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );

afterEach(() => vi.unstubAllGlobals());

describe("proxy: casos adicionales", () => {
  it("ISBN encontrado devuelve solo los campos usados", async () => {
    responde(200, { numFound: 1, docs: [{ key: "/works/OL1W", title: "Dune", author_name: ["F. H."], extra: 1 }] });
    const res = await porIsbn(req(), ctxIsbn("978-0-306-40615-7"));
    expect(await res.json()).toEqual({ id: "OL1W", titulo: "Dune", autores: ["F. H."], portada_url: null, anio: null });
  });

  it("el servicio externo responde 500 → 502", async () => {
    responde(500, {});
    expect((await buscar(req("http://x/api/libros/buscar?q=dune"), undefined)).status).toBe(502);
  });

  it("respuesta con forma inválida → 502", async () => {
    responde(200, { docs: "no-es-lista" });
    expect((await buscar(req("http://x/api/libros/buscar?q=dune"), undefined)).status).toBe(502);
  });

  it("sinopsis: 404 del servicio → 404, y caída → 504", async () => {
    responde(404, {});
    expect((await detalle(req(), ctxId("OL1W"))).status).toBe(404);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect((await detalle(req(), ctxId("OL1W"))).status).toBe(504);
  });

  it("sinopsis: error 500 del servicio → 502; id inválido → 400", async () => {
    responde(500, {});
    expect((await detalle(req(), ctxId("OL1W"))).status).toBe(502);
    expect((await detalle(req(), ctxId("../etc"))).status).toBe(400);
  });

  it("las rutas de libros exigen token", async () => {
    const sinToken = new Request("http://x/api/libros/buscar?q=dune");
    expect((await buscar(sinToken, undefined)).status).toBe(401);
  });
});
