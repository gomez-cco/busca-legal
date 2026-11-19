# Cómo alimentar a BUSCALEGAL con más información

BUSCALEGAL responde solo con lo que está escrito en `data/`. Para que sepa más, se agregan
**conceptos** (glosario) o **temas** (fichas de trámites). Todo se puede hacer desde el
navegador en GitHub, sin instalar nada: al guardar, Render vuelve a publicar la app sola
en 2 o 3 minutos.

## 1. Saber qué le falta

En **Render → tu servicio → Logs** busca estas etiquetas:

- `[SIN_RESPUESTA]`: preguntas que no supo responder.
- `[FEEDBACK_NO_UTIL]`: respuestas que un usuario marcó con 👎 (incluye qué temas se mostraron).
- `[FEEDBACK_UTIL]`: respuestas marcadas con 👍.

Copia esas preguntas: son tu lista de pendientes.

## 2. Agregar un concepto al glosario (preguntas "¿qué es…?")

1. En GitHub abre `data/glosario.json` y haz clic en el lápiz ✏️ (Edit).
2. Copia este bloque y pégalo antes del último `]`, poniendo una coma después del `}` anterior:

```json
{
  "termino": "Nombre del concepto",
  "alias": ["como lo escribiria la gente", "otra forma de decirlo", "sinonimo"],
  "area": "Familia / Laboral / Penal / Civil / ...",
  "definicion": "Explicación en lenguaje simple, 2 a 4 frases.",
  "base": "Art. X del Código / Ley que lo regula",
  "tema": "id-de-la-ficha-relacionada"
}
```

- `alias`: en minúsculas y **sin tildes** (el buscador ignora tildes y ya reconoce plurales y errores de tipeo leves).
- `tema`: el `id` de una ficha existente en `data/areas/*.json` (por ejemplo, `herencia-sucesion`), o `null` si no hay ninguna.

3. Abajo, en "Commit changes", haz clic en **Commit changes**.

## 3. Agregar una ficha de trámite (preguntas "¿qué hago si…?")

Abre el archivo del área en `data/areas/` (laboral, tributario, penal, comercial,
administrativo, familia o civil) y agrega dentro de `"temas": [ ... ]`:

```json
{
  "id": "identificador-unico-sin-espacios",
  "titulo": "Título visible de la ficha",
  "temas": ["frases que escribiria un usuario", "me paso tal cosa", "como hago tal tramite"],
  "resumen": "Respuesta corta en 1 o 2 frases.",
  "explicacion": "Explicación más completa en lenguaje simple.",
  "baseLegal": ["Art. X Ley Y"],
  "pasos": ["Paso 1", "Paso 2", "Paso 3"],
  "plazos": ["Plazo importante"],
  "documentos": ["Documento útil"],
  "dondeAcudir": ["Institución"],
  "consejo": "Un consejo práctico.",
  "alerta": "Un riesgo o error frecuente."
}
```

Lo que más pesa en la búsqueda son las frases de `"temas"`: escribe ahí cómo lo preguntaría
una persona común ("me quieren embargar", "no me pagan la pensión").

## 4. Si algo se rompe

Si te equivocas con una coma o comilla, el JSON queda inválido y Render mostrará el error en
el despliegue (la versión anterior sigue funcionando). Para revisar antes, pega el contenido
en un validador como jsonlint.com, o pídele a Claude que agregue los conceptos por ti con la
lista de preguntas de los Logs.

## 5. Antes de publicar contenido nuevo

Verifica cada dato contra la fuente oficial (bcn.cl/leychile, dt.gob.cl, sii.cl, pjud.cl) e
idealmente con un abogado.
