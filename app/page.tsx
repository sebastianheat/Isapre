import LeadForm from "@/components/LeadForm";
import ChatWidget from "@/components/ChatWidget";

const VENTAJAS = [
  { ico: "🏥", t: "+5.000 prestadores", s: "Red amplia en todo Chile" },
  { ico: "📋", t: "2.183 planes comparados", s: "Las 7 isapres del mercado" },
  { ico: "🤝", t: "Asesoría 100% gratis", s: "Sin compromiso ni cargos ocultos" },
  { ico: "🔒", t: "Sin alza 2025-2026", s: "Compromiso público de Nueva Masvida" },
  { ico: "⚡", t: "Activación 24-72 h", s: "100% online, sin papeleo" },
  { ico: "💬", t: "Cierre por WhatsApp", s: "Un ejecutivo te acompaña en todo el proceso" },
];

const PASOS = [
  { n: "1", t: "Ingresa tus datos", s: "Edad, sueldo líquido, región y a quién quieres cubrir." },
  { n: "2", t: "Comparamos las 7 isapres", s: "Buscamos los mejores planes ajustados a tu bolsillo." },
  { n: "3", t: "Cierras con un ejecutivo", s: "Te contactamos por WhatsApp y dejamos todo activo en 24-72 h." },
];

export default function Page() {
  return (
    <div className="landing">
      <header className="nav">
        <div className="nav-inner">
          <div className="brand">
            <span className="brand-mark">N</span>
            <span className="brand-name">nuevaisapre<span className="brand-tld">.cl</span></span>
          </div>
          <nav className="nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#ventajas">Por qué elegirnos</a>
            <a href="#form">Cotizar</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-pill">Comparador independiente · sin costo</span>
            <h1>
              Encuentra tu <span className="hl">mejor plan de isapre</span> en 30 segundos.
            </h1>
            <p>
              Comparamos en tiempo real los <strong>2.183 planes</strong> de las 7 isapres y
              elegimos los 3 que mejor te calzan según tu <strong>presupuesto</strong>, edad y
              clínica de preferencia. Cierra por WhatsApp con tu ejecutiva.
            </p>
            <ul className="hero-checks">
              <li>✓ Precios reales · catálogos oficiales</li>
              <li>✓ Cobertura por clínica con porcentajes exactos</li>
              <li>✓ Una ejecutiva real (no un bot al final)</li>
            </ul>
          </div>
          <div id="form" className="hero-form">
            <LeadForm />
          </div>
        </div>
      </section>

      <section id="ventajas" className="ventajas">
        <h2>Por qué cotizar con nosotros</h2>
        <div className="ventajas-grid">
          {VENTAJAS.map((v) => (
            <div key={v.t} className="ventaja">
              <div className="ventaja-ico">{v.ico}</div>
              <div className="ventaja-text">
                <strong>{v.t}</strong>
                <span>{v.s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="pasos">
        <h2>Cómo funciona</h2>
        <div className="pasos-grid">
          {PASOS.map((p) => (
            <div key={p.n} className="paso">
              <div className="paso-num">{p.n}</div>
              <strong>{p.t}</strong>
              <span>{p.s}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cierre">
        <h2>Tu plan ideal está a un formulario de distancia</h2>
        <p>Llena tus datos arriba y un asesor te contacta por WhatsApp.</p>
        <a href="#form" className="cta-link">Cotizar ahora</a>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} nuevaisapre.cl · Asesoría certificada en isapres</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/privacidad" className="footer-admin-link">Política de Privacidad</a>
          <a href="/admin" className="footer-admin-link">Acceso ejecutivos</a>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
