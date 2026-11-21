import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/errors";
import { signUp } from "@/lib/firebase-auth-rest";
import { clientIp, limitAttempts } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export const POST = route(async (req) => {
  limitAttempts(`registro:${clientIp(req)}`);
  const { email, password } = schema.parse(await readJson(req));
  const sesion = await signUp(email, password);
  return NextResponse.json(sesion, { status: 201 });
});
