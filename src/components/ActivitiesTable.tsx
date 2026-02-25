// src/components/ActivitiesTable.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ActivityRow = {
  id?: string | number;
  place: string;
  activity_date: string;
  activity: string;
};

type UIActivityRow = ActivityRow & {
  __key: string;
  __deleting?: boolean;
};

function toISODate(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function sortByDateAsc(rows: UIActivityRow[]) {
  const toTs = (s: string) => {
    const x = toISODate(s);
    if (!x) return Number.POSITIVE_INFINITY;
    const t = Date.parse(x);
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
  };
  return [...rows].sort((a, b) => {
    const da = toTs(a.activity_date);
    const db = toTs(b.activity_date);
    if (da !== db) return da - db;
    const pa = (a.place ?? "").toLowerCase();
    const pb = (b.place ?? "").toLowerCase();
    if (pa !== pb) return pa.localeCompare(pb);
    const aa = (a.activity ?? "").toLowerCase();
    const ab = (b.activity ?? "").toLowerCase();
    return aa.localeCompare(ab);
  });
}

export default function ActivitiesTable({ rows }: { rows: ActivityRow[] }) {
  const router = useRouter();

  const [uiRows, setUiRows] = useState<UIActivityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const confirmTimersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const mapped: UIActivityRow[] = (rows ?? []).map((r, idx) => ({
      ...r,
      activity_date: toISODate(r.activity_date),
      __key: String((r as any).id ?? `row-${idx}-${toISODate(r.activity_date)}-${r.place}-${Math.random().toString(16).slice(2)}`),
      __deleting: false,
    }));
    setUiRows(sortByDateAsc(mapped));
    setErr(null);
    setOkMsg(null);
  }, [rows]);

  const viewRows = useMemo(() => sortByDateAsc(uiRows), [uiRows]);

  const grouped = useMemo(() => {
    const m = new Map<string, UIActivityRow[]>();
    for (const r of viewRows) {
      const d = toISODate(r.activity_date) || "Sin fecha";
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [viewRows]);

  const setCell = (key: string, patch: Partial<ActivityRow>) => {
    setUiRows((prev) =>
      prev.map((r) =>
        r.__key === key
          ? {
              ...r,
              ...patch,
              activity_date: patch.activity_date !== undefined ? toISODate(patch.activity_date) : r.activity_date,
            }
          : r
      )
    );
  };

  const addRow = () => {
    const iso = new Date().toISOString().slice(0, 10);
    const k = `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setUiRows((prev) =>
      sortByDateAsc([
        ...prev,
        {
          __key: k,
          id: undefined,
          activity_date: iso,
          place: "",
          activity: "",
          __deleting: false,
        },
      ])
    );
  };

  const validate = () => {
    for (const r of viewRows) {
      if (!toISODate(r.activity_date)?.trim()) return "Falta fecha en una fila.";
      if (!r.place?.trim()) return "Falta lugar en una fila.";
      if (!r.activity?.trim()) return "Falta actividad en una fila.";
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
      const payload = {
        rows: viewRows.map(({ __key, __deleting, ...r }) => ({
          ...r,
          activity_date: toISODate(r.activity_date),
        })),
      };

      const resp = await fetch("/api/activities/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error guardando (HTTP ${resp.status})`);

      setOkMsg("Guardado OK.");
      router.refresh();
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
      const resp = await fetch("/api/activities/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `Error eliminando (HTTP ${resp.status})`);

      setUiRows((prev) => prev.filter((x) => x.__key !== r.__key));
      router.refresh();
    } catch (e: any) {
      setUiRows((prev) => prev.map((x) => (x.__key === r.__key ? { ...x, __deleting: false } : x)));
      setErr(e?.message || "Error eliminando.");
    }
  };

  const askDelete = (row: UIActivityRow) => {
    if (row.__deleting) return;

    const key = row.__key;
    const flagKey = `__confirm_${key}`;

    const anyRow: any = row as any;
    if (anyRow[flagKey]) {
      deleteRow(row);
      return;
    }

    if (confirmTimersRef.current[key]) clearTimeout(confirmTimersRef.current[key]);

    setUiRows((prev) =>
      prev.map((r) => {
        if (r.__key !== key) return r as any;
        const x: any = { ...r };
        x[flagKey] = true;
        return x;
      })
    );

    confirmTimersRef.current[key] = setTimeout(() => {
      setUiRows((prev) =>
        prev.map((r) => {
          if (r.__key !== key) return r as any;
          const x: any = { ...r };
          x[flagKey] = false;
          return x;
        })
      );
      confirmTimersRef.current[key] = null;
    }, 4000);
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
        .btnDanger {
          border: 1px solid rgba(122, 16, 32, 0.25);
          background: #fff;
          color: #7a1020;
        }
        .btnIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
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

        .cards {
          display: grid;
          gap: 12px;
          place-items: center;
          width: 100%;
          max-width: 100%;
        }
        .card {
          width: min(560px, calc(100vw - 28px));
          max-width: 100%;
          border: 1px solid #c6d9cc;
          border-radius: 14px;
          padding: 12px;
          background: #e8f6ee;
          overflow: hidden;
        }

        .grid2 {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
          margin-top: 10px;
          align-items: start;
        }
        .field {
          display: grid;
          justify-items: stretch;
          min-width: 0;
        }
        .field label {
          display: block;
          font-size: 12px;
          color: #1f5132;
          opacity: 0.9;
          margin-bottom: 4px;
          font-weight: 800;
        }

        .input,
        .textarea {
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
        .input::placeholder,
        .textarea::placeholder {
          color: rgba(31, 81, 50, 0.55);
          font-weight: 800;
        }
        .textarea {
          min-height: 44px;
          resize: vertical;
        }

        .rowActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }

        .tableWrap {
          display: none;
          overflow-x: hidden;
          border-radius: 14px;
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          padding: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: transparent;
        }
        th,
        td {
          text-align: left;
          border-bottom: 1px solid rgba(31, 81, 50, 0.2);
          padding: 10px 8px;
          vertical-align: top;
          color: #1f5132;
          font-weight: 800;
          overflow: hidden;
        }
        th {
          border-bottom: 1px solid rgba(31, 81, 50, 0.35);
          font-weight: 900;
          white-space: nowrap;
        }

        .colDate {
          width: 140px;
        }
        .colPlace {
          width: 160px;
        }
        .colAct {
          width: auto;
        }
        .colDel {
          width: 70px;
        }

        .mobileList {
          display: block;
        }
        .dayGroup {
          width: min(560px, calc(100vw - 28px));
          border: 1px solid #c6d9cc;
          border-radius: 14px;
          background: #e8f6ee;
          overflow: hidden;
          margin: 0 auto 12px;
        }
        .dayHeader {
          padding: 10px 12px;
          font-weight: 900;
          color: #1f5132;
          border-bottom: 1px solid rgba(31, 81, 50, 0.2);
          background: #e2f3e8;
        }
        .rowLine {
          display: grid;
          grid-template-columns: 140px minmax(0, 1fr);
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(31, 81, 50, 0.15);
          color: #1f5132;
          font-weight: 800;
        }
        .rowLine:last-child {
          border-bottom: none;
        }
        .rowLeft {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rowRight {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (min-width: 950px) {
          .cards {
            display: none;
          }
          .mobileList {
            display: none;
          }
          .tableWrap {
            display: block;
            overflow-x: hidden;
          }
          th,
          td {
            padding: 8px 6px;
          }
          .input,
          .textarea {
            padding: 8px 8px;
          }
          .btnIcon {
            width: 36px;
            height: 36px;
            border-radius: 12px;
          }
        }

        @media (max-width: 480px) {
          .grid2 {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
          .dateNarrow {
            justify-items: center;
          }
          .dateNarrow .input {
            width: 150px;
            max-width: 100%;
            height: 44px;
            padding-left: 8px;
            padding-right: 8px;
          }
        }
      `}</style>

      {err && <div className="msgErr">{err}</div>}
      {okMsg && <div className="msgOk">{okMsg}</div>}

      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>Activities</div>
          <div className="muted">Ordenado por fecha (más antiguo → más nuevo). Edita y guarda.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btnPrimary" onClick={saveAll} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btnPrimary btnIcon" onClick={addRow} title="Agregar fila">
            +
          </button>
        </div>
      </div>

      <div className="mobileList">
        {grouped.map(([d, items]) => (
          <div key={d} className="dayGroup">
            <div className="dayHeader">{d}</div>
            {items.map((r) => (
              <div key={r.__key} className="rowLine">
                <div className="rowLeft">{r.place?.trim() ? r.place : "Sin lugar"}</div>
                <div className="rowRight">{r.activity?.trim() ? r.activity : "—"}</div>
              </div>
            ))}
          </div>
        ))}
        {!viewRows.length && <div className="muted">No hay filas en activities.</div>}
      </div>

      <div className="cards">
        {viewRows.map((r) => {
          const anyRow: any = r as any;
          const flagKey = `__confirm_${r.__key}`;
          const confirm = !!anyRow[flagKey];

          return (
            <div className="card" key={r.__key}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "#1f5132" }}>{r.place?.trim() ? r.place : "Sin lugar"}</div>
                <div className="muted" style={{ fontWeight: 900 }}>
                  {toISODate(r.activity_date) || "Sin fecha"}
                </div>
              </div>

              <div className="grid2">
                <div className="field dateNarrow">
                  <label>Fecha</label>
                  <input className="input" type="date" value={toISODate(r.activity_date)} onChange={(e) => setCell(r.__key, { activity_date: e.target.value })} />
                </div>

                <div className="field">
                  <label>Lugar</label>
                  <input className="input" value={r.place ?? ""} onChange={(e) => setCell(r.__key, { place: e.target.value })} placeholder="Lugar" />
                </div>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Actividad</label>
                <textarea className="textarea" value={r.activity ?? ""} onChange={(e) => setCell(r.__key, { activity: e.target.value })} placeholder="Actividad" />
              </div>

              <div className="rowActions">
                <button className="btn btnDanger" onClick={() => askDelete(r)} disabled={!!r.__deleting}>
                  {r.__deleting ? "Eliminando…" : confirm ? "Segura loca?" : "Eliminar (-)"}
                </button>
              </div>
            </div>
          );
        })}

        {!viewRows.length && <div className="muted">No hay filas en activities.</div>}
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th className="colDate">Fecha</th>
              <th className="colPlace">Lugar</th>
              <th className="colAct">Actividad</th>
              <th className="colDel">Del</th>
            </tr>
          </thead>

          <tbody>
            {viewRows.map((r) => {
              const anyRow: any = r as any;
              const flagKey = `__confirm_${r.__key}`;
              const confirm = !!anyRow[flagKey];

              return (
                <tr key={r.__key}>
                  <td className="colDate">
                    <input className="input" type="date" value={toISODate(r.activity_date)} onChange={(e) => setCell(r.__key, { activity_date: e.target.value })} />
                  </td>

                  <td className="colPlace">
                    <input className="input" value={r.place ?? ""} onChange={(e) => setCell(r.__key, { place: e.target.value })} placeholder="Lugar" />
                  </td>

                  <td className="colAct">
                    <input className="input" value={r.activity ?? ""} onChange={(e) => setCell(r.__key, { activity: e.target.value })} placeholder="Actividad" />
                  </td>

                  <td className="colDel">
                    <button className="btn btnDanger btnIcon" onClick={() => askDelete(r)} disabled={!!r.__deleting} title="Eliminar">
                      {r.__deleting ? "…" : confirm ? "?" : "-"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {!viewRows.length && (
              <tr>
                <td colSpan={4} style={{ padding: 10 }}>
                  No hay filas en activities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}