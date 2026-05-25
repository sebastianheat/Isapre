# Checklist de Configuración — Romina (Isapres Chile) en HEAT Latam
## Tiempo estimado: 15-20 minutos

> Asume que ya tienes la subcuenta de Nueva Masvida creada en heatlatam.com. Si te trabas en algún paso, mándame screenshot y te oriento.
>
> **Identidad del bot:** Romina · Isapres Chile. Cierre con Cynthia Rodríguez. Sebastián nunca se menciona al cliente.

---

## ARQUITECTURA DEL SISTEMA

```
[Google Ads / Redes Sociales]
        ↓
[Landing / Cotizador] ──→ [Webhook HEAT] ──→ [CRM Pipeline]
        ↓                                        ↓
[WhatsApp Bot: Romina] ←─ [Conversation AI] ←─ [Base de Conocimientos]
        ↓
[Cynthia (ejecutiva)] ──→ [Cierre de Venta]
```

Hay dos frentes en paralelo:
- **Bot en HEAT (WhatsApp):** este checklist.
- **Cotizador conversacional propio (web):** la app Next.js del repo (`app/`, `lib/`), que se despliega en Vercel. Es independiente de HEAT.

---

## 🔐 PASO 0 — Seguridad (HACER YA)

- [ ] Cambiar la contraseña de iCloud (s.yanez.1@icloud.com) si alguna vez la pegaste en un chat
- [ ] Cambiar la contraseña de HEAT Latam
- [ ] Activar 2FA en HEAT Latam: Settings → My Profile → Security → Two-Factor Authentication
- [ ] (Opcional) Crear un usuario "team member" dedicado para configuración: Settings → My Staff → Add User. Rol: Admin

---

## 📋 PASO 1 — Pipeline de Ventas (3 min)

Ruta: **Opportunities → Pipelines → New Pipeline**

- [ ] Nombre: `Ventas Isapre`
- [ ] Etapas (en orden):
  1. Nuevo Lead
  2. En Calificación
  3. Datos Completos
  4. Cotización Enviada
  5. Interesado
  6. Agendado
  7. En Proceso
  8. Cerrado Ganado
  9. Cerrado Perdido
- [ ] Guardar

---

## 🏷️ PASO 2 — Custom Fields (5 min)

Ruta: **Settings → Custom Fields → Contact → Add Field**

| # | Nombre del campo | Field Key | Tipo | Opciones |
|---|---|---|---|---|
| 1 | RUT | `rut` | Single Line | — |
| 2 | Edad | `edad` | Number | — |
| 3 | Isapre actual | `isapre_actual` | Dropdown | Fonasa, Banmédica, Consalud, Colmena, Cruz Blanca, Vidatres, Nueva Masvida, Esencial, Sin previsión |
| 4 | Rango de sueldo | `rango_sueldo` | Dropdown | $400.000-$600.000, $600.000-$800.000, $800.000-$1.000.000, $1.000.000-$1.500.000, $1.500.000-$2.000.000, Más de $2.000.000 |
| 5 | Cantidad de cargas | `cantidad_cargas` | Number | — |
| 6 | Edades de cargas | `edades_cargas` | Single Line | — |
| 7 | Región | `region` | Dropdown | Arica y Parinacota, Tarapacá, Antofagasta, Atacama, Coquimbo, Valparaíso, Metropolitana, O'Higgins, Maule, Ñuble, Biobío, Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes |
| 8 | Clínicas de preferencia | `clinicas_preferencia` | Single Line | — |
| 9 | Preexistencias | `preexistencias` | Multi Line | — |
| 10 | Plan cotizado | `plan_cotizado` | Single Line | — |
| 11 | Precio del plan | `precio_plan` | Number | — |
| 12 | Excedente | `excedente` | Number | — |
| 13 | Isapre solicitada (si no es NMV) | `isapre_solicitada` | Single Line | — |
| 14 | Fuente | `fuente` | Dropdown | WhatsApp, Landing, Google Ads, Instagram, Facebook, Referido, Cotizador |

> El campo `rut` existe igual, pero el bot lo pide **al final** (al derivar a Cynthia), no al inicio.

- [ ] Confirmar que los 14 campos aparecen en la lista

---

## 🏷️ PASO 3 — Tags (1 min)

Ruta: **Settings → Tags → Add Tag**

- [ ] `escalar_ejecutivo`
- [ ] `agendado`
- [ ] `consulta_pendiente`
- [ ] `cliente_dificil`
- [ ] `lead_frio`
- [ ] `cotizado`
- [ ] `interesado`
- [ ] `isapre_solicitada`

> Recordatorio: los tags son **internos**. El bot nunca debe escribirlos en el mensaje que ve el cliente (ver reglas de tags en `system-prompt-romina.md`).

---

## 📱 PASO 4 — Conectar WhatsApp (5 min)

Ruta: **Settings → Phone Numbers → Connect WhatsApp** (o **Integrations → WhatsApp**)

### Opción A — WhatsApp QR (para empezar hoy)
- [ ] Tener un teléfono con un número dedicado (no personal)
- [ ] En HEAT, elegir "Connect via QR"
- [ ] Escanear el QR (WhatsApp → Configuración → Dispositivos vinculados)
- [ ] Verificar que el número aparece "Conectado"

### Opción B — WhatsApp Business API (producción)
- [ ] Facebook Business Manager verificado
- [ ] Número dedicado SIN cuenta de WhatsApp activa
- [ ] Seguir el wizard de HEAT para vincular con Meta
- [ ] Esperar aprobación de Meta (24-72h)

> **Recomendación:** empieza con QR para validar el flujo esta semana; en paralelo inicia el trámite de Business API.

---

## 🤖 PASO 5 — Crear el bot "Romina" (3 min)

Ruta: **Settings → Conversation AI → Bots → Create New Bot**

- [ ] Nombre del bot: `Romina`
- [ ] Idioma: `Spanish (Chile)`
- [ ] Modo: `Auto-Pilot`
- [ ] Canales: `WhatsApp`, `Instagram DM`, `Facebook Messenger`, `Web Chat`
- [ ] Personalidad: `Professional + Warm`
- [ ] En **"Objetivos del bot"**: pegar TODO el contenido de `system-prompt-romina.md` (entre las líneas `===`)
- [ ] Guardar

---

## 📚 PASO 6 — Subir Base de Conocimientos (2 min)

Ruta: **Conversation AI → Knowledge Base → Upload File**

- [ ] Subir `kb-conversation-ai-nmv.md`
- [ ] Esperar el indexado (aparece "Ready")
- [ ] Vincular la knowledge base al bot Romina: Bot Settings → Knowledge Source
- [ ] (Opcional) Agregar URLs: https://www.nuevamasvida.cl/ y /conoce-nuestros-nuevos-planes/

---

## ⚙️ PASO 7 — Workflows / Automatizaciones (5 min)

Ruta: **Automations → Workflows → Create Workflow**

### Workflow 1: Nuevo Lead WhatsApp
- [ ] Trigger: `Inbound Message` → WhatsApp → primer mensaje
- [ ] Action 1: `Add to Pipeline` → Ventas Isapre → Nuevo Lead
- [ ] Action 2: `AI Conversation` → Bot Romina → Activate
- [ ] Action 3: `Internal Notification` → "Nuevo lead WhatsApp: {{contact.name}}"
- [ ] Guardar

### Workflow 2: Lead desde Cotizador / Landing
- [ ] Trigger: `Inbound Webhook` (copiar la URL)
- [ ] Action 1: `Create/Update Contact` con los datos del payload
- [ ] Action 2: `Add to Pipeline` → Cotización Enviada
- [ ] Action 3: `Add Tag` → `cotizado`
- [ ] Action 4: `Send WhatsApp` → template "Cotización lista"
- [ ] Action 5: `AI Conversation` → Bot Romina → Activate
- [ ] Guardar

### Workflow 3: Escalamiento a Cynthia
- [ ] Trigger: `Tag Added` → `escalar_ejecutivo`
- [ ] Action 1: `Move to Stage` → Agendado
- [ ] Action 2: `AI Conversation` → Deactivate Bot
- [ ] Action 3: `Assign To User` → Cynthia
- [ ] Action 4: `Notification` a Cynthia: "Lead listo para llamar: {{contact.name}} — {{contact.phone}}"
- [ ] Guardar

### Workflow 4: Seguimiento lead frío
- [ ] Trigger: `Tag Added` → `lead_frio`
- [ ] Wait: 48 horas
- [ ] Action: `Send WhatsApp` → "Hola {{contact.first_name}}, ¿sigues interesado/a en el plan? 😊"
- [ ] Guardar

---

