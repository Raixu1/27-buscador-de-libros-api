import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return NextResponse.json({ usuario: { id: user.uid, email: user.email } });
});
