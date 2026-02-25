// src/components/StaysTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type StayRow = {
  place: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  rooms: number | null;
  beds: number | null;
  listing_link: string | null;
};

type UIStayRow = StayRow & {
  __key: string;
  __orig_link: string | null;
  __saving?: boolean;
  __error?: string | null;
  __link_input?: string;
  __deleting?: boolean;
};

const PLACES = ["Pozuzo", "Oxapampa"] as const;

function toISODate(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function getAirbnbId(url: string | null) {
  if (!url) return null;
  const m = url.match(/\/rooms\/(\d+)/);
  return m?.[1] ?? null;
}

function fmtMoney(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toFixed(2);
}

function toNumOrNull(v: string) {
  if (v === "" || v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function toNum(v: string, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function AirbnbEmbed({
  listingId,
  checkIn,
  checkOut,
  adults = 4,
}: {
  listingId: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}) {
  const embedHref = useMemo(() => {
    const ci = checkIn ? `check_in=${encodeURIComponent(toISODate(checkIn))}` : "";
    const co = checkOut ? `&check_out=${encodeURIComponent(toISODate(checkOut))}` : "";
    const ad = `&adults=${encodeURIComponent(String(adults))}`;
    return `https://es-l.airbnb.com/rooms/${listingId}?${ci}${co}${ad}&s=66&source=embed_widget`;
  }, [listingId, checkIn, checkOut, adults]);

  useEffect(() => {
    const SRC = "https://www.airbnb.com.pe/embeddable/airbnb_jssdk";
    const id = "airbnb_jssdk_force";

    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src = SRC;
    document.body.appendChild(s);
  }, [listingId, checkIn, checkOut]);

  return (
    <div
      className="airbnb-embed-frame"
      data-id={listingId}
      data-view="home"
      data-hide-price="true"
      style={{ width: "min(450px, 92vw)", height: "min(300px, 60vh)", margin: "0 auto" }}
    >
      <a href={embedHref} target="_blank" rel="noreferrer">
        Ver en Airbnb
      </a>
      <a href={embedHref} target="_blank" rel="nofollow noreferrer">
        Abrir detalle
      </a>
    </div>
  );
}

export default function StaysTable({ rows }: { rows: StayRow[] }) {
  const [data, setData] = useState<UIStayRow[]>([]);
  const [openEmbedForKey, setOpenEmbedForKey] = useState<string | null>(null);

  useEffect(() => {
    setData(
      (rows ?? []).map((r, idx) => ({
        ...r,
        check_in_date: toISODate(r.check_in_date),
        check_out_date: toISODate(r.check_out_date),
        __key: `${r.listing_link ?? "no-link"}-${idx}-${Math.random().toString(16).slice(2)}`,
        __orig_link: r.listing_link ?? null,
        __saving: false,
        __deleting: false,
        __error: null,
        __link_input: "",
      }))
    );
  }, [rows]);

  const openRow = useMemo(() => data.find((r) => r.__key === openEmbedForKey) ?? null, [data, openEmbedForKey]);
  const embedId = useMemo(() => getAirbnbId(openRow?.listing_link ?? null), [openRow?.listing_link]);

  const addRow = () => {
    const iso = new Date().toISOString().slice(0, 10);

    const newRow: UIStayRow = {
      place: "Pozuzo",
      check_in_date: iso,
      check_out_date: iso,
      total_price: 0,
      rooms: null,
      beds: null,
      listing_link: null,
      __key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      __orig_link: null,
      __saving: false,
      __deleting: false,
      __error: null,
      __link_input: "",
    };

    setData((prev) => [newRow, ...prev]);
  };

  const updateLocal = (key: string, patch: Partial<UIStayRow>) => {
    setData((prev) => prev.map((r) => (r.__key === key ? { ...r, ...patch, __error: null } : r)));
  };

  const applyLinkInputToRow = (row: UIStayRow): UIStayRow => {
    const typed = (row.__link_input ?? "").trim();
    if (!typed) return row;
    return { ...row, listing_link: typed, __link_input: "" };
  };

  const saveRow = async (row: UIStayRow) => {
    const rowToSave = applyLinkInputToRow(row);

    updateLocal(row.__key, {
      __saving: true,
      __error: null,
      listing_link: rowToSave.listing_link,
      __link_input: rowToSave.__link_input,
    });

    const payload = {
      orig_link: rowToSave.__orig_link,
      row: {
        place: rowToSave.place,
        check_in_date: rowToSave.check_in_date,
        check_out_date: rowToSave.check_out_date,
        total_price: Number(rowToSave.total_price),
        rooms: rowToSave.rooms,
        beds: rowToSave.beds,
        listing_link: rowToSave.listing_link && rowToSave.listing_link.trim() ? rowToSave.listing_link.trim() : null,
      },
    };

    try {
      const res = await fetch("/api/stays/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || `Error guardando (HTTP ${res.status})`);

      updateLocal(row.__key, {
        __saving: false,
        __error: null,
        __orig_link: payload.row.listing_link ?? null,
        listing_link: payload.row.listing_link ?? null,
        check_in_date: toISODate(payload.row.check_in_date),
        check_out_date: toISODate(payload.row.check_out_date),
        total_price: Number(payload.row.total_price),
        __link_input: "",
      });
    } catch (e: any) {
      updateLocal(row.__key, { __saving: false, __error: e?.message || "Error guardando" });
    }
  };

  const deleteRow = async (row: UIStayRow) => {
    const link = (row.listing_link ?? "").trim();
    const orig = (row.__orig_link ?? "").trim();

    const id = link || orig;
    if (!id) {
      setData((prev) => prev.filter((r) => r.__key !== row.__key));
      return;
    }

    updateLocal(row.__key, { __deleting: true, __error: null });

    try {
      const res = await fetch("/api/stays/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_link: id }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || `Error eliminando (HTTP ${res.status})`);

      setData((prev) => prev.filter((r) => r.__key !== row.__key));
      if (openEmbedForKey === row.__key) setOpenEmbedForKey(null);
    } catch (e: any) {
      updateLocal(row.__key, { __deleting: false, __error: e?.message || "Error eliminando" });
    }
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
        }
        .muted {
          color: #2a5e3b;
          opacity: 0.9;
          font-size: 13px;
          font-weight: 700;
        }

        .cards {
          display: grid;
          gap: 12px;
        }
        .card {
          border: 1px solid #c6d9cc;
          border-radius: 14px;
          padding: 12px;
          background: #e8f6ee;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .grid3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
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
        .select {
          width: 100%;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid #c6d9cc;
          background: #cfe9d7;
          color: #1f5132;
          font-size: 14px;
          font-weight: 800;
          outline: none;
        }
        .input::placeholder {
          color: rgba(31, 81, 50, 0.55);
          font-weight: 800;
        }

        :global(input[type="number"]::-webkit-outer-spin-button),
        :global(input[type="number"]::-webkit-inner-spin-button) {
          -webkit-appearance: none;
          margin: 0;
        }
        :global(input[type="number"]) {
          -moz-appearance: textfield;
          appearance: textfield;
        }

        .rowActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .linkLine {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .linkA {
          text-decoration: none;
          font-weight: 900;
          color: #1f5132;
          border-bottom: 2px solid rgba(31, 81, 50, 0.25);
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
        }

        .colLugar {
          width: 140px;
        }
        .colDate {
          width: 140px;
        }
        .colMoney {
          width: 130px;
        }
        .colPP {
          width: 110px;
        }
        .colSmall {
          width: 95px;
        }
        .colLink {
          width: 70px;
        }
        .colIcon {
          width: 90px;
        }
        .colSave {
          width: 110px;
        }
        .colDel {
          width: 80px;
        }

        @media (min-width: 950px) {
          .cards {
            display: none;
          }
          .tableWrap {
            display: block;
          }
        }

        @media (min-width: 950px) {
          .tableWrap {
            overflow-x: hidden;
          }
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }
        .embedWrap {
          width: 100%;
          max-width: 720px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>Stays</div>
          <div className="muted">Edita cualquier fila y guarda. “+” crea una nueva. “-” elimina por link.</div>
        </div>

        <button className="btn btnPrimary btnIcon" onClick={addRow} title="Agregar fila">
          +
        </button>
      </div>

      <div className="cards">
        {data.map((r) => {
          const perPerson = (Number(r.total_price) / 4) || 0;
          const id = getAirbnbId(r.listing_link ?? null);

          return (
            <div className="card" key={r.__key}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#1f5132" }}>{r.place}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>{fmtMoney(r.total_price)}</div>
                  <div className="muted">x persona (4): {fmtMoney(perPerson)}</div>
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Lugar</label>
                  <select className="select" value={r.place} onChange={(e) => updateLocal(r.__key, { place: e.target.value })}>
                    {PLACES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Total (S/.)</label>
                  <input className="input" type="number" inputMode="decimal" step="0.01" value={Number(r.total_price)} onChange={(e) => updateLocal(r.__key, { total_price: toNum(e.target.value, 0) })} />
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Check In</label>
                  <input className="input" type="date" value={toISODate(r.check_in_date)} onChange={(e) => updateLocal(r.__key, { check_in_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Check Out</label>
                  <input className="input" type="date" value={toISODate(r.check_out_date)} onChange={(e) => updateLocal(r.__key, { check_out_date: e.target.value })} />
                </div>
              </div>

              <div className="grid3">
                <div className="field">
                  <label>#Cuartos</label>
                  <input className="input" type="number" inputMode="numeric" step="1" value={r.rooms ?? ""} onChange={(e) => updateLocal(r.__key, { rooms: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>#Camas</label>
                  <input className="input" type="number" inputMode="numeric" step="1" value={r.beds ?? ""} onChange={(e) => updateLocal(r.__key, { beds: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>C/U (S/.)</label>
                  <input className="input" value={fmtMoney(perPerson)} readOnly />
                </div>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Link</label>
                <div className="linkLine">
                  <input className="input" placeholder="Pega link aquí…" value={r.__link_input ?? ""} onChange={(e) => updateLocal(r.__key, { __link_input: e.target.value })} />
                  <button className="btn btnIcon" onClick={() => setOpenEmbedForKey(r.__key)} disabled={!id} title={!id ? "No hay link guardado para preview" : "Ver preview"}>
                    🔎
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  {r.listing_link ? (
                    <a className="linkA" href={r.listing_link} target="_blank" rel="noreferrer">
                      link
                    </a>
                  ) : (
                    <span className="muted">Sin link guardado (Preview no disponible)</span>
                  )}
                </div>
              </div>

              {r.__error && (
                <div style={{ marginTop: 10, background: "#fee", border: "1px solid #f5c2c2", padding: 10, borderRadius: 12, color: "#7a1020", fontWeight: 800 }}>
                  {r.__error}
                </div>
              )}

              <div className="rowActions">
                <button className="btn btnPrimary" onClick={() => saveRow(r)} disabled={!!r.__saving || !!r.__deleting}>
                  {r.__saving ? "Guardando…" : "Guardar"}
                </button>
                <button className="btn btnDanger btnIcon" onClick={() => deleteRow(r)} disabled={!!r.__saving || !!r.__deleting} title="Eliminar (por listing_link)">
                  {r.__deleting ? "…" : "-"}
                </button>
              </div>
            </div>
          );
        })}

        {!data.length && <div className="muted">No hay filas en stays.</div>}
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th className="colLugar">Lugar</th>
              <th className="colDate">Check In</th>
              <th className="colDate">Check Out</th>
              <th className="colMoney">Total (S/.)</th>
              <th className="colPP">C/U (S/.)</th>
              <th className="colSmall">#Cuartos</th>
              <th className="colSmall">#Camas</th>
              <th className="colLink">Link</th>
              <th className="colIcon">Preview</th>
              <th className="colSave">Guardar</th>
              <th className="colDel">-</th>
            </tr>
          </thead>

          <tbody>
            {data.map((r) => {
              const perPerson = (Number(r.total_price) / 4) || 0;
              const id = getAirbnbId(r.listing_link ?? null);

              return (
                <tr key={r.__key}>
                  <td className="colLugar">
                    <select className="select" value={r.place} onChange={(e) => updateLocal(r.__key, { place: e.target.value })}>
                      {PLACES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="colDate">
                    <input className="input" type="date" value={toISODate(r.check_in_date)} onChange={(e) => updateLocal(r.__key, { check_in_date: e.target.value })} />
                  </td>

                  <td className="colDate">
                    <input className="input" type="date" value={toISODate(r.check_out_date)} onChange={(e) => updateLocal(r.__key, { check_out_date: e.target.value })} />
                  </td>

                  <td className="colMoney">
                    <input className="input" type="number" inputMode="decimal" step="0.01" value={Number(r.total_price)} onChange={(e) => updateLocal(r.__key, { total_price: toNum(e.target.value, 0) })} />
                  </td>

                  <td className="colPP" style={{ color: "#2a5e3b", fontWeight: 900 }}>
                    {fmtMoney(perPerson)}
                  </td>

                  <td className="colSmall">
                    <input className="input" type="number" inputMode="numeric" step="1" value={r.rooms ?? ""} onChange={(e) => updateLocal(r.__key, { rooms: toNumOrNull(e.target.value) })} />
                  </td>

                  <td className="colSmall">
                    <input className="input" type="number" inputMode="numeric" step="1" value={r.beds ?? ""} onChange={(e) => updateLocal(r.__key, { beds: toNumOrNull(e.target.value) })} />
                  </td>

                  <td className="colLink">
                    <input className="input" placeholder="Pega link…" value={r.__link_input ?? ""} onChange={(e) => updateLocal(r.__key, { __link_input: e.target.value })} />
                    {r.__error ? <div style={{ marginTop: 6, color: "#7a1020", fontWeight: 900 }}>{r.__error}</div> : null}
                  </td>

                  <td className="colIcon">
                    <button className="btn btnIcon" onClick={() => setOpenEmbedForKey(r.__key)} disabled={!id} title={!id ? "No hay link guardado para preview" : "Ver preview"}>
                      🔎
                    </button>
                  </td>

                  <td className="colSave">
                    <button className="btn btnPrimary" onClick={() => saveRow(r)} disabled={!!r.__saving || !!r.__deleting}>
                      {r.__saving ? "…" : "Guardar"}
                    </button>
                  </td>

                  <td className="colDel">
                    <button className="btn btnDanger btnIcon" onClick={() => deleteRow(r)} disabled={!!r.__saving || !!r.__deleting} title="Eliminar (por listing_link)">
                      {r.__deleting ? "…" : "-"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {!data.length && (
              <tr>
                <td colSpan={11} style={{ padding: 10 }}>
                  No hay filas en stays.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openEmbedForKey && (
        <div className="overlay" onClick={() => setOpenEmbedForKey(null)}>
          <div className="embedWrap" onClick={(e) => e.stopPropagation()}>
            {embedId && openRow ? (
              <AirbnbEmbed listingId={embedId} checkIn={openRow.check_in_date} checkOut={openRow.check_out_date} adults={4} />
            ) : (
              <div className="muted" style={{ background: "#e8f6ee", border: "1px solid #c6d9cc", borderRadius: 16, padding: 14, fontWeight: 900 }}>
                Sin link guardado para mostrar preview.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}