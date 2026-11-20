'use strict';

// Pruebas sin dependencias: node test/run.js
const assert = require('assert');
const { composeAnswer, areas } = require('../lib/engine');
const { calcularIndemnizacion, calcularFiniquito, antiguedad, parseDate } = require('../lib/calc');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed += 1; } catch (err) { failed += 1; console.error(`✗ ${name}\n  ${err.message}`); }
}

// Consulta → tema que debe aparecer primero.
const ROUTING = [
  ['me despidieron por necesidades de la empresa cuanto me corresponde', 'despido-necesidades-empresa'],
  ['calcular indemnizacion por años de servicio', 'indemnizacion-anos-servicio'],
  ['me echaron y no me pagaron las imposiciones', 'nulidad-despido-ley-bustos'],
  ['mi jefe me humilla todos los dias', 'ley-karin-acoso'],
  ['cuantas horas es la jornada ahora', 'jornada-40-horas'],
  ['estoy embarazada y me despidieron', 'fuero-maternal-permisos'],
  ['horas extras no pagadas', 'horas-extra'],
  ['me llego una carta del sii', 'citacion-liquidacion-sii'],
  ['como declaro el iva', 'iva-f29'],
  ['tengo una deuda con tesoreria', 'deudas-tgr-convenios'],
  ['quiero cerrar mi empresa', 'termino-giro'],
  ['detuvieron a mi hijo anoche', 'detencion-derechos'],
  ['me clonaron la tarjeta', 'fraude-tarjetas'],
  ['como hago una denuncia', 'denuncia-querella'],
  ['manejaba curado', 'manejo-estado-ebriedad'],
  ['legitima defensa entraron a robar a mi casa', 'legitima-defensa'],
  ['quiero crear una spa', 'constituir-empresa'],
  ['un cliente no me paga la factura', 'cobro-factura'],
  ['compre por internet y llego malo', 'derechos-consumidor'],
  ['no puedo pagar mis deudas', 'insolvencia-ley-20720'],
  ['registrar mi marca', 'marcas-inapi'],
  ['la municipalidad me clausuro el local', 'municipalidades'],
  ['el servicio publico no me responde hace meses', 'silencio-administrativo'],
  ['quiero pedir informacion a un ministerio', 'transparencia'],
  ['me iniciaron un sumario', 'sumario-administrativo'],
  ['recurso de proteccion isapre', 'isapre-reclamos'],
  ['recurso de proteccion contra un colegio', 'recurso-proteccion'],
  ['choque y el bache no estaba señalizado', 'responsabilidad-estado'],
  ['articulo 161', 'despido-necesidades-empresa'],
  ['me quieren embargar la casa que puedo hacer?', 'embargo-juicio-ejecutivo'],
  ['pueden embargar mi sueldo', 'bienes-inembargables'],
  ['me van a rematar la casa por el dividendo', 'remate-hipoteca'],
  ['deuda de hace 6 años me cobran', 'prescripcion-deudas'],
  ['me llaman todo el dia para cobrar', 'cobranza-extrajudicial-dicom'],
  ['el arrendatario no me paga', 'arriendo'],
  ['Debo contribuciones atrasadas', 'contribuciones'],
  ['no he pagado las contribuciones me van a rematar', 'contribuciones'],
  ['tesoreria me quiere embargar', 'deudas-tgr-convenios'],
  ['me quieren cobrar pension alimenticia', 'pension-alimentos'],
  ['el papa de mi hijo no paga la pension', 'pension-alimentos'],
  ['quiero divorciarme', 'divorcio'],
  ['no me deja ver a mi hijo', 'relacion-directa-regular'],
  ['tuicion de mis hijos', 'cuidado-personal'],
  ['quiero viajar con mi hijo y el papa no firma', 'salida-pais-menor'],
  ['murio mi papa quien hereda', 'herencia-sucesion'],
  ['acuerdo de union civil', 'acuerdo-union-civil'],
  ['como saco la patente comercial para mi negocio', 'patente-municipal'],
  ['me cobran el derecho de aseo', 'derechos-aseo-ornato'],
  ['multa por la ordenanza de aseo y ornato', 'derechos-aseo-ornato'],
  ['a que tribunal voy si me deben plata', 'a-que-tribunal-voy'],
  ['me dejaron una demanda en la casa con mi mama', 'notificaciones-judiciales'],
  ['me citaron a reconocer firma', 'gestion-preparatoria'],
  ['me demando una casa comercial por la tarjeta', 'gestion-preparatoria'],
  ['la causa lleva mas de 6 meses sin movimiento', 'abandono-procedimiento'],
  ['no puedo pagar un abogado', 'abogado-gratis'],
  ['me amenazo mi vecino por whatsapp', 'amenazas'],
  ['me pegaron en una pelea', 'lesiones'],
  ['abusaron de mi hija', 'delitos-sexuales'],
  ['subieron mi plan de isapre', 'isapre-reclamos'],
  ['despido injustificado', 'despido-causales'],
  ['cuando puedo comprar un vehiculo con IVA?', 'iva-vehiculos'],
  ['puedo recuperar el iva de una camioneta', 'iva-vehiculos'],
  ['el iva del auto de la empresa', 'iva-vehiculos'],
  ['cuanto se paga por transferir un auto usado', 'transferencia-vehiculo-usado'],
  ['puedo rebajar como gasto la camioneta', 'gastos-vehiculos-renta'],
  ['que compras dan credito fiscal', 'credito-fiscal-requisitos'],
  ['me despidieron por falta de probidad', 'despido-disciplinario-160'],
  ['falte 3 dias y me despidieron', 'despido-disciplinario-160'],
  ['quiero renunciar', 'renuncia-voluntaria'],
  ['me ofrecen un mutuo acuerdo', 'mutuo-acuerdo'],
  ['no me renovaron el contrato a plazo fijo', 'vencimiento-plazo-obra'],
  ['me despidieron por whatsapp', 'carta-despido'],
  ['me despidieron estando con licencia', 'despido-licencia-medica'],
  ['como cobro el seguro de cesantia', 'seguro-cesantia'],
  ['quiero despedir a la nana', 'casa-particular'],
  ['cuanto tiempo tengo para demandar', 'plazos-laborales'],
  ['cuando llega la devolucion de impuestos', 'devolucion-impuestos'],
  ['me retuvieron la devolucion', 'devolucion-impuestos'],
  ['olvide mi clave del sii', 'clave-tributaria'],
  ['cuando emitir boleta o factura', 'boleta-factura'],
  ['que regimen tributario me conviene', 'regimenes-tributarios'],
  ['tengo un departamento arrendado debo pagar impuesto', 'impuesto-arriendos'],
  ['vendi mi casa debo pagar impuesto', 'venta-inmueble'],
  ['pago iva en temu', 'iva-compras-extranjero'],
  ['como pagar menos impuestos', 'beneficios-tributarios-personas'],
  ['cuanto es mi sueldo liquido', 'liquidacion-sueldo'],
  ['me rechazaron la licencia', 'licencias-medicas'],
  ['murio mi papa permiso', 'permisos-legales'],
  ['trabajo todos los domingos', 'domingos-festivos'],
  ['no pagan mis cotizaciones', 'cotizaciones-impagas'],
  ['me cambiaron de funciones', 'cambio-funciones'],
  ['quiero formar un sindicato', 'sindicato-negociacion'],
];

