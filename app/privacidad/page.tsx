import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad · nuevaisapre.cl",
  description: "Cómo tratamos tus datos personales en nuevaisapre.cl.",
};

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px", lineHeight: 1.65 },
  h1: { fontSize: 32, fontWeight: 800, color: "#082D6E", marginBottom: 8 },
  updated: { color: "#64748B", fontSize: 13, marginBottom: 32 },
  h2: { fontSize: 20, fontWeight: 700, color: "#0D47A1", margin: "28px 0 10px" },
  p: { color: "#0F172A", marginBottom: 12, fontSize: 15 },
  li: { color: "#0F172A", marginBottom: 6, fontSize: 15 },
};

export default function PrivacidadPage() {
  return (
    <div style={S.wrap}>
      <Link href="/" style={{ color: "#1565C0", fontSize: 14, textDecoration: "none" }}>
        ← Volver a nuevaisapre.cl
      </Link>
      <h1 style={S.h1}>Política de Privacidad</h1>
      <p style={S.updated}>Última actualización: julio de 2026</p>

      <p style={S.p}>
        En <strong>nuevaisapre.cl</strong> (el &quot;Sitio&quot;) ayudamos a personas en Chile a
        comparar y cotizar planes de isapre. Esta política explica qué datos personales
        recolectamos, para qué los usamos y cuáles son tus derechos, en conformidad con la
        Ley N° 19.628 sobre Protección de la Vida Privada y la Ley N° 21.719 que regula la
        protección y el tratamiento de los datos personales en Chile.
      </p>

      <h2 style={S.h2}>1. Qué datos recolectamos</h2>
      <ul>
        <li style={S.li}><strong>Datos que tú nos entregas</strong> al llenar el formulario de cotización o conversar con nuestra asistente virtual: nombre, RUT, teléfono/WhatsApp, email, región, edad, sueldo líquido aproximado, previsión actual, cargas familiares y clínica de preferencia.</li>
        <li style={S.li}><strong>Datos de navegación</strong>: identificadores de clic de publicidad (por ejemplo, el parámetro &quot;gclid&quot; de Google Ads) y datos técnicos básicos del navegador, usados para medir la efectividad de nuestras campañas.</li>
      </ul>

      <h2 style={S.h2}>2. Para qué usamos tus datos</h2>
      <ul>
        <li style={S.li}>Preparar y enviarte cotizaciones de planes de salud ajustadas a tu perfil.</li>
        <li style={S.li}>Contactarte por WhatsApp, teléfono o email para entregarte asesoría, si así lo solicitaste.</li>
        <li style={S.li}>Gestionar internamente tu solicitud (seguimiento por nuestros ejecutivos).</li>
        <li style={S.li}>Medir y optimizar nuestra publicidad. Para esto podemos compartir con Google datos de conversión: el identificador de clic (gclid) y, en forma <strong>irreversiblemente encriptada (hash SHA-256)</strong>, tu email o teléfono. Google no recibe tus datos en texto claro desde nuestro sitio.</li>
      </ul>

      <h2 style={S.h2}>3. Con quién compartimos datos</h2>
      <p style={S.p}>Usamos proveedores de servicios que tratan datos por cuenta nuestra:</p>
      <ul>
        <li style={S.li}><strong>Google (Ads / Tag)</strong> — medición de conversiones publicitarias, con datos encriptados o identificadores de clic.</li>
        <li style={S.li}><strong>Vercel y Upstash</strong> — infraestructura donde opera el Sitio y se almacenan las solicitudes.</li>
        <li style={S.li}><strong>Resend</strong> — envío de notificaciones internas por email a nuestro equipo.</li>
        <li style={S.li}><strong>Plataforma CRM interna</strong> — gestión del contacto por parte de nuestros ejecutivos.</li>
        <li style={S.li}><strong>Anthropic (Claude)</strong> — procesamiento del texto de la conversación con la asistente virtual para generar respuestas.</li>
      </ul>
      <p style={S.p}>No vendemos tus datos personales a terceros.</p>

      <h2 style={S.h2}>4. Cuánto tiempo los conservamos</h2>
      <p style={S.p}>
        Las solicitudes de cotización se conservan por un máximo de 60 días en nuestros
        sistemas operativos; los registros del CRM y correos internos se conservan mientras
        exista una relación comercial activa o potencial, y luego se eliminan o anonimizan.
      </p>

      <h2 style={S.h2}>5. Tus derechos</h2>
      <p style={S.p}>
        Puedes solicitar en cualquier momento acceso, rectificación, eliminación o bloqueo
        de tus datos personales, y oponerte a su uso con fines publicitarios. Para
        ejercerlos escríbenos a{" "}
        <a href="mailto:info@nuevaisapre.cl" style={{ color: "#1565C0" }}>
          info@nuevaisapre.cl
        </a>{" "}
        indicando tu nombre y RUT. Responderemos dentro de los plazos legales.
      </p>

      <h2 style={S.h2}>6. Seguridad</h2>
      <p style={S.p}>
        Aplicamos medidas técnicas razonables: cifrado en tránsito (HTTPS), acceso al panel
        interno restringido con credenciales individuales, y encriptación de los datos
        compartidos con plataformas publicitarias.
      </p>

      <h2 style={S.h2}>7. Cambios a esta política</h2>
      <p style={S.p}>
        Podemos actualizar esta política; la versión vigente estará siempre publicada en
        esta página con su fecha de actualización.
      </p>
    </div>
  );
}
