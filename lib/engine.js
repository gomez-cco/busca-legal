'use strict';

const fs = require('fs');
const path = require('path');

const AREAS_DIR = path.join(__dirname, '..', 'data', 'areas');
const AREA_ORDER = ['laboral', 'tributario', 'penal', 'comercial', 'administrativo', 'familia', 'civil'];

const areas = AREA_ORDER
  .map((id) => path.join(AREAS_DIR, `${id}.json`))
  .filter((p) => fs.existsSync(p))
  .map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));

const GLOSSARY_PATH = path.join(__dirname, '..', 'data', 'glosario.json');
const glossary = fs.existsSync(GLOSSARY_PATH) ? JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf8')) : [];

const ASSISTANT_NAME = 'BUSCALEGAL';

const DISCLAIMER = 'Orientación general basada en la legislación chilena. No reemplaza la asesoría de un abogado que revise tu caso concreto; verifica la vigencia de las normas en bcn.cl/leychile.';

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'en', 'con',
  'para', 'por', 'que', 'como', 'se', 'su', 'sus', 'mi', 'mis', 'me', 'te', 'lo', 'le', 'les',
  'al', 'del', 'es', 'son', 'ser', 'esta', 'este', 'estos', 'estas', 'pero', 'si', 'no', 'ya',
  'quiero', 'necesito', 'puedo', 'quisiera', 'hacer', 'tengo', 'tener', 'hola', 'buenas', 'buenos',
  'porfa', 'favor', 'ayuda', 'ayudame', 'dame', 'saber', 'sobre', 'cual', 'cuales', 'cuando',
  'donde', 'debo', 'deben', 'tiene', 'tienen', 'hay', 'muy', 'mas', 'menos', 'tambien', 'solo',
  'estoy', 'esta', 'fue', 'ahora', 'hace', 'dias', 'dia', 'caso', 'consulta', 'pregunta',
  'derecho', 'legal', 'ley', 'abogado', 'chile', 'puede', 'pueden', 'algo', 'eso', 'esto',
  'cosa', 'nos', 'nosotros', 'ellos', 'ella', 'usted', 'ustedes', 'mio', 'mia', 'tu', 'tus',
]);

// Phrases that hint the legal area even when no topic phrase matches literally.
const AREA_HINTS = {
  laboral: ['trabajo', 'trabajador', 'trabajadora', 'empleador', 'jefe', 'patron', 'empresa me', 'sueldo', 'contrato de trabajo', 'inspeccion del trabajo', 'laboral', 'despid', 'finiquit', 'licencia medica', 'afp', 'cotizaciones', 'imposiciones', 'vacaciones', 'horas extra', 'jornada', 'sindicato'],
  tributario: ['sii', 'impuesto', 'impuestos', 'tributari', 'iva', 'renta', 'factura', 'boleta', 'tesoreria', 'tgr', 'contador', 'f29', 'f22', 'giro', 'evasion', 'contribuciones'],
  penal: ['delito', 'carcel', 'fiscal', 'fiscalia', 'carabineros', 'pdi', 'detenid', 'robo', 'hurto', 'estafa', 'denuncia', 'querella', 'penal', 'imputado', 'victima', 'juzgado de garantia', 'condena', 'pena'],
  comercial: ['empresa', 'sociedad', 'socio', 'spa', 'eirl', 'limitada', 'pagare', 'cheque', 'factura impaga', 'cliente', 'proveedor', 'consumidor', 'sernac', 'marca', 'quiebra', 'deudas', 'contrato comercial', 'compra', 'negocio'],
  familia: ['pension', 'alimentos', 'hijo', 'hija', 'hijos', 'divorci', 'matrimonio', 'mi pareja', 'mi esposa', 'mi esposo', 'mi marido', 'mi ex', 'tribunal de familia', 'mediacion', 'herencia', 'hereder', 'testamento', 'tuicion', 'visitas', 'paternidad'],
  civil: ['embarg', 'remat', 'deuda', 'debo', 'me deben', 'cobranza', 'dicom', 'arriendo', 'arrendatario', 'arrendador', 'hipoteca', 'dividendo', 'receptor', 'demanda ejecutiva'],
  administrativo: ['municipalidad', 'municipio', 'patente', 'aseo', 'ornato', 'ordenanza', 'alcalde', 'servicio publico', 'ministerio', 'contraloria', 'funcionario', 'sumario', 'licitacion', 'mercado publico', 'transparencia', 'resolucion', 'estado', 'fisco', 'seremi', 'recurso de proteccion'],
};

