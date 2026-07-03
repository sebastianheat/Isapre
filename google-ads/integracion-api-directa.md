# Integración directa Google Ads API (subida automática de conversiones)

Objetivo: eliminar el paso manual de subir el CSV. Un cron nocturno sube las
conversiones calificadas directo a Google Ads vía API (ConversionUploadService).

## Por qué todavía no está hecho

La Google Ads API exige un **developer token** que Google entrega por
solicitud (no es instantáneo) + credenciales OAuth. Sin esos dos, no hay
forma técnica de subir conversiones automáticamente — el CSV manual/por
email es el único camino. Por eso el flujo actual: cron semanal que manda
el CSV listo a info@ y Titi lo sube en 2 minutos.

## Paso 1 — Developer token (Sebastián, ~10 min + espera de días)

1. Entrar a https://ads.google.com con la cuenta ADMINISTRADORA (si la
   cuenta 102-420-6439 no cuelga de un MCC/administrador, crear una cuenta
   de administrador gratis en https://ads.google.com/home/tools/manager-accounts/
   y vincular la cuenta existente).
2. En la cuenta de administrador: **Herramientas → Configuración → Centro de API**.
3. Solicitar el developer token. Nivel "Acceso básico" es suficiente
   (15.000 operaciones/día — nos sobra). Google pide describir el uso:
   *"Subida de conversiones offline propias (first-party) desde nuestro CRM
   interno a nuestra propia cuenta publicitaria"* — ese caso se aprueba
   normalmente sin problemas.
4. El token de prueba sirve solo contra cuentas test; esperar el mail de
   aprobación para producción (típico: 1-5 días hábiles).

## Paso 2 — Credenciales OAuth (Sebastián + yo, 15 min)

1. https://console.cloud.google.com → crear proyecto "nuevaisapre-ads".
2. **APIs y servicios → Habilitar** → "Google Ads API".
3. **Pantalla de consentimiento** → tipo Interno/Externo (Externo con
   usuarios de prueba basta) → scope `https://www.googleapis.com/auth/adwords`.
4. **Credenciales → Crear → ID de cliente OAuth** → tipo "Aplicación de
   escritorio". Anotar client_id y client_secret.
5. Generar el refresh_token una única vez (yo te doy el comando/script para
   correr en tu máquina; el refresh token no expira mientras se use).

## Paso 3 — Env vars en Vercel (Sensitive ON)

```
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=1024206439        # sin guiones
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<MCC id>    # solo si aplica
GOOGLE_ADS_CONVERSION_ACTION_ID=<id numérico de "Lead Calificado">
```

El ID numérico de la acción sale de la URL al abrir "Lead Calificado" en
Google Ads (parámetro ctId), o vía la API con una consulta GAQL.

## Paso 4 — Código (yo, 1 sesión)

- `lib/googleAds.ts`: cliente REST de la Google Ads API (v17+):
  - OAuth: POST https://oauth2.googleapis.com/token con refresh_token →
    access_token efímero.
  - Subida: POST /vXX/customers/{cid}:uploadClickConversions con
    `conversions: [{ gclid, conversionAction, conversionDateTime,
    conversionValue, currencyCode }]` y `partialFailure: true`.
- `app/api/cron/subir-conversiones/route.ts`: diario 03:00 Chile, toma los
  leads calificados con gclid no subidos, los sube, marca
  `exportadoOffline`, loguea partial failures.
- Se desactiva el cron del CSV semanal (o se deja como respaldo mensual).

## Resultado final

Titi marca ✅ Calificado en el panel → esa misma noche la conversión ya
está en Google Ads. Cero CSV, cero subidas manuales, optimización con
datos frescos de <24 h (mejor señal para el smart bidding que la subida
semanal).
