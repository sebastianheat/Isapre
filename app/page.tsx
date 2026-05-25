"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SALUDO: Msg = {
  role: "assistant",
  content:
    "Hola, soy Romina, tu asesora en Isapres Chile. Con gusto te ayudo a encontrar y cotizar tu plan de salud.\n\nPara partir, cuéntame por favor: ¿qué edad tienes, en qué ciudad o región vives y cuánto es tu sueldo líquido (lo que recibes en mano)? Si vas a sumar cargas (pareja, hijos), indícame cuántas y sus edades, y si tienes alguna clínica o prestador de preferencia.\n\nSi te acomoda, puedes enviarme un audio y lo revisamos. 🙂",
};

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([SALUDO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Algo falló. Intenta de nuevo.");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
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
    <div className="app">
      <header className="header">
        <div className="avatar">R</div>
        <div>
          <h1>Romina · Isapres Chile</h1>
          <span>Asesora de planes de salud</span>
        </div>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.role === "user" ? "user" : ""}`}>
            <div className={`bubble ${m.role === "user" ? "user" : "bot"}`}>{m.content}</div>
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