const AREA_BROWSE_WORDS = {
  laboral: ['laboral', 'del trabajo', 'trabajo'],
  tributario: ['tributario', 'tributaria', 'impuestos'],
  penal: ['penal', 'procesal penal'],
  comercial: ['comercial', 'mercantil', 'empresas'],
  administrativo: ['administrativo', 'administrativa'],
  familia: ['familia'],
  civil: ['civil', 'deudas', 'embargos', 'arriendos'],
};

// Subjects outside the five loaded areas: answer with a pointer instead of a wrong topic.
const OUT_OF_SCOPE = [
  {
    match: ['servidumbre', 'deslindes', 'cerco con el vecino', 'promesa de compraventa', 'compraventa de casa', 'usucapion', 'prescripcion adquisitiva', 'regularizar un terreno', 'saneamiento de titulo'],
    area: 'Derecho Civil (propiedad y bienes raíces), que aún no tengo cargado en detalle',
    donde: 'Juzgados Civiles, Corporación de Asistencia Judicial, Conservador de Bienes Raíces y, para regularizar propiedades, el Ministerio de Bienes Nacionales (DL 2.695).',
  },
];

const GREETINGS = [
  'Entiendo tu consulta, vamos por partes.',
  'Claro, te explico cómo funciona.',
  'Buena pregunta. Esto es lo que dice la ley y lo que te recomiendo hacer.',
  'Te oriento con esto paso a paso.',
];

const URGENT_PATTERNS = [
  { match: ['detenid', 'detuvieron', 'esta preso', 'en la comisaria'], text: 'Si alguien está detenido ahora: tiene derecho a guardar silencio y a un defensor gratuito de la Defensoría Penal Pública. La audiencia de control de detención debe ocurrir dentro de 24 horas.' },
  { match: ['me pega', 'me golpea', 'me amenaza de muerte', 'violencia', 'tengo miedo', 'me quiere matar'], text: 'Si estás en peligro ahora, llama al 133 (Carabineros) o al 1455 (orientación en violencia contra la mujer). Puedes pedir medidas de protección inmediatas.' },
  { match: ['suicid', 'quitarme la vida', 'no quiero vivir'], text: 'Si estás pensando en hacerte daño, llama ahora a la línea *4141 (prevención del suicidio, MINSAL) o acude al servicio de urgencia más cercano. No estás solo/a.' },
];

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Singular-ish form of a word so plurals match: "beneficios"→"beneficio", "pensiones"→"pension",
// "deudas"→"deuda", "trabajadores"→"trabajador".
function singular(w) {
  if (w.length < 4) return w;
  if (/[nrldz]es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

function canon(text) {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean).map(singular).join(' ');
}

// Edit distance capped at 2 (enough to tolerate one typo).
function editDistance(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
      rowMin = Math.min(rowMin, prev[j]);
    }
    if (rowMin > 1) return 2;
  }
  return prev[b.length];
}

function wordMatches(q, a) {
  if (q === a) return true;
  return a.length >= 6 && editDistance(q, a) <= 1;
}

