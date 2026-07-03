# Plan de trabajo — nuevaisapre.cl (próximas 2 semanas)

Estado al 4-jul-2026: campaña Google Ads generando ~3 leads/día a CPA $7.441
(ya 33% más barato que comprar leads a $11.000). Panel CRM completo con
pipeline, calidad, recordatorios y automatizaciones. Meta: CPA $2.500-3.500
por lead calificado en 4-6 semanas.

## ✅ Completado esta noche (4-jul, sesión autónoma)

- Kanban responsivo: mobile = 1 columna con swipe, desktop ancho = las 7
  columnas a la vista, toggle "⇹ Compactar columnas" estilo Excel (persiste).
- Panel instalable como app (PWA): manifest + íconos generados. En el celular:
  Chrome → menú → "Agregar a pantalla de inicio" → abre directo en el
  pipeline, pantalla completa, sin barra del navegador.
- Branding: topbar con gradiente azul + logo N, login con marca y fondo de
  color, headers de columna teñidos con el color de su etapa, nav inferior
  con pill activa.
- **Cron semanal automático** (lunes ~08:00 Chile): genera el CSV de
  conversiones calificadas y lo manda a info@ con el archivo adjunto y las
  instrucciones. Ya no hay que acordarse de exportar — solo abrir el correo
  del lunes y subir el adjunto a Google Ads.
- Página **/privacidad** publicada + link en footer (compliance Ads y ley
  21.719). Revisable/editable cuando quieras.
- Doc `google-ads/integracion-api-directa.md` con los pasos para eliminar
  también la subida manual (requiere developer token de Google, ver Semana 2).

## Semana 1 (6-12 jul) — Activar el loop de calidad y estabilizar

**Sebastián / Titi (operación, ~20 min/día):**
1. **HOY**: marcar calidad de los 15 leads existentes (12 ✅ / 2 🟡 / 1 🚫)
   → exportar CSV (botón) → subir en Google Ads → Conversiones → Subidas.
   Eso activa la acción "Lead Calificado".
2. Diario: trabajar los leads por el pipeline (etapa + notas + recordatorios)
   y marcar calidad apenas se valida el perfil. La calidad marcada A TIEMPO
   es la que alimenta la optimización.
3. Instalar el panel como app en los celulares de los ejecutivos (Agregar a
   pantalla de inicio).
4. Lunes 8: llegará el primer correo automático con CSV — subirlo (2 min).

**Google Ads (con el Claude del navegador):**
5. Cuando "Lead Calificado" acumule ≥15 conversiones importadas: moverla a
   **Principal** y "Cotización completada (Form Submit)" a **Secundaria**.
   Es EL cambio que hace optimizar hacia leads vendibles.
6. Con ≥30 conversiones totales y aprendizaje maduro: evaluar subir
   presupuesto +20% (máx.) y/o pasar a **Target CPA $5.000** inicial.
7. Revisar Search Terms Report y agregar negativas nuevas (15 min).

**Claude Code (yo, cuando me lo pidas):**
8. Solicitar **developer token** de Google Ads API (ver doc) — el trámite
   demora días, conviene iniciarlo ya para tenerlo en Semana 2.
9. Dashboard de métricas en el panel (/admin/metricas): leads por día,
   por canal, tasa de calificación, CPA estimado — 1 sesión.

## Semana 2 (13-19 jul) — Automatizar y escalar

10. **Integración directa Google Ads API** (si el token llegó): subida
    automática de conversiones offline cada noche, sin CSV ni pasos
    manuales. La subida manual del lunes desaparece.
11. **Target CPA**: bajar de $5.000 en escalones de $500/semana hacia
    $3.500 → $3.000 → $2.500 monitoreando que no caiga el volumen.
12. **WhatsApp productivo**: mover Romina del número de prueba de Meta al
    WABA real que hoy está en GHL (requiere decidir si el número sale de
    GHL o se usa uno nuevo dedicado — conversación de 15 min + setup).
13. **Vida Tres % por clínica**: extraer y validar coberturas por clínica
    (misma metodología que NMV/Banmédica) → Romina deja de decir "lo
    confirma el ejecutivo" para la 4ª isapre más pedida.
14. **Landing conversion boost** (medio día): logos de las 7 isapres como
    trust strip, 2-3 testimonios, sticky CTA mobile. Objetivo: subir
    conversion rate del ~20% actual hacia 25%+ (baja el CPA sin tocar Ads).

## Backlog (después, por prioridad)

- Script semanal Supersalud: re-descarga de PDFs + actualización de catálogo
  de precios (hoy los PDFs viven en el Netlify antiguo).
- Notificaciones push del panel (PWA) para recordatorios — reemplaza email.
- Reporte semanal automático por email: resumen de leads, etapas y CPA.
- Multi-idioma de la landing (haitiano-creole/inglés) si el público lo pide.

## Números que estamos persiguiendo

| Métrica | Hoy | Meta 2 semanas | Meta 6 semanas |
|---|---|---|---|
| Leads/día | 3 | 4-5 | 6-8 |
| CPA (todo lead) | $7.441 | $5.500 | $3.500 |
| CPA lead calificado | ~$9.300 | $6.500 | $2.500-3.500 |
| Tasa calificación | 80% (12/15) | 85% | 90% |
| Conversion rate landing | ~21% | 24% | 28% |
