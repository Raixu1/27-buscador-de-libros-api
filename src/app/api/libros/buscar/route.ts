import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/errors";
import { buscarLibros } from "@/lib/openlibrary";

export const runtime = "nodejs";

const schema = z.object({
  q: z.string().trim().min(3, "La búsqueda requiere al menos 3 caracteres").max(100),
  pagina: z.coerce.number().int().min(1).max(100).default(1),
});

export const GET = route(async (req) => {
  await requireUser(req);
  const params = new URL(req.url).searchParams;
  const { q, pagina } = schema.parse({ q: params.get("q") ?? "", pagina: params.get("pagina") ?? undefined });
  return NextResponse.json(await buscarLibros(q, pagina));
});
