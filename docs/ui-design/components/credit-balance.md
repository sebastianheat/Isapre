# Component: CreditBalance

**Usado en:** `/panel` (Inicio), `/panel/creditos`, `/admin/creditos`, `/admin/usuarios`
**Regla de origen:** Component Selection — aparece en más de una pantalla → componente nuevo con spec propio.

## Propósito
Mostrar el saldo de créditos de un ejecutivo de forma consistente, con la alerta de saldo bajo integrada — refuerza el modelo mental de "caja chica" de Cynthia y la necesidad de Rodrigo de saber cuándo recargar.

## Variantes

| Contexto | Tamaño | Incluye alerta de saldo bajo |
|---|---|---|
| `/panel` Inicio (propio saldo) | Grande | Sí — visible si `creditos_saldo <= 3` |
| `/panel/creditos` (propio saldo) | Grande | Sí |
| `/admin/creditos` / `/admin/usuarios` (saldo de otro ejecutivo) | Compacto, en tabla | No — la alerta es responsabilidad del ejecutivo, no del superadmin |

## Comportamiento
- El número mostrado siempre proviene del saldo cacheado (`usuario.creditos_saldo`), que a su vez es recalculable desde el ledger (`credit_transactions`) — nunca se calcula en el cliente.
- La alerta de saldo bajo usa color de advertencia (no error) — no bloquea ninguna acción, solo informa.
- Al hacer clic sobre el componente (en `/panel`), navega a `/panel/creditos`. En `/admin`, no es clickeable — el saldo es de solo lectura ahí (las acciones de crédito viven en botones separados).

## Acceptance Targets
- [ ] Debe mostrar el número de créditos actual, nunca un valor cacheado obsoleto tras una compra o consumo reciente
- [ ] La alerta de saldo bajo debe aparecer solo cuando `creditos_saldo <= 3`, en la variante grande
- [ ] En `/admin`, el componente no debe ser interactivo (solo lectura)
