// src/app/api/stays/delete/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const listing_link = String(body?.listing_link ?? "").trim();

    if (!listing_link) {
      return NextResponse.json({ ok: false, error: "Falta listing_link" }, { status: 400 });
    }

    const { error } = await supabase.from("stays").delete().eq("listing_link", listing_link);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}