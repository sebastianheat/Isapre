# Design System: Marketplace de Leads nuevaisapre.cl

> Aplica a las superficies **nuevas**: cotizador público (`/cotizador`, `/mi-cotizacion`), panel del ejecutivo (`/panel`), y las secciones nuevas de `/admin` (Créditos, Reparto). El `/admin` existente conserva su CSS actual (`admin.css`) — no se retoca en este paso, por decisión explícita del Tech Spec.

## 1. Visual Theme & Atmosphere

**Confianza Bancaria Cálida.** nuevaisapre.cl vende una decisión de dinero real (cambiarse de isapre) a través de dos audiencias distintas: un consumidor que necesita sentir que el precio no le está siendo ocultado, y un ejecutivo de ventas que necesita que la herramienta se sienta seria, no un juguete. La dirección estética evita dos extremos: el "fintech genérico" (azul Tailwind + gradiente morado, que ya define el 80% de las apps con IA) y el "corporativo frío" de una isapre tradicional (grises, PDF escaneado). En su lugar: un azul profundo y editorial que evoca solidez bancaria, calentado con un dorado apagado que evoca "valor" sin caer en cliché de lujo, sobre un fondo color papel — no blanco puro — que hace que los números (precios, UF, porcentajes) se sientan impresos, no generados.

**Key Characteristics:**
- Azul profundo dominante, no el azul-500 de Tailwind — un azul casi-marino, editorial
- Un solo acento dorado apagado, usado con disciplina (nunca decorativo, siempre semántico: "esto es lo recomendado", "esto es tu ahorro")
- Fondo color papel cálido, nunca blanco puro — da a los precios una sensación de documento serio, no de pantalla genérica
- Tipografía con carácter propio: un display serif cálido para títulos, un sans humanista para datos y cuerpo
- El movimiento tiene un propósito narrativo único: los precios "cuentan" al cambiar, como un contador físico — es la firma visual del producto (el cotizador se siente vivo, no estático)

---

## 2. Color Palette & Roles

### Primary Foundation
- **Azul Cotización** (#0F3D68) — Color dominante. Headers, navegación activa, CTAs primarios. Evoca la solidez del azul ya usado en el branding actual de nuevaisapre.cl, pero más profundo y menos genérico que el `#1565C0` de la referencia visual anterior.
- **Azul Noche** (#0A2A47) — Variante más oscura para fondos de sección (hero del cotizador, header del panel).

### Accent & Interactive
- **Dorado UF** (#C9973B) — Único acento. Se usa para: el badge "Más elegida" de un plan, el CTA de "Comprar créditos", los números de precio en la tarjeta de plan destacada. Nunca decorativo — siempre marca algo que el usuario debe notar.
- **Verde WhatsApp** (#25D366) — Se conserva del sistema visual actual del proyecto para los CTAs de WhatsApp específicamente (reconocimiento de marca externa, no negociable).

### Typography & Text Hierarchy
- **Tinta Azul** (#101B2D) — Texto primario. Un negro tinteado hacia el azul dominante, nunca `#000000` puro.
- **Pizarra Media** (#4A5A6E) — Texto secundario, labels, metadata.
- **Niebla** (#C7D0DA) — Bordes, divisores.

### Functional States
- **Success:** Verde Aprobado (#1F7A52)
- **Error:** Rojo Terracota (#B8452F) — un rojo cálido, no el rojo de alarma genérico
- **Warning:** Ámbar Aviso (#B8791A) — distinto del Dorado UF para no confundir "acento de marca" con "advertencia"
- **Info:** Azul Cotización al 70% de opacidad sobre el fondo papel

### Fondo
- **Papel Cálido** (#FBF7EF) — Fondo base de todas las superficies nuevas. Un blanco roto con tinte cálido, nunca `#FFFFFF` puro — hace que los precios y tablas se sientan impresos en un documento serio.

> **Regla Forge aplicada:** ningún color puro (#000/#fff). Los neutrales están tinteados hacia el azul dominante (textos) o hacia el papel cálido (fondos).

---

## 3. Typography Rules

**Display Font:** **Fraunces** (variable serif, optical size alto) — un serif contemporáneo con carácter editorial, no un serif de lujo genérico (Playfair) ni un sans genérico. Comunica "esto es un documento financiero serio", no "esto es una app más".

**Body Font:** **Public Sans** — humanista, muy legible en tablas de números y precios (buen soporte de tabular figures), sin ser Inter/Roboto/Arial ni un default de sistema.

**Mono (códigos de plan, RUT):** **IBM Plex Mono** — solo para `plan.codigo` y datos tipo identificador, nunca para precios (los precios siempre van en Public Sans con tabular figures activadas).

### Hierarchy & Weights
- **Display (H1):** Fraunces, 600, `clamp(28px, 4vw, 44px)`, letter-spacing -0.01em
- **Section Headers (H2):** Fraunces, 500, `clamp(22px, 2.5vw, 30px)`
- **Subsection (H3):** Public Sans, 700, 18px
- **Body:** Public Sans, 400, line-height 1.6, 16px
- **Precios (destacados):** Public Sans, 700, `font-variant-numeric: tabular-nums`, tamaño según contexto (32px en tarjeta de plan, 22px en listas)
- **Small/Meta:** Public Sans, 500, 13px, letter-spacing 0.02em
- **CTA Buttons:** Public Sans, 700, letter-spacing 0.01em, 15px

### Spacing Principles
- Line-height generoso en body (1.6) para las descripciones de coberturas, que son texto denso
- Los títulos Fraunces nunca llevan letter-spacing positivo — el serif ya tiene presencia propia
- Los precios siempre con `tabular-nums` para que el "conteo" animado (ver Motion) no salte de ancho

---

## 4. Component Stylings

### Buttons
- **Shape:** Esquinas redondeadas moderadas (10px) — ni pill (demasiado "app de consumo genérica"), ni esquina recta (demasiado frío para una decisión de salud/dinero)
- **Primary CTA:** Fondo Azul Cotización, texto Papel Cálido, padding generoso (14px 24px). Hover: el fondo se aclara 8% y el botón se eleva 1px con sombra suave — nunca un cambio de color completo.
- **Secondary:** Borde 1.5px Azul Cotización, fondo transparente, texto Azul Cotización. Se usa para "Recotizar", "Cancelar".
- **CTA de conversión (Dorado UF):** reservado exclusivamente para "Comprar créditos" y el badge de plan recomendado — es el único lugar donde el dorado se usa como fondo sólido, no solo como acento.

### Cards & Containers
- **Corners:** 16px — más redondeado que los botones, para que las tarjetas de plan se sientan como "fichas", no como paneles de datos
- **Background:** Blanco puro `#FFFFFF` (única excepción a la regla de no-blanco-puro: las tarjetas necesitan contrastar contra el fondo Papel Cálido para sentirse como objetos físicos sobre una mesa)
- **Shadow:** Difusa y suave (`0 8px 24px rgba(15,27,45,0.06)`), nunca dramática — el producto es de confianza, no de espectáculo
- **Hover:** Elevación de 2px + sombra que crece levemente — nunca un cambio de escala (evita el "AI slop" de cards que saltan)
- **Regla anti-slop:** nunca anidar cards dentro de cards. La ficha del lead, por ejemplo, usa secciones separadas por espacio y una línea Niebla, no cards dentro de la card principal.

### Navigation
- **Estilo:** Bottom Nav (definido en `docs/ux-design/information-architecture.md`) — en mobile, barra inferior fija con 5 ítems, ícono + label. En desktop, la misma barra se ancla arriba como top bar, conservando el mismo set de 5 ítems (no se reinterpreta como sidebar).
- **Active state:** El ítem activo se distingue con el ícono en Dorado UF sobre fondo Azul Noche — nunca solo un cambio de color de texto, siempre también el ícono cambia de peso (outline → filled).
- **Mobile:** Fixed bottom, con safe-area padding para notch/home indicator.

### Inputs & Forms
- **Stroke:** Borde 1.5px Niebla, sin relleno de color en estado default
- **Background:** Papel Cálido muy sutil (un tono más claro que el fondo general) — nunca fondo blanco puro en inputs, para diferenciarlos de las cards
- **Focus:** Borde Azul Cotización + halo suave de 3px al 15% de opacidad — sin glow neón
- **Error:** Borde Rojo Terracota + ícono de alerta a la derecha del input + mensaje inline debajo

### Iconos
`@phosphor-icons/react`, estilo `duotone` para navegación (le da calidez sin perder claridad) y `regular` para iconografía funcional dentro de tablas y formularios. Nunca Lucide/Feather como primera opción (regla Forge).

---

## 5. Layout Principles

### Grid & Structure
- **Max width:** 1180px para el cotizador y panel (coincide con el ancho ya usado en el diseño de referencia `mi-cotizacion.html`, por continuidad de marca)
- **Grid:** 12 columnas en desktop; el cotizador rompe el grid intencionalmente en el hero (el formulario flota sobre un fondo Azul Noche con un patrón geométrico sutil, ver Atmósfera)
- **Breakpoints:** Mobile (<768px), Tablet (768–1024px), Desktop (>1024px)

### Whitespace Strategy
- **Base unit:** 4px, escala 4/8/12/16/24/32/48/64
- **Section margins:** generosos en el cotizador público (respirar entre el formulario y los resultados — es un momento de alto interés, no debe sentirse apretado)
- **Edge padding:** 16px mobile, 28px desktop

### Alignment
- Texto **left-aligned** por defecto — nunca centrar bloques de texto largo (regla anti-slop)
- Las tarjetas de plan sí pueden centrar su contenido interno (precio, badge) por ser fichas cortas, no texto corrido
- **Touch targets:** mínimo 44×44px en toda la superficie mobile

---

## 6. Motion & Animation

### Philosophy
El motion tiene un solo trabajo narrativo central: **los precios se sienten vivos**. Cuando Marcela cambia su edad o Rodrigo ajusta un filtro, el número no simplemente cambia — cuenta hacia el nuevo valor, como un odómetro. Es el diferenciador visual más memorable del producto (ver Anti-AI-Slop, sección 7) y refuerza directamente la propuesta de valor: "esto se calcula en vivo, no es un número fijo".

### Timing & Easing
- **Conteo de precios:** 400-600ms, `ease-out-expo` — desacelera como un objeto real, nunca lineal
- **Micro-interacciones (hover, focus):** 150ms, `ease-out`
- **Entrada de tarjetas de plan (primera carga):** stagger de 60ms entre tarjetas, fade-up de 12px, `ease-out-quart`
- **Barras de cobertura (hospitalaria/ambulatoria):** se llenan de 0 al valor real en 500ms, `ease-out-quint`, disparadas cuando la tarjeta entra en viewport

### Rules
- Solo se anima `transform` y `opacity` (nunca `width`/`height`/`padding` directamente — las barras de cobertura usan `transform: scaleX()` con `transform-origin: left`, no `width`)
- Respeta `prefers-reduced-motion`: el conteo de precios se reemplaza por un cambio instantáneo sin transición
- Nunca bounce ni elastic easing — coherente con el tono de "institución financiera seria", no "app juguetona"

---

## 7. Anti-AI-Slop Markers

### Patrones Prohibidos
- [ ] NO Inter/Roboto/Arial como fuente — se usa Fraunces + Public Sans
- [ ] NO azul Tailwind `#3B82F6` ni gradiente morado-a-azul
- [ ] NO cards idénticas con ícono redondeado + heading + texto repetidas (las 3 tarjetas de plan tienen jerarquía visual distinta: la Recomendada se destaca con el Dorado UF, las otras dos son visualmente secundarias)
- [ ] NO glassmorphism ni glow borders
- [ ] NO modal como default — el desglose de cálculo es modal solo porque es genuinamente contenido secundario que no debe competir con las 3 tarjetas; el LeadGate también es modal por la misma razón (interrumpe deliberadamente en el momento de alto interés)
- [ ] NO sparklines decorativos — los gráficos de métricas en `/admin` muestran datos reales, completos, nunca mini-charts sin ejes

### El Test
Si alguien viera el cotizador y dijera "esto lo hizo una IA", el problema sería el azul genérico o el Inter por defecto — ninguno de los dos está presente aquí. El objetivo es que alguien pregunte "¿por qué los precios se ven como si estuvieran contando?", no "¿qué plantilla es esta?".

### Diferenciador Visual
El **conteo animado de precios** (sección 6) es el detalle que un usuario va a recordar — ningún competidor (incluido tu7.cl, que recalcula sin transición visible) lo tiene. Es barato de implementar (una librería de count-up o una animación CSS con `@property`) y comunica directamente la propuesta de valor central: transparencia y cálculo en vivo.

---

## 8. Design System Notes for Generation

### Lenguaje Descriptivo
- **Atmósfera:** "Un documento financiero cálido, no una app fría — como si los precios estuvieran impresos en papel de buena calidad, pero se recalcularan solos frente a tus ojos."
- **Buttons:** "Botones sólidos en azul marino profundo, esquinas suavemente redondeadas, que se elevan levemente al pasar el mouse — nunca cambian de color por completo."
- **Shadows:** "Sombras difusas y discretas, como luz de oficina, nunca dramáticas ni de neón."
- **Spacing:** "Generoso alrededor de los resultados del cotizador — el usuario necesita sentir que tiene espacio para comparar con calma, no que está siendo apurado a decidir."

### Color References
- Primary CTA: "Azul Cotización (#0F3D68)"
- Accent CTA (compra/recomendado): "Dorado UF (#C9973B)"
- Background: "Papel Cálido (#FBF7EF)"
- Text: "Tinta Azul (#101B2D)"

### Component Prompts
- "Una tarjeta de plan de isapre con esquinas de 16px, fondo blanco puro sobre un fondo papel cálido, con el precio en Public Sans bold con números tabulares que cuentan al cambiar, una barra de cobertura que se llena con `scaleX`, y — solo en la tarjeta recomendada — un badge dorado 'Más elegida' en la esquina superior."
- "Una barra de navegación inferior fija de 5 ítems con iconos Phosphor duotone, el ítem activo en dorado sobre fondo azul noche, que se reubica como barra superior en desktop sin cambiar de estructura."
- "Un formulario de cotización de una columna en mobile, con inputs de fondo papel muy sutil y foco en azul cotización con halo suave — nunca inputs con fondo blanco puro."
