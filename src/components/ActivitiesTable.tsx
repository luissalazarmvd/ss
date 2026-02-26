"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ActivityRow = {
  id?: string | number | null;
  place: string;
  activity_date: string;
  activity: string;
  order_no?: number | null;
};

type UIActivityRow = ActivityRow & {
  __key: string;
  __deleting?: boolean;
};

type ListResp = { ok: boolean; rows: ActivityRow[]; error?: string };
type ApiResp = { ok: boolean; error?: string };

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

function isValidId(id: any) {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  return s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined";
}

function sortRows(a: UIActivityRow, b: UIActivityRow) {
  const da = a.activity_date.localeCompare(b.activity_date);
  if (da !== 0) return da;

  const oa = Number(a.order_no ?? 1e9);
  const ob = Number(b.order_no ?? 1e9);
  if (oa !== ob) return oa - ob;

  return String(a.__key).localeCompare(String(b.__key));
}

function mapToUI(rows: ActivityRow[]) {
  const mapped: UIActivityRow[] = (rows ?? [])
    .map((r, idx) => ({
      ...r,
      activity_date: toISODate(r.activity_date),
      __key: isValidId((r as any).id) ? String((r as any).id) : `row-${idx}-${Math.random().toString(16).slice(2)}`,
      __deleting: false,
    }))
    .filter((r) => DATE_OPTIONS.includes(r.activity_date as any))
    .sort(sortRows);

  return mapped;
}

