import { beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "./helpers/fakeFirebase";

vi.mock("@/lib/firebase", () => import("./helpers/fakeFirebase"));

const { GET: listar } = await import("@/app/api/lectura/route");
const { PUT, DELETE } = await import("@/app/api/lectura/[id]/route");
const { requireAdmin } = await import("@/lib/auth");

const libro = {
  titulo: "Cien años de soledad",
  autores: ["Gabriel García Márquez"],
  portada_url: "https://covers.openlibrary.org/b/id/1-M.jpg",
  anio: 1967,
  estado: "leido",
  calificacion: 5,
  nota: "Genial",
};

const req = (method: string, token?: string, body?: unknown, url = "http://x/api/lectura") =>
  new Request(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => store.clear());

describe("autenticación", () => {
  it("responde 401 sin token", async () => {
    const res = await listar(req("GET"), undefined);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "No autenticado" });
  });

  it("responde 401 con token inválido", async () => {
    const res = await PUT(req("PUT", "falso", libro), ctx("OL1W"));
    expect(res.status).toBe(401);
  });
});

describe("validación", () => {
  it("responde 400 si hay calificación y el estado no es «leido»", async () => {
    const res = await PUT(req("PUT", "token-a", { ...libro, estado: "quiero" }), ctx("OL1W"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detalles[0].campo).toBe("calificacion");
  });

  it("responde 400 con un id inválido y 415 sin JSON", async () => {
    expect((await PUT(req("PUT", "token-a", libro), ctx("../x"))).status).toBe(400);
    const sinJson = new Request("http://x", { method: "PUT", headers: { authorization: "Bearer token-a" }, body: "x" });
    expect((await PUT(sinJson, ctx("OL1W"))).status).toBe(415);
  });

  it("descarta campos no declarados", async () => {
    const res = await PUT(req("PUT", "token-a", { ...libro, rol: "admin", uid: "uid-b" }), ctx("OL1W"));
    expect(res.status).toBe(200);
    const saved = store.get("usuarios/uid-a/lectura/OL1W");
    expect(saved).not.toHaveProperty("rol");
    expect(saved).not.toHaveProperty("uid");
  });
});

describe("autorización y aislamiento", () => {
  it("el usuario B no ve ni borra lo del usuario A", async () => {
    await PUT(req("PUT", "token-a", libro), ctx("OL1W"));

    const lista = await (await listar(req("GET", "token-b"), undefined)).json();
    expect(lista.items).toHaveLength(0);
    expect((await DELETE(req("DELETE", "token-b"), ctx("OL1W"))).status).toBe(404);

    const listaA = await (await listar(req("GET", "token-a"), undefined)).json();
    expect(listaA.items).toHaveLength(1);
    expect(listaA.items[0].id).toBe("OL1W");
  });

  it("el borrado es lógico y se reporta en la sincronización", async () => {
    await PUT(req("PUT", "token-a", libro), ctx("OL1W"));
    expect((await DELETE(req("DELETE", "token-a"), ctx("OL1W"))).status).toBe(200);
    expect((await DELETE(req("DELETE", "token-a"), ctx("OL1W"))).status).toBe(404);
    const lista = await (await listar(req("GET", "token-a"), undefined)).json();
    expect(lista.items[0].deleted_at).not.toBeNull();
  });

  it("requireAdmin responde 403 sin el claim rol=admin", async () => {
    await expect(requireAdmin(req("GET", "token-a"))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(req("GET", "token-admin"))).resolves.toMatchObject({ uid: "uid-admin" });
  });
});
