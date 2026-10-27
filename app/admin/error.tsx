"use client";

// Si la base (Upstash) no responde, el panel muestra esto en vez de una lista
// vacía. En producción Next oculta el mensaje real del error, así que el texto
// cubre ese caso sin poder confirmarlo.
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="admin-card" style={{ maxWidth: 560, margin: "48px auto", display: "grid", gap: 12 }}>
      <h1 className="admin-h1">No se pudo cargar el panel</h1>
      <p style={{ margin: 0 }}>
        Lo más probable es que la base de datos no esté respondiendo. Los leads y usuarios no se
        borran por esto: vuelven a aparecer apenas la base responda. Mientras tanto, los leads
        nuevos siguen llegando por correo a info@nuevaisapre.cl.
      </p>
      <button className="admin-btn" onClick={reset}>Reintentar</button>
    </div>
  );
}