async function fetchActivitiesNoCache(): Promise<ActivityRow[]> {
  const res = await fetch(`/api/activities/list?t=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });

  const j: ListResp = await res.json().catch(() => ({ ok: false, rows: [], error: "Respuesta inválida" } as any));
  if (!res.ok || !j?.ok) throw new Error(j?.error || `Error cargando (HTTP ${res.status})`);
  return j.rows ?? [];
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${Math.max(42, el.scrollHeight)}px`;
}

export default function ActivitiesTable() {
  const [uiRows, setUiRows] = useState<UIActivityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const [isTouchUI, setIsTouchUI] = useState(false);

  const aliveRef = useRef(true);
  const refreshInFlightRef = useRef(false);
  const dragRef = useRef<{ key: string; date: string } | null>(null);

  const grouped = useMemo(() => {
    const byDate = new Map<string, UIActivityRow[]>();
    for (const d of DATE_OPTIONS) byDate.set(d, []);

    for (const r of uiRows) {
      const d = toISODate(r.activity_date);
      if (!DATE_OPTIONS.includes(d as any)) continue;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(r);
    }

    return DATE_OPTIONS.map((d) => [d, byDate.get(d) ?? []] as const);
  }, [uiRows]);

  const refresh = async (opts?: { silent?: boolean }) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    if (!opts?.silent) {
      setLoading(true);
      setErr(null);
      setOkMsg(null);
    }

    try {
      const rows = await fetchActivitiesNoCache();
      if (!aliveRef.current) return;
      setUiRows(mapToUI(rows));
      setErr(null);
    } catch (e: any) {
      if (!aliveRef.current) return;
      setErr(e?.message || "Error cargando.");
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    refresh();
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mqTouch = window.matchMedia("(hover: none) and (pointer: coarse)");
    const mqSmall = window.matchMedia("(max-width: 520px)");
    const apply = () => setIsTouchUI(!!(mqTouch.matches && mqSmall.matches));
    apply();

    const handler = () => apply();
    if (typeof mqTouch.addEventListener === "function") mqTouch.addEventListener("change", handler);
    else (mqTouch as any).addListener(handler);
    if (typeof mqSmall.addEventListener === "function") mqSmall.addEventListener("change", handler);
    else (mqSmall as any).addListener(handler);

    return () => {
      if (typeof mqTouch.removeEventListener === "function") mqTouch.removeEventListener("change", handler);
      else (mqTouch as any).removeListener(handler);
      if (typeof mqSmall.removeEventListener === "function") mqSmall.removeEventListener("change", handler);
      else (mqSmall as any).removeListener(handler);
    };
  }, []);

  const setCell = (key: string, patch: Partial<ActivityRow>) => {
    setUiRows((prev) => prev.map((r) => (r.__key === key ? { ...r, ...patch } : r)));
  };

  const renumberDate = (rows: UIActivityRow[], date: string) => {
    let n = 0;
    return rows.map((r) => {
      if (toISODate(r.activity_date) !== date) return r;
      n += 1;
      return { ...r, order_no: n };
    });
  };

  const addRowForDate = (date: string) => {
    const k = `new-${date}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setUiRows((prev) => {
      const next: UIActivityRow[] = [
        ...prev,
        {
          __key: k,
          id: undefined,
          order_no: null,
          activity_date: date,
          place: "Viaje",
          activity: "",
          __deleting: false,
        },
      ];

      const withOrder = renumberDate(
        next.map((x) => (toISODate(x.activity_date) === date && x.__key === k ? { ...x, order_no: 1e9 } : x)),
        date
      );

      return withOrder.sort(sortRows);
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
          const base: any = {
            place: r.place,
            activity_date: d,
            activity: r.activity,
            order_no: idx + 1,
          };
          if (isValidId(r.id)) base.id = r.id;
          out.push(base);
        });
      }

      const resp = await fetch(`/api/activities/save?t=${Date.now()}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({ rows: out }),
      });

      const data: ApiResp | null = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error guardando (HTTP ${resp.status})`);

      setOkMsg("Guardado OK.");
      await refresh({ silent: true });
    } catch (e: any) {
      setErr(e?.message || "Error guardando.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (r: UIActivityRow) => {
    setErr(null);
    setOkMsg(null);

    if (!isValidId(r.id)) {
      setUiRows((prev) => prev.filter((x) => x.__key !== r.__key));
      return;
    }

    setUiRows((prev) => prev.map((x) => (x.__key === r.__key ? { ...x, __deleting: true } : x)));

    try {
      const resp = await fetch(`/api/activities/delete?t=${Date.now()}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({ id: r.id }),
      });

      const data: ApiResp | null = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error eliminando (HTTP ${resp.status})`);

      await refresh({ silent: true });
    } catch (e: any) {
      setUiRows((prev) => prev.map((x) => (x.__key === r.__key ? { ...x, __deleting: false } : x)));
      setErr(e?.message || "Error eliminando.");
    }
  };

  const startDrag = (key: string, date: string) => (e: React.DragEvent) => {
    if (!key || !date) return;

    dragRef.current = { key, date };
    setDragKey(key);
    setDragDate(date);
    setOverKey(null);

    const payload = JSON.stringify({ key, date });
    try {
      e.dataTransfer.setData("text/plain", payload);
      e.dataTransfer.effectAllowed = "move";
    } catch {}

    try {
      (e.currentTarget as HTMLElement).blur?.();
    } catch {}
  };

  const endDrag = () => {
    dragRef.current = null;
    setOverKey(null);
    setDragKey(null);
    setDragDate(null);
  };

  const reorderWithinDate = (fromKey: string, toKey: string, date: string) => {
    setUiRows((prev) => {
      const from = prev.findIndex((x) => x.__key === fromKey);
      const to = prev.findIndex((x) => x.__key === toKey);
      if (from < 0 || to < 0 || from === to) return prev;

      if (toISODate(prev[from].activity_date) !== date) return prev;
      if (toISODate(prev[to].activity_date) !== date) return prev;

      const moved = moveItem(prev, from, to);
      const ren = renumberDate(moved, date);
      return ren.sort(sortRows);
    });
  };

  const onDragOverRow = (targetKey: string, targetDate: string) => (e: React.DragEvent) => {
    const p = dragRef.current;
    if (!p) return;
    if (p.date !== targetDate) return;
    if (p.key === targetKey) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    setOverKey(targetKey);
    reorderWithinDate(p.key, targetKey, targetDate);
  };

  const onDropRow = (e: React.DragEvent) => {
    e.preventDefault();
    endDrag();
  };

  const moveUp = (key: string, date: string) => {
    setUiRows((prev) => {
      const idx = prev.findIndex((x) => x.__key === key);
      if (idx < 0) return prev;

      if (toISODate(prev[idx].activity_date) !== date) return prev;

      let prevIdx = idx - 1;
      while (prevIdx >= 0 && toISODate(prev[prevIdx].activity_date) !== date) prevIdx -= 1;
      if (prevIdx < 0) return prev;

      const moved = moveItem(prev, idx, prevIdx);
      const ren = renumberDate(moved, date);
      return ren.sort(sortRows);
    });
  };

  const moveDown = (key: string, date: string) => {
    setUiRows((prev) => {
      const idx = prev.findIndex((x) => x.__key === key);
      if (idx < 0) return prev;

      if (toISODate(prev[idx].activity_date) !== date) return prev;

      let nextIdx = idx + 1;
      while (nextIdx < prev.length && toISODate(prev[nextIdx].activity_date) !== date) nextIdx += 1;
      if (nextIdx >= prev.length) return prev;

      const moved = moveItem(prev, idx, nextIdx);
      const ren = renumberDate(moved, date);
      return ren.sort(sortRows);
    });
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
          transition: background 120ms ease, outline-color 120ms ease;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(31, 81, 50, 0.15);
          align-items: center;
          color: #1f5132;
          font-weight: 800;
        }

        .rowLine:last-child {
          border-bottom: none;
        }

        .rowLine.dragging {
          opacity: 0.65;
          transform: scale(0.995);
          filter: saturate(1.05);
        }

        .rowLine.over {
          outline: 2px solid rgba(31, 81, 50, 0.35);
          outline-offset: -2px;
          background: rgba(31, 81, 50, 0.06);
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
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }

        .dragHandle:active {
          cursor: grabbing;
        }

        .rowLine.dragging .dragHandle {
          background: #dff1e6;
        }

        .moveBtns {
          display: none;
          gap: 6px;
          align-items: center;
          justify-content: center;
        }

        .mvBtn {
          width: 34px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          color: #1f5132;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
        }

        .mvBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
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

        textarea.input {
          height: auto;
          min-height: 42px;
          resize: none;
          overflow: hidden;
          line-height: 1.25;
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
            grid-template-columns: 34px minmax(0, 1fr) 42px;
            grid-template-areas:
              "drag place del"
              "drag act del";
            gap: 8px;
            align-items: start;
          }

          .dragHandle {
            width: 34px;
          }

          .placeCell {
            grid-area: place;
          }

          .actCell {
            grid-area: act;
          }

          .dragCell {
            grid-area: drag;
          }

          .delCell {
            grid-area: del;
          }

          .select,
          .input {
            padding: 10px 10px;
          }

          .dragHandle {
            display: inline-flex;
          }

          .moveBtns {
            display: flex;
          }
        }

        @media (max-width: 520px) {
          :global(body) {
            -webkit-touch-callout: none;
          }
        }
      `}</style>

      {err && <div className="msgErr">{err}</div>}
      {okMsg && <div className="msgOk">{okMsg}</div>}

      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>Actividades</div>
          <div className="muted">Fechas fijas. Reordena y guarda.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => refresh()} disabled={loading}>
            {loading ? "Cargando…" : "Refrescar"}
          </button>
          <button className="btn btnPrimary" onClick={saveAll} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="groups">
        {grouped.map(([d, items]) => (
          <div key={d} className="groupCard">
            <div className="groupHeader">
              <div>{d}</div>
              <button className="miniBtn" onClick={() => addRowForDate(d)} title="Agregar fila a esta fecha">
                +
              </button>
            </div>

            {items.map((r, idx) => {
              const isDragging = dragKey === r.__key && dragDate === d;
              const isOver = overKey === r.__key && dragDate === d && dragKey && dragKey !== r.__key;

              const canUp = idx > 0;
              const canDown = idx < items.length - 1;

              return (
                <div
                  key={r.__key}
                  className={`rowLine${isDragging ? " dragging" : ""}${isOver ? " over" : ""}`}
                  onDragOver={onDragOverRow(r.__key, d)}
                  onDrop={onDropRow}
                  data-rowkey={r.__key}
                  data-date={d}
                >
                  {!isTouchUI ? (
                    <div className="dragHandle dragCell" title="Arrastrar" draggable onDragStart={startDrag(r.__key, d)} onDragEnd={endDrag}>
                      ≡
                    </div>
                  ) : (
                    <div className="moveBtns dragCell" aria-label="Mover">
                      <button className="mvBtn" onClick={() => moveUp(r.__key, d)} disabled={!canUp || !!r.__deleting} title="Subir">
                        ↑
                      </button>
                      <button className="mvBtn" onClick={() => moveDown(r.__key, d)} disabled={!canDown || !!r.__deleting} title="Bajar">
                        ↓
                      </button>
                    </div>
                  )}

                  <select className="select placeCell" value={r.place} onChange={(e) => setCell(r.__key, { place: e.target.value })}>
                    {PLACES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <textarea
                    className="input actCell"
                    value={r.activity ?? ""}
                    rows={1}
                    onFocus={(e) => autoGrow(e.currentTarget)}
                    onInput={(e) => autoGrow(e.currentTarget)}
                    onChange={(e) => {
                      setCell(r.__key, { activity: e.target.value });
                      requestAnimationFrame(() => autoGrow(e.currentTarget));
                    }}
                  />

                  <button className="delBtn delCell" onClick={() => deleteRow(r)} disabled={!!r.__deleting} title="Eliminar">
                    {r.__deleting ? "…" : "-"}
                  </button>
                </div>
              );
            })}

            {!items.length && (
              <div style={{ padding: 12, color: "#2a5e3b", fontWeight: 800, opacity: 0.9 }}>
                {loading ? "Cargando…" : "Sin actividades. Agrega con “+”."}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}