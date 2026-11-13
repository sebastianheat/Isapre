"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { textoEstado, type EstadoCuenta, type PagoPlan } from "@/lib/planes-pagados-tipos";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }) : "";
const ETIQUETA: Record<PagoPlan["estado"], { texto: string; clase: string }> = {
  pendiente: { texto: "⏳ Por validar", clase: "orange" },
  validado: { texto: "✅ Validado", clase: "green" },
  rechazado: { texto: "❌ Rechazado", clase: "red" },
};
const MAX_FOTO = 850_000;

// Achica la foto en el celular antes de subirla (JPEG, lado mayor 1600 px).
async function comprimir(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = mal;
      i.src = url;
    });
    for (const [lado, calidad] of [[1600, 0.72], [1280, 0.6], [1024, 0.5]] as const) {
      const escala = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", calidad);
      if (data.length <= MAX_FOTO) return data;
    }
    throw new Error("muy pesada");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Planes pagados de UN vendedor: estado de su cuenta (cada 20 leads = 1 plan),
// registro del plan (él) y validación ("Validar factura": superadmin o admin).
export default function PlanesPagados({
  email,
  saldo,
  estadoInicial,
  pagosIniciales,
  puedeRegistrar,
  puedeValidar,
  nombres = {},
}: {
  email: string;
  saldo: number;
  estadoInicial: EstadoCuenta;
  pagosIniciales: PagoPlan[];
  puedeRegistrar: boolean;
  puedeValidar: boolean;
  nombres?: Record<string, string>;
}) {
  const router = useRouter();
  const [pagos, setPagos] = useState(pagosIniciales);
  const [estado, setEstado] = useState(estadoInicial);
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [foto, setFoto] = useState("");
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function refrescar() {
    const d = await fetch(`/api/admin/pagos?email=${encodeURIComponent(email)}`).then((r) => r.json()).catch(() => null);
    if (d?.pagos) {
      setPagos(d.pagos);
      setEstado(d.estado);
    }
    window.dispatchEvent(new Event("admin:impugnaciones")); // refresca el aviso del panel
    router.refresh();
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setMsg(null);
    try {
      setFoto(await comprimir(archivo));
    } catch {
      setFoto("");
      setMsg({ tipo: "error", texto: "No se pudo leer la foto. Prueba con otra." });
    }
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setEnCurso("registrar");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "registrar", clienteNombre: nombre, clienteRut: rut, foto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error || "No se pudo registrar." });
        return;
      }
      setNombre("");
      setRut("");
      setFoto("");
      setMsg({ tipo: "ok", texto: "Plan registrado. Queda por validar (superadmin o jefe de equipo)." });
      await refrescar();
    } catch {
      setMsg({ tipo: "error", texto: "Error de red." });
    } finally {
      setEnCurso("");
    }
  }

  async function validar(p: PagoPlan, aprobar: boolean) {
    setEnCurso(p.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "validar", id: p.id, aprobar, motivo: motivo[p.id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error || "No se pudo validar." });
        return;
      }
      setMsg({ tipo: "ok", texto: aprobar ? `Validado: ${p.clienteNombre}.` : `Rechazado: ${p.clienteNombre}.` });
      await refrescar();
    } catch {
      setMsg({ tipo: "error", texto: "Error de red." });
    } finally {
      setEnCurso("");
    }
  }

  return (
    <div id="planes" style={{ display: "grid", gap: 12 }}>
      <h2 className="admin-h2" style={{ marginBottom: 0 }}>🧾 Planes pagados</h2>
      <div className="admin-card" style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 13 }}>
          Por cada <strong>20 leads</strong> se paga <strong>1 plan vendido</strong>: al recibir el cupo se debe el
          1º; desde el lead 21 el 2º, desde el 41 el 3º… Los leads falsos devueltos no cuentan.
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
          <span>Créditos disponibles: <strong>{saldo}</strong></span>
          <span>Leads recibidos: <strong>{estado.entregados}</strong></span>
          <span>Planes a pagar: <strong>{estado.bloques}</strong></span>
          <span>Planes pagados: <strong>{estado.validados}</strong></span>
        </div>
        <div className={`admin-msg ${estado.debe > 0 ? "error" : "ok"}`} style={{ margin: 0 }}>
          {estado.debe > 0 ? "⚠️ " : "✅ "}
          {textoEstado(estado)}
        </div>
      </div>

      {msg && <div className={`admin-msg ${msg.tipo === "error" ? "error" : "ok"}`} style={{ margin: 0 }}>{msg.texto}</div>}

      {puedeRegistrar && (
        <form className="admin-card admin-form" onSubmit={registrar} style={{ display: "grid", gap: 10 }}>
          <strong>Registrar plan pagado</strong>
          <label>
            <span>Nombre del cliente</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez Soto" />
          </label>
          <label>
            <span>RUT del cliente</span>
            <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-5" inputMode="text" />
          </label>
          <label>
            <span>Foto del plan aceptado</span>
            <input type="file" accept="image/*" onChange={elegirFoto} />
          </label>
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Vista previa del plan" style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 8 }} />
          )}
          <button className="admin-btn" disabled={enCurso !== "" || !nombre.trim() || !rut.trim() || !foto}>
            {enCurso === "registrar" ? "Enviando…" : "Registrar plan pagado"}
          </button>
        </form>
      )}

      {pagos.length === 0 ? (
        <div className="admin-card">Todavía no hay planes registrados.</div>
      ) : (
        pagos.map((p) => (
          <div key={p.id} className="admin-card admin-form" style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{p.clienteNombre}</strong>
              <span className={`tag ${ETIQUETA[p.estado].clase}`}>{ETIQUETA[p.estado].texto}</span>
            </div>
            <div style={{ fontSize: 13 }}>
              RUT {p.clienteRut} · registrado {fecha(p.fecha)} ·{" "}
              <a href={`/api/admin/pagos/foto?id=${encodeURIComponent(p.id)}`} target="_blank" rel="noopener">
                Ver foto
              </a>
            </div>
            {p.revisadoPor && (
              <div style={{ fontSize: 12 }}>
                {p.estado === "validado" ? "Validado" : "Rechazado"} por {nombres[p.revisadoPor.toLowerCase()] ?? p.revisadoPor} ·{" "}
                {fecha(p.revisadoEn)}
                {p.motivo ? ` — ${p.motivo}` : ""}
              </div>
            )}
            {puedeValidar && p.estado === "pendiente" && (
              <>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  Motivo (obligatorio si rechazas)
                  <textarea rows={2} value={motivo[p.id] ?? ""} onChange={(e) => setMotivo((m) => ({ ...m, [p.id]: e.target.value }))} />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="admin-btn small" onClick={() => validar(p, true)} disabled={enCurso !== ""}>
                    {enCurso === p.id ? "…" : "Validar factura"}
                  </button>
                  <button className="admin-btn small secondary" onClick={() => validar(p, false)} disabled={enCurso !== ""}>
                    Rechazar
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
