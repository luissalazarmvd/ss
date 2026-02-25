// src/app/api/activities/save/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

type ActivityRow = {
  id?: string | number;
  place: string;
  activity_date: string;
  activity: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: ActivityRow[] = Array.isArray(body?.rows) ? body.rows : [];

    for (const r of rows) {
      if (!r.activity_date || !r.place || !r.activity) {
        return NextResponse.json({ ok: false, error: "Fila inválida: falta activity_date/place/activity." }, { status: 400 });
      }
    }

    const cleaned = rows.map((r) => ({
      id: r.id === undefined || r.id === null || String(r.id).trim() === "" ? undefined : r.id,
      place: String(r.place),
      activity_date: String(r.activity_date).slice(0, 10),
      activity: String(r.activity),
    }));

    const { error: upErr } = await supabase.from("activities").upsert(cleaned, { onConflict: "id" });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}