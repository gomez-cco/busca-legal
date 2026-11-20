'use strict';

// Calculadora de finiquito (Código del Trabajo, Chile).
// Estimación orientativa: no reemplaza el finiquito oficial ni la revisión de un abogado.
// Normas: arts. 159, 160, 161, 162, 163, 163 bis (obra o faena), 168, 171, 172 y 73 CT; art. 13 Ley 19.728.

const TOPE_UF = 90;
const TOPE_ANOS = 11;

const CAUSALES = {
  '161-necesidades': { label: 'Art. 161 inc. 1° – Necesidades de la empresa', ias: true, aviso: true, afc: true, recargoSiInjustificado: 30 },
  '161-desahucio': { label: 'Art. 161 inc. 2° – Desahucio (gerentes, exclusiva confianza, casa particular)', ias: true, aviso: true, afc: true, recargoSiInjustificado: 30 },
  '159-1': { label: 'Art. 159 N°1 – Mutuo acuerdo', ias: false, pactada: true },
  '159-2': { label: 'Art. 159 N°2 – Renuncia voluntaria', ias: false },
  '159-4': { label: 'Art. 159 N°4 – Vencimiento del plazo', ias: false, recargoSiInjustificado: 50 },
  '159-5': { label: 'Art. 159 N°5 – Conclusión de la obra o faena', ias: false, obra: true, recargoSiInjustificado: 50 },
  '159-6': { label: 'Art. 159 N°6 – Caso fortuito o fuerza mayor', ias: false, recargoSiInjustificado: 50 },
  '160': { label: 'Art. 160 – Causal disciplinaria', ias: false, recargoSiInjustificado: 80 },
  '171': { label: 'Art. 171 – Autodespido (despido indirecto)', ias: false, autodespido: true },
};
// Compatibilidad con la versión anterior de la calculadora.
const LEGACY = { 161: '161-necesidades', 159: '159-4', 160: '160' };

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

// Años completos, meses y días entre dos fechas.
function antiguedad(inicio, termino) {
  let anos = 0;
  while (addMonthsUTC(inicio, (anos + 1) * 12) <= termino) anos += 1;
  const desdeAniversario = addMonthsUTC(inicio, anos * 12);
  let meses = 0;
  while (addMonthsUTC(desdeAniversario, meses + 1) <= termino) meses += 1;
  const desdeMes = addMonthsUTC(desdeAniversario, meses);
  const dias = Math.round((termino - desdeMes) / 86400000);
  // "Fracción superior a seis meses": más de 6 meses cumplidos.
  const fraccionSuperiorASeisMeses = meses > 6 || (meses === 6 && dias > 0);
  const mesesTotales = anos * 12 + meses;
  return { anos, meses, dias, mesesTotales, fraccionSuperiorASeisMeses };
}

// Art. 73 CT: el feriado (en días hábiles) se paga agregando los sábados, domingos y festivos
// que median desde el día siguiente al término. Aquí se cuentan los fines de semana reales;
// los festivos no se incluyen (el monto real puede ser algo mayor).
function habilesACorridos(termino, habiles) {
  if (habiles <= 0) return 0;
  const entero = Math.floor(habiles);
  const fraccion = habiles - entero;
  let corridos = 0;
  let contados = 0;
  const d = new Date(termino.getTime());
  while (contados < entero) {
    d.setUTCDate(d.getUTCDate() + 1);
    corridos += 1;
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) contados += 1;
  }
  return corridos + fraccion;
}

const round = (n) => Math.round(n);
const fmt = (n) => `$${round(n).toLocaleString('es-CL')}`;
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

