# UI — Marketplace de Leads nuevaisapre.cl

> Documentación interna del Skill #8. La versión portable del design system vive en `DESIGN.md` (root del proyecto).

## Alcance de este paso

Por decisión explícita del usuario, este paso implementó:
1. El **Design System completo** (`DESIGN.md`) para las superficies nuevas.
2. **Una pantalla insignia implementada en código real**: `/cotizador` — Resultados, la más compleja y la que mejor prueba el sistema (motor de cálculo, filtros, desglose, LeadGate).

El resto de las pantallas de `docs/ui-design/screen-flows/` (panel del ejecutivo, extensión de `/admin`, registro) quedan **especificadas pero no implementadas** — se construyen en `/build` siguiendo el mismo Design System y los mismos screen flows, una vez migrada la base de datos (Fase 1 del Blueprint).

## Design System — Resumen

Ver `DESIGN.md` para el detalle completo. Resumen ejecutivo:

- **Paleta:** Azul Cotización (#0F3D68) dominante + Dorado UF (#C9973B) como único acento semántico, sobre fondo Papel Cálido (#FBF7EF) — nunca blanco/negro puro.
- **Tipografía:** Fraunces (display, serif cálido) + Public Sans (body, con tabular figures para precios) + IBM Plex Mono (códigos de plan) — cero Inter/Roboto/Arial en las superficies nuevas.
- **Diferenciador visual:** el conteo animado de precios (`PrecioContador`) — cuando el usuario cambia un dato, el precio "cuenta" hacia el nuevo valor con `ease-out-expo`, en vez de saltar instantáneamente. Ningún competidor (incluido tu7.cl) lo tiene.
- **Motion:** solo `transform`/`opacity`, `prefers-reduced-motion` respetado, barras de cobertura con `scaleX` disparadas por `IntersectionObserver`.

## Implementación técnica

- **Tailwind CSS 3.4** instalado con `corePlugins.preflight: false` — decisión deliberada para no romper `admin.css` existente (ver `tailwind.config.ts`). El contenido escaneado está acotado a las rutas/componentes nuevos (`app/cotizador`, `app/panel`, `components/cotizador`, `components/panel`, `components/ui`).
- Fuentes cargadas vía `next/font/google` en `app/cotizador/layout.tsx`, aplicadas solo dentro de ese subárbol — el layout raíz (`app/layout.tsx`) conserva Inter para el resto del sitio sin cambios.
- `lib/pricing.ts`: motor de cálculo puro, con 7 tests unitarios (`lib/pricing.test.ts`) que verifican contra los 3 casos reales confirmados en `analisis-tu7cl-cotizador.md` — todos pasan.
- `lib/cotizador-store.ts`: store de Zustand acotado solo al cotizador, tal como decidió el Tech Spec.

## Pantallas implementadas

### `/cotizador` — Formulario + Resultados + Desglose + LeadGate
- **Screen flow de referencia:** `docs/ui-design/screen-flows/cotizador-publico.md`
- **Componentes nuevos:** `CotizadorShell`, `PlanCard`, `BarraCobertura`, `PrecioContador`, `DesgloseModal`, `FiltrosCotizador`, `LeadGateModal`, más `Button`/`Badge` (shadcn/ui customizado, ver `components/ui/`)
- **Verificado en navegador** (Chrome, vía Claude in Chrome): formulario → resultados con 3 tarjetas → tarjeta "Recomendada" destacada con badge dorado → precio $81.766 coincide exactamente con el test unitario para cotizante de 35 años en Banmédica → modal de desglose con el label corregido "Aporte adicional de tu isapre (GES)" → LeadGate con botón "Enviar" deshabilitado hasta aceptar el consentimiento → filtro por isapre funcional.

### Acceptance Targets cumplidos (de `screen-flows/cotizador-publico.md`)

- [x] Debo ver los campos edad, renta, región y cargas, sin campo de RUT
- [x] Si ingreso una edad fuera de 0-100, debo ver un error inline sin perder los demás datos
- [x] Al enviar datos válidos, debo ver los 3 planes
- [x] Debo ver 3 tarjetas de plan con precio en pesos
- [x] La tarjeta "Recomendada" debe distinguirse visualmente de las otras dos
- [x] Al aplicar un filtro, el contador de planes debe actualizarse
- [x] En mobile, los filtros deben vivir en un drawer/acordeón, no ocupar toda la pantalla por defecto (verificado estructuralmente: `lg:hidden` / `hidden lg:block`)
- [x] Debo ver una tabla con beneficiario, edad, factor, y el total en pesos
- [x] La fila del aporte de la isapre debe decir "Aporte adicional de tu isapre (GES)", nunca solo "GES"
- [x] El modal solo debe aparecer al hacer clic en una acción de alto interés, nunca antes de ver los planes
- [x] El botón "Enviar" debe estar deshabilitado hasta que el checkbox de consentimiento esté marcado
- [ ] Si un filtro deja 0 planes, debo ver "No hay planes con estos filtros..." — implementado en código, no verificado visualmente (el catálogo de muestra tiene 1 plan por isapre, no se forzó ese caso en la sesión de prueba)
- [ ] Tras enviar el LeadGate, debo ver la confirmación "Un ejecutivo te contactará..." — implementado en código, pendiente de verificar visualmente con datos válidos de WhatsApp

## Anti-AI-Slop Check

- ✅ Tipografía con personalidad propia (Fraunces + Public Sans, no Inter/Roboto/Arial)
- ✅ Paleta con dominancia clara (Azul Cotización manda, Dorado UF es el único acento)
- ✅ Las 3 tarjetas de plan tienen jerarquía visual distinta, no son idénticas
- ✅ Al menos un detalle memorable identificado: el conteo animado de precios
- ✅ Estados empty y error diseñados (no placeholders genéricos)
- ✅ Motion con intención narrativa (contador de precios), no bounces arbitrarios
- ✅ Navegación no aplica a esta pantalla (público, sin nav persistente, según IA)

## Pendiente para `/build`

- Implementar `/panel` (dashboard, mis leads, ficha, créditos, perfil) y la extensión de `/admin` (créditos, reparto) siguiendo `DESIGN.md` y sus respectivos screen flows.
- Reemplazar `lib/cotizador-mock-data.ts` por el catálogo real desde Postgres una vez migrado.
- Conectar `POST /api/cotizaciones` real (hoy el LeadGate solo simula el envío en el cliente).
- Implementar los componentes `StatusBadge` y `CreditBalance` (`docs/ui-design/components/`) cuando se construyan `/panel` y `/admin`.
