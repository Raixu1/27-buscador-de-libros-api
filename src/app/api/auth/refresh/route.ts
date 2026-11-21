import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/errors";
import { refreshSession } from "@/lib/firebase-auth-rest";
import { clientIp, limitAttempts } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({ refreshToken: z.string().min(1).max(2048) });

export const POST = route(async (req) => {
  limitAttempts(`refresh:${clientIp(req)}`);
  const { refreshToken } = schema.parse(await readJson(req));
  return NextResponse.json(await refreshSession(refreshToken));
});
