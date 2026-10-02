# DECISIONES — Fase 1 marketplace-leads (agente Equilibrado)

Mejoras y adaptaciones al plan aplicadas con criterio propio. Cada una indica qué, por qué y dónde.

## Sub-fase 1.1 — Reparto

1. **`kvMarcarUnaVez` ahora es realmente atómico** (`lib/store.ts`). Era `GET` + `SET`: dos requests
   simultáneos podían ver la clave libre. En Upstash usa `SET key 1 EX ttl NX` (una sola operación).
   Misma firma y mismo resultado para los otros usuarios (dedupe de webhooks de WhatsApp y Meta).
   El plan lo daba por atómico; no lo era.
2. **Primitivas nuevas en KV: `kvIncrBy`, `kvLPush`, `kvLRange`** (`lib/store.ts`). Un saldo con
   leer-modificar-escribir pierde actualizaciones cuando dos asignaciones corren a la vez; INCRBY no.
   A diferencia del resto del módulo, estas **no** caen a memoria si Upstash falla: un saldo en memoria
   por instancia divergiría del real en silencio. Prefiero que falle a la vista.
3. **`asignarLead`/`reasignarLead` viven en `lib/reparto.ts`, no en `lib/leads.ts`.** `leads.ts`
   quedó en 499 líneas (límite del proyecto: 500). En `leads.ts` quedaron el tipo, `estadoAsignacion()`
   y `listarLeadsSinAsignar()`.
4. **`lib/credits-kv.ts` se creó en 1.1, no en 1.2**: asignar descuenta crédito, así que 1.1 no puede
   funcionar sin él. 1.2 agrega las pantallas, la API y los tests de regalo.
5. **La cola sin asignar se deriva de `listarLeads()`, sin índice `leads:sin-asignar`.** Los leads
   anteriores a la Fase 1 no tienen el campo; mantener un índice exigiría backfill y puede divergir del
   lead. Con TTL de 60 días y ~3 leads/día son pocos cientos de registros. El índice tiene sentido en
   Postgres (Fase 2). Se considera "sin asignar" a un lead sin `assignmentStatus` y sin `asignadoA`.
6. **Leads `ganado`/`perdido` no entran a la cola de reparto.** Los leads viejos sin asignar ya
   cerrados inundarían la cola el primer día.
7. **Campo extra `asignacionCobrada` en el lead.** "¿Asignar igual como regalo?" asigna sin descontar;
   si luego se reasigna, no hay crédito que devolver (devolverlo regalaría un crédito de la nada). Sin
   este campo la reasignación no puede distinguir los dos casos. Las asignaciones legacy (anteriores a
   la fase) tampoco devuelven crédito: nunca se cobraron.
8. **El ledger no guarda datos personales:** el movimiento lleva `leadId`, no el nombre del prospecto.
   Motivos fijos ("Asignación de lead", "corrección de asignación").
9. **`PATCH /api/admin/leads/[id]` ya no acepta `asignadoA`** (responde 400/403). Ese era el selector
   libre de la ficha: asignaba sin créditos, sin lock y sin actualizar `assignmentStatus`, dejando el
   sistema inconsistente. La ficha ahora asigna/reasigna por la API de reparto. Era el único consumidor.
10. **Orden de operaciones de la reasignación:** cobrar al nuevo → guardar lead → devolver al original.
    Así un fallo a mitad de camino nunca deja un crédito devuelto sin reasignación. Si guardar el lead
    falla, se revierte el cobro.
11. **Confirmación de reasignar inline** (no modal): mismo flujo y texto ("corrección de asignación"
    prellenado), un componente menos. La ficha permite además "Asignar" a un lead sin asignar para no
    perder lo que el superadmin podía hacer antes con el selector libre.
12. **Nav inferior con 7 ítems para superadmin** (Reparto y Créditos): se compacta el padding en
    pantallas ≤480px para que quepan.
13. **Tests nunca tocan Upstash real:** cada archivo de test borra las env de KV antes de importar el store.

## Sub-fase 1.2 — Créditos mínimos

14. **Validación del regalo en dos capas:** el formulario valida motivo/cantidad en el cliente (mensajes
    de la spec) y la API + `regalarCreditos()` lo vuelven a validar. El motivo solo-espacios cuenta como vacío.
15. **El saldo del historial se recalcula sumando los movimientos** (US-010: "recalculable desde el
    historial"). Si el contador guardado diverge, la pantalla lo avisa en vez de ocultarlo.
16. **Cada movimiento de asignación enlaza a su lead** (`ver lead`) y el historial muestra el nombre de
    quien lo hizo, para poder auditar el día en menos de un minuto.
17. **CTA "Regalar créditos" del estado vacío** lleva a `/admin/creditos?ejecutivo=…` con el ejecutivo
    preseleccionado. Los saldos listan a todos los usuarios (Cynthia es superadmin y ejecutiva a la vez).
18. **Rutas de créditos solo para superadmin** (el ejecutivo ve su saldo en `/panel`, Fase posterior).

## Sub-fase 1.3 — Interruptor "Recibir leads"

19. **`recibiendoLeads` ausente = prendido** (`recibeLeads()` en `lib/usuarios.ts`). Los usuarios
    existentes no tienen el campo; tratarlo como apagado dejaría el selector vacío el primer día.
20. **El interruptor también se aplica en el servidor**, no solo en el selector: `asignarLead` y
    `reasignarLead` rechazan (`no_recibe_leads`) a un ejecutivo en pausa aunque la petición llegue
    por API con un email válido.
21. **Interruptor en dos lugares:** `/admin/usuarios` (el superadmin lo cambia a cualquiera, estado
    visible en la lista) y `/admin/perfil` (cada uno el suyo, como pide US-007: "interruptor en el
    perfil"). `PATCH /api/admin/usuarios/[email]` deja a un ejecutivo tocar solo su propio estado.
22. **Regresión de "calidad":** la lógica de calidad (`cambiarCalidad` en `LeadPipeline`, validación en
    el `PATCH` del lead) no se modificó; el diff solo cambia el bloque de asignación y un comentario.
    Verificado también en el navegador en 1.4.
