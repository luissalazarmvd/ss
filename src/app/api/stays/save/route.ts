// src/app/api/stays/save/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orig_link: string | null = body?.orig_link ?? null;
    const row = body?.row;

    if (!row) return NextResponse.json({ ok: false, error: "Falta row" }, { status: 400 });

    // normalización mínima
    const payload = {
      place: String(row.place ?? "Viaje"),
      check_in_date: String(row.check_in_date ?? "").slice(0, 10),
      check_out_date: String(row.check_out_date ?? "").slice(0, 10),
      total_price: Number(row.total_price ?? 0),
      rooms: row.rooms === null || row.rooms === "" ? null : Number(row.rooms),
      beds: row.beds === null || row.beds === "" ? null : Number(row.beds),
      listing_link: row.listing_link ? String(row.listing_link).trim() : null,
    };

    if (!payload.check_in_date || !payload.check_out_date) {
      return NextResponse.json({ ok: false, error: "check_in_date y check_out_date son obligatorios" }, { status: 400 });
    }

    // si es nueva: requiere link para identificar
    if (!orig_link) {
      if (!payload.listing_link) {
        return NextResponse.json({ ok: false, error: "Para crear, listing_link no puede estar vacío" }, { status: 400 });
      }

      const ins = await supabase.from("stays").insert(payload);
      if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 400 });

      return NextResponse.json({ ok: true });
    }

    // si existe: update por link original (permite cambiar el link)
    const upd = await supabase.from("stays").update(payload).eq("listing_link", orig_link);
    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}