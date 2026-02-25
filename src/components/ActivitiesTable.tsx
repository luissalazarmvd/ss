// src/components/ActivitiesTable.tsx
type ActivityRow = {
  place: string;
  activity_date: string;
  activity: string;
};

export default function ActivitiesTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["date", "place", "activity"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{r.activity_date}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{r.place}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{r.activity}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={3} style={{ padding: 8 }}>
                No hay filas en activities.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}