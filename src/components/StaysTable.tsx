// src/components/StaysTable.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type StayRow = {
  place: string;
  check_in_date: string; // "YYYY-MM-DD"
  check_out_date: string; // "YYYY-MM-DD"
  total_price: number;
  rooms: number | null;
  beds: number | null;
  listing_link: string | null; // esto alimenta el embed
};

type UIStayRow = StayRow & {
  __key: string;
  __orig_link: string | null; // link original en DB (para update)
  __saving?: boolean;
  __error?: string | null;

  // UI-only: input para ingresar link (SIEMPRE vacío al cargar)
  __link_input?: string;
};

const PLACES = ["Viaje", "Pozuzo", "Oxapampa"] as const;

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
  width = 450,
  height = 300,
}: {
  listingId: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  width?: number;
  height?: number;
}) {
  const embedHref = useMemo(() => {
    const ci = checkIn ? `check_in=${encodeURIComponent(toISODate(checkIn))}` : "";
    const co = checkOut ? `&check_out=${encodeURIComponent(toISODate(checkOut))}` : "";
    const ad = `&adults=${encodeURIComponent(String(adults))}`;
    return `https://es-l.airbnb.com/rooms/${listingId}?${ci}${co}${ad}&s=66&source=embed_widget`;
  }, [listingId, checkIn, checkOut, adults]);

  useEffect(() => {
    // re-ejecutar SDK para que escanee el DOM del modal
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
      style={{ width, height, margin: "0 auto" }}
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
  const [data, setData] = useState<UIStayRow[]>(
    (rows ?? []).map((r, idx) => ({
      ...r,
      check_in_date: toISODate(r.check_in_date),
      check_out_date: toISODate(r.check_out_date),
      __key: `${r.listing_link ?? "no-link"}-${idx}-${Math.random().toString(16).slice(2)}`,
      __orig_link: r.listing_link ?? null,
      __saving: false,
      __error: null,
      __link_input: "", // SIEMPRE vacío al cargar (aunque DB tenga listing_link)
    }))
  );

  const [openEmbedForKey, setOpenEmbedForKey] = useState<string | null>(null);

  const openRow = useMemo(
    () => data.find((r) => r.__key === openEmbedForKey) ?? null,
    [data, openEmbedForKey]
  );

  const embedId = useMemo(() => getAirbnbId(openRow?.listing_link ?? null), [openRow?.listing_link]);

  const addRow = () => {
    const iso = new Date().toISOString().slice(0, 10);

    const newRow: UIStayRow = {
      place: "Viaje",
      check_in_date: iso,
      check_out_date: iso,
      total_price: 0,
      rooms: null,
      beds: null,
      listing_link: null,
      __key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      __orig_link: null,
      __saving: false,
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
    return {
      ...row,
      listing_link: typed, // se guarda a DB
      __link_input: "", // se limpia siempre después de usarlo
    };
  };

  const saveRow = async (row: UIStayRow) => {
    // aplica link input solo al momento de guardar
    const rowToSave = applyLinkInputToRow(row);

    updateLocal(row.__key, {
      __saving: true,
      __error: null,
      listing_link: rowToSave.listing_link,
      __link_input: rowToSave.__link_input,
    });

    const payload = {
      orig_link: rowToSave.__orig_link, // puede ser null si es nueva
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
        __link_input: "", // siempre vacío
      });
    } catch (e: any) {
      updateLocal(row.__key, { __saving: false, __error: e?.message || "Error guardando" });
    }
  };

  return (
    <>
      <style jsx>{`
        :global(body) {
          /* por si acaso */
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .btn {
          border: 1px solid #c6d9cc;
          background: #e8f6ee; /* verde pastel */
          color: #1f5132; /* verde más oscuro */
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

        /* Mobile cards */
        .cards {
          display: grid;
          gap: 12px;
        }
        .card {
          border: 1px solid #c6d9cc;
          border-radius: 14px;
          padding: 12px;
          background: #e8f6ee; /* verde pastel */
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
          background: #cfe9d7; /* verde pastel del fondo */
          color: #1f5132; /* verde oscuro */
          font-size: 14px;
          font-weight: 800;
          outline: none;
        }
        .input::placeholder {
          color: rgba(31, 81, 50, 0.55);
          font-weight: 800;
        }

        .rowActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          align-items: center;
          flex-wrap: wrap;
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

        /* Desktop table */
        .tableWrap {
          display: none;
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid #c6d9cc;
          background: #e8f6ee;
          padding: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
          background: transparent;
        }
        th,
        td {
          text-align: left;
          border-bottom: 1px solid rgba(31, 81, 50, 0.2);
          padding: 10px;
          vertical-align: top;
          color: #1f5132;
          font-weight: 800;
        }
        th {
          border-bottom: 1px solid rgba(31, 81, 50, 0.35);
          font-weight: 900;
        }

        /* Modal */
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
        .modal {
          width: 100%;
          max-width: 720px;
          background: #e8f6ee;
          border-radius: 16px;
          padding: 12px;
          border: 1px solid #c6d9cc;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          color: #1f5132;
          font-weight: 900;
        }

        @media (min-width: 950px) {
          .cards {
            display: none;
          }
          .tableWrap {
            display: block;
          }
        }
      `}</style>

      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1f5132" }}>Stays</div>
          <div className="muted">Edita cualquier fila y guarda. “+” crea una nueva.</div>
        </div>

        <button className="btn btnPrimary btnIcon" onClick={addRow} title="Agregar fila">
          +
        </button>
      </div>

      {/* Mobile: cards */}
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
                  <label>Precio Total (S/.)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={Number(r.total_price)}
                    onChange={(e) => updateLocal(r.__key, { total_price: toNum(e.target.value, 0) })}
                  />
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
                  <input className="input" type="number" step="1" value={r.rooms ?? ""} onChange={(e) => updateLocal(r.__key, { rooms: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>#Camas</label>
                  <input className="input" type="number" step="1" value={r.beds ?? ""} onChange={(e) => updateLocal(r.__key, { beds: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>Precio por Persona (S/.)</label>
                  <input className="input" value={fmtMoney(perPerson)} readOnly />
                </div>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Link (ingreso)</label>
                <div className="linkLine">
                  <input
                    className="input"
                    placeholder="Pega link aquí (no se muestra el guardado)…"
                    value={r.__link_input ?? ""}
                    onChange={(e) => updateLocal(r.__key, { __link_input: e.target.value })}
                  />
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
                <button className="btn btnPrimary" onClick={() => saveRow(r)} disabled={!!r.__saving}>
                  {r.__saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          );
        })}

        {!data.length && <div className="muted">No hay filas en stays.</div>}
      </div>

      {/* Desktop: table */}
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              {[
                "Lugar",
                "Check In",
                "Check Out",
                "Precio Total (S/.)",
                "Precio por Persona (S/.)",
                "#Cuartos",
                "#Camas",
                "Link",
                "Preview",
                "Guardar",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const perPerson = (Number(r.total_price) / 4) || 0;
              const id = getAirbnbId(r.listing_link ?? null);

              return (
                <tr key={r.__key}>
                  <td>
                    <select className="select" value={r.place} onChange={(e) => updateLocal(r.__key, { place: e.target.value })}>
                      {PLACES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input className="input" type="date" value={toISODate(r.check_in_date)} onChange={(e) => updateLocal(r.__key, { check_in_date: e.target.value })} />
                  </td>

                  <td>
                    <input className="input" type="date" value={toISODate(r.check_out_date)} onChange={(e) => updateLocal(r.__key, { check_out_date: e.target.value })} />
                  </td>

                  <td>
                    <input className="input" type="number" step="0.01" value={Number(r.total_price)} onChange={(e) => updateLocal(r.__key, { total_price: toNum(e.target.value, 0) })} />
                  </td>

                  <td className="muted">{fmtMoney(perPerson)}</td>

                  <td>
                    <input className="input" type="number" step="1" value={r.rooms ?? ""} onChange={(e) => updateLocal(r.__key, { rooms: toNumOrNull(e.target.value) })} />
                  </td>

                  <td>
                    <input className="input" type="number" step="1" value={r.beds ?? ""} onChange={(e) => updateLocal(r.__key, { beds: toNumOrNull(e.target.value) })} />
                  </td>

                  {/* Link: SIEMPRE vacío al cargar, solo para ingresar */}
                  <td style={{ minWidth: 380 }}>
                    <input
                      className="input"
                      placeholder="Pega link aquí (input)…"
                      value={r.__link_input ?? ""}
                      onChange={(e) => updateLocal(r.__key, { __link_input: e.target.value })}
                    />
                    {r.__error ? <div style={{ marginTop: 6, color: "#7a1020", fontWeight: 900 }}>{r.__error}</div> : null}
                  </td>

                  {/* Preview */}
                  <td>
                    <button className="btn btnIcon" onClick={() => setOpenEmbedForKey(r.__key)} disabled={!id} title={!id ? "No hay link guardado para preview" : "Ver preview"}>
                      🔎
                    </button>
                  </td>

                  {/* Guardar */}
                  <td>
                    <button className="btn btnPrimary" onClick={() => saveRow(r)} disabled={!!r.__saving}>
                      {r.__saving ? "…" : "Guardar"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {!data.length && (
              <tr>
                <td colSpan={10} style={{ padding: 10 }}>
                  No hay filas en stays.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal preview */}
      {openEmbedForKey && (
        <div className="overlay" onClick={() => setOpenEmbedForKey(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>Preview Airbnb</div>
              <button className="btn" onClick={() => setOpenEmbedForKey(null)}>
                Cerrar
              </button>
            </div>

            {embedId && openRow ? (
              <AirbnbEmbed
                listingId={embedId}
                checkIn={openRow.check_in_date}
                checkOut={openRow.check_out_date}
                adults={4}
                width={450}
                height={300}
              />
            ) : (
              <div className="muted">No hay link guardado para mostrar el preview.</div>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              {openRow?.listing_link ? (
                <a className="btn" href={openRow.listing_link} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center" }}>
                  Abrir en Airbnb
                </a>
              ) : (
                <span className="muted" style={{ flex: 1 }}>
                  Sin link
                </span>
              )}
              <button className="btn btnPrimary" onClick={() => setOpenEmbedForKey(null)} style={{ flex: 1 }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}