for (const [q, expected] of ROUTING) {
  test(`routing: "${q}"`, () => {
    const a = composeAnswer(q);
    const ids = (a.items || []).map((i) => i.id);
    assert.strictEqual(ids[0], expected, `esperaba ${expected}, obtuve [${ids.join(', ')}]`);
    assert.ok(a.disclaimer, 'toda respuesta debe incluir el descargo');
  });
}

// Every welcome-screen chip must land on a topic, otherwise the first click is a dead end.
for (const q of ['Me despidieron, ¿cuánto me corresponde?', 'Me llegó una citación del SII', 'Detuvieron a un familiar', 'Quiero constituir una SpA', 'Un cliente no me paga una factura', 'La municipalidad rechazó mi patente', 'Quiero demandar pensión de alimentos', 'Me quieren embargar la casa', 'Debo contribuciones atrasadas', '¿Qué es la posesión efectiva con beneficio de inventario?', 'Calcular mi finiquito', '¿Cuánto es mi sueldo líquido?', '¿Cuándo llega la devolución de impuestos?']) {
  test(`chip de bienvenida: "${q}"`, () => assert.ok(composeAnswer(q).items.length > 0));
}

test('definición: posesión efectiva con beneficio de inventario', () => {
  const a = composeAnswer('que es posesion efectiva con beneficio de inventario');
  const defs = a.items.filter((i) => i.type === 'definicion').map((i) => i.termino);
  assert.ok(defs.includes('Beneficio de inventario') && defs.includes('Posesión efectiva'), defs.join(','));
  assert.ok(a.items.some((i) => i.id === 'herencia-sucesion'));
});
for (const [q, term] of [['que es la UF', 'UF (Unidad de Fomento)'], ['que es una terceria', 'Tercería'], ['que significa formalizacion', 'Formalización'], ['que es el silencio administrativo', 'Silencio administrativo']]) {
  test(`definición: ${q}`, () => assert.strictEqual(composeAnswer(q).items[0].termino, term));
}
for (const q of ['que es posesion efectiva con beneficios de inventario', 'que es el benefisio de inventario', 'que es posecion efectiva']) {
  test(`definición tolerante a plural/tipeo: ${q}`, () => {
    assert.ok(composeAnswer(q).items.some((i) => i.type === 'definicion'));
  });
}
test('glosario lista todos los términos', () => {
  const { glossary } = require('../lib/engine');
  assert.strictEqual(composeAnswer('glosario').topicLinks.length, glossary.length);
});
test('cada término de glosario apunta a un tema existente o null', () => {
  const { glossary, TOPICS } = require('../lib/engine');
  for (const g of glossary) assert.ok(g.tema === null || TOPICS.some((t) => t.id === g.tema), `${g.termino} → ${g.tema}`);
});
test('chips del glosario resuelven a su definición', () => {
  const { glossary } = require('../lib/engine');
  for (const label of composeAnswer('glosario').topicLinks) {
    const a = composeAnswer(label);
    assert.ok(a.items.length && a.items[0].type === 'definicion', `sin definición: ${label}`);
  }
  assert.ok(glossary.length >= 80);
});
test('relacionados del mismo derecho y cercanos a la pregunta', () => {
  const a = composeAnswer('cuando puedo comprar un vehiculo con IVA?');
  assert.ok(a.related.length >= 2);
  assert.ok(a.related.some((r) => /Crédito fiscal|Vehículos de la empresa|vehículo usado/.test(r)), a.related.join(' | '));
});
test('sin ficha exacta pero con área clara: responde dentro de esa área', () => {
  const a = composeAnswer('tengo un problema con mi jefe');
  assert.ok(a.items.length > 0 && a.items.every((i) => i.areaId === 'laboral'), a.items.map((i) => i.id).join(','));
  assert.ok(a.noMatch, 'debe quedar registrada como sin respuesta exacta');
});
test('saludo devuelve bienvenida sin fichas', () => {
  const a = composeAnswer('hola');
  assert.strictEqual(a.items.length, 0);
  assert.match(a.greeting, /BUSCALEGAL/);
});
test('navegación por área lista sus temas', () => {
  const a = composeAnswer('Temas de Derecho Penal y Procesal Penal');
  assert.ok(a.topicLinks.length >= 10);
});
test('fuera de alcance (propiedad) se deriva', () => {
  assert.match(composeAnswer('tengo un problema de servidumbre con el vecino').body, /Civil/);
});
test('urgencia detención muestra aviso', () => {
  assert.ok(composeAnswer('detuvieron a mi hijo anoche').urgent.length > 0);
});
test('urgencia VIF muestra aviso', () => {
  assert.ok(composeAnswer('me pega mi pareja').urgent.length > 0);
});
test('cada tema tiene campos mínimos', () => {
  for (const area of areas) {
    for (const t of area.temas) {
      for (const k of ['id', 'titulo', 'resumen', 'explicacion']) assert.ok(t[k], `${area.id}/${t.id} sin ${k}`);
      assert.ok(t.temas && t.temas.length >= 3, `${area.id}/${t.id} necesita al menos 3 frases clave`);
      assert.ok(t.baseLegal && t.baseLegal.length, `${area.id}/${t.id} sin base legal`);
      assert.ok(t.pasos && t.pasos.length, `${area.id}/${t.id} sin pasos`);
    }
  }
});
test('ids de temas únicos', () => {
  const ids = areas.flatMap((a) => a.temas.map((t) => t.id));
  assert.strictEqual(new Set(ids).size, ids.length);
});

