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
    const deletedIds: Array<string | number> = Array.isArray(body?.deletedIds) ? body.deletedIds : [];

    // Validación mínima
    for (const r of rows) {
      if (!r.activity_date || !r.place || !r.activity) {
        return NextResponse.json({ ok: false, error: "Fila inválida: falta activity_date/place/activity." }, { status: 400 });
      }
    }

    // 1) borrar eliminados (si tienen id)
    if (deletedIds.length) {
      const { error: delErr } = await supabase.from("activities").delete().in("id", deletedIds);
      if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    // 2) upsert de filas (si no tienes columna id, esto lo tienes que ajustar)
    // - si id viene undefined, supabase insertará generando id (si tu tabla lo genera)
    // - si id viene definido, actualiza/insert según PK
    const { error: upErr } = await supabase.from("activities").upsert(rows, { onConflict: "id" });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}