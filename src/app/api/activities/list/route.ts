// src/app/api/activities/list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATE_OPTIONS = ["2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"] as const;

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
      .from("activities")
      .select("id, place, activity_date, activity, order_no")
      .in("activity_date", [...DATE_OPTIONS])
      .order("activity_date", { ascending: true })
      .order("order_no", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, rows: data ?? [] },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error listando activities" },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}