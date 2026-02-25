// src/components/StaysTable.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type StayRow = {
  place: string;
  check_in_date: string;   // "YYYY-MM-DD"
  check_out_date: string;  // "YYYY-MM-DD"
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

/**
 * EMBED Airbnb que “re-renderiza” siempre:
 * - Inyecta el script cuando se monta.
 * - Si ya existe, lo reemplaza para forzar ejecución.
 */
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const embedHref = useMemo(() => {
    const ci = checkIn ? `check_in=${encodeURIComponent(toISODate(checkIn))}` : "";
    const co = checkOut ? `&check_out=${encodeURIComponent(toISODate(checkOut))}` : "";
    const ad = `&adults=${encodeURIComponent(String(adults))}`;
    return `https://es-l.airbnb.com/rooms/${listingId}?${ci}${co}${ad}&s=66&source=embed_widget`;
  }, [listingId, checkIn, checkOut, adults]);

  useEffect(() => {
    // Forzar que el script “corra” después de insertar el div embed.
    // Airbnb SDK suele escanear el DOM al ejecutarse.
    const SRC = "https://www.airbnb.com.pe/embeddable/airbnb_jssdk";
    const id = "airbnb_jssdk_force";

    // Remueve script previo para re-ejecutarlo
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src = SRC;

    // Insertar al final del body (o head)
    document.body.appendChild(s);

    return () => {
      // opcional: no lo removemos en cleanup para no estar creando/quitando en cada render
      // pero si quieres estricto:
      // const x = document.getElementById(id); if (x) x.remove();
    };
  }, [listingId, checkIn, checkOut]);

  return (
    <div
      ref={containerRef}
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
    }))
  );

  const [openEmbedForKey, setOpenEmbedForKey] = useState<string | null>(null);

  const openRow = useMemo(
    () => data.find((r) => r.__key === openEmbedForKey) ?? null,
    [data, openEmbedForKey]
  );

  const embedId = useMemo(
    () => getAirbnbId(openRow?.listing_link ?? null),
    [openRow?.listing_link]
  );

  const addRow = () => {
    const iso = new Date().toISOString().slice(0, 10);

    const newRow: UIStayRow = {
      place: "Viaje",
      check_in_date: iso,
      check_out_date: iso,
      total_price: 0,
      rooms: null,
      beds: null,
      listing_link: "",
      __key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      __orig_link: null,
      __saving: false,
      __error: null,
    };

    setData((prev) => [newRow, ...prev]);
  };

  const updateLocal = (key: string, patch: Partial<UIStayRow>) => {
    setData((prev) => prev.map((r) => (r.__key === key ? { ...r, ...patch, __error: null } : r)));
  };

  const saveRow = async (row: UIStayRow) => {
    updateLocal(row.__key, { __saving: true, __error: null });

    const payload = {
      orig_link: row.__orig_link,
      row: {
        place: row.place,
        check_in_date: row.check_in_date,
        check_out_date: row.check_out_date,
        total_price: Number(row.total_price),
        rooms: row.rooms,
        beds: row.beds,
        listing_link: row.listing_link && row.listing_link.trim() ? row.listing_link.trim() : null,
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
        listing_link: payload.row.listing_link ?? "",
        check_in_date: toISODate(payload.row.check_in_date),
        check_out_date: toISODate(payload.row.check_out_date),
        total_price: Number(payload.row.total_price),
      });
    } catch (e: any) {
      updateLocal(row.__key, { __saving: false, __error: e?.message || "Error guardando" });
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
          border: 1px solid #ddd;
          background: #fff;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
        }
        .btnPrimary {
          border: 1px solid #111;
          background: #111;
          color: #fff;
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
          color: #666;
          font-size: 13px;
        }

        .cards {
          display: grid;
          gap: 12px;
        }
        .card {
          border: 1px solid #e9e9e9;
          border-radius: 14px;
          padding: 12px;
          background: #fff;
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
          color: #666;
          margin-bottom: 4px;
        }
        .input,
        .select {
          width: 100%;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          font-size: 14px;
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
          font-weight: 600;
        }

        .tableWrap {
          display: none;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1100px;
        }
        th,
        td {
          text-align: left;
          border-bottom: 1px solid #eee;
          padding: 10px;
          vertical-align: top;
        }
        th {
          border-bottom: 1px solid #ddd;
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
        .modal {
          width: 100%;
          max-width: 720px;
          background: #fff;
          border-radius: 16px;
          padding: 12px;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
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
          <div style={{ fontWeight: 800, fontSize: 18 }}>Stays</div>
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
                <div style={{ fontWeight: 800 }}>{r.place}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtMoney(r.total_price)}</div>
                  <div className="muted">x persona (4): {fmtMoney(perPerson)}</div>
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Place</label>
                  <select className="select" value={r.place} onChange={(e) => updateLocal(r.__key, { place: e.target.value })}>
                    {PLACES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Total price</label>
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
                  <label>Check-in</label>
                  <input className="input" type="date" value={toISODate(r.check_in_date)} onChange={(e) => updateLocal(r.__key, { check_in_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Check-out</label>
                  <input className="input" type="date" value={toISODate(r.check_out_date)} onChange={(e) => updateLocal(r.__key, { check_out_date: e.target.value })} />
                </div>
              </div>

              <div className="grid3">
                <div className="field">
                  <label>Rooms</label>
                  <input className="input" type="number" step="1" value={r.rooms ?? ""} onChange={(e) => updateLocal(r.__key, { rooms: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>Beds</label>
                  <input className="input" type="number" step="1" value={r.beds ?? ""} onChange={(e) => updateLocal(r.__key, { beds: toNumOrNull(e.target.value) })} />
                </div>
                <div className="field">
                  <label>Precio x Persona</label>
                  <input className="input" value={fmtMoney(perPerson)} readOnly />
                </div>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Listing link</label>
                <div className="linkLine">
                  <input
                    className="input"
                    placeholder="Pega el link del listing…"
                    value={r.listing_link ?? ""}
                    onChange={(e) => updateLocal(r.__key, { listing_link: e.target.value })}
                  />
                  <button
                    className="btn btnIcon"
                    onClick={() => setOpenEmbedForKey(r.__key)}
                    disabled={!id}
                    title={!id ? "No pude leer el ID del link" : "Ver embed"}
                  >
                    🔎
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  {r.listing_link ? (
                    <a className="linkA" href={r.listing_link} target="_blank" rel="noreferrer">
                      link
                    </a>
                  ) : (
                    <span className="muted">Sin link</span>
                  )}
                </div>
              </div>

              {r.__error && (
                <div style={{ marginTop: 10, background: "#fee", border: "1px solid #f5c2c2", padding: 10, borderRadius: 12 }}>
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
              {["place", "check_in", "check_out", "total_price", "px_persona(4)", "rooms", "beds", "listing_link", "embed", "save"].map((h) => (
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
                        <option key={p} value={p}>{p}</option>
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

                  <td style={{ minWidth: 380 }}>
                    <div className="linkLine">
                      <input className="input" placeholder="link…" value={r.listing_link ?? ""} onChange={(e) => updateLocal(r.__key, { listing_link: e.target.value })} />
                      {r.listing_link ? (
                        <a className="btn" href={r.listing_link} target="_blank" rel="noreferrer">
                          link
                        </a>
                      ) : null}
                    </div>
                    {r.__error ? <div style={{ marginTop: 6, color: "#b00020" }}>{r.__error}</div> : null}
                  </td>

                  <td>
                    <button className="btn btnIcon" onClick={() => setOpenEmbedForKey(r.__key)} disabled={!id} title={!id ? "No pude leer el ID del link" : "Ver embed"}>
                      🔎
                    </button>
                  </td>

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

      {/* Modal embed */}
      {openEmbedForKey && (
        <div className="overlay" onClick={() => setOpenEmbedForKey(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div style={{ fontWeight: 800 }}>Miniatura Airbnb</div>
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
              <div className="muted">No pude extraer el ID del link.</div>
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