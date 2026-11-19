'use strict';

const fs = require('fs');
const path = require('path');

const AREAS_DIR = path.join(__dirname, '..', 'data', 'areas');
const AREA_ORDER = ['laboral', 'tributario', 'penal', 'comercial', 'administrativo', 'familia', 'civil'];

const areas = AREA_ORDER
  .map((id) => path.join(AREAS_DIR, `${id}.json`))
  .filter((p) => fs.existsSync(p))
  .map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));

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
  administrativo: ['municipalidad', 'municipio', 'alcalde', 'servicio publico', 'ministerio', 'contraloria', 'funcionario', 'sumario', 'licitacion', 'mercado publico', 'transparencia', 'resolucion', 'estado', 'fisco', 'seremi', 'recurso de proteccion'],
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
      titleWords: wordsOf(t.titulo),
      phraseWords: phrases.flatMap((p) => p.split(' ')),
      bodyWords: wordsOf([t.resumen, t.explicacion, (t.baseLegal || []).join(' ')].join(' ')),
    });
  }
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

function scoreTopic(topic, tokens, rawNorm, areaHits) {
  let score = 0;

  for (const phrase of topic.phrasesNorm) {
    if (phrase.length >= 3 && rawNorm.includes(phrase)) {
      score += 8 + phrase.split(' ').length * 4;
    }
  }

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
  const scored = TOPICS
    .map((t) => ({ t, score: scoreTopic(t, tokens, rawNorm, areaHits) }))
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
      greeting: urgent.length ? 'Lo primero es tu seguridad.' : pick(GREETINGS),
      body: `No logré identificar con claridad el tema legal de "${q}". ¿Me cuentas un poco más? Por ejemplo: quién es la otra parte (empleador, SII, Tesorería, municipalidad, una empresa, un banco, tu ex pareja, la policía), qué pasó, cuándo ocurrió y si te notificaron algún documento.`,
      items: [],
      urgent,
      topicLinks: areas.map((a) => `Temas de ${a.titulo}`),
      disclaimer: DISCLAIMER,
    };
  }

  const items = matches.map(toTopicItem);
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
    related: relatedTopics(items),
    disclaimer: DISCLAIMER,
  };
}

module.exports = { composeAnswer, searchTopics, normalize, areas, TOPICS, DISCLAIMER };
