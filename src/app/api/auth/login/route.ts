import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/errors";
import { signIn } from "@/lib/firebase-auth-rest";
import { clientIp, limitAttempts } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });

export const POST = route(async (req) => {
  limitAttempts(`login:${clientIp(req)}`);
  const { email, password } = schema.parse(await readJson(req));
  return NextResponse.json(await signIn(email, password));
});
