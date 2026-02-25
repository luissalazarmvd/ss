// src/components/ActivitiesTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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

export default function ActivitiesTable({ rows }: { rows: ActivityRow[] }) {
  const router = useRouter();

  const [uiRows, setUiRows] = useState<UIActivityRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const styles = useMemo(() => {
    const btnBase: React.CSSProperties = {
      border: "1px solid #ddd",
      background: "#fff",
      padding: "8px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 600,
      lineHeight: 1,
    };
    return {
      wrap: { overflowX: "auto" as const },
      toolbar: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "flex-start",
        margin: "0 0 10px 0",
        flexWrap: "wrap" as const,
      },
      btn: btnBase,
      btnPrimary: { ...btnBase, background: "#0b5fff", color: "#fff", borderColor: "#0b5fff" },
      btnDanger: { ...btnBase, background: "#fff", color: "#b00020", borderColor: "#f0c6cc" },
      table: { width: "100%", borderCollapse: "collapse" as const, minWidth: 720 },
      th: { textAlign: "left" as const, borderBottom: "1px solid #ddd", padding: 8, whiteSpace: "nowrap" as const },
      td: { padding: 8, borderBottom: "1px solid #f0f0f0" },
      input: {
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
      } as React.CSSProperties,
      small: { fontSize: 12, opacity: 0.8 },
      msgErr: { background: "#fee", padding: 12, borderRadius: 8, marginBottom: 10 },
      msgOk: { background: "#eefaf0", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #cfe8d6" },
    };
  }, []);

  useEffect(() => {
    const mapped: UIActivityRow[] = (rows ?? []).map((r, idx) => ({
      ...r,
      __key: String((r as any).id ?? `row-${idx}-${r.activity_date}-${r.place}`),
      __deleting: false,
    }));
    setUiRows(mapped);
    setErr(null);
    setOkMsg(null);
  }, [rows]);

  const setCell = (key: string, patch: Partial<ActivityRow>) => {
    setUiRows((prev) => prev.map((r) => (r.__key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const k = `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setUiRows((prev) => [
      ...prev,
      {
        __key: k,
        id: undefined,
        activity_date: "",
        place: "",
        activity: "",
        __deleting: false,
      },
    ]);
  };

  const validate = () => {
    for (const r of uiRows) {
      if (!r.activity_date?.trim()) return "Falta activity_date (YYYY-MM-DD) en una fila.";
      if (!r.place?.trim()) return "Falta place en una fila.";
      if (!r.activity?.trim()) return "Falta activity en una fila.";
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
        rows: uiRows.map(({ __key, __deleting, ...r }) => r),
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

  return (
    <div>
      {err && <div style={styles.msgErr}>{err}</div>}
      {okMsg && <div style={styles.msgOk}>{okMsg}</div>}

      <div style={styles.toolbar}>
        <button onClick={saveAll} disabled={saving} style={saving ? { ...styles.btnPrimary, opacity: 0.7, cursor: "not-allowed" } : styles.btnPrimary}>
          {saving ? "Guardando..." : "Guardar"}
        </button>

        <button onClick={addRow} style={styles.btn}>
          + Agregar fila
        </button>

        <span style={styles.small}>Orden: se respeta tal cual llega de Supabase (no se reordena acá).</span>
      </div>

      <div style={styles.wrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["date", "place", "activity", ""].map((h) => (
                <th key={h || "actions"} style={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {uiRows.map((r) => (
              <tr key={r.__key}>
                <td style={styles.td}>
                  <input value={r.activity_date ?? ""} onChange={(e) => setCell(r.__key, { activity_date: e.target.value })} placeholder="YYYY-MM-DD" style={styles.input} />
                </td>
                <td style={styles.td}>
                  <input value={r.place ?? ""} onChange={(e) => setCell(r.__key, { place: e.target.value })} placeholder="Lugar" style={styles.input} />
                </td>
                <td style={styles.td}>
                  <input value={r.activity ?? ""} onChange={(e) => setCell(r.__key, { activity: e.target.value })} placeholder="Actividad" style={styles.input} />
                </td>
                <td style={{ ...styles.td, width: 60, textAlign: "right" }}>
                  <button onClick={() => deleteRow(r)} style={r.__deleting ? { ...styles.btnDanger, opacity: 0.6, cursor: "not-allowed" } : styles.btnDanger} disabled={!!r.__deleting} title="Eliminar fila">
                    {r.__deleting ? "…" : "-"}
                  </button>
                </td>
              </tr>
            ))}

            {!uiRows.length && (
              <tr>
                <td colSpan={4} style={{ ...styles.td, padding: 12 }}>
                  No hay filas en activities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}