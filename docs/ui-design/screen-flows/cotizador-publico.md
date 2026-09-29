# Screen Flow: Cotizador Público

**Epic:** 5 (Cotizador Público), 10 (Consentimiento, transversal)
**Persona objetivo:** Marcela (prospecto)
**Dispositivo primario:** Mobile (persona Marcela) — todo este flow se diseña mobile-first, desktop es una expansión, no el caso base.

```
/cotizador (form mínimo) ──[completa datos]──▶ Resultados (3 planes) ──[clic "ver desglose"]──▶ Modal desglose
        │                                              │
        │                                       [clic filtros]──▶ Resultados filtrados (facetas)
        │                                              │
        │                                       [clic "Enviar propuesta" / "Hablar con asesor"]
        │                                              ▼
        │                                        LeadGate (modal) ──[completa + acepta consentimiento]──▶ Confirmación
        │
        └──(vuelve más tarde)──▶ /mi-cotizacion (recupera por WhatsApp) ──▶ Resultados (misma vista)
```

---

### Pantalla: `/cotizador` — Formulario mínimo

**Entry from:** Google Ads, tráfico orgánico, link "Cotiza tu plan aquí"
**Story refs:** US-018

#### Layout
Mobile: formulario de una sola columna, sin sidebar de filtros todavía (los filtros solo aparecen tras el primer resultado). Desktop: formulario centrado, más ancho.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Campos: edad, renta bruta, región, cargas | Input del usuario | Numérico / selector de región / lista dinámica de cargas |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Agregar carga | Botón "+ Agregar carga" | Agrega fila edad+parentesco (progressive disclosure) |
| Ver mis cotizaciones | Botón principal "Ver mis planes" | Navega a Resultados con el cálculo ya hecho |

#### States
- **Validación:** edad fuera de 0-100 o renta ≤ 0 → error inline, datos conservados.
- **Loading:** catálogo cargando por primera vez → skeleton de las 3 tarjetas de plan, no un spinner genérico.
- **Error:** catálogo no carga → "No pudimos cargar los planes. Reintentar." con botón de retry.

---

### Pantalla: `/cotizador` — Resultados (3 planes comparados)

**Entry from:** Envío del formulario mínimo
**Story refs:** US-018, US-019, US-020

#### Layout
Mobile: 3 tarjetas de plan apiladas verticalmente (Económica/Recomendada/Premium, la Recomendada destacada visualmente). Filtros colapsados en un botón "Filtros" que abre un drawer inferior (resuelve la violación de usabilidad H8 encontrada en el Skill #6 — nunca un sidebar fijo en mobile). Desktop: sidebar de filtros a la izquierda, tarjetas en grid a la derecha (patrón tu7.cl adaptado).

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Tarjeta de plan | `plan` + cálculo de `lib/pricing.ts` | Nombre isapre, precio en pesos grande, barras de cobertura hospitalaria/ambulatoria |
| Contador de filtros | Facetas calculadas | "X planes" junto a cada filtro |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Cambiar cualquier dato del formulario | Inputs siempre editables arriba | Recalcula instantáneo, sin reload (US-018) |
| Aplicar filtro | Checkbox/chip por isapre, zona, tipo, cobertura | Lista se filtra, contador se actualiza (US-019) |
| Ver desglose | Botón "Ver desglose" en cada tarjeta | Abre modal de desglose (US-020) |
| Enviar propuesta / Hablar con asesor | Botón primario en cada tarjeta | Abre LeadGate (US-021) |

#### States
- **Default:** 3 planes visibles, Recomendada destacada.
- **Empty (filtros sin resultados):** "No hay planes con estos filtros. Prueba ajustando la cobertura o la zona." + botón "Limpiar filtros".
- **Loading:** recalculo es instantáneo en cliente — no hay estado de loading visible para cambios de filtro/edad.

---

### Pantalla: Modal — Desglose de cálculo por beneficiario

**Entry from:** Botón "Ver desglose" en una tarjeta de plan
**Story refs:** US-020

#### Layout
Modal centrado (mobile: fullscreen). Tabla: beneficiario, edad, factor, precio base, valor plan, aporte adicional de la isapre (ver nota de lenguaje abajo), total UF, total pesos. Fórmula explicada en una frase debajo de la tabla.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Fila por beneficiario | `lib/pricing.ts` detalle | Tabla |
| Aporte adicional de la isapre | Campo `ges_uf` del plan | **Label en lenguaje simple: "Aporte adicional de tu isapre (GES)"** — no solo "GES" |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Cerrar | Botón X o clic fuera del modal | Vuelve a Resultados sin perder el estado |

**Nota de diseño:** el label "Aporte adicional de tu isapre (GES)" resuelve la violación de usabilidad Severidad 2 encontrada en el Skill #6 (`docs/ux-design/usability-evaluation/cotizador-publico.md`) — la sigla "GES" nunca aparece sola en la versión pública del desglose.

---

### Pantalla: Modal — LeadGate (pedir contacto)

**Entry from:** "Enviar propuesta", "Descargar PDF" o "Hablar con asesor" en Resultados — **nunca antes de ver los planes**
**Story refs:** US-021, US-043 (consentimiento)

#### Layout
Modal simple: nombre, WhatsApp, texto de consentimiento con checkbox obligatorio y link a política de privacidad.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Texto de consentimiento | Versión vigente | Texto + link a `/privacidad` |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Enviar | Botón "Enviar" (deshabilitado hasta aceptar consentimiento) | Crea el `lead` enlazado a la `cotizacion`, guarda texto+versión+timestamp del consentimiento, cierra el modal, muestra confirmación |

#### States
- **Validación:** teléfono no es un WhatsApp chileno válido → "Ingresa un WhatsApp chileno válido (+56 9 XXXXXXXX)".
- **Checkbox no marcado:** botón "Enviar" deshabilitado (prevención de error, H5).
- **Success:** confirmación inline "¡Listo! Un ejecutivo te contactará por WhatsApp con tu cotización." — el modal se cierra, la pantalla de Resultados queda visible detrás.

---

### Pantalla: `/mi-cotizacion` — Recuperar cotización guardada

**Entry from:** Link "¿Ya cotizaste? Recupérala aquí", visita directa
**Story refs:** US-022 (P2)

#### Layout
Reutiliza el patrón ya validado en el diseño de referencia (`nuevamas.netlify.app`): entry card pidiendo WhatsApp → portal con los mismos datos de Resultados.

#### States
- **Not found:** "No encontramos una cotización para ese WhatsApp" + link a `/cotizador`.

---

## Component Selection

| Componente | Decisión | Dónde vive |
|---|---|---|
| `PlanCard` | Nuevo — se repite en Resultados y en el cotizador del ejecutivo (Epic 6) | `docs/ui-design/components/plan-card.md` |
| `PriceBreakdownModal` | Nuevo — reutilizado en versión pública y versión ejecutivo (con distinto label de GES según audiencia) | Inline en `lib/pricing.ts`-driven component, sin spec separado por ahora |
| `FilterFacetGroup` | Nuevo — específico del cotizador | Ya descrito en Tech Spec 3.2 (`components/cotizador/filtro-facetas.tsx`) |
| `LeadGate` | Nuevo — único al flujo público | Ya descrito en Tech Spec 3.2 (`components/cotizador/lead-gate.tsx`) |

---

## Acceptance Targets: Cotizador Público

### `/cotizador` — Formulario
- [ ] Debo ver los campos edad, renta, región y cargas, sin campo de RUT
- [ ] Si ingreso una edad fuera de 0-100, debo ver un error inline sin perder los demás datos
- [ ] Al enviar datos válidos, debo ver los 3 planes en menos de lo que percibo como instantáneo (sin loading visible para el cálculo)

### Resultados
- [ ] Debo ver 3 tarjetas de plan con precio en pesos
- [ ] La tarjeta "Recomendada" debe distinguirse visualmente de las otras dos
- [ ] Al aplicar un filtro, el contador de planes debe actualizarse
- [ ] Si un filtro deja 0 planes, debo ver "No hay planes con estos filtros..." y un botón "Limpiar filtros"
- [ ] En mobile, los filtros deben vivir en un drawer/acordeón, no ocupar toda la pantalla por defecto

### Modal de desglose
- [ ] Debo ver una tabla con beneficiario, edad, factor, y el total en pesos
- [ ] La fila del aporte de la isapre debe decir "Aporte adicional de tu isapre (GES)", nunca solo "GES"

### LeadGate
- [ ] El modal solo debe aparecer al hacer clic en una acción de alto interés, nunca antes de ver los planes
- [ ] El botón "Enviar" debe estar deshabilitado hasta que el checkbox de consentimiento esté marcado
- [ ] Tras enviar, debo ver la confirmación "Un ejecutivo te contactará por WhatsApp con tu cotización"
