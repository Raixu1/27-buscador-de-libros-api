import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/errors";
import { borrarLectura, lecturaSchema, parseId, upsertLectura } from "@/lib/lectura";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const id = parseId((await ctx.params).id);
  const input = lecturaSchema.parse(await readJson(req));
  return NextResponse.json(await upsertLectura(user.uid, id, input));
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const id = parseId((await ctx.params).id);
  await borrarLectura(user.uid, id);
  return NextResponse.json({ ok: true });
});