function calcularFiniquito(input) {
  const errors = [];
  const inicio = parseDate(input.fechaInicio);
  const termino = parseDate(input.fechaTermino);
  const remuneracion = Number(input.remuneracion);
  const valorUF = Number(input.valorUF);
  const causalKey = LEGACY[input.causal] || String(input.causal || '161-necesidades');
  const causal = CAUSALES[causalKey];
  const avisoDado = Boolean(input.avisoDado);
  const feriadoPendienteDias = num(input.feriadoPendienteDias);
  const diasPendientes = Math.min(31, num(input.diasTrabajadosSinPagar));
  const horasExtraPendientes = num(input.horasExtraPendientes);
  const otrosHaberes = num(input.otrosHaberes);
  const descuentos = num(input.descuentos);
  const aporteAFC = num(input.aporteAFC);
  const indemnizacionPactada = num(input.indemnizacionPactada);
  const contratoAnterior1981 = Boolean(input.contratoAnterior1981);

  if (!inicio) errors.push('Fecha de inicio inválida.');
  if (!termino) errors.push('Fecha de término inválida.');
  if (inicio && termino && termino <= inicio) errors.push('La fecha de término debe ser posterior a la de inicio.');
  if (!(remuneracion > 0)) errors.push('Ingresa la última remuneración mensual (mayor que 0).');
  if (!(valorUF > 0)) errors.push('Ingresa el valor de la UF (en pesos) para aplicar el tope de 90 UF.');
  if (!causal) errors.push('Causal no reconocida.');
  if (errors.length) return { ok: false, errors };

  const ant = antiguedad(inicio, termino);
  const topeMonto = TOPE_UF * valorUF;
  const base = Math.min(remuneracion, topeMonto);
  const topeAplicado = remuneracion > topeMonto;
  const cumpleUnAno = ant.anos >= 1;

  let anosIndemnizables = ant.anos + (ant.fraccionSuperiorASeisMeses ? 1 : 0);
  const topeAnosAplicado = !contratoAnterior1981 && anosIndemnizables > TOPE_ANOS;
  if (!contratoAnterior1981) anosIndemnizables = Math.min(anosIndemnizables, TOPE_ANOS);
  const iasCalculada = cumpleUnAno ? base * anosIndemnizables : 0;

  const lineas = [];
  const notas = [];
  const add = (concepto, monto, baseLegal, tipo = 'haber') => {
    if (monto > 0) lineas.push({ concepto, monto: round(monto), base: baseLegal, tipo });
  };

  // 1) Remuneraciones y haberes pendientes (proceden en cualquier causal).
  const valorDia = remuneracion / 30;
  add(`Remuneración de ${diasPendientes} día(s) trabajado(s) sin pagar`, valorDia * diasPendientes, 'Art. 54 y 55 CT');
  add('Horas extraordinarias pendientes', horasExtraPendientes, 'Art. 32 CT');
  add('Otros haberes pendientes (bonos, comisiones, gratificación)', otrosHaberes, 'Art. 41 y 42 CT');

  // 2) Feriado proporcional y pendiente (art. 73): días hábiles convertidos a corridos.
  const mesesFraccion = ant.meses + ant.dias / 30;
  const feriadoPropHabiles = Math.round(1.25 * mesesFraccion * 100) / 100;
  const propCorridos = habilesACorridos(termino, feriadoPropHabiles);
  add(`Feriado proporcional (${feriadoPropHabiles} días hábiles ≈ ${propCorridos.toFixed(1)} días corridos)`, propCorridos * valorDia, 'Art. 73 CT');
  if (feriadoPendienteDias > 0) {
    const pendCorridos = habilesACorridos(termino, feriadoPendienteDias);
    add(`Feriado pendiente (${feriadoPendienteDias} días hábiles ≈ ${pendCorridos.toFixed(1)} días corridos)`, pendCorridos * valorDia, 'Art. 73 CT');
  }

  // 3) Indemnizaciones según causal.
  let ias = 0;
  if (causal.ias) {
    if (cumpleUnAno) {
      ias = iasCalculada;
      add(`Indemnización por años de servicio (${anosIndemnizables} año${anosIndemnizables === 1 ? '' : 's'} × ${fmt(base)})`, ias, 'Art. 163 y 172 CT', 'indemnizacion');
    } else {
      notas.push('Con menos de 1 año de antigüedad no corresponde indemnización por años de servicio (art. 163 CT).');
    }
    if (!avisoDado) add('Indemnización sustitutiva del aviso previo (1 mes)', base, 'Art. 161 y 162 CT', 'indemnizacion');
  }

  if (causal.obra) {
    // Ley 21.122: contratos por obra o faena de más de 30 días, terminados por el art. 159 N°5.
    const mesesObra = ant.mesesTotales + (ant.dias > 15 ? 1 : 0);
    if (ant.mesesTotales >= 1) {
      add(`Indemnización por término de obra o faena (2,5 días × ${mesesObra} mes(es))`, (base / 30) * 2.5 * mesesObra, 'Art. 163 inc. final CT (Ley 21.122)', 'indemnizacion');
      notas.push('La indemnización por obra o faena (2,5 días por mes y fracción superior a 15 días) aplica a contratos por obra de más de 30 días celebrados desde la vigencia de la Ley 21.122; verifica la fecha de tu contrato.');
    }
  }

  if (causal.pactada && indemnizacionPactada > 0) {
    add('Indemnización pactada en el mutuo acuerdo', indemnizacionPactada, 'Art. 159 N°1 CT (acuerdo de las partes)', 'indemnizacion');
  }
  if (causal.pactada && !indemnizacionPactada) {
    notas.push('En el mutuo acuerdo no hay indemnización legal obligatoria: solo la que acuerden. No firmes sin negociar el monto.');
  }

  // 4) Descuentos.
  if (causal.afc && aporteAFC > 0 && ias > 0) {
    lineas.push({ concepto: 'Descuento: aporte del empleador al seguro de cesantía (cuenta individual AFC)', monto: -round(Math.min(aporteAFC, ias)), base: 'Art. 13 Ley 19.728', tipo: 'descuento' });
    notas.push('El empleador puede descontar de la indemnización por años de servicio lo que aportó a tu cuenta individual de cesantía (art. 13 Ley 19.728). Según la jurisprudencia de la Corte Suprema, si el despido por necesidades de la empresa es declarado injustificado, ese descuento no procede.');
  } else if (causal.afc && ias > 0) {
    notas.push('Ojo: en despidos por el art. 161, el empleador puede descontar de la indemnización su aporte a tu cuenta individual de cesantía (AFC). Pide el certificado en afc.cl e ingrésalo para un cálculo más exacto.');
  }
  if (descuentos > 0) {
    lineas.push({ concepto: 'Descuentos (anticipos, préstamos u otros autorizados)', monto: -round(descuentos), base: 'Art. 58 CT', tipo: 'descuento' });
  }

  const total = lineas.reduce((s, l) => s + l.monto, 0);

  // 5) Escenarios judiciales.
  const escenarios = [];
  if (causal.autodespido) {
    if (cumpleUnAno) {
      [{ nombre: 'Autodespido acogido (recargo 50%)', p: 50 }, { nombre: 'Autodespido por acoso sexual o laboral (recargo hasta 80%)', p: 80 }].forEach(({ nombre, p }) => {
        escenarios.push({ escenario: nombre, porcentaje: p, recargo: round(iasCalculada * p / 100), totalIndemnizaciones: round(iasCalculada * (1 + p / 100) + base) });
      });
    }
    notas.push('En el autodespido el empleador normalmente no paga indemnizaciones de forma voluntaria: se demandan. Si el tribunal acoge la demanda, se pagan indemnización por años de servicio con recargo y la sustitutiva del aviso previo. Si la rechaza, el término se entiende como renuncia.');
  } else if (causal.recargoSiInjustificado && cumpleUnAno) {
    const opciones = causalKey === '160'
      ? [{ nombre: 'Art. 160 declarado indebido', p: 80 }, { nombre: 'Art. 160 N°1, 5 o 6 sin motivo plausible (hasta)', p: 100 }]
      : causalKey.startsWith('161')
        ? [{ nombre: 'Art. 161 declarado improcedente', p: 30 }]
        : [{ nombre: `${causal.label.split(' – ')[0]} declarado injustificado`, p: 50 }];
    opciones.forEach(({ nombre, p }) => {
      const conAviso = causalKey.startsWith('161') ? 0 : base; // en 159/160 el juez además ordena el aviso previo
      escenarios.push({ escenario: nombre, porcentaje: p, recargo: round(iasCalculada * p / 100), totalIndemnizaciones: round(iasCalculada * (1 + p / 100) + conAviso) });
    });
  }
  escenarios.push({ escenario: 'Tutela de derechos fundamentales con ocasión del despido (adicional)', porcentaje: null, recargo: null, totalIndemnizaciones: null, rango: [round(base * 6), round(base * 11)] });

  if (topeAplicado) notas.push(`Se aplicó el tope de 90 UF (${fmt(topeMonto)}) a la base de cálculo de las indemnizaciones (art. 172 CT).`);
  if (topeAnosAplicado) notas.push('Se aplicó el tope de 11 años (330 días). Si tu contrato es anterior al 14-08-1981, marca esa opción: el tope no aplica.');
  notas.push('Base de cálculo: sueldo, comisiones y regalías permanentes; excluye horas extra y pagos esporádicos (aguinaldos). Si tu remuneración es variable, usa el promedio de los últimos 3 meses (art. 172 CT).');
  notas.push('El feriado se convierte a días corridos sumando los sábados y domingos desde el día siguiente al término; los festivos no están incluidos, por lo que el monto real puede ser algo mayor.');
  notas.push('Las indemnizaciones legales por término de contrato no son imponibles ni tributables dentro de los límites legales. El finiquito debe pagarse dentro de 10 días hábiles desde la separación (art. 177 CT).');

  return {
    ok: true,
    causal: { key: causalKey, label: causal.label },
    antiguedad: { ...ant, anosIndemnizables, cumpleUnAno },
    base: round(base),
    topeMonto: round(topeMonto),
    lineas,
    total,
    escenarios,
    // compatibilidad con la versión anterior
    recargos: escenarios.filter((e) => e.porcentaje !== null).map((e) => ({ escenario: e.escenario, porcentaje: e.porcentaje, recargo: e.recargo, totalConIAS: e.totalIndemnizaciones })),
    notas,
  };
}

module.exports = { calcularFiniquito, calcularIndemnizacion: calcularFiniquito, antiguedad, parseDate, habilesACorridos, CAUSALES };
