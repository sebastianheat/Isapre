# Persona: Marcela

**Segment:** Prospectos / Consumidores finales (los leads)
**Primary:** No (secundaria, pero es el origen de todo el inventario que se vende)
**Story map activities:** Cotizar en `/cotizador`, comparar planes, pedir contacto, recibir seguimiento por WhatsApp

## Background
Marcela tiene 41 años, trabaja de forma dependiente y vio un anuncio de Google mientras buscaba "cotizar isapre" porque siente que paga de más en su plan actual. Quiere saber si le conviene cambiarse antes de comprometerse a hablar con nadie.

## Goals
- Ver 3 planes comparados con precio real en pesos, en segundos, sin compromiso.
- Entender por qué un plan cuesta lo que cuesta, no solo ver un número.
- Poder recuperar su cotización después si lo piensa unos días, sin rehacerla.

## Frustrations
- No sabe el precio real hasta hablar con un ejecutivo — la mayoría de los sitios solo prometen "un asesor te contacta".
- Le piden RUT o datos sensibles solo para darle un precio referencial.
- Desconfía de que el ejecutivo le recomiende el plan que más comisión le deja a él, no el que más le conviene a ella.

## Current Behavior
- Busca en Google, entra a dos o tres sitios de isapres o comparadores.
- Abandona formularios que piden demasiados datos antes de mostrar algo de valor.

## Technical Comfort
- **Device:** Casi siempre celular — llega desde un anuncio de Google Ads mientras hace otra cosa.
- **Comfort level:** Medio-bajo para formularios largos, pero cómoda navegando cualquier sitio simple.
- **Expectations:** Espera resultados inmediatos, como cuando compara vuelos o seguros de auto online.

## Quotes
- "Solo quiero saber cuánto me costaría antes de que alguien me llame."
- "No voy a dar mi RUT solo para ver un precio."

## Design Implications
- El cotizador público debe pedir el mínimo de datos posibles (edad, renta, cargas) antes de mostrar precio — nada de RUT hasta que ella decida avanzar.
- Mobile-first, con resultados en la misma pantalla, sin loading largo ni "te contactaremos pronto" como única respuesta.
- El "pedir contacto" (LeadGate) debe aparecer recién en el momento de alto interés (enviar propuesta, descargar PDF), nunca antes de mostrar los planes.
