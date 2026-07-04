# Meta Lead Ads → Panel (setup)

Los formularios instantáneos de Facebook/Instagram entran DIRECTO al panel
(nuevaisapre.cl/admin) vía webhook, en tiempo real. Sin HEAT (para no
duplicar con la sincronización propia de GHL), con dedupe por email/teléfono,
email a info@ y nota automática con campaña/anuncio de origen.

## Lo que ya está construido (lado nuestro)

- Webhook: `https://www.nuevaisapre.cl/api/meta-leads`
  - GET: verificación de Meta (hub.challenge)
  - POST: recibe cada lead, lo busca en Graph API y lo guarda en el panel
- Mapeo tolerante de campos: reconoce nombre/email/teléfono/RUT/región/
  edad/sueldo/previsión/clínica en español o inglés; lo que no reconoce
  queda como nota en el lead (no se pierde nada).
- Canal 📘 Meta Ads en pipeline, lista, filtros y métricas.
- Bonus: si un anuncio de Meta lleva a la landing (en vez de form
  instantáneo), el fbclid de la URL también etiqueta el lead como Meta Ads.

## Setup en Meta (una sola vez, ~10 min)

Usar la MISMA app de Meta que ya tienen para WhatsApp (developers.facebook.com).

### 1. Env vars en Vercel (antes de tocar Meta)

| Key | Value | Sensitive |
|---|---|---|
| `META_LEADS_VERIFY_TOKEN` | `nuevaisapre-meta-2026` (o el que quieras) | opcional |
| `META_PAGE_ACCESS_TOKEN` | (paso 3) | **ON** |

Redeploy después de agregarlas.

### 2. Suscribir el webhook

1. developers.facebook.com → tu app → **Webhooks** (menú izquierdo; si no
   está, "Agregar producto" → Webhooks)
2. En el dropdown elegir **Página** (Page) → **Suscribirse a este objeto**
3. Callback URL: `https://www.nuevaisapre.cl/api/meta-leads`
4. Verify token: el mismo de la env var (`nuevaisapre-meta-2026`)
5. **Verificar y guardar** → debe quedar verde
6. En la lista de campos del objeto Página: buscar **leadgen** → **Suscribirse**

### 3. Page Access Token (para leer el detalle de cada lead)

1. developers.facebook.com/tools/explorer (Graph API Explorer)
2. Elegir tu app → **Generar token de acceso** con estos permisos:
   `pages_show_list`, `pages_manage_metadata`, `leads_retrieval`,
   `pages_read_engagement`
3. En el dropdown "User or Page" elegir **la página de Nueva Isapre**
   → eso te da el PAGE access token
4. Convertirlo a long-lived (no caduca):
   - GET `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN_CORTO}` para el user token largo
   - Con ese, GET `/me/accounts` → el `access_token` de la página que
     devuelve es long-lived
5. Pegarlo en Vercel como `META_PAGE_ACCESS_TOKEN` (Sensitive ON) → Redeploy

### 4. Suscribir la app a la página

En Graph API Explorer, con el Page token del paso 3:
`POST /{PAGE_ID}/subscribed_apps?subscribed_fields=leadgen`
(igual que hicimos con WhatsApp). Respuesta esperada: `{"success": true}`.

### 5. Probar

1. developers.facebook.com/tools/lead-ads-testing
2. Elegir página + formulario → **Create lead** (genera un lead de prueba)
3. En segundos debería aparecer en nuevaisapre.cl/admin/leads con el badge
   📘 Meta Ads y una nota con la campaña/anuncio.
4. Borrar el lead de prueba desde el panel (superadmin).

## Troubleshooting

- **Verificación falla (paso 2)**: revisar que `META_LEADS_VERIFY_TOKEN` en
  Vercel coincida EXACTO y que hubo redeploy después de setearla.
- **El lead de prueba no llega**: revisar Runtime Logs en Vercel filtrando
  "leadgen" o "Meta lead". Si dice "Graph API 403": el Page token no tiene
  `leads_retrieval` o la app no está suscrita a la página (paso 4).
- **Leads reales no llegan pero el de prueba sí**: la app tiene que estar
  en modo **Live** (ya lo está, por WhatsApp) y el token debe ser de la
  página dueña del formulario.
