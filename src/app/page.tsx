// src/app/page.tsx
import StaysTable from "../components/StaysTable";
import ActivitiesTable from "../components/ActivitiesTable";

const DARK_GREEN = "#1f5132"; // mismo verde oscuro que usas en ActivitiesTable

export default async function Page() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "16px 14px 40px",
        color: DARK_GREEN, // aplica a todo el texto por defecto
      }}
    >
      <h1 style={{ margin: "0 0 12px 0", textAlign: "center", color: DARK_GREEN }}>
        Viaje: stays + actividades
      </h1>

      <h2 style={{ marginTop: 24, textAlign: "center", color: DARK_GREEN }}>Hospedajes</h2>
      <StaysTable />

      <h2 style={{ marginTop: 24, textAlign: "center", color: DARK_GREEN }}>Actividades</h2>
      <ActivitiesTable />
    </main>
  );
}