# Conversiones Offline — Google Ads ↔ nuevaisapre.cl

La palanca de mayor impacto para bajar el costo por lead CALIFICADO
(mejora esperada 20-40% a mediano plazo): decirle a Google cuáles leads
sirvieron de verdad, para que optimice hacia esos perfiles y no hacia
"cualquier formulario enviado".

## Flujo semanal (5 minutos)

1. Durante la semana, en el panel (`nuevaisapre.cl/admin`), en el detalle de
   cada lead marcá su **Calidad**:
   - ✅ **Calificado** — sueldo sobre $1M, edad razonable, perfil vendible
   - 🟡 **Marginal** — dudoso (ej. sueldo $850k-1M, edad límite)
   - 🚫 **No calificado** — no sirve (Fonasa bajo sueldo, edad muy alta, etc.)

2. Una vez a la semana (ej. lunes en la mañana), en `/admin/leads` click en
   **"⬇ Exportar conversiones calificadas (CSV Google Ads)"**.
   Se descarga `offline-conversions-YYYY-MM-DD.csv` con los leads
   ✅ Calificado + gclid que no se hayan exportado antes.

3. En Google Ads: **Objetivos → Conversiones → Subidas** →
   **+ Subir archivo** → seleccionar el CSV → **Aplicar** (podés hacer
   "Vista previa" primero para validar).

4. Listo. Google procesa en ~3 hs y esas conversiones aparecen en la acción
   "Lead Calificado".

## Setup inicial (una sola vez, 5 min)

Crear la acción de conversión de importación:

1. Google Ads → **Objetivos → Conversiones → Resumen** → **+ Nueva acción de
   conversión**
2. Elegir **Importar** → **Conversiones de clics** (u "Otras fuentes de
   datos" → CRM manual, según la UI)
3. Configuración:
   - **Nombre**: `Lead Calificado` ← EXACTO así (el CSV usa este nombre; si
     eliges otro, setear la env var `OFFLINE_CONVERSION_NAME` en Vercel con
     el mismo valor)
   - **Categoría**: Cliente potencial calificado
   - **Valor**: usar el valor de cada conversión (el CSV manda $11.000 CLP —
     lo que cuesta comprar un lead calificado a un tercero; configurable con
     env var `OFFLINE_CONVERSION_VALUE`)
   - **Recuento**: Una
   - **Ventana de conversión**: 30 días
   - **Optimización**: **Principal** ← importante. Y en ese momento evaluar
     mover "Cotización completada (Form Submit)" a **Secundaria** para que
     Google optimice hacia leads CALIFICADOS, no hacia formularios (hacer
     este cambio recién cuando haya ≥15 conversiones importadas, para no
     matar el aprendizaje).

## Detalles técnicos

- El export vive en `GET /api/admin/leads/export-offline` (solo superadmin,
  requiere sesión del panel).
- Query params: `?dias=30` (ventana, default 30) e `?incluirExportados=1`
  (re-incluir ya exportados; útil si Google rechazó una subida).
- Cada lead exportado se marca con `exportadoOffline` para no repetirlo.
  Google Ads dedupea igual (por gclid + nombre + hora), así que repetir no
  duplica conversiones.
- Formato del CSV (estándar de Google Ads):

```
Parameters:TimeZone=America/Santiago
Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency
Cj0KCQ...,Lead Calificado,2026-07-01 14:30:00,11000,CLP
```

- Solo se exportan leads con `gclid` (los que vinieron de un click de Google
  Ads). Los leads orgánicos/WhatsApp no aplican a este flujo.
- La hora de conversión es la fecha de creación del lead (siempre posterior
  al click, requisito de Google).

## Roadmap opcional (cuando el volumen lo amerite)

Automatizar la subida vía Google Ads API (OAuth + developer token) para
eliminar el paso manual del CSV. Con 3-5 leads/día el flujo manual semanal
es suficiente; con 20+/día conviene automatizar.
