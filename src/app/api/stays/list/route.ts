// src/app/api/stays/list/route.ts
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

export async function GET() {
  try {
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("stays")
      .select("place, check_in_date, check_out_date, total_price, rooms, beds, listing_link")
      .order("check_in_date", { ascending: true })
      .order("check_out_date", { ascending: true })
      .order("place", { ascending: true })
      .order("total_price", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200, headers: noStoreHeaders() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error listando stays" }, { status: 500, headers: noStoreHeaders() });
  }
}