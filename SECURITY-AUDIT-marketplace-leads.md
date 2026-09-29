# Security & Scalability Audit — Marketplace de Leads nuevaisapre.cl

**Fecha:** 2026-09-07
**VCAL:** 4 — Alto porcentaje de código generado por IA (commits co-autorados por Claude en todo el historial, incluyendo el código nuevo de esta sesión); requiere auditoría completa, no spot-check.
**Revisado por:** Claude (Skill #9 — Security & Scalability Audit)
**Alcance:** Código actual en producción (`app/`, `lib/`, `components/`) + código nuevo de la Fase de planificación (`lib/pricing.ts`, `components/cotizador/`) + arquitectura planificada (TECH-SPEC-marketplace-leads.md) para lo que aún no existe.

---

## ⚠️ Hallazgo que requiere acción HOY (independiente de este pipeline)

**SEC-1 es una vulnerabilidad en el sistema que ya está en producción**, no en el marketplace planificado. No bloquea la generación del Blueprint (es un fix de configuración, no una decisión de diseño), pero no puede esperar al cronograma del proyecto — ver detalle abajo.

---

## Resumen Ejecutivo

**Nivel de Riesgo Global:** 🔴 Alto (por SEC-1, aislado) / 🟡 Medio (el resto)

**Top 5 Riesgos:**
1. **SEC-1** — Credencial semilla del superadmin con default débil (`123456`) + interruptor de reset (`ADMIN_SEED_FORCE`) que sobreescribe y borra usuarios — 🔴 Crítico
2. **SEC-2** — Webhooks de WhatsApp y Meta Lead Ads sin verificación de firma criptográfica — 🟠 Alto
3. **SEC-4** — `/api/chat` público, sin autenticar, sin rate limiting, con historial de conversación controlado por el cliente — 🟠 Alto
4. **SEC-5** — Login del admin sin rate limiting — 🟠 Alto
5. **SEC-10** — El catálogo de planes se extrae mensualmente de la API privada y autenticada de tu7.cl (con cookie de sesión) — riesgo legal/de continuidad de negocio, no técnico — 🟠 Alto (negocio, no CVSS)

**Decisión de pipeline:**
- ▶️ **PROCEDER** al Blueprint — ninguno de los hallazgos críticos/altos está en el diseño nuevo del marketplace; todos son del sistema actual o de la cadena de datos, y ya tienen mitigación clara documentada abajo. **SEC-1 se resuelve hoy, en paralelo, no como parte del Blueprint.**

**Resumen de hallazgos:**

| Categoría | Críticos | Altos | Medios | Bajos | OK |
|-----------|----------|-------|--------|-------|-----|
| Seguridad App | 1 | 3 | 2 | 1 | 6 |
| Vibe Coding / Datos | 0 | 1 | 0 | 0 | 1 |
| Escalabilidad | 0 | 0 | 1 | 0 | 1 |
| Observabilidad | 0 | 0 | 2 | 0 | 0 |

---

## Hallazgos de Seguridad

### SEC-1 — Credencial semilla débil por defecto + reset destructivo fail-open

| Campo | Valor |
|-------|-------|
| **ID** | SEC-1 |
| **OWASP** | A07 — Identification and Authentication Failures |
| **Severidad** | 🔴 Crítico |
| **CVSS Score** | 9.5 |
| **Probabilidad** | Alta — el commit más reciente del repo (`d1c5b09`) usó exactamente este mecanismo |
| **Status** | 🔴 Open |

**Descripción:** En `lib/usuarios.ts`, `SEED_PASSWORD` cae a `"123456"` si `ADMIN_SEED_PASSWORD` no está configurada, y `SEED_EMAIL` cae a `"info@nuevaisapre.cl"` si `ADMIN_SEED_EMAIL` no está configurada. Además, si `ADMIN_SEED_FORCE=1` está activo, un login exitoso con esas credenciales **sobreescribe la contraseña del superadmin actual y elimina a todos los demás usuarios** (`lib/usuarios.ts:82-104`). El login (`app/api/admin/login/route.ts`) no tiene rate limiting (ver SEC-5), por lo que si cualquiera de las dos env vars no está bien configurada en Vercel, el sistema completo (incluyendo datos personales de todos los leads) es tomable por cualquiera que intente `info@nuevaisapre.cl` / `123456`.

**Evidencia:** `lib/usuarios.ts:27-28` (defaults), `lib/usuarios.ts:82-104` (lógica de reset destructivo). El commit `d1c5b09 "Reset de emergencia del superadmin vía ADMIN_SEED_FORCE"` indica que este flag se usó recientemente — el comentario en el código dice explícitamente "Quitar el flag después de usarlo".

**Impacto:** Toma de control total del panel superadmin (todos los leads, datos personales, futuro ledger de créditos) con una credencial pública y documentada en el propio código fuente.

**Recomendación (verificar HOY, no esperar al Blueprint):**
1. Confirmar en Vercel → Settings → Environment Variables que `ADMIN_SEED_PASSWORD` está configurada con un valor fuerte y único (no `123456`).
2. Confirmar que `ADMIN_SEED_FORCE` **no está presente** en las variables de entorno de producción ahora que el reset de emergencia ya se usó — si sigue en `1`, quitarlo inmediatamente.
3. A futuro: agregar rate limiting al login (SEC-5) para que incluso una mala configuración momentánea no sea trivialmente explotable.

---

### SEC-2 — Webhooks de WhatsApp y Meta Lead Ads sin verificación de firma

| Campo | Valor |
|-------|-------|
| **ID** | SEC-2 |
| **OWASP** | A08 — Software and Data Integrity Failures |
| **Severidad** | 🟠 Alto |
| **CVSS Score** | 7.5 |
| **Probabilidad** | Media |
| **Status** | 🔴 Open |

**Descripción:** `app/api/whatsapp/route.ts` y `app/api/meta-leads/route.ts` verifican el `hub.verify_token` solo en el `GET` de configuración inicial del webhook. El handler `POST` — el que procesa mensajes reales y crea leads — **no valida la firma `X-Hub-Signature-256`** que Meta firma con el App Secret en cada request.

**Evidencia:** `app/api/whatsapp/route.ts` (función `POST`), `app/api/meta-leads/route.ts` (función `POST`). No hay ninguna referencia a `x-hub-signature` en el repo (`grep` sin resultados).

**Impacto:** Cualquiera que conozca (o adivine) la URL del webhook puede enviar payloads falsos que el sistema trata como mensajes reales de WhatsApp o leads reales de Meta — puede inyectar leads falsos, forzar llamadas innecesarias a la API de Anthropic (ver SEC-4), o intentar manipular la conversación de Romina con contenido adversarial.

**Recomendación:** Implementar verificación de `X-Hub-Signature-256` usando el App Secret de Meta (`crypto.createHmac('sha256', APP_SECRET)`), comparando con `crypto.timingSafeEqual` antes de procesar el body. Rechazar con 401 si no coincide.

---

### SEC-3 — Secret de fallback hardcodeado en el código fuente

| Campo | Valor |
|-------|-------|
| **ID** | SEC-3 |
| **OWASP** | A02 — Cryptographic Failures |
| **Severidad** | 🟠 Alto |
| **CVSS Score** | 6.5 |
| **Probabilidad** | Baja (requiere que la env var no esté configurada) |
| **Status** | 🔴 Open |

**Descripción:** `app/api/meta-leads/route.ts:24` — `const VERIFY_TOKEN = process.env.META_LEADS_VERIFY_TOKEN || "nuevaisapre-meta-2026";`. El valor de fallback queda commiteado en git y ahora también en el historial de esta conversación.

**Evidencia:** `app/api/meta-leads/route.ts:24`.

**Impacto:** Si la env var no está configurada en algún ambiente (ej. preview), el token de verificación del webhook es público y conocido — reduce la protección del handshake `hub.mode=subscribe` a nada.

**Recomendación:** Eliminar el fallback. Si `META_LEADS_VERIFY_TOKEN` no está configurada, el `GET` debe fallar explícitamente (retornar 500 con log claro), nunca operar con un secreto conocido.

---

### SEC-4 — Endpoint de IA público sin autenticación ni límite de uso

| Campo | Valor |
|-------|-------|
| **ID** | SEC-4 |
| **OWASP** | EXT-08 — AI Cost Caps (Vibe Coding) |
| **Severidad** | 🟠 Alto |
| **CVSS Score** | 6.8 |
| **Probabilidad** | Media |
| **Status** | 🔴 Open |

**Descripción:** `app/api/chat/route.ts` es completamente público, sin sesión ni token, y el cliente controla íntegramente el array `messages` que se reenvía al modelo. No hay límite de longitud de mensaje, cantidad de mensajes en el historial, ni rate limiting por IP/sesión. `max_tokens: 4096` en `lib/agent.ts:144` limita el costo de una sola respuesta, pero no el número de requests.

**Evidencia:** `app/api/chat/route.ts` completo; `lib/agent.ts:144`.

**Impacto:** Un script automatizado puede llamar este endpoint en loop con historiales largos, generando un costo de API de Anthropic significativo en horas — el patrón exacto que documenta `vibe-coding-risks.md` como causa de facturas de $10K+ overnight.

**Recomendación:** Agregar rate limiting por IP (ej. 20 mensajes/hora) y un límite explícito de tamaño/cantidad de mensajes en el `history` recibido antes de reenviarlo al modelo. No requiere Upstash nuevo si el volumen es bajo — puede empezar como un contador en la misma KV que ya existe.

---

### SEC-5 — Sin rate limiting en el login del panel admin

| Campo | Valor |
|-------|-------|
| **ID** | SEC-5 |
| **OWASP** | A07 / EXT-05 |
| **Severidad** | 🟠 Alto |
| **CVSS Score** | 7.0 |
| **Probabilidad** | Media |
| **Status** | 🔴 Open |

**Descripción:** `app/api/admin/login/route.ts` no limita intentos fallidos por IP ni por cuenta — permite fuerza bruta ilimitada contra el login del superadmin, que da acceso a todos los datos personales de leads y (en el marketplace) al ledger de créditos.

**Evidencia:** `app/api/admin/login/route.ts` completo — sin ningún contador ni bloqueo.

**Impacto:** Combinado con SEC-1, hace que un valor semilla débil sea trivialmente explotable en cuestión de minutos con un script simple.

**Recomendación:** Limitar a ~5 intentos fallidos por IP cada 15 minutos (con Upstash Ratelimit, ya en el stack de referencia de Forge) antes de escalar a más features de auth.

---

### SEC-6 — Endpoints de cron fail-open si falta `CRON_SECRET`

| Campo | Valor |
|-------|-------|
| **ID** | SEC-6 |
| **OWASP** | A05 — Security Misconfiguration |
| **Severidad** | 🟡 Medio |
| **CVSS Score** | 5.5 |
| **Probabilidad** | Media |
| **Status** | 🔴 Open |

**Descripción:** `app/api/cron/export-semanal/route.ts` y `app/api/cron/recordatorios/route.ts` solo verifican el header `Authorization` **si** `process.env.CRON_SECRET` existe (`if (secret) { ... }`). Si la variable no está configurada en un ambiente (no está documentada en `.env.example`), el endpoint queda completamente abierto.

**Evidencia:** Ambos archivos, línea `const secret = process.env.CRON_SECRET;` seguida de `if (secret) { ... }`.

**Impacto:** Cualquiera que descubra la URL puede disparar el envío masivo de emails de recordatorio o el export semanal a voluntad — abuso de recursos y spam, no fuga de datos directa (los emails van a direcciones ya configuradas, no a un atacante).

**Recomendación:** Cambiar el patrón a fail-closed: si `CRON_SECRET` no está configurado, rechazar con 500 en vez de operar sin protección. Documentar `CRON_SECRET` en `.env.example`.

---

### SEC-7 — Sin headers de seguridad HTTP

| Campo | Valor |
|-------|-------|
| **ID** | SEC-7 |
| **OWASP** | A05 — Security Misconfiguration |
| **Severidad** | 🟡 Medio |
| **CVSS Score** | 5.0 |
| **Probabilidad** | Alta (siempre presente) |
| **Status** | 🔴 Open |

**Descripción:** `next.config.mjs` está vacío — no hay `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options` ni `Permissions-Policy` configurados.

**Evidencia:** `next.config.mjs` completo (`const nextConfig = {};`).

**Impacto:** Sin `X-Frame-Options`/CSP con `frame-ancestors`, el panel admin es embebible en un iframe malicioso (clickjacking). Sin CSP, cualquier XSS que se cuele es más difícil de contener.

**Recomendación:** Aplicar el template de headers de `security-checklist.md` (sección "Security Headers Configuration Template") a `next.config.mjs`.

---

### SEC-8 — Sin tabla de audit log para acciones administrativas

| Campo | Valor |
|-------|-------|
| **ID** | SEC-8 |
| **OWASP** | A09 — Security Logging and Monitoring Failures |
| **Severidad** | 🟡 Medio |
| **CVSS Score** | 4.5 |
| **Probabilidad** | N/A (gap estructural) |
| **Status** | 🔴 Open |

**Descripción:** No existe ninguna tabla o registro de auditoría de acciones administrativas (crear/eliminar usuarios, exportar leads, cambios de rol). El Tech Spec del marketplace ya incluye `acceso_log` para vistas de leads (Ley 21.719), pero no cubre acciones administrativas generales del sistema actual.

**Evidencia:** Sin resultados al buscar `audit_log`/`activity_log` en el repo.

**Impacto:** Ante un incidente de seguridad (ej. si SEC-1 se explota), no hay forma de reconstruir qué se hizo, cuándo, ni por quién.

**Recomendación:** Extender `acceso_log` (ya planificado en el Tech Spec) para cubrir también acciones de `superadmin` (crear/suspender ejecutivo, regalar créditos, exportar datos) — no es trabajo adicional significativo si se hace al mismo tiempo que esa tabla.

---

### SEC-9 — Fallback silencioso a memoria en el store de datos (ya documentado)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-9 |
| **OWASP** | A05 / Disponibilidad de datos |
| **Severidad** | 🔵 Bajo (para el sistema actual) / 🟠 Alto (si se construye el marketplace sobre esto) |
| **Status** | 🟡 Accepted — ya hay plan de migración |

**Descripción:** Ya identificado extensivamente en `VIABILITY-marketplace-leads.md` y `TECH-SPEC-marketplace-leads.md`: `lib/store.ts` cae a un `Map` en memoria si faltan las env vars de Upstash. Se documenta acá solo para que quede en el registro formal de la auditoría de seguridad, no se repite el análisis.

**Recomendación:** Ya cubierta — migración a Postgres antes de construir el ledger de créditos (US-046 del Blueprint).

---

### Ítems Revisados — Sin Hallazgo (OK)

| Item | Evidencia |
|------|-----------|
| Passwords hasheados con bcrypt | `lib/auth.ts` (`hashPassword`/`verifyPassword`, cost 10) |
| Sesión en cookie httpOnly, no localStorage | `lib/auth.ts` (`COOKIE_OPCIONES: { httpOnly: true, secure: true, sameSite: "lax" }`) |
| Rutas `/api/admin/*` verifican sesión + rol de forma consistente | `obtenerSesion()` presente en todas salvo login/logout (esperado) |
| Sin `dangerouslySetInnerHTML` en el código | `grep` sin resultados |
| System prompt de Romina separado del input del usuario (mitiga prompt injection de override) | `lib/agent.ts:145` — usa el parámetro `system` de la API de Anthropic, no concatenación |
| `max_tokens` configurado en la llamada a Anthropic | `lib/agent.ts:144` |
| Secretos no committeados (`.env` en `.gitignore`, cookie de tu7.cl "nunca commiteada" según el propio commit) | `.gitignore`, mensaje del commit `3262b93` |
| Aislamiento de leads por ejecutivo ya implementado y funcionando | Commit `f244c07` "Visibilidad de leads por asignación" |

---

## Hallazgo de Vibe Coding / Cadena de Datos

### SEC-10 — El catálogo de planes depende de la API privada y autenticada de un competidor

| Campo | Valor |
|-------|-------|
| **ID** | SEC-10 |
| **Categoría** | Riesgo de negocio / continuidad de datos (no CVSS clásico) |
| **Severidad** | 🟠 Alto (impacto de negocio, no técnico) |
| **Status** | 🔴 Open — requiere decisión del usuario, no un fix de código |

**Descripción:** El script `scripts/refresh-catalogo.mjs` (commit `3262b93`) extrae el catálogo completo **mensualmente** haciendo `POST /Api/data/planes/` contra tu7.cl usando una **cookie de sesión autenticada** (`TU7_COOKIE`, correctamente no commiteada). Esto no es solo "leer datos públicos" — reutiliza una sesión de una cuenta de ejecutivo pagada de tu7.cl para extraer programáticamente su base de datos completa.

**Impacto real:**
1. Si tu7.cl detecta el patrón (requests automatizados mensuales reusando una sesión) puede suspender la cuenta usada, cortando la fuente de datos de la noche a la mañana.
2. Es probable violación de los Términos de Servicio de tu7.cl — riesgo legal si deciden actuar (cese y desista, o algo mayor).
3. Conecta directamente con el **Elephant R-10** del Pre-Mortem ("tu7.cl puede copiar el modelo") — pero es más grave de lo que ese hallazgo asumía: tu7.cl no solo podría copiar el modelo de negocio, podría **cortar el suministro de datos** del que depende el diferenciador central del cotizador.

**Recomendación:** Esta no es una decisión técnica, es una decisión de negocio/legal que el usuario debe tomar conscientemente:
- Evaluar una fuente de datos propia o con licencia (directamente de las isapres, o de la Superintendencia de Salud) para dejar de depender de scrapear a un competidor.
- Si se mantiene el proceso actual, tratarlo explícitamente como un riesgo operativo con plan de contingencia (¿qué se hace el día que se corte el acceso?), no como una fuente de datos estable.
- No es bloqueante para continuar el Blueprint (no es una vulnerabilidad de código), pero sí debe registrarse como riesgo de negocio de alta prioridad — ya está reflejado en el Pre-Mortem actualizado.

---

## Hallazgos de Escalabilidad

### SCALE-1 — Límite fijo de 500 leads en el cron de recordatorios

| Campo | Valor |
|-------|-------|
| **ID** | SCALE-1 |
| **Severidad** | 🟡 Medio |
| **Status** | 🔴 Open |

**Descripción:** `app/api/cron/recordatorios/route.ts` llama `listarLeads(500)` — si el volumen de leads supera 500, los recordatorios de leads fuera de esa ventana simplemente no se revisan, sin ningún error ni alerta.

**Recomendación:** Paginar la revisión o indexar recordatorios pendientes por fecha en vez de escanear todos los leads — se vuelve relevante en cuanto el marketplace aumente el volumen (justo el objetivo del proyecto).

### Ítems Revisados — Sin Hallazgo Crítico

| Item | Estado |
|------|--------|
| Adelgazamiento del catálogo del cotizador (evitar el error de los 2,8MB de tu7.cl) | ✅ Ya diseñado explícitamente en TECH-SPEC 8.2 |
| Índices de base de datos para el marketplace | ✅ Ya definidos en el schema del Tech Spec (`idx_lead_asignado`, `idx_lead_sin_asignar`, etc.) |

---

## Hallazgos de Observabilidad

| Item | Estado | Nota |
|------|--------|------|
| Logging estructurado (no solo console.log) | ❌ | Todo el logging actual es `console.log`/`console.error` sin formato JSON ni traceId |
| Health check endpoint (`/api/health`) | ❌ | No existe |
| Rate limiting en endpoints sensibles | ❌ | Ver SEC-4, SEC-5 |
| Circuit breaker en llamadas a Anthropic | ⚠️ | Se captura `Anthropic.RateLimitError` puntualmente, pero no hay circuit breaker real |

Estos son gaps aceptables para el volumen actual, pero deben resolverse **antes** de que el marketplace mueva dinero real (Mercado Pago) — un fallo silencioso en el checkout sin logging estructurado es mucho más difícil de diagnosticar que uno con leads.

---

## Checklist de Mínimos

### Seguridad
| Item | Estado |
|------|--------|
| RLS / aislamiento por ejecutivo habilitado y probado | ✅ (KV actual) / ⚠️ (pendiente de implementar el patrón `SET LOCAL` para Postgres, ya diseñado) |
| Sin secretos en código cliente | ✅ |
| Sin secretos hardcodeados en código servidor | ❌ (SEC-3) |
| API routes validan sesión server-side | ✅ (con la excepción esperada de login/logout/webhooks) |
| Webhooks verifican firma criptográfica | ❌ (SEC-2) |
| Security headers en `next.config.mjs` | ❌ (SEC-7) |
| Rate limiting en login y endpoints de IA | ❌ (SEC-4, SEC-5) |
| npm audit: cero vulnerabilidades high/critical | ⚠️ (1 high conocido — postcss/Next 16, ya en seguimiento desde antes de esta sesión) |

### Escalabilidad
| Item | Estado |
|------|--------|
| Sin queries N+1 (KV actual) | ✅ |
| Listados con límite explícito (aunque sea fijo) | ⚠️ (SCALE-1 — el límite existe pero es silencioso) |
| Índices planificados para el nuevo schema | ✅ (Tech Spec) |
| Catálogo del cotizador adelgazado para el cliente | ✅ (diseñado, pendiente de implementar con datos reales) |

### Observabilidad
| Item | Estado |
|------|--------|
| Logging estructurado | ❌ |
| Health check endpoint | ❌ |
| Rate limiting | ❌ |
| Circuit breaker en LLM | ⚠️ |

**Leyenda:** ✅ OK · ⚠️ Riesgo aceptable · ❌ Bloqueante

---

## Plan de Acción

### 🔴 Inmediato (hoy, fuera del cronograma del Blueprint)
1. **SEC-1** — Verificar/rotar `ADMIN_SEED_PASSWORD` en Vercel y confirmar que `ADMIN_SEED_FORCE` no sigue activo.

### 🔴 Antes de construir el Blueprint (o en su primera fase, antes de abrir registro externo)
1. **SEC-5** — Rate limiting en `/api/admin/login`.
2. **SEC-2** — Verificación de firma en webhooks de WhatsApp y Meta Lead Ads.
3. **SEC-4** — Rate limiting y límites de tamaño en `/api/chat`.
4. **SEC-3** — Eliminar el fallback hardcodeado del token de Meta Lead Ads.
5. **SEC-6** — Cambiar los cron endpoints a fail-closed.

### 📅 30 días (Sprint 1 del Blueprint)
1. **SEC-7** — Headers de seguridad en `next.config.mjs`.
2. **SEC-8** — Extender `acceso_log` a acciones administrativas.
3. **SCALE-1** — Paginar o indexar la revisión de recordatorios.

### 📅 60 días (Sprint 2)
1. Logging estructurado (JSON, con traceId) para el motor de reparto y el ledger de créditos — crítico antes de Mercado Pago en modo `live`.
2. Health check endpoint (`/api/health`) — útil para monitoreo una vez que haya usuarios externos.

### 📅 90 días / Decisión de negocio (no técnica)
1. **SEC-10** — Definir una estrategia de fuente de datos del catálogo que no dependa de una cuenta autenticada de tu7.cl — decisión del usuario, ya reflejada como riesgo en el Pre-Mortem actualizado.
