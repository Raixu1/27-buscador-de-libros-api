import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/errors";
import { listarLectura } from "@/lib/lectura";

export const runtime = "nodejs";

const sinceSchema = z.iso.datetime().nullable();

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const since = sinceSchema.parse(new URL(req.url).searchParams.get("since"));
  const items = await listarLectura(user.uid, since);
  return NextResponse.json({ items, servidor_ahora: new Date().toISOString() });
});
