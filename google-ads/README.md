# Google Ads — Campaña Nueva Isapre

Archivos para configurar la campaña de Google Ads basada en el análisis de la
competencia chilena (cambiarisapre.cl, cotizarisapreonline.cl, tuplan360.cl,
elige-tuplan.cl, etc.) — diferenciándonos por especificidad ("las 7 isapres",
"1.782 planes", "% real por clínica") y compromiso ("sin alza 2025-2026").

## Cómo usar cada archivo

### `keywords-hot-buyer.csv`

Las **20 keywords de alto intent** (cliente buscando contratar/cambiar isapre,
NO sólo investigando). CPC esperado $800-2.000 CLP, conversión 5-12%.

**Cómo importar**:
1. Google Ads → Campaña → Grupo de anuncios → **Palabras clave**
2. Botón **+ Palabras clave** → pegá el contenido del CSV (sin la columna
   "Tipo de concordancia" — el formato `[exact]`, `"frase"` ya define el tipo)
3. Alternativamente, abrí en Google Ads Editor → **Make multiple changes** →
   **Update palabras clave** → pegá el CSV completo.

### `negative-keywords.txt`

Lista de **negative keywords críticas** para evitar gasto en clicks irrelevantes
(gente buscando Fonasa, reclamos, empleos en isapre, etc.).

**Cómo importar**:
1. Google Ads → **Herramientas** → **Listas compartidas** → **Listas de
   palabras clave negativas** → **+ Crear lista** → nombre "ISAPRE NEGATIVES"
2. Pegá el contenido completo de `negative-keywords.txt`
3. **Aplicar** a todas las campañas del proyecto isapre
4. Ahorra típicamente 30-50% del gasto.

### `ad-copy.md`

**3 variantes de Responsive Search Ad** (A, B, C) listas para pegar. Cada una
con headlines, descriptions, paths.

**Plus**: sitelinks (4), callouts (6), structured snippets (2 categorías).

**Cómo importar**:
1. Google Ads → Grupo de anuncios → **+ Anuncio nuevo** → **Anuncio de
   búsqueda responsive**
2. Pegá Headline 1, 2, 3... en orden (Google Ads acepta hasta 15 headlines y
   4 descriptions por ad).
3. URL final: `https://nuevaisapre.cl/?utm_source=googleads&utm_medium=cpc&utm_campaign=<nombre>&utm_content=variant_A`
   (cambia variant_A/B/C según corresponda)
4. **Sitelinks**: Activos → + Sitelink → pegá los 4 títulos + descripciones
5. **Callouts**: Activos → + Callout → pegá los 6
6. **Structured snippets**: Activos → + Snippet estructurado

## Estructura de campaña recomendada

```
Campaña: "Search — Hot Buyer"
  Bidding: Maximize Conversions (primeras 2 semanas), luego Target CPA ~$8.000 CLP
  Budget: $15.000-25.000 CLP/día para arrancar
  Negative keywords list: aplicada
  Ad groups:
    1. "Cotizar / Comparar"
       Keywords: cotizar isapre, comparar isapres, cotizar plan isapre
       3 ads: variants A, B, C
    2. "Cambiar / Contratar"
       Keywords: cambiar isapre, cambiarme de isapre, contratar isapre
       3 ads: variants A, B, C
    3. "Branded NMV" (defensivo)
       Keywords: nueva masvida, isapre nueva masvida
       1 ad: variant A
```

## Métricas objetivo (primeras 2 semanas)

- **CTR**: >5% en hot buyer keywords
- **Conversion rate**: 5-10% (forms + chat leads)
- **CPA**: <$10.000 CLP por lead capturado
- **Quality Score**: 7+/10 (ads relevantes + landing alineada)

A las 2 semanas comparar contra estos benchmarks y rotar/pausar ads que estén
debajo. La variante B (urgencia + bolsillo) suele ganar a esta categoría.
