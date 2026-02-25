// src/app/page.tsx
import StaysTable from "../components/StaysTable";
import ActivitiesTable from "../components/ActivitiesTable";

export default async function Page() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "16px 14px 40px",
      }}
    >
      <h1 style={{ margin: "0 0 12px 0", textAlign: "center" }}>Viaje: stays + actividades</h1>

      <h2 style={{ marginTop: 24, textAlign: "center" }}>Hospedajes</h2>
      <StaysTable />

      <h2 style={{ marginTop: 24, textAlign: "center" }}>Actividades</h2>
      <ActivitiesTable />
    </main>
  );
}