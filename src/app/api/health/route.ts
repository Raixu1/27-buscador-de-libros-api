import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true, servicio: "buscador-de-libros-api" });
}
