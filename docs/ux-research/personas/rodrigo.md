# Persona: Rodrigo

**Segment:** Ejecutivos de Isapre (compradores de créditos) — perfil externo
**Primary:** Sí
**Story map activities:** Registrarse, comprar créditos, recibir lead asignado, cotizar, contactar y cerrar venta, usar Romina

## Background
Rodrigo tiene 34 años y es corredor de seguros de salud freelance en Santiago. Trabaja con varias isapres a la vez, gestiona su propia cartera de clientes y compra leads sueltos cuando el flujo de referidos baja. Hoy paga $19.990/mes a tu7.cl solo para poder cotizar rápido durante una llamada.

## Goals
- Recibir leads exclusivos, ya cotizados y calificados, listos para cerrar.
- Pagar solo por lo que efectivamente recibe, sin compromiso mensual fijo.
- Cotizar en segundos durante una llamada sin depender de una suscripción.
- Ver su propia tasa de cierre para saber si está mejorando.

## Frustrations
- Paga $19.990-$21.990/mes a tu7.cl y algunas semanas no le llega ni un lead nuevo — la suscripción no garantiza nada.
- Los leads sueltos que compra a otros proveedores cuestan ~$11.000 y a veces son datos falsos o duplicados.
- Cuando no tiene el cotizador a mano, cotiza a ojo o con una calculadora, y eso le resta credibilidad frente al cliente.
- Ha perdido ventas porque otro ejecutivo contactó primero al mismo lead comprado a un proveedor que revende.

## Current Behavior
- Abre tu7.cl en el celular durante o justo después de una llamada para cotizar en vivo.
- Compra leads sueltos por WhatsApp a un par de proveedores informales cuando tiene presupuesto.
- Hace seguimiento manual de sus clientes en WhatsApp, sin ningún CRM.

## Technical Comfort
- **Device:** Mixto — celular en terreno/entre llamadas, laptop en la oficina o en casa por la tarde.
- **Comfort level:** Medio — usa WhatsApp Business, Excel básico y apps de isapres, pero no es un power user de software.
- **Expectations:** Espera que las cosas funcionen "como una calculadora" — sin loading, sin pasos de más, con un botón directo para enviar por WhatsApp.

## Quotes
- "Pago $20.000 al mes a tu7.cl y a veces no me cae ni un lead nuevo en toda la semana."
- "Si pudiera elegir, preferiría pagar solo cuando de verdad recibo algo."
- "Necesito cotizar mientras tengo al cliente todavía en la línea, no después."

## Design Implications
- Mobile-first en todo `/panel` — Rodrigo casi nunca está frente a un escritorio cuando más lo necesita.
- Notificación de lead asignado debe ser imposible de pasar por alto (email + WhatsApp), porque la ventana de alta intención dura minutos.
- El checkout de créditos debe sentirse como una compra de e-commerce (2-3 clics), no como un formulario B2B con aprobación lenta.
- El cotizador debe recalcular al instante sin llamadas al servidor — cualquier spinner rompe la sensación de "calculadora en vivo" que Rodrigo espera de tu7.cl.
