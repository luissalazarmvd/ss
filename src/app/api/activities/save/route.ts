// src/app/api/activities/save/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATE_OPTIONS = new Set(["2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"]);

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

function toISODate(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function isValidIdBigint(id: any) {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (!s) return false;
  const sl = s.toLowerCase();
  if (sl === "null" || sl === "undefined") return false;
  return /^[0-9]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json().catch(() => null);

    const rowsIn = Array.isArray(body?.rows) ? body.rows : null;
    if (!rowsIn) {
      return NextResponse.json(
        { ok: false, error: "Body inválido: { rows: [...] }" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const clean: Array<{
      id?: number;
      place: string;
      activity_date: string;
      activity: string;
      order_no: number;
    }> = [];

    for (const r of rowsIn) {
      const activity_date = toISODate(r?.activity_date);
      if (!DATE_OPTIONS.has(activity_date)) continue;

      const place = String(r?.place ?? "").trim();
      const activity = String(r?.activity ?? "").trim();

      if (!place)
        return NextResponse.json({ ok: false, error: "Falta place en una fila." }, { status: 400, headers: noStoreHeaders() });
      if (!activity)
        return NextResponse.json({ ok: false, error: "Falta activity en una fila." }, { status: 400, headers: noStoreHeaders() });

      const order_no_raw = Number(r?.order_no);
      const order_no = Number.isFinite(order_no_raw) && order_no_raw > 0 ? Math.floor(order_no_raw) : 1;

      const row: any = { place, activity_date, activity, order_no };

      if (isValidIdBigint(r?.id)) row.id = Number(String(r.id).trim());

      clean.push(row);
    }

    const datesTouched = Array.from(new Set(clean.map((x) => x.activity_date)));

    for (const d of datesTouched) {
      const incomingForDate = clean.filter((x) => x.activity_date === d);

      const keepIds = incomingForDate
        .filter((x) => typeof (x as any).id === "number" && Number.isFinite((x as any).id))
        .map((x) => String((x as any).id));

      const { data: existing, error: exErr } = await sb.from("activities").select("id").eq("activity_date", d);
      if (exErr) throw exErr;

      const existingIds = (existing ?? []).map((x: any) => String(x.id));
      const toDelete = keepIds.length ? existingIds.filter((id) => !keepIds.includes(id)) : existingIds;

      if (toDelete.length) {
        const { error: delErr } = await sb.from("activities").delete().in("id", toDelete);
        if (delErr) throw delErr;
      }

      const toUpsert = incomingForDate.filter((x) => typeof (x as any).id === "number");
      const toInsert = incomingForDate.filter((x) => typeof (x as any).id !== "number");

      if (toUpsert.length) {
        const payload = toUpsert.map((x: any) => ({
          id: x.id,
          place: x.place,
          activity_date: x.activity_date,
          activity: x.activity,
          order_no: x.order_no,
        }));

        const { error: upErr } = await sb.from("activities").upsert(payload, { onConflict: "id" });
        if (upErr) throw upErr;
      }

      if (toInsert.length) {
        const payload = toInsert.map((x: any) => ({
          place: x.place,
          activity_date: x.activity_date,
          activity: x.activity,
          order_no: x.order_no,
        }));

        const { error: insErr } = await sb.from("activities").insert(payload);
        if (insErr) throw insErr;
      }
    }

    const { data: out, error: outErr } = await sb
      .from("activities")
      .select("id, place, activity_date, activity, order_no")
      .in("activity_date", Array.from(DATE_OPTIONS))
      .order("activity_date", { ascending: true })
      .order("order_no", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (outErr) throw outErr;

    return NextResponse.json({ ok: true, rows: out ?? [] }, { status: 200, headers: noStoreHeaders() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error guardando activities" }, { status: 500, headers: noStoreHeaders() });
  }
}