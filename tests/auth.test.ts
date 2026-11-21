import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapFirebaseError, MENSAJE_CREDENCIALES } from "@/lib/firebase-auth-rest";
import { resetRateLimit } from "@/lib/ratelimit";

const { normalizePrivateKey } = await vi.importActual<typeof import("@/lib/firebase")>("@/lib/firebase");

vi.mock("@/lib/firebase", () => import("./helpers/fakeFirebase"));

const { POST: registro } = await import("@/app/api/auth/registro/route");
const { POST: login } = await import("@/app/api/auth/login/route");
const { GET: yo } = await import("@/app/api/auth/yo/route");

const post = (body: unknown) =>
  new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => resetRateLimit());

describe("auth", () => {
  it("registro con contraseña corta responde 400", async () => {
    const res = await registro(post({ email: "a@test.com", password: "1234" }), undefined);
    expect(res.status).toBe(400);
  });

  it("login limita intentos (429)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, { status: 400 })));
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await login(post({ email: "a@test.com", password: "x" }), undefined)).status;
    expect(last).toBe(429);
    vi.unstubAllGlobals();
  });

  it("GET /yo devuelve el usuario del token verificado", async () => {
    const res = await yo(new Request("http://x", { headers: { authorization: "Bearer token-a" } }), undefined);
    expect(await res.json()).toEqual({ usuario: { id: "uid-a", email: "a@test.com" } });
  });

  it("mismo mensaje de credenciales exista o no el correo", () => {
    for (const code of ["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"]) {
      const err = mapFirebaseError(code);
      expect([err.status, err.message]).toEqual([401, MENSAJE_CREDENCIALES]);
    }
    expect(mapFirebaseError("EMAIL_EXISTS").status).toBe(409);
    expect(mapFirebaseError("TOO_MANY_ATTEMPTS_TRY_LATER").status).toBe(429);
  });

  it("convierte \\n literales de la clave privada", () => {
    expect(normalizePrivateKey("a\\nb")).toBe("a\nb");
  });
});
