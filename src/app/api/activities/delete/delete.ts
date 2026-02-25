// src/app/api/activities/delete/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body?.id;

    if (id === undefined || id === null || String(id).trim() === "") {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const { error } = await supabase.from("activities").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
    }
}