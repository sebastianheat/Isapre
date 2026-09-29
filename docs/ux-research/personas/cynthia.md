# Persona: Cynthia

**Segment:** Ejecutivos de Isapre — perfil interno, con rol superadmin adicional
**Primary:** No (secundaria, pero crítica para la Fase 0)
**Story map activities:** Aprobar ejecutivos, regalar créditos, asignar leads a mano, configurar el motor de reparto, trabajar sus propios leads

## Background
Cynthia opera la cuenta `info@nuevaisapre.cl` — es a la vez la superadmin del sistema y una ejecutiva activa que trabaja sus propios leads como cualquier otra. Es quien más tiempo pasa dentro del panel a diario y quien primero va a usar el marketplace, ya que la Fase 0 arranca regalándole créditos a ella e Ingrid.

## Goals
- Aprobar rápido a nuevos ejecutivos externos sin fricción, evitando que cualquiera compre datos de personas.
- Regalar créditos con trazabilidad clara (motivo registrado) — sobre todo en la Fase 0, donde todo el reparto es manual.
- Ver de un vistazo el pool de leads sin asignar y poder resolverlo a mano cuando no hay ejecutivos con saldo.
- Que el export de conversiones para Google Ads nunca se rompa, pase lo que pase con el resto del sistema.

## Frustrations
- Hoy la asignación de leads es manual e informal, sin un registro (ledger) de quién recibió qué y por qué.
- No tiene visibilidad de cuánto saldo tiene cada ejecutivo sin revisar caso por caso.
- Cualquier cambio en la base de datos le da miedo si puede afectar el export que alimenta la campaña de Google Ads.

## Current Behavior
- Gestiona todo desde `/admin` hoy: revisa leads uno por uno, los asigna por email a Ingrid o se los queda ella.
- Exporta el CSV de conversiones manualmente cada semana y lo sube a Google Ads.

## Technical Comfort
- **Device:** Principalmente laptop/desktop en horario de oficina, celular para revisar notificaciones fuera de horario.
- **Comfort level:** Alto respecto a Rodrigo — usa el panel admin a diario, cómoda con tablas, filtros y exportar CSV.
- **Expectations:** Espera que cualquier acción administrativa (regalar créditos, asignar a mano) tome 2-3 clics, no un flujo largo — lo hace muchas veces al día.

## Quotes
- "Necesito saber quién tiene saldo antes de decidir a quién le regalo créditos."
- "No puedo perder de vista el export de conversiones, de eso vive la campaña."
- "Si le regalo créditos a alguien tiene que quedar registrado por qué, si no después no me acuerdo."

## Design Implications
- El panel superadmin debe mostrar saldo y estado de cada ejecutivo en una sola vista, sin tener que entrar a cada perfil.
- El flujo de "regalar créditos" debe pedir motivo obligatorio y quedar visible en un historial tipo ledger/chequera — no un simple +N sin rastro.
- La vista de "leads sin asignar" debe permitir asignar a mano en un clic, priorizando esta pantalla en la Fase 0 porque será la más usada durante los primeros días.
