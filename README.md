# BUSCALEGAL — by JJ

Asistente legal local (sin costo, sin API externa) que responde consultas en lenguaje natural
sobre **legislación chilena** en siete áreas: Derecho Laboral, Tributario, Penal (y Procesal
Penal), Comercial, Administrativo, Familia y Civil (deudas, embargos y arriendos). Para cada caso entrega: qué dice la ley, base legal
(artículos), plazos, pasos a seguir, documentos útiles, dónde acudir, un consejo y una alerta.

Sigue la misma arquitectura que ALLEXCEL: Node.js sin dependencias, motor de búsqueda por
reglas y sinónimos, base de conocimiento en JSON y frontend responsive servido por el mismo
backend. Lista para desplegar en Render.

> ⚠️ Es orientación general. No reemplaza la asesoría de un abogado que revise el caso
> concreto. Las normas cambian: verifica la vigencia en [bcn.cl/leychile](https://www.bcn.cl/leychile).

## Qué incluye

- **78 temas** en 7 áreas (`data/areas/*.json`), por ejemplo:
  - **Laboral:** contrato, honorarios vs. contrato, jornada 40 horas, horas extra, feriado,
    remuneraciones, causales de despido, indemnización, Ley Bustos, finiquito, autodespido,
    Ley Karin, tutela laboral, fuero maternal, accidentes del trabajo, teletrabajo, juicio laboral.
  - **Tributario:** inicio de actividades, IVA/F29, Renta/F22, boletas de honorarios,
    citaciones y liquidaciones del SII, reclamación ante el TTA, deudas y convenios TGR,
    prescripción, infracciones y delitos tributarios, término de giro, contribuciones, herencias.
  - **Penal:** detención y derechos, denuncia y querella, formalización y cautelares,
    salidas alternativas, juicio oral/abreviado/simplificado, prescripción, penas sustitutivas,
    legítima defensa, delitos contra la propiedad, VIF, manejo en estado de ebriedad,
    responsabilidad penal de empresas (Ley 20.393 / 21.595).
  - **Comercial:** constitución de SpA/EIRL/Limitada, conflictos entre socios, cobro de
    facturas, pagarés y cheques, insolvencia (Ley 20.720), consumidor (Ley 19.496), contratos,
    marcas (INAPI), libre competencia.
  - **Administrativo:** reposición y jerárquico (Ley 19.880), silencio administrativo, recurso
    de protección, transparencia, sumarios, compras públicas, responsabilidad del Estado,
    reclamos municipales, Contraloría.
  - **Familia:** pensión de alimentos, deudas de alimentos y Registro de Deudores, aumento o
    rebaja, divorcio y compensación económica, cuidado personal, relación directa y regular,
    salida del país de menores, filiación, régimen de bienes y bien familiar, AUC, herencias,
    adopción, VIF ante Tribunales de Familia.
  - **Civil:** juicio ejecutivo y embargo, bienes inembargables, remate por hipoteca,
    prescripción de deudas, cobranza abusiva y DICOM, arriendos y Ley "Devuélveme mi casa".
- **Glosario jurídico** (`data/glosario.json`, 91 conceptos): responde preguntas del tipo
  "¿qué es / qué significa…?" (beneficio de inventario, posesión efectiva, tercería, UF,
  formalización, silencio administrativo, etc.) y enlaza con la ficha del trámite.
- **Calculadora de indemnización por despido** (arts. 162, 163, 168 y 172 CT): años de
  servicio, aviso previo, topes de 90 UF y 11 años, feriado proporcional y pendiente, y
  escenarios de recargo judicial.
- **Avisos de urgencia** (detención, violencia, riesgo vital) con números de ayuda.
- Derivación cuando la consulta es de un tema aún no cargado (por ejemplo, servidumbres o regularización de propiedades).
- Accesibilidad: tamaño de letra A−/A+ persistente, tema claro/oscuro, diseño móvil.

## Cómo ejecutarlo

```bash
node server.js
```

Abre [http://localhost:3000](http://localhost:3000). Pruebas:

```bash
npm test
```

## Desplegar en Render

1. Sube este repositorio a GitHub.
2. En [render.com](https://render.com) → **New → Blueprint** y elige el repositorio
   (Render lee `render.yaml`). También puedes usar **New → Web Service** con
   `Build: npm install` y `Start: node server.js`.
3. El plan gratuito "duerme" el servicio tras inactividad; el frontend lo despierta al cargar.

## Estructura

- `server.js`: servidor HTTP y rutas de la API
- `lib/engine.js`: búsqueda por frases clave, raíces de palabras y pistas de área; arma la respuesta
- `lib/calc.js`: calculadora de indemnizaciones
- `data/areas/*.json`: base de conocimiento (un archivo por área)
- `data/glosario.json`: conceptos jurídicos `{ termino, alias, area, definicion, base, tema }`
- `public/`: interfaz (HTML/CSS/JS sin build ni frameworks)
- `test/run.js`: pruebas de ruteo de consultas y de la calculadora

## Endpoints

- `POST /api/ask` — `{ "message": "texto" }` → respuesta estructurada con fichas
- `GET /api/areas` — áreas y temas para el panel lateral
- `POST /api/calc/indemnizacion` — `{ fechaInicio, fechaTermino, remuneracion, valorUF, causal, avisoDado, feriadoPendienteDias }`
- `GET /api/health`

## Cómo agregar o corregir contenido

Edita el JSON del área en `data/areas/`. Cada tema tiene:

```json
{
  "id": "identificador-unico",
  "titulo": "Título visible",
  "temas": ["frases", "que", "escribiría", "un usuario"],
  "resumen": "Respuesta corta",
  "explicacion": "Explicación en lenguaje simple",
  "baseLegal": ["Art. X Ley Y"],
  "pasos": ["Paso 1", "Paso 2"],
  "plazos": ["Plazo"],
  "documentos": ["Documento"],
  "dondeAcudir": ["Institución"],
  "consejo": "…",
  "alerta": "…"
}
```

Las frases de `temas` son lo que más pesa en la búsqueda: si una consulta real no encuentra
el tema correcto, agrega esa forma de decirlo ahí y súmala a `test/run.js`.

Para agregar un área nueva (por ejemplo, Derecho del Consumidor ampliado o Inmobiliario), crea `data/areas/<id>.json`
con la misma estructura y añade su id a `AREA_ORDER` en `lib/engine.js`.

## Próximos pasos posibles

- El motor es local y por reglas: cubre bien consultas frecuentes en español, pero no entiende
  lenguaje totalmente libre como una IA. Si más adelante se quiere eso, basta cambiar
  `composeAnswer(query)` en `lib/engine.js` para que consulte un modelo usando estas fichas
  como contexto (manteniendo el mismo contrato de respuesta).
- Modelos de escritos descargables (cartas de despido, recursos, solicitudes).
