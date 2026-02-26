// src/app/api/activities/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const rawId = body?.id;

    const s = String(rawId ?? "").trim();
    if (!/^[0-9]+$/.test(s)) {
      return NextResponse.json({ ok: false, error: "Id inválido" }, { status: 400, headers: noStoreHeaders() });
    }

    const idNum = Number(s);

    const { error } = await sb.from("activities").delete().eq("id", idNum);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: noStoreHeaders() });

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error eliminando activities" }, { status: 500, headers: noStoreHeaders() });
  }
}