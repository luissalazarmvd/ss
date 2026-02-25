// src/app/api/activities/delete/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawId = body?.id;

    if (rawId === undefined || rawId === null || String(rawId).trim() === "") {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const idNum = Number(rawId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json({ ok: false, error: "Id inválido" }, { status: 400 });
    }

    const { error } = await supabase.from("activities").delete().eq("id", idNum);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}