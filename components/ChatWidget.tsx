"use client";

import { useState } from "react";
import RominaChat from "./RominaChat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
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
