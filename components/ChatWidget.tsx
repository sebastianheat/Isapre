"use client";

import { useEffect, useState } from "react";
import RominaChat from "./RominaChat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  // Mientras el panel está abierto: bloquea el scroll del body y ajusta
  // la altura/posición del panel al visualViewport (mobile + teclado).
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    function update() {
      const vv = window.visualViewport;
      if (!vv) return;
      root.style.setProperty("--chat-vh", `${vv.height}px`);
      root.style.setProperty("--chat-top", `${vv.offsetTop}px`);
    }
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      root.style.removeProperty("--chat-vh");
      root.style.removeProperty("--chat-top");
    };
  }, [open]);

  return (
    <>
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <div className="chat-widget-avatar">R</div>
            <div className="chat-widget-titles">
              <strong>Romina</strong>
              <span>Asesora · te respondo al toque</span>
            </div>
            <button
              className="chat-widget-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>
          <RominaChat />
        </div>
      )}
      {!open && (
        <button
          className="chat-widget-fab"
          onClick={() => setOpen(true)}
          aria-label="Abrir chat con Romina"
        >
          <span className="chat-widget-fab-emoji">💬</span>
          <span className="chat-widget-fab-text">Chatea con Romina</span>
        </button>
      )}
    </>
  );
}

