// src/components/ActivitiesTable.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ActivityRow = {
  id?: string | number;
  place: string;
  activity_date: string;
  activity: string;
  order_no?: number | null;
};

type UIActivityRow = ActivityRow & {
  __key: string;
  __deleting?: boolean;
};

const PLACES = ["Viaje", "Pozuzo", "Oxapampa"] as const;
const DATE_OPTIONS = ["2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"] as const;

function toISODate(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function moveItem<T>(arr: T[], from: number, to: number) {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

export default function ActivitiesTable({ rows }: { rows: ActivityRow[] }) {
  const router = useRouter();

  const [uiRows, setUiRows] = useState<UIActivityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const drag = useRef<{ key: string | null; date: string | null }>({ key: null, date: null });

  useEffect(() => {
    const mapped: UIActivityRow[] = (rows ?? [])
      .map((r, idx) => ({
        ...r,
        activity_date: toISODate(r.activity_date),
        __key: String((r as any).id ?? `row-${idx}-${Math.random().toString(16).slice(2)}`),
        __deleting: false,
      }))
      .filter((r) => DATE_OPTIONS.includes(r.activity_date as any))
      .sort((a, b) => {
        const da = a.activity_date.localeCompare(b.activity_date);
        if (da !== 0) return da;
        const oa = Number(a.order_no ?? 1e9);
        const ob = Number(b.order_no ?? 1e9);
        if (oa !== ob) return oa - ob;
        return String(a.__key).localeCompare(String(b.__key));
      });

    setUiRows(mapped);
    setErr(null);
    setOkMsg(null);
  }, [rows]);

  const grouped = useMemo(() => {
    const m = new Map<string, UIActivityRow[]>();
    for (const d of DATE_OPTIONS) m.set(d, []);
    for (const r of uiRows) {
      const d = toISODate(r.activity_date);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return DATE_OPTIONS.map((d) => [d, m.get(d) ?? []] as const);
  }, [uiRows]);

  const setCell = (key: string, patch: Partial<ActivityRow>) => {
    setUiRows((prev) => prev.map((r) => (r.__key === key ? { ...r, ...patch } : r)));
  };

  const addRowForDate = (date: string) => {
    const k = `new-${date}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setUiRows((prev) => {
      const next: UIActivityRow[] = [...prev, { __key: k, id: undefined, order_no: null, activity_date: date, place: "Viaje", activity: "", __deleting: false }];
      next.sort((a, b) => {
        const da = a.activity_date.localeCompare(b.activity_date);
        if (da !== 0) return da;
        const oa = Number(a.order_no ?? 1e9);
        const ob = Number(b.order_no ?? 1e9);
        if (oa !== ob) return oa - ob;
        return String(a.__key).localeCompare(String(b.__key));
      });
      return next;
    });
  };

  const validate = () => {
    for (const [d, items] of grouped) {
      for (const r of items) {
        if (toISODate(r.activity_date) !== d) return "Fila inválida (fecha).";
        if (!r.place?.trim()) return "Falta lugar en una fila.";
        if (!r.activity?.trim()) return "Falta actividad en una fila.";
      }
    }
    return null;
  };

  const refreshHard = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_ts", String(Date.now()));
    window.history.replaceState({}, "", url.toString());
    router.refresh();
  };

  const saveAll = async () => {
    setErr(null);
    setOkMsg(null);

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);
    try {
      const out: any[] = [];
      for (const [d, items] of grouped) {
        items.forEach((r, idx) => {
          out.push({
            id: r.id,
            place: r.place,
            activity_date: d,
            activity: r.activity,
            order_no: idx + 1,
          });
        });
      }

      const resp = await fetch(`/api/activities/save?_ts=${Date.now()}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ rows: out }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error guardando (HTTP ${resp.status})`);

      setOkMsg("Guardado OK.");
      await refreshHard();
    } catch (e: any) {
      setErr(e?.message || "Error guardando.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (r: UIActivityRow) => {
    setErr(null);
    setOkMsg(null);

    if (r.id === undefined || r.id === null || String(r.id).trim() === "") {
      setUiRows((prev) => prev.filter((x) => x.__key !== r.__key));
      return;
    }

    setUiRows((prev) => prev.map((x) => (x.__key === r.__key ? { ...x, __deleting: true } : x)));

    try {
      const resp = await fetch(`/api/activities/delete?_ts=${Date.now()}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ id: r.id }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error eliminando (HTTP ${resp.status})`);

      setUiRows((prev) => prev.filter((x) => x.__key !== r.__key));
      await refreshHard();
    } catch (e: any) {
      setUiRows((prev) => prev.map((x) => (x.__key === r.__key ? { ...x, __deleting: false } : x)));
      setErr(e?.message || "Error eliminando.");
    }
  };

  const beginDrag = (key: string, date: string) => (e: React.PointerEvent) => {
    drag.current = { key, date };
    try {
      (e.target as any)?.setPointerCapture?.(e.pointerId);
    } catch {}
    e.preventDefault();
  };

  const onDragMove = (e: React.PointerEvent) => {
    const key = drag.current.key;
    const date = drag.current.date;
    if (!key || !date) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const rowEl = el?.closest?.("[data-rowkey]") as HTMLElement | null;
    const targetKey = rowEl?.getAttribute?.("data-rowkey") || null;
    const targetDate = rowEl?.getAttribute?.("data-date") || null;

    if (!targetKey || !targetDate) return;
    if (targetDate !== date) return;
    if (targetKey === key) return;

    setUiRows((prev) => {
      const from = prev.findIndex((x) => x.__key === key);
      const to = prev.findIndex((x) => x.__key === targetKey);
      if (from < 0 || to < 0 || from === to) return prev;

      if (toISODate(prev[from].activity_date) !== date) return prev;
      if (toISODate(prev[to].activity_date) !== date) return prev;

      return moveItem(prev, from, to);
    });
  };

  const endDrag = () => {
    drag.current = { key: null, date: null };
  };

  return (
    <>
      <style jsx>{`
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .btn {
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          color: #1f5132;
          font-weight: 800;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .btnPrimary {
          border: 1px solid #1f5132;
          background: #1f5132;
          color: #e8f6ee;
        }
        .btnIcon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .muted {
          color: #2a5e3b;
          opacity: 0.9;
          font-size: 13px;
          font-weight: 700;
        }
        .msgErr {
          background: #fee;
          border: 1px solid #f5c2c2;
          padding: 10px;
          border-radius: 12px;
          color: #7a1020;
          font-weight: 800;
          text-align: center;
          margin-bottom: 10px;
        }
        .msgOk {
          background: #eefaf0;
          border: 1px solid #cfe8d6;
          padding: 10px;
          border-radius: 12px;
          color: #1f5132;
          font-weight: 900;
          text-align: center;
          margin-bottom: 10px;
        }

        .groups {
          display: grid;
          gap: 14px;
          place-items: center;
          width: 100%;
          max-width: 100%;
        }

        .groupCard {
          width: min(720px, calc(100vw - 28px));
          border: 1px solid #c6d9cc;
          border-radius: 14px;
          background: #e8f6ee;
          overflow: hidden;
        }

        .groupHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 12px 12px;
          font-weight: 900;
          color: #1f5132;
          border-bottom: 1px solid rgba(31, 81, 50, 0.2);
          background: #e2f3e8;
        }

        .miniBtn {
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          color: #1f5132;
          font-weight: 900;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .rowLine {
          display: grid;
          grid-template-columns: 36px 160px minmax(0, 1fr) 44px;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(31, 81, 50, 0.15);
          align-items: center;
          color: #1f5132;
          font-weight: 800;
        }

        .rowLine:last-child {
          border-bottom: none;
        }

        .dragHandle {
          width: 36px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          color: #1f5132;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          touch-action: none;
          cursor: grab;
        }

        .dragHandle:active {
          cursor: grabbing;
        }

        .select,
        .input {
          width: 100%;
          min-width: 0;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid #c6d9cc;
          background: #cfe9d7;
          color: #1f5132;
          font-size: 14px;
          font-weight: 800;
          outline: none;
        }

        .delBtn {
          border: 1px solid rgba(122, 16, 32, 0.25);
          background: #fff;
          color: #7a1020;
          font-weight: 900;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        @media (max-width: 520px) {
          .groupCard {
            width: min(560px, calc(100vw - 28px));
          }
          .rowLine {
            grid-template-columns: 34px 140px minmax(0, 1fr) 42px;
            gap: 8px;
          }
          .select,
          .input {
            padding: 10px 10px;
          }
        }
      `}</style>

      {err && <div className="msgErr">{err}</div>}
      {okMsg && <div className="msgOk">{okMsg}</div>}

      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>Activities</div>
          <div className="muted">Fechas fijas. Ordena dentro de cada fecha y guarda.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btnPrimary" onClick={saveAll} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btnPrimary btnIcon" onClick={() => addRowForDate(DATE_OPTIONS[0])} title="Agregar fila">
            +
          </button>
        </div>
      </div>

      <div className="groups" onPointerMove={onDragMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag}>
        {grouped.map(([d, items]) => (
          <div key={d} className="groupCard">
            <div className="groupHeader">
              <div>{d}</div>
              <button className="miniBtn" onClick={() => addRowForDate(d)} title="Agregar fila a esta fecha">
                +
              </button>
            </div>

            {items.map((r, idx) => (
              <div key={r.__key} className="rowLine" data-rowkey={r.__key} data-date={d}>
                <div className="dragHandle" onPointerDown={beginDrag(r.__key, d)} title="Arrastrar">
                  ≡
                </div>

                <select className="select" value={r.place} onChange={(e) => setCell(r.__key, { place: e.target.value })}>
                  {PLACES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <input className="input" value={r.activity ?? ""} onChange={(e) => setCell(r.__key, { activity: e.target.value })} />

                <button className="delBtn" onClick={() => deleteRow(r)} disabled={!!r.__deleting} title="Eliminar">
                  {r.__deleting ? "…" : "-"}
                </button>
              </div>
            ))}

            {!items.length && (
              <div style={{ padding: 12, color: "#2a5e3b", fontWeight: 800, opacity: 0.9 }}>
                Sin actividades. Agrega con “+”.
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}