import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/errors";
import { parseId } from "@/lib/lectura";
import { obtenerSinopsis } from "@/lib/openlibrary";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, ctx) => {
  await requireUser(req);
  const id = parseId((await ctx.params).id);
  return NextResponse.json(await obtenerSinopsis(id));
});
