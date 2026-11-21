import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HttpError, readJson, route } from "@/lib/errors";
import { mapFirebaseError } from "@/lib/firebase-auth-rest";
import { isValidIsbn10, isValidIsbn13 } from "@/lib/isbn";
import { clientIp, limitAttempts } from "@/lib/ratelimit";

const conCuerpo = (body: string, type = "application/json") =>
  new Request("http://x", { method: "POST", headers: { "content-type": type }, body });

describe("formato de error uniforme", () => {
  it("HttpError conserva estado y detalles", async () => {
    const h = route(async () => {
      throw new HttpError(409, "Choque", [{ campo: "id", mensaje: "repetido" }]);
    });
    const res = await h(new Request("http://x"), undefined);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Choque", detalles: [{ campo: "id", mensaje: "repetido" }] });
  });

  it("ZodError → 400 con detalles por campo", async () => {
    const h = route(async () => {
      z.object({ a: z.string() }).parse({});
      return new Response();
    });
    const body = await (await h(new Request("http://x"), undefined)).json();
    expect(body.error).toBe("Datos inválidos");
    expect(body.detalles[0].campo).toBe("a");
  });

  it("cualquier otro error → 500 «Error interno» sin filtrar el mensaje", async () => {
    const h = route(async () => {
      throw new Error("contraseña=secreta");
    });
    const res = await h(new Request("http://x"), undefined);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secreta");
  });
});

describe("readJson", () => {
  it("rechaza JSON mal formado (400) y cuerpos grandes (413)", async () => {
    await expect(readJson(conCuerpo("{no"))).rejects.toMatchObject({ status: 400 });
    await expect(readJson(conCuerpo(JSON.stringify({ x: "a".repeat(100) })), 50)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("rechaza tipos de contenido distintos de JSON (415)", async () => {
    await expect(readJson(conCuerpo("{}", "text/plain"))).rejects.toMatchObject({ status: 415 });
  });
});

describe("utilidades", () => {
  it("mapFirebaseError cubre contraseña débil y correo inválido", () => {
    expect(mapFirebaseError("WEAK_PASSWORD : x").status).toBe(400);
    expect(mapFirebaseError("INVALID_EMAIL").status).toBe(400);
    expect(mapFirebaseError("TOKEN_EXPIRED").status).toBe(401);
  });

  it("validadores de ISBN rechazan formatos que no corresponden", () => {
    expect(isValidIsbn10("123")).toBe(false);
    expect(isValidIsbn13("123")).toBe(false);
  });

  it("clientIp toma la primera IP de x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x"))).toBe("desconocida");
  });

  it("el límite de intentos se reinicia pasada la ventana", () => {
    for (let i = 0; i < 10; i++) limitAttempts("k", 0);
    expect(() => limitAttempts("k", 1)).toThrow();
    expect(() => limitAttempts("k", 61_000)).not.toThrow();
  });
});
