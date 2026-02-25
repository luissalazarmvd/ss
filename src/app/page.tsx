// src/app/page.tsx
import { supabase } from "../lib/supabaseServer";
import StaysTable from "../components/StaysTable";
import ActivitiesTable from "../components/ActivitiesTable";

export default async function Page() {
  const { data: stays, error: staysErr } = await supabase
    .from("stays")
    .select("*")
    .order("place", { ascending: true })
    .order("total_price", { ascending: true });

  const { data: activities, error: actErr } = await supabase
    .from("activities")
    .select("*")
    .order("activity_date", { ascending: true })
    .order("place", { ascending: true });

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "16px 14px 40px",
      }}
    >
      <h1 style={{ margin: "0 0 12px 0", textAlign: "center" }}>Viaje: stays + actividades</h1>

      {(staysErr || actErr) && (
        <pre style={{ background: "#fee", padding: 12, borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify({ staysErr, actErr }, null, 2)}
        </pre>
      )}

      <h2 style={{ marginTop: 24, textAlign: "center" }}>Hospedajes</h2>
      <StaysTable rows={stays ?? []} />

      <h2 style={{ marginTop: 24, textAlign: "center" }}>Actividades</h2>
      <ActivitiesTable rows={activities ?? []} />
    </main>
  );
}