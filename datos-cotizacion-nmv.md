# Datos de cotización NMV — referencia canónica

> **Fuente única de verdad para precios y factores.** Estos valores son los
> que usa la app (`lib/cotizador.ts`) y están validados contra los casos de
> prueba reales. Reemplazan la tabla de la sección 5 de
> `base-conocimientos-agente-isapre.md`, que tenía una columna "Factor" que NO
> calza con la fórmula real. Si algún día cambian los factores o el catálogo,
> editar `lib/cotizador.ts` **y** este archivo a la vez.

---

## Fórmula

```
Total Factores = Factor del cotizante + Σ (Factor de cada carga)
Precio en UF   = (UF Base del plan × Total Factores) + 0.854   ← el 0.854 es el GES
Precio en $    = Precio en UF × Valor UF del día
Cotización 7%  = Renta bruta mensual × 0.07
Excedente      = Precio en $ − Cotización 7%
```

El **valor UF** se obtiene en vivo desde `mindicador.cl`. Si la API falla, la app
usa un valor de respaldo de **$40.093,59** (actualizar el respaldo cada cierto
tiempo en `lib/cotizador.ts`).

---

## Tabla de factores por edad

| Tramo de edad | Factor cotizante | Factor carga |
|---|---|---|
| 0 – 1 año   | 0.0 | 0.0 |
| 2 – 19      | 0.6 | 0.6 |
| 20 – 24     | 0.9 | 0.7 |
| 25 – 34     | 1.0 | 0.7 |
| 35 – 44     | 1.3 | 0.9 |
| 45 – 54     | 1.4 | 1.0 |
| 55 – 64     | 2.0 | 1.4 |
| 65 o más    | 2.4 | 2.2 |

El **cotizante** usa la columna "Factor cotizante"; cada **carga** usa la columna
"Factor carga" según su propia edad.

---

## Catálogo Pleno Salud — UF base

| Código | UF base | | Código | UF base |
|---|---|---|---|---|
| PS251000 | 1.916 | | PS251007 | 2.231 |
| PS251001 | 1.979 | | PS251008 | 2.303 |
| PS251002 | 2.015 | | PS251009 | 2.375 |
| PS251003 | 2.060 | | PS251010 | 2.447 |
| PS251004 | 2.087 | | PS251011 | 2.519 |
| PS251005 | 2.123 | | PS251012 | 2.591 |
| PS251006 | 2.159 | | | |

---

## Las 3 opciones que presenta el bot

| Etiqueta | Plan | Posición |
|---|---|---|
| Económica   | PS251002 | menor precio |
| Recomendada | PS251005 | intermedia (la destacada) |
| Premium     | PS251010 | mayor precio |

---

## Ejemplo validado (paso a paso)

**Caso:** cotizante de 32 años, renta $1.200.000, sin cargas. UF = $40.093,59.

- Total Factores = 1.0 (cotizante 25-34) + 0 = **1.0**
- Cotización 7% = 1.200.000 × 0.07 = **$84.000**

| Plan | Cálculo UF | Precio $ | Excedente (precio − 7%) |
|---|---|---|---|
| PS251002 | (2.015 × 1.0) + 0.854 = 2.869 UF | **$115.029** | $31.029 |
| PS251005 | (2.123 × 1.0) + 0.854 = 2.977 UF | **$119.359** | $35.359 |
| PS251010 | (2.447 × 1.0) + 0.854 = 3.301 UF | **$132.349** | $48.349 |

Estos tres montos coinciden exactamente con los casos de prueba validados.

---

## Importante sobre coberturas

El **% exacto de cobertura por clínica** NO está en estos datos y **no se debe
inventar**. El bot presenta precio, cotización 7% y excedente; el detalle fino de
coberturas y clínicas lo confirma la ejecutiva (Cynthia) al cierre.
