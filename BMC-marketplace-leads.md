# Business Model Canvas — Marketplace de Leads nuevaisapre.cl

**Creado:** 2026-09-07
**Última actualización:** 2026-09-07
**Producto:** Marketplace de créditos para leads de isapre + motor de cotización propio + Romina (IA interna para ejecutivos)

> Nota de método: se usa **BMC completo** (no Lean Canvas) porque no es una idea en blanco — ya hay producto en producción, campaña de Google Ads con datos reales (CPA, volumen) y un competidor directo (tu7.cl) mapeado en detalle.

## Segmentos de Clientes

- **Ejecutivos de Isapre (compradores de créditos):** corredores y agentes de venta de isapre — tanto externos (por reclutar) como el equipo interno actual (Cynthia, Ingrid), que reciben créditos regalados por el superadmin. Son quienes pagan por acceder a leads exclusivos y calificados para cerrar ventas de pólizas.
- **Prospectos / consumidores finales (los leads):** personas que buscan cotizar o cambiarse de isapre, captadas vía Google Ads o tráfico orgánico. No pagan, pero son el inventario que el negocio vende — su experiencia de cotización determina qué tan valioso es el lead que se le vende al ejecutivo.

## Propuestas de Valor

- **Para Ejecutivos de Isapre:** Leads exclusivos (nunca revendidos dos veces), pre-calificados y enriquecidos con la cotización completa del prospecto (edad, renta, cargas, planes que miró) — sin mensualidad fija como tu7.cl, se paga solo por lead recibido ($10.000 c/u, packs de 10). Incluye Romina, una herramienta de IA gratuita para responder y trabajar esos leads más rápido — algo que ningún competidor ofrece incluido.
- **Para Prospectos / consumidores finales:** Cotización real, instantánea y transparente de planes de 7 isapres (motor de cálculo propio con desglose auditable por beneficiario), sin RUT ni compromiso, con seguimiento humano directo por WhatsApp de un ejecutivo asignado — no un formulario ciego que promete "un asesor te llama".

## Canales

- **Adquisición (prospectos):** Google Ads (canal ya validado, ~3 leads/día, CPA $7.441), tráfico orgánico/SEO nuevo vía páginas indexables de planes (`/planes/[isapre]`, inexistente en tu7.cl), WhatsApp.
- **Adquisición (ejecutivos):** equipo interno primero (Cynthia, Ingrid); después reclutamiento directo/boca a boca. Posible canal futuro: partnership con isapres que ya reclutan ejecutivos activamente (se confirmó un aviso real de Consalud buscando "Ejecutivos de Ventas de Isapres" corriendo en tu7.cl — señal de demanda).
- **Entrega:** self-service vía panel web — `/cotizador` público, `/panel` del ejecutivo, notificación inmediata por email/WhatsApp cuando se asigna un lead.

## Relaciones con Clientes

- **Ejecutivos de Isapre:** cuenta self-service con **aprobación manual** del superadmin al registrarse (evita que cualquiera compre datos de personas). Soporte directo del equipo al inicio; dashboard de autoservicio para comprar créditos y gestionar su cartera de leads.
- **Prospectos:** sin cuenta ni fricción — cotización anónima recuperable por WhatsApp, atención humana vía el ejecutivo asignado (no un chatbot genérico).

## Fuentes de Ingreso

- **Venta de créditos prepago:** $10.000 por crédito (= 1 lead), vendido en packs de 10 ($100.000). Sin precio por volumen todavía — pendiente definir en `/precio`. Es la única fuente de ingreso directa del modelo; mapea a la Propuesta de Valor de Ejecutivos.
- **Valor indirecto (no es revenue stream nuevo):** una cotización completa adjunta al lead es un evento de conversión de mayor calidad para Google Ads, lo que baja el CPA de la campaña existente — mejora la economía del negocio sin ser un ingreso separado.

## Recursos Clave

- **Catálogo de coberturas verificado:** 2.182 PDFs / 102 planes de Nueva Más Vida ya extraídos y catalogados (visto en el historial de commits) — es el activo de datos que, según el propio análisis de tu7.cl, es la barrera de entrada real, no el código.
- **Motor de cotización propio** (a construir) y su base de datos normalizada de isapres/planes/coberturas/factores.
- **Marca y dominio nuevaisapre.cl** + historial de performance de la campaña de Google Ads.
- **Equipo:** Sebastián (producto/desarrollo), Cynthia e Ingrid (ejecutivas internas — primeros usuarios y validadores del marketplace).
- **Infraestructura:** Next.js/Vercel; migración pendiente de Upstash KV a Postgres/Supabase para soportar el ledger de créditos.

## Actividades Clave

- **Mantener actualizado el catálogo de planes y coberturas de las 7 isapres** — actividad crítica y recurrente, no un proyecto de una sola vez.
- Desarrollo y mantención del motor de cotización, el marketplace (ledger, reparto, checkout) y Romina interna.
- **Aprobación/curaduría manual de ejecutivos nuevos** antes de dejarlos comprar créditos.
- Operación y optimización continua de la campaña de Google Ads (CPA, calidad de leads).

## Alianzas Clave

- **Mercado Pago** (procesador de pago) — dependencia crítica para todo el revenue stream; sin alternativa de respaldo definida. Riesgo a mitigar con manejo robusto de caídas del webhook.
- **Google Ads** — canal de adquisición casi único de prospectos hoy. El canal SEO propuesto reduce esta dependencia a mediano plazo, pero no la elimina en el corto plazo.
- **Vercel / Supabase (o Neon)** — infraestructura de cómputo y datos.
- **Isapres (relación indirecta, no formalizada):** fuente de los PDFs oficiales de planes y coberturas. No hay acuerdo de distribución confirmado — riesgo legal señalado también en el análisis de tu7.cl (sección 9, checklist de cumplimiento).

## Estructura de Costos

- **Tipo de modelo:** Orientado a valor — se cobra premium por un lead enriquecido y exclusivo, no se compite por ser el proveedor de leads más barato.
- **Desarrollo:** tiempo de Sebastián + Claude Code — costo de oportunidad alto mientras se construye motor de cotización + marketplace en paralelo. Magnitud: alta.
- **Infraestructura:** Vercel, Postgres/Supabase, comisión de Mercado Pago por transacción. Magnitud: media, variable con volumen.
- **Marketing:** Google Ads (CPA actual $7.441/lead). Magnitud: alta y ya comprometida.
- **Curaduría y soporte:** tiempo humano para aprobar ejecutivos y resolver reembolsos de leads inválidos — no escala automáticamente. Magnitud: baja hoy, riesgo si crece rápido sin herramientas de gestión masiva.

## Puntos de Riesgo

- La única fuente de ingreso (venta de créditos) **no está validada fuera del equipo interno** — ver Viability Check.
- Dependencia de un solo proveedor de pagos (Mercado Pago) sin plan de contingencia si el webhook falla o la cuenta se suspende.
- Dependencia casi total de Google Ads para el inventario de prospectos — un aumento de CPA o cambio de política de Google afecta directamente cuánto hay para vender.
- Mantener el catálogo de planes actualizado es una actividad continua e intensiva en tiempo; sin un proceso semi-automatizado se vuelve cuello de botella al escalar a más isapres o regiones.
- Uso de PDFs oficiales de isapres y datos personales de terceros bajo Ley 21.719 sin marco de cumplimiento confirmado — mismo hallazgo que el checklist del análisis de tu7.cl.
- Fuente de ingreso sin Propuesta de Valor exclusiva de "chat IA gratis" para el segmento Prospectos — Romina beneficia solo a Ejecutivos; se documenta como decisión consciente, no como omisión.
