import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimit } from "@/lib/ratelimit";

vi.mock("@/lib/firebase", () => import("./helpers/fakeFirebase"));

const { POST: registro } = await import("@/app/api/auth/registro/route");
const { POST: login } = await import("@/app/api/auth/login/route");
const { POST: refresh } = await import("@/app/api/auth/refresh/route");
const { GET: health } = await import("@/app/api/health/route");

const post = (body: unknown) =>
  new Request("http://x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const firebaseResponde = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );

const SESION = { idToken: "id", refreshToken: "ref", expiresIn: "3600", localId: "uid-1" };

beforeEach(() => resetRateLimit());
afterEach(() => vi.unstubAllGlobals());

describe("auth mediada: casos felices", () => {
  it("registro devuelve 201 con la sesión normalizada", async () => {
    firebaseResponde(200, SESION);
    const res = await registro(post({ email: "a@test.com", password: "12345678" }), undefined);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      token: "id",
      refreshToken: "ref",
      expiraEnSeg: 3600,
      usuario: { id: "uid-1", email: "a@test.com" },
    });
  });

  it("login devuelve 200 y la clave web viaja solo hacia Firebase", async () => {
    firebaseResponde(200, SESION);
    const res = await login(post({ email: "a@test.com", password: "x" }), undefined);
    expect(res.status).toBe(200);
    const url = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(url).toContain("accounts:signInWithPassword?key=clave-de-prueba");
  });

  it("refresh devuelve el nuevo par de tokens", async () => {
    firebaseResponde(200, { id_token: "nuevo", refresh_token: "ref2", expires_in: "3600" });
    const res = await refresh(post({ refreshToken: "ref" }), undefined);
    expect(await res.json()).toEqual({ token: "nuevo", refreshToken: "ref2", expiraEnSeg: 3600 });
  });

  it("health responde ok sin autenticación", async () => {
    expect(await health().json()).toEqual({ ok: true, servicio: "buscador-de-libros-api" });
  });
});

describe("auth mediada: errores", () => {
  it("correo repetido → 409", async () => {
    firebaseResponde(400, { error: { message: "EMAIL_EXISTS" } });
    const res = await registro(post({ email: "a@test.com", password: "12345678" }), undefined);
    expect(res.status).toBe(409);
  });

  it("refresh inválido → 401", async () => {
    firebaseResponde(400, { error: { message: "INVALID_REFRESH_TOKEN" } });
    expect((await refresh(post({ refreshToken: "x" }), undefined)).status).toBe(401);
  });

  it("Firebase no responde → 504", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect((await login(post({ email: "a@test.com", password: "x" }), undefined)).status).toBe(504);
  });

  it("respuesta de Firebase con forma inesperada → 500 sin detalles", async () => {
    firebaseResponde(200, { otraCosa: true });
    const res = await login(post({ email: "a@test.com", password: "x" }), undefined);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Error interno" });
  });

  it("código desconocido de Firebase → 500", async () => {
    firebaseResponde(400, { error: { message: "ALGO_RARO : detalle" } });
    expect((await login(post({ email: "a@test.com", password: "x" }), undefined)).status).toBe(500);
  });
});