// ---------- Calculadora ----------
test('antigüedad: 5 años y 7 meses ⇒ fracción > 6 meses', () => {
  const a = antiguedad(parseDate('2020-01-01'), parseDate('2025-08-15'));
  assert.strictEqual(a.anos, 5);
  assert.strictEqual(a.meses, 7);
  assert.ok(a.fraccionSuperiorASeisMeses);
});
test('antigüedad: exactamente 6 meses no suma año', () => {
  const a = antiguedad(parseDate('2020-01-01'), parseDate('2023-07-01'));
  assert.strictEqual(a.anos, 3);
  assert.strictEqual(a.meses, 6);
  assert.strictEqual(a.dias, 0);
  assert.ok(!a.fraccionSuperiorASeisMeses);
});
test('161 sin aviso: IAS + aviso', () => {
  const r = calcularIndemnizacion({ fechaInicio: '2020-01-01', fechaTermino: '2025-08-15', remuneracion: 1000000, valorUF: 39000, causal: '161', avisoDado: false });
  assert.ok(r.ok);
  assert.strictEqual(r.antiguedad.anosIndemnizables, 6);
  assert.strictEqual(r.lineas.find((l) => /años de servicio/.test(l.concepto)).monto, 6000000);
  assert.strictEqual(r.lineas.find((l) => /aviso previo/.test(l.concepto)).monto, 1000000);
});
test('tope de 90 UF y 11 años', () => {
  const r = calcularIndemnizacion({ fechaInicio: '2005-01-01', fechaTermino: '2025-03-01', remuneracion: 9000000, valorUF: 39000, causal: '161', avisoDado: true });
  assert.strictEqual(r.base, 90 * 39000);
  assert.strictEqual(r.antiguedad.anosIndemnizables, 11);
  assert.strictEqual(r.lineas.find((l) => /años de servicio/.test(l.concepto)).monto, 11 * 90 * 39000);
});
test('menos de 1 año: sin IAS', () => {
  const r = calcularIndemnizacion({ fechaInicio: '2025-01-01', fechaTermino: '2025-10-01', remuneracion: 800000, valorUF: 39000, causal: '161', avisoDado: false });
  assert.ok(!r.lineas.some((l) => /años de servicio/.test(l.concepto)));
});
test('causal 160: sin IAS pero con escenarios de recargo', () => {
  const r = calcularIndemnizacion({ fechaInicio: '2018-01-01', fechaTermino: '2025-01-10', remuneracion: 1000000, valorUF: 39000, causal: '160' });
  assert.ok(!r.lineas.some((l) => /años de servicio/.test(l.concepto)));
  assert.strictEqual(r.recargos.find((x) => x.porcentaje === 80).recargo, 7 * 1000000 * 0.8);
});
test('finiquito: renuncia solo paga feriado y haberes', () => {
  const r = calcularFiniquito({ fechaInicio: '2020-03-01', fechaTermino: '2025-09-15', remuneracion: 900000, valorUF: 39000, causal: '159-2', diasTrabajadosSinPagar: 15 });
  assert.ok(r.ok);
  assert.ok(!r.lineas.some((l) => l.tipo === 'indemnizacion'));
  assert.strictEqual(r.lineas.find((l) => /día\(s\) trabajado/.test(l.concepto)).monto, 450000);
  assert.ok(r.lineas.some((l) => /Feriado proporcional/.test(l.concepto)));
});
test('finiquito: 161 descuenta AFC y anticipos', () => {
  const r = calcularFiniquito({ fechaInicio: '2018-01-01', fechaTermino: '2025-01-10', remuneracion: 1000000, valorUF: 39000, causal: '161-necesidades', avisoDado: true, aporteAFC: 800000, descuentos: 100000 });
  const ias = r.lineas.find((l) => /años de servicio/.test(l.concepto)).monto;
  assert.strictEqual(ias, 7000000);
  assert.strictEqual(r.lineas.find((l) => /cesantía/.test(l.concepto)).monto, -800000);
  assert.strictEqual(r.total, r.lineas.reduce((s2, l) => s2 + l.monto, 0));
});
test('finiquito: obra o faena paga 2,5 días por mes', () => {
  const r = calcularFiniquito({ fechaInicio: '2025-01-01', fechaTermino: '2025-07-01', remuneracion: 900000, valorUF: 39000, causal: '159-5' });
  assert.strictEqual(r.lineas.find((l) => /obra o faena/.test(l.concepto)).monto, Math.round(30000 * 2.5 * 6));
});
test('finiquito: autodespido muestra escenarios de demanda', () => {
  const r = calcularFiniquito({ fechaInicio: '2019-01-01', fechaTermino: '2025-01-15', remuneracion: 1000000, valorUF: 39000, causal: '171' });
  assert.ok(r.escenarios.some((e) => e.porcentaje === 80));
});
test('feriado: días hábiles a corridos cuenta fines de semana', () => {
  const { habilesACorridos } = require('../lib/calc');
  // Término el viernes 2025-01-10: 5 hábiles siguientes = lunes 13 a viernes 17 → 7 días corridos.
  assert.strictEqual(habilesACorridos(parseDate('2025-01-10'), 5), 7);
});
test('sueldo líquido: descuentos e impuesto único', () => {
  const { calcularSueldoLiquido, impuestoUnico } = require('../lib/calc');
  const r = calcularSueldoLiquido({ sueldoBase: 1000000, valorUF: 39900, valorUTM: 69000, tasaAFP: 11.44 });
  assert.ok(r.ok);
  // 1.000.000 - 114.400 AFP - 70.000 salud - 6.000 AFC = 809.600 (exento de impuesto: < 13,5 UTM)
  assert.strictEqual(r.liquido, 809600);
  // Tramo 2 (35,2 UTM): 8% - 1,74 UTM
  assert.strictEqual(Math.round(impuestoUnico(2428800, 69000)), 74244);
  // continuidad de tramos
  assert.ok(Math.abs(impuestoUnico(30 * 69000 + 1, 69000) - impuestoUnico(30 * 69000, 69000)) < 1);
});
test('sueldo líquido: plazo fijo no descuenta AFC e Isapre usa plan si es mayor', () => {
  const { calcularSueldoLiquido } = require('../lib/calc');
  const r = calcularSueldoLiquido({ sueldoBase: 1000000, valorUF: 40000, valorUTM: 69000, contrato: 'plazo', salud: 'isapre', planIsapreUF: 3 });
  assert.ok(!r.lineas.some((l) => /cesantía/.test(l.concepto) && l.monto !== 0));
  assert.strictEqual(r.lineas.find((l) => /Isapre/.test(l.concepto)).monto, -120000);
});
test('horas extra: fórmula DT y recargo 50%', () => {
  const { calcularHorasExtra } = require('../lib/calc');
  const r = calcularHorasExtra({ sueldoBase: 900000, jornadaSemanal: 42, horas: 10 });
  assert.strictEqual(r.valorHoraOrdinaria, 5000);
  assert.strictEqual(r.total, 75000);
  assert.ok(!calcularHorasExtra({ sueldoBase: 900000, recargo: 30 }).ok);
});
test('validación de entrada', () => {
  const r = calcularIndemnizacion({ fechaInicio: 'x', remuneracion: -1 });
  assert.ok(!r.ok && r.errors.length >= 3);
});

console.log(`\n${passed} pruebas OK, ${failed} fallidas`);
process.exit(failed ? 1 : 0);
