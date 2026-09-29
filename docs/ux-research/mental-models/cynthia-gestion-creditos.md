# Mental Model: Cynthia — Gestión de créditos y reparto manual

**Persona:** [docs/ux-research/personas/cynthia.md](../personas/cynthia.md)
**Domain:** Regalar créditos y asignar leads a mano

## Current Mental Model
Cynthia piensa en los créditos como una **caja chica**: ella "entrega" créditos desde un fondo a cada ejecutivo, y necesita poder cuadrar cuánto ha entregado, a quién y por qué — igual que llevar el control de una caja chica de oficina, no como un simple contador que sube y baja sin rastro.

## Source
- **Herramienta existente:** ninguna formal hoy — usa criterio manual y memoria, lo cual ya le genera ansiedad ("después no me acuerdo").
- **Analogía física:** una chequera o libro de caja chica — cada movimiento tiene fecha, monto, motivo y a quién.
- **Patrón de software común:** un extracto bancario o historial de transacciones (fecha, movimiento, saldo resultante).

## Key Expectations
- Espera que cada crédito regalado quede con un motivo escrito y visible después, no solo un número que cambió.
- Espera ver el saldo de cada ejecutivo sin tener que sumar manualmente movimientos pasados.
- Espera que asignar un lead a mano sea tan rápido como "elegir un destinatario de una lista", no un formulario largo.

## Design Constraints
- La UI de "regalar créditos" debe tener el campo motivo como obligatorio, no opcional, y mostrar el historial (ledger) inmediatamente después de la acción — refuerza el modelo de "caja chica con respaldo".
- La vista de ejecutivos debe mostrar el saldo actual ya calculado (cacheado desde el ledger), no obligar a Cynthia a sumar nada.
- "Leads sin asignar" debe ser una cola con un selector rápido de ejecutivo activo, priorizada como la pantalla más usada en la Fase 0.

## Where the System Model Differs
- El sistema modela el saldo como algo siempre recalculable desde `credit_transactions` (fuente de verdad append-only) — Cynthia no necesita saber esto, solo necesita confiar en que el número que ve es correcto y que existe un historial detrás si algo no cuadra.
- El motor de reparto automático (cuando se active en fases posteriores) tomará decisiones que hoy Cynthia toma a mano — la transición debe mostrarle claramente qué reglas está aplicando el sistema (ponderación por menor carga reciente) para que confíe en que reemplaza bien su criterio manual.
