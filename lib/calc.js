'use strict';

// Estimación de indemnizaciones por término de contrato (Código del Trabajo, Chile).
// Arts. 162, 163, 168, 172 y 73 CT. Es una estimación orientativa, no un finiquito oficial.

const TOPE_UF = 90;
const TOPE_ANOS = 11;

function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonthsUTC(date, months) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

// Años completos y meses restantes entre dos fechas.
function antiguedad(inicio, termino) {
  let anos = 0;
  while (addMonthsUTC(inicio, (anos + 1) * 12) <= termino) anos += 1;
  const desdeAniversario = addMonthsUTC(inicio, anos * 12);
  let meses = 0;
  while (addMonthsUTC(desdeAniversario, meses + 1) <= termino) meses += 1;
  const desdeMes = addMonthsUTC(desdeAniversario, meses);
  const dias = Math.round((termino - desdeMes) / 86400000);
  // "Fracción superior a seis meses": más de 6 meses cumplidos (6 meses y al menos 1 día).
  const fraccionSuperiorASeisMeses = meses > 6 || (meses === 6 && dias > 0);
  return { anos, meses, dias, fraccionSuperiorASeisMeses };
}

function round(n) { return Math.round(n); }

function calcularIndemnizacion(input) {
  const errors = [];
  const inicio = parseDate(input.fechaInicio);
  const termino = parseDate(input.fechaTermino);
  const remuneracion = Number(input.remuneracion);
  const valorUF = Number(input.valorUF);
  const causal = String(input.causal || '161');
  const avisoDado = Boolean(input.avisoDado);
  const feriadoPendienteDias = Math.max(0, Number(input.feriadoPendienteDias) || 0);

  if (!inicio) errors.push('Fecha de inicio inválida (usa AAAA-MM-DD).');
  if (!termino) errors.push('Fecha de término inválida (usa AAAA-MM-DD).');
  if (inicio && termino && termino <= inicio) errors.push('La fecha de término debe ser posterior a la de inicio.');
  if (!(remuneracion > 0)) errors.push('Ingresa una remuneración mensual mayor que 0.');
  if (!(valorUF > 0)) errors.push('Ingresa el valor de la UF (en pesos) para aplicar el tope de 90 UF.');
  if (!['161', '159', '160'].includes(causal)) errors.push('Causal no reconocida.');
  if (errors.length) return { ok: false, errors };

  const ant = antiguedad(inicio, termino);
  const topeMonto = TOPE_UF * valorUF;
  const base = Math.min(remuneracion, topeMonto);
  const topeAplicado = remuneracion > topeMonto;

  let anosIndemnizables = ant.anos + (ant.fraccionSuperiorASeisMeses ? 1 : 0);
  const topeAnosAplicado = anosIndemnizables > TOPE_ANOS;
  anosIndemnizables = Math.min(anosIndemnizables, TOPE_ANOS);
  const cumpleUnAno = ant.anos >= 1;

  const lineas = [];
  const notas = [];

  let ias = 0;
  let aviso = 0;
  if (causal === '161') {
    if (cumpleUnAno) {
      ias = base * anosIndemnizables;
      lineas.push({ concepto: `Indemnización por años de servicio (${anosIndemnizables} año${anosIndemnizables === 1 ? '' : 's'} × ${round(base).toLocaleString('es-CL')})`, monto: round(ias), base: 'Art. 163 y 172 CT' });
    } else {
      notas.push('Con menos de 1 año de antigüedad no corresponde indemnización por años de servicio (art. 163 CT).');
    }
    if (!avisoDado) {
      aviso = base;
      lineas.push({ concepto: 'Indemnización sustitutiva del aviso previo (1 mes)', monto: round(aviso), base: 'Art. 162 inciso 4° CT' });
    }
  } else {
    notas.push(`Por la causal del art. ${causal} no corresponde, en principio, indemnización por años de servicio ni aviso previo. Si un juez declara injustificado el despido, se paga con los recargos que se muestran abajo.`);
  }

  // Feriado proporcional: 15 días hábiles por año ⇒ 1,25 días hábiles por mes completo trabajado
  // desde el último aniversario (más la fracción de días del mes en curso).
  const mesesFraccion = ant.meses + ant.dias / 30;
  const feriadoPropHabiles = Math.round(1.25 * mesesFraccion * 100) / 100;
  // Aproximación: los días hábiles se convierten a corridos (se agregan sábados, domingos y festivos).
  const factorCorridos = 7 / 5;
  const valorDia = remuneracion / 30;
  const feriadoProp = feriadoPropHabiles * factorCorridos * valorDia;
  if (feriadoProp > 0) {
    lineas.push({ concepto: `Feriado proporcional (~${feriadoPropHabiles} días hábiles)`, monto: round(feriadoProp), base: 'Art. 73 CT' });
  }
  const feriadoPend = feriadoPendienteDias * factorCorridos * valorDia;
  if (feriadoPend > 0) {
    lineas.push({ concepto: `Feriado pendiente (${feriadoPendienteDias} días hábiles)`, monto: round(feriadoPend), base: 'Art. 73 CT' });
  }

  const total = lineas.reduce((s, l) => s + l.monto, 0);

  // Escenarios de recargo judicial (art. 168 CT) sobre la indemnización por años de servicio.
  const iasPotencial = cumpleUnAno ? base * anosIndemnizables : 0;
  const recargos = cumpleUnAno ? [
    { escenario: 'Art. 161 aplicado indebidamente (improcedente)', porcentaje: 30 },
    { escenario: 'Art. 159 injustificado o despido sin causal', porcentaje: 50 },
    { escenario: 'Art. 160 indebido', porcentaje: 80 },
    { escenario: 'Art. 160 N°1, 5 o 6 sin motivo plausible (hasta)', porcentaje: 100 },
  ].map((r) => ({
    ...r,
    recargo: round(iasPotencial * r.porcentaje / 100),
    totalConIAS: round(iasPotencial * (1 + r.porcentaje / 100) + (causal === '161' ? 0 : base)),
  })) : [];
  if (cumpleUnAno && causal !== '161') {
    notas.push('En los escenarios de recargo con causal 159 o 160, el total incluye además la indemnización sustitutiva del aviso previo (1 mes), que el juez ordena pagar si declara injustificado el despido.');
  }

  if (topeAplicado) notas.push(`Se aplicó el tope de 90 UF ($${round(topeMonto).toLocaleString('es-CL')}) a la base de cálculo (art. 172 CT).`);
  if (topeAnosAplicado) notas.push('Se aplicó el tope de 11 años (330 días). Si tu contrato es anterior al 14-08-1981, el tope no aplica.');
  notas.push('La remuneración base debe incluir sueldo, comisiones y regalías permanentes, y excluir horas extra y pagos esporádicos (aguinaldos, bonos de fiestas). Si es variable, usa el promedio de los últimos 3 meses.');
  notas.push('El feriado se valoriza aproximando días hábiles a corridos (×7/5). El finiquito real cuenta los sábados, domingos y festivos exactos del período.');
  notas.push('Estas indemnizaciones no son imponibles ni tributables dentro de los topes legales. Agrega también remuneraciones pendientes del último mes.');

  return {
    ok: true,
    antiguedad: { ...ant, anosIndemnizables, cumpleUnAno },
    base: round(base),
    topeMonto: round(topeMonto),
    lineas,
    total,
    recargos,
    notas,
  };
}

module.exports = { calcularIndemnizacion, antiguedad, parseDate };
