import Link from "next/link";

// Pestañas de Créditos para el admin (jefe de equipo que también vende):
// sus créditos personales y los del equipo.
export default function PestanasCreditos({ activa }: { activa: "mios" | "equipo" }) {
  return (
    <div className="admin-filters" style={{ marginBottom: 12 }}>
      <Link href="/admin/mis-creditos" className={`pill ${activa === "mios" ? "active" : ""}`}>
        👤 Mis créditos
      </Link>
      <Link href="/admin/creditos" className={`pill ${activa === "equipo" ? "active" : ""}`}>
        👥 Créditos del equipo
      </Link>
    </div>
  );
}