## 📨 PASO 8 — Templates de WhatsApp (solo Business API)

Si conectaste por QR, salta este paso.

Ruta: **Settings → WhatsApp → Templates → Create Template**

### Template 1: Bienvenida desde Cotizador (`bienvenida_cotizador`)
```
Hola {{1}} 👋

Soy Romina, tu asesora de Isapres Chile. Recibimos tu cotización del plan {{2}} por {{3}} mensual.

¿Tienes 5 minutos para que revisemos juntos los detalles?
```

### Template 2: Recordatorio (`recordatorio_seguimiento`)
```
Hola {{1}}, soy Romina de Isapres Chile.

¿Pudiste revisar las opciones que vimos? Estoy disponible para resolver cualquier duda 😊
```

### Template 3: Confirmación de cita (`cita_confirmada`)
```
{{1}}, tu llamada con Cynthia está confirmada para el {{2}} a las {{3}}.

Si necesitas reagendar, escríbeme aquí mismo. ¡Nos hablamos pronto!
```

- [ ] Enviar las 3 templates a aprobación de Meta (24-48h)

---

## 🌐 PASO 9 — Conectar Cotizador / Landing (3 min)

- [ ] En Workflow 2, copiar la URL del webhook de entrada
- [ ] Pegarla en el formulario del cotizador/landing que uses
- [ ] Probar: enviar una cotización de prueba y verificar que llega como contacto a HEAT

> Para el cotizador conversacional propio (app del repo), el deploy es en Vercel y no depende de HEAT (ver README del proyecto / `.env.example`).

---

## 🧪 PASO 10 — Pruebas internas (5 min)

- [ ] Mandarte un WhatsApp desde otro número al número conectado
- [ ] Verificar que Romina saluda automáticamente
- [ ] Conversación de prueba: dar edad, renta, cargas → debe cotizar 3 opciones
- [ ] Verificar que el RUT lo pide al final (al derivar), no al inicio
- [ ] Decir "quiero hablar con un humano" → debe agregar tag `escalar_ejecutivo` (sin escribir el tag en el mensaje)
- [ ] Verificar que Cynthia recibe la notificación
- [ ] Confirmar que NO aparece ningún tag interno en los mensajes del cliente

---

## 📊 PASO 11 — Dashboard de seguimiento

Ruta: **Reporting → Custom Reports**

- [ ] Leads nuevos por día (30 días)
- [ ] Conversiones por etapa
- [ ] Leads por fuente (WhatsApp vs Landing vs Cotizador vs Ads)
- [ ] Tasa de cierre (Cerrado Ganado / Total Leads)

---

## 🚨 MANTENIMIENTO MENSUAL

- [ ] Verificar en vendor.tu7.cl si cambiaron precios base de planes Pleno Salud
- [ ] Si hay cambios, actualizar `datos-cotizacion-nmv.md`, `lib/cotizador.ts` y `kb-conversation-ai-nmv.md`
- [ ] Actualizar el valor UF de respaldo en `lib/cotizador.ts` (el cotizador igual lo trae en vivo)
- [ ] Re-subir la base de conocimientos a HEAT (Knowledge Base → Replace)
- [ ] Revisar conversaciones de la semana y ajustar `system-prompt-romina.md` si Romina se equivoca en algo

---

## CRONOGRAMA SUGERIDO

| Semana | Tarea |
|--------|-------|
| 1 | Pipeline, custom fields, tags y bot Romina en HEAT; conectar WhatsApp (QR); subir KB |
| 2 | Publicar cotizador/landing con webhook; templates a Meta; workflows |
| 3 | Pruebas internas y ajuste del prompt |
| 4 | Lanzamiento con Ads; monitoreo y optimización |

---

## ✅ ARCHIVOS DEL PROYECTO

| Archivo | Para qué |
|---|---|
| `system-prompt-romina.md` | Pegar en HEAT → bot Romina → Objetivos del bot |
| `kb-conversation-ai-nmv.md` | Subir como Knowledge Base en HEAT |
| `base-conocimientos-agente-isapre.md` | Referencia interna ampliada del agente |
| `datos-cotizacion-nmv.md` | Fuente única de factores, catálogo y fórmula |
| `app/` + `lib/` | Cotizador conversacional propio (Next.js, deploy en Vercel) |
| `checklist-setup-heatlatam.md` | Este documento |

---

*Última actualización: 25 de mayo de 2026.*