// True if the alias words appear consecutively in the query words (plural- and typo-tolerant).
function containsSeq(queryWords, aliasWords) {
  if (!aliasWords.length || aliasWords.length > queryWords.length) return false;
  for (let i = 0; i + aliasWords.length <= queryWords.length; i++) {
    let ok = true;
    for (let k = 0; k < aliasWords.length; k++) {
      if (!wordMatches(queryWords[i + k], aliasWords[k])) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function tokenize(query) {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Light Spanish "stemming": compare by prefix so "despidieron" ~ "despido", "renuncie" ~ "renuncia".
function stem(word) {
  if (word.length <= 4) return word;
  if (word.length <= 6) return word.slice(0, 4);
  return word.slice(0, 5);
}

function wordsOf(text) {
  return normalize(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
}

const TOPICS = [];
for (const area of areas) {
  for (const t of area.temas) {
    const phrases = (t.temas || []).map(normalize);
    TOPICS.push({
      ...t,
      areaId: area.id,
      areaTitulo: area.titulo,
      phrasesNorm: phrases,
      phrasesWords: phrases.map((p) => canon(p).split(' ').filter(Boolean)),
      titleWords: wordsOf(t.titulo),
      phraseWords: phrases.flatMap((p) => p.split(' ')),
      bodyWords: wordsOf([t.resumen, t.explicacion, (t.baseLegal || []).join(' ')].join(' ')),
    });
  }
}

const GLOSSARY_INDEX = glossary.map((g) => ({
  ...g,
  aliasNorm: [...new Set([normalize(g.termino.replace(/\(.*?\)/g, '')).trim(), ...(g.alias || []).map(normalize)])].filter(Boolean),
})).map((g) => ({ ...g, aliasWords: g.aliasNorm.map((a) => canon(a).split(' ').filter(Boolean)) }));

function hasPhrase(haystack, phrase) {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`).test(haystack);
}

// Glossary entries whose term or alias appears literally in the query, longest match first.
function findTerms(rawNorm, max = 3) {
  const qWords = canon(rawNorm).split(' ').filter(Boolean);
  const hits = [];
  for (const g of GLOSSARY_INDEX) {
    let best = null;
    g.aliasWords.forEach((words, idx) => {
      if (containsSeq(qWords, words) && (!best || words.join(' ').length > best.length)) {
        best = words.join(' ');
      }
      if (!best && hasPhrase(rawNorm, g.aliasNorm[idx])) best = canon(g.aliasNorm[idx]);
    });
    if (best) hits.push({ g, len: best.length, alias: best });
  }
  hits.sort((a, b) => b.len - a.len);
  // Drop a hit whose matched words are fully contained in a longer hit ("embargo" inside "embargo de bienes").
  const kept = [];
  for (const h of hits) {
    if (!kept.some((k) => k.alias.includes(h.alias) && k.g !== h.g)) kept.push(h);
  }
  return kept.slice(0, max).map((h) => h.g);
}

const DEFINITION_RE = /(^|[^a-z])(que es|que son|que significa|que significan|que quiere decir|definicion|definir|concepto|en que consiste|en que consisten|para que sirve|explicame|diferencia entre)([^a-z]|$)/;

function toDefinitionItem(g) {
  return { type: 'definicion', termino: g.termino, area: g.area, definicion: g.definicion, base: g.base, tema: g.tema };
}

function detectAreas(rawNorm) {
  const hits = new Set();
  for (const [areaId, hints] of Object.entries(AREA_HINTS)) {
    if (hints.some((h) => rawNorm.includes(h))) hits.add(areaId);
  }
  return hits;
}

function countStemHits(words, s) {
  let n = 0;
  for (const w of words) if (w.startsWith(s)) n += 1;
  return n;
}

function scoreTopic(topic, tokens, rawNorm, areaHits, qWords) {
  let score = 0;

  topic.phrasesNorm.forEach((phrase, i) => {
    const words = topic.phrasesWords[i];
    if (phrase.length < 3) return;
    if (rawNorm.includes(phrase)) score += 8 + words.length * 4;
    // Plural/typo-tolerant match counts a bit less than an exact one.
    else if (containsSeq(qWords, words)) score += 6 + words.length * 3;
  });

  // Article references like "articulo 161" / "art 161" / "art. 161".
  const artMatch = rawNorm.match(/art(?:iculo|\.)?\s*(\d{2,4})/);
  if (artMatch) {
    const ref = artMatch[1];
    if ((topic.baseLegal || []).some((b) => new RegExp(`\\b${ref}\\b`).test(b))) score += 10;
  }

  for (const tok of tokens) {
    const s = stem(tok);
    if (countStemHits(topic.titleWords, s)) score += 5;
    if (countStemHits(topic.phraseWords, s)) score += 3;
    score += Math.min(countStemHits(topic.bodyWords, s), 3);
  }

  if (areaHits.has(topic.areaId)) score += 4;
  return score;
}

const TOPIC_THRESHOLD = 11;

function searchTopics(query, topN = 3) {
  const tokens = tokenize(query);
  const rawNorm = normalize(query);
  const areaHits = detectAreas(rawNorm);
  const qWords = canon(rawNorm).split(' ').filter(Boolean);
  const scored = TOPICS
    .map((t) => ({ t, score: scoreTopic(t, tokens, rawNorm, areaHits, qWords) }))
    .filter((r) => r.score >= TOPIC_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  // Drop weak tail results far below the best match, so the answer stays focused.
  const best = scored[0].score;
  return scored.filter((r) => r.score >= best * 0.5).slice(0, topN).map((r) => r.t);
}

function toTopicItem(t) {
  return {
    type: 'topic',
    id: t.id,
    area: t.areaTitulo,
    areaId: t.areaId,
    titulo: t.titulo,
    resumen: t.resumen,
    explicacion: t.explicacion,
    baseLegal: t.baseLegal || [],
    pasos: t.pasos || [],
    plazos: t.plazos || [],
    documentos: t.documentos || [],
    dondeAcudir: t.dondeAcudir || [],
    consejo: t.consejo || '',
    alerta: t.alerta || '',
    calculadora: t.id === 'indemnizacion-anos-servicio' || t.id === 'finiquito' ? 'indemnizacion' : null,
  };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function findAreaBrowseIntent(rawNorm) {
  const browse = /(temas|que sabes|que ves|que cubres|indice|lista|todo lo|materias|ver todo)/.test(rawNorm)
    || /^derecho\s+\w+\s*\??$/.test(rawNorm.trim());
  if (!browse) return null;
  for (const area of areas) {
    const words = AREA_BROWSE_WORDS[area.id] || [];
    if (words.some((w) => rawNorm.includes(w))) return area;
  }
  return null;
}

function relatedTopics(items) {
  if (!items.length) return [];
  const shown = new Set(items.map((i) => i.id));
  const areaId = items[0].areaId;
  return TOPICS.filter((t) => t.areaId === areaId && !shown.has(t.id)).slice(0, 3).map((t) => t.titulo);
}

function urgentNotes(rawNorm) {
  return URGENT_PATTERNS.filter((u) => u.match.some((m) => rawNorm.includes(m))).map((u) => u.text);
}

function composeAnswer(query) {
  const q = String(query || '').trim().slice(0, 1000);
  if (!q) {
    return {
      greeting: `¡Hola! Soy ${ASSISTANT_NAME}, tu asistente legal.`,
      body: 'Cuéntame tu caso en palabras simples —por ejemplo "me despidieron por necesidades de la empresa, ¿cuánto me corresponde?" o "me llegó una citación del SII"— y te explico qué dice la ley, los plazos y qué hacer paso a paso.',
      items: [],
      disclaimer: DISCLAIMER,
    };
  }

  const rawNorm = normalize(q);
  const urgent = urgentNotes(rawNorm);

  const browseArea = findAreaBrowseIntent(rawNorm);
  if (browseArea) {
    return {
      greeting: pick(GREETINGS),
      body: `${browseArea.titulo}: ${browseArea.intro} Estos son los temas que tengo cargados; toca uno o pregúntame tu caso directamente.`,
      items: [],
      topicLinks: browseArea.temas.map((t) => t.titulo),
      leyes: browseArea.leyes,
      disclaimer: DISCLAIMER,
    };
  }

  if (/^(glosario|diccionario|diccionario juridico|conceptos|terminos legales)\s*\??$/.test(rawNorm.trim())) {
    return {
      greeting: pick(GREETINGS),
      body: `Este es el glosario jurídico: ${glossary.length} conceptos explicados en lenguaje simple. Toca uno para ver su definición.`,
      items: [],
      topicLinks: glossary.map((g) => `¿Qué es ${g.termino.replace(/\s*\(.*?\)/g, '')}?`),
      disclaimer: DISCLAIMER,
    };
  }

  const terms = findTerms(rawNorm);
  const isDefinition = DEFINITION_RE.test(rawNorm);
  if (terms.length && isDefinition) {
    const defs = terms.map(toDefinitionItem);
    const topicIds = [...new Set(terms.map((g) => g.tema).filter(Boolean))];
    const topics = topicIds.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean).slice(0, 1).map(toTopicItem);
    return {
      greeting: pick(GREETINGS),
      body: defs.length > 1
        ? 'Te explico cada concepto y, debajo, el trámite relacionado paso a paso:'
        : `Te explico qué es ${defs[0].termino}${topics.length ? ' y, debajo, el trámite relacionado paso a paso' : ''}:`,
      items: [...defs, ...topics],
      urgent,
      related: topics.length ? relatedTopics(topics) : [],
      disclaimer: DISCLAIMER,
    };
  }

  const oosFirst = OUT_OF_SCOPE.find((o) => o.match.some((m) => rawNorm.includes(normalize(m))));
  if (oosFirst) {
    return {
      greeting: 'Entiendo.',
      body: `Tu consulta parece corresponder a ${oosFirst.area}. Para este tipo de casos puedes acudir a: ${oosFirst.donde}`,
      items: [],
      urgent,
      disclaimer: DISCLAIMER,
    };
  }

  const matches = searchTopics(q, 3);

  if (!matches.length && terms.length) {
    return {
      greeting: pick(GREETINGS),
      body: 'Encontré estos conceptos en tu consulta. Si me cuentas tu caso concreto, te oriento con los pasos a seguir:',
      items: terms.map(toDefinitionItem),
      urgent,
      disclaimer: DISCLAIMER,
    };
  }

  if (!matches.length && !tokenize(q).length && !urgent.length) {
    return {
      greeting: `¡Hola! Soy ${ASSISTANT_NAME}, tu asistente legal.`,
      body: 'Cuéntame qué te pasó o qué necesitas hacer, con tus palabras. Mientras más detalles me des (quién, qué, cuándo, si te notificaron algo), mejor te puedo orientar.',
      items: [],
      topicLinks: areas.map((a) => `Temas de ${a.titulo}`),
      disclaimer: DISCLAIMER,
    };
  }

  if (!matches.length) {
    const oos = OUT_OF_SCOPE.find((o) => o.match.some((m) => rawNorm.includes(normalize(m))));
    if (oos) {
      return {
        greeting: 'Entiendo.',
        body: `Tu consulta parece corresponder a ${oos.area} (cubro Laboral, Tributario, Penal, Comercial, Administrativo, Familia y Civil: deudas, embargos y arriendos). Para este tipo de casos puedes acudir a: ${oos.donde}`,
        items: [],
        urgent,
        disclaimer: DISCLAIMER,
      };
    }
    return {
      noMatch: true,
      greeting: urgent.length ? 'Lo primero es tu seguridad.' : pick(GREETINGS),
      body: `No logré identificar con claridad el tema legal de "${q}". ¿Me cuentas un poco más? Por ejemplo: quién es la otra parte (empleador, SII, Tesorería, municipalidad, una empresa, un banco, tu ex pareja, la policía), qué pasó, cuándo ocurrió y si te notificaron algún documento.`,
      items: [],
      urgent,
      topicLinks: areas.map((a) => `Temas de ${a.titulo}`),
      disclaimer: DISCLAIMER,
    };
  }

  const items = matches.map(toTopicItem);
  const relatedRaw = relatedTopics(items);
  const multiArea = new Set(items.map((i) => i.areaId)).size > 1;

  let body;
  if (items.length === 1) {
    body = `Esto corresponde a ${items[0].area}. Te dejo qué dice la ley, los plazos que debes cuidar y los pasos a seguir:`;
  } else if (multiArea) {
    body = 'Tu caso toca más de un área del derecho. Revisa cada ficha: muchas veces conviene actuar en paralelo en ambas.';
  } else {
    body = `Encontré varios temas de ${items[0].area} relacionados con tu consulta. El primero es el que mejor calza:`;
  }

  return {
    greeting: urgent.length ? 'Lo primero es tu seguridad.' : pick(GREETINGS),
    body,
    items,
    urgent,
    related: relatedRaw,
    disclaimer: DISCLAIMER,
  };
}

module.exports = { composeAnswer, searchTopics, findTerms, normalize, areas, glossary, TOPICS, DISCLAIMER };
