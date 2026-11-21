import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/errors";
import { normalizeIsbn } from "@/lib/isbn";
import { buscarPorIsbn } from "@/lib/openlibrary";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ isbn: string }> };

export const GET = route<Ctx>(async (req, ctx) => {
  await requireUser(req);
  const isbn = normalizeIsbn((await ctx.params).isbn);
  if (!isbn) throw new HttpError(400, "ISBN inválido");
  return NextResponse.json(await buscarPorIsbn(isbn));
});
