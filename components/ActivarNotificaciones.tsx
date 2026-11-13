"use client";

import { useEffect, useState } from "react";

// Activa las notificaciones push en ESTE dispositivo.
// - Android/PC: basta con aceptar el permiso del navegador.
// - iPhone/iPad: solo funcionan si el panel se agregó a la pantalla de inicio
//   y se abrió desde ese ícono (exigencia de Apple, iOS 16.4 o más nuevo).
// compacto: versión barra (arriba del panel), que se puede cerrar.

type Estado = "cargando" | "no-soportado" | "ios-sin-instalar" | "bloqueado" | "inactivo" | "activo";

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function instaladaComoApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const OCULTAR_KEY = "push_aviso_oculto";

export default function ActivarNotificaciones({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [clave, setClave] = useState("");
  const [msg, setMsg] = useState("");
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (compacto && window.localStorage.getItem(OCULTAR_KEY) === "1") setOculto(true);
      } catch { /* sin storage: se muestra */ }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado(esIOS() && !instaladaComoApp() ? "ios-sin-instalar" : "no-soportado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const datos = await fetch("/api/admin/push").then((r) => r.json()).catch(() => ({}));
      setClave(datos.clavePublica || "");
      if (!datos.clavePublica) {
        setEstado("no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "activo" : "inactivo");
    })().catch(() => setEstado("no-soportado"));
  }, [compacto]);

  async function activar() {
    setMsg("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) });
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error();
      setEstado("activo");
      setMsg("Listo: en este dispositivo te van a llegar los avisos.");
    } catch {
      setMsg("No se pudieron activar. Intenta de nuevo.");
    }
  }

  async function desactivar() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/admin/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setEstado("inactivo");
    setMsg("Desactivadas en este dispositivo.");
  }

  async function probar() {
    const r = await fetch("/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prueba: true }),
    }).then((x) => x.json()).catch(() => ({}));
    setMsg(r.enviados ? "Enviada: debería llegarte en unos segundos." : "No se pudo enviar la prueba.");
  }

  if (compacto) {
    if (oculto || (estado !== "inactivo" && estado !== "ios-sin-instalar")) return null;
    const cerrar = () => {
      setOculto(true);
      try { window.localStorage.setItem(OCULTAR_KEY, "1"); } catch { /* no-op */ }
    };
    return (
      <div className="admin-msg ok" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 180 }}>
          {estado === "inactivo"
            ? "🔔 Activa las notificaciones para saber al instante cuando te llega un lead."
            : "🔔 Para recibir notificaciones en iPhone: botón Compartir → “Agregar a pantalla de inicio”, y abre el panel desde ese ícono."}
        </span>
        {estado === "inactivo" && <button className="admin-btn small" onClick={activar}>Activar</button>}
        <button className="admin-btn small secondary" onClick={cerrar} aria-label="Cerrar aviso">Ahora no</button>
      </div>
    );
  }

  return (
    <div className="admin-card" style={{ display: "grid", gap: 10 }}>
      <strong>🔔 Notificaciones en este dispositivo</strong>
      {estado === "cargando" && <span>Revisando…</span>}
      {estado === "activo" && (
        <>
          <span>Activas. Te avisamos cada lead nuevo, tus recordatorios y un resumen cada mañana.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="admin-btn small" onClick={probar}>Enviar una de prueba</button>
            <button className="admin-btn small secondary" onClick={desactivar}>Desactivar aquí</button>
          </div>
        </>
      )}
      {estado === "inactivo" && (
        <>
          <span>Recibe un aviso al instante cuando te llega un lead, tus recordatorios y un resumen cada mañana.</span>
          <div><button className="admin-btn small" onClick={activar}>Activar notificaciones</button></div>
        </>
      )}
      {estado === "ios-sin-instalar" && (
        <span>
          En iPhone, Apple solo permite notificaciones si el panel está en la pantalla de inicio: en Safari toca{" "}
          <strong>Compartir</strong> → <strong>“Agregar a pantalla de inicio”</strong>, abre el panel desde ese ícono
          y vuelve a esta pantalla.
        </span>
      )}
      {estado === "bloqueado" && (
        <span>
          Las notificaciones están bloqueadas para este sitio. Actívalas en los ajustes del navegador (candado junto
          a la dirección → Notificaciones → Permitir) y recarga.
        </span>
      )}
      {estado === "no-soportado" && <span>Este navegador no permite notificaciones push.</span>}
      {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
