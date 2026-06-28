"use client";

import { useEffect, useRef, useState } from "react";
import { capturarGclidDeUrl, obtenerGclid } from "@/lib/gclid";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SALUDO: Msg = {
  role: "assistant",
  content:
    "Hola, soy Romina, tu asesora en Isapres Chile. Con gusto te ayudo a encontrar tu mejor plan de salud entre las 7 isapres.\n\nPara partir, cuéntame por favor: ¿qué edad tienes, en qué ciudad o región vives y cuánto es tu sueldo líquido? Si vas a sumar cargas (pareja, hijos), indícame cuántas y sus edades.",
};

function renderRich(text: string) {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:)])/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = m[2] ?? m[3];
    const label = m[1] ?? m[3];
    out.push(
      <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="msg-link">
        {label}
      </a>,
    );
    last = regex.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RominaChat() {
  const [messages, setMessages] = useState<Msg[]>([SALUDO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Captura el gclid al abrir el chat (si vino de Google Ads).
  useEffect(() => {
    capturarGclidDeUrl();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";
    // El backend puede tardar hasta 60s en cotizaciones con detalle por
    // clínica. Damos un margen amplio (70s) para no abortar antes que él.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 70_000);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, gclid: obtenerGclid() }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Algo falló. Intenta de nuevo en un momento.");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        // Si el chat capturó un lead en este turno (Romina llamó registrar_lead
        // exitosamente), disparamos la misma conversión de Google Ads que el
        // form de la landing. Métricas unificadas: 1 lead = 1 conversión sin
        // importar el canal.
        if (data.leadCapturado) {
          const sendTo = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
          type Gtag = (cmd: string, event: string, params: Record<string, unknown>) => void;
          const gtag = (window as unknown as { gtag?: Gtag }).gtag;
          if (sendTo && typeof gtag === "function") {
            gtag("event", "conversion", { send_to: sendTo, value: 1.0, currency: "CLP" });
          }
        }
      }
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      setError(
        isAbort
          ? "Está tardando más de lo normal. Intenta de nuevo en un momento."
          : "Sin conexión. Intenta de nuevo.",
      );
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autosize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  return (
    <div className="chat">
      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.role === "user" ? "user" : ""}`}>
            <div className={`bubble ${m.role === "user" ? "user" : "bot"}`}>{renderRich(m.content)}</div>
          </div>
        ))}
        {loading && (
          <div className="row">
            <div className="bubble bot">
              <div className="typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="composer">
        <textarea
          ref={taRef}
          value={input}
          onChange={autosize}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu mensaje…"
          rows={1}
        />
        <button onClick={send} disabled={loading || !input.trim()} aria-label="Enviar">
          ➤
        </button>
      </div>
    </div>
  );
}
