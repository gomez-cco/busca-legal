(() => {
  'use strict';

  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('composerInput');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
  const newChatBtn = document.getElementById('newChatBtn');
  const fontUp = document.getElementById('fontUp');
  const fontDown = document.getElementById('fontDown');
  const themeToggle = document.getElementById('themeToggle');
  const areaList = document.getElementById('areaList');
  const openCalcBtn = document.getElementById('openCalcBtn');

  const tplTopic = document.getElementById('tpl-topic-card');
  const tplCalc = document.getElementById('tpl-calc-card');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  // ---------- Accessibility: font scale ----------
  const MIN_SCALE = 0.85, MAX_SCALE = 1.45, STEP = 0.075;
  function currentScale() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale')) || 1;
  }
  function applyFontScale(scale) {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    document.documentElement.style.setProperty('--font-scale', clamped.toFixed(3));
    store.set('buscalegal:fontScale', String(clamped));
  }
  applyFontScale(parseFloat(store.get('buscalegal:fontScale')) || 1);
  fontUp.addEventListener('click', () => applyFontScale(currentScale() + STEP));
  fontDown.addEventListener('click', () => applyFontScale(currentScale() - STEP));

  // ---------- Theme ----------
  const savedTheme = store.get('buscalegal:theme');
  document.documentElement.setAttribute('data-theme',
    savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('buscalegal:theme', next);
  });

  // ---------- Sidebar (mobile) ----------
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('show');
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle.addEventListener('click', () => (sidebar.classList.contains('open') ? closeSidebar() : openSidebar()));
  sidebarBackdrop.addEventListener('click', closeSidebar);

  // ---------- Helpers ----------
  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function fillList(root, role, values, wrapRole) {
    const wrap = root.querySelector(`[data-role="${wrapRole}"]`);
    if (!values || !values.length) { wrap.remove(); return; }
    const list = root.querySelector(`[data-role="${role}"]`);
    values.forEach((v) => {
      const li = document.createElement('li');
      li.textContent = v;
      list.appendChild(li);
    });
  }

  function fillText(root, role, value, wrapRole) {
    if (!value) { root.querySelector(`[data-role="${wrapRole}"]`).remove(); return; }
    root.querySelector(`[data-role="${role}"]`).textContent = value;
  }

  function chips(labels, className) {
    const wrap = document.createElement('div');
    wrap.className = `chips ${className || ''}`;
    labels.forEach((label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = label;
      b.addEventListener('click', () => ask(label));
      wrap.appendChild(b);
    });
    return wrap;
  }

  const fmt = (n) => `$${Math.round(n).toLocaleString('es-CL')}`;

  // ---------- Messages ----------
  function addUserMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg user';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function buildTopicCard(t) {
    const node = tplTopic.content.cloneNode(true);
    const root = node.querySelector('.card-topic');
    root.dataset.area = t.areaId || '';
    root.querySelector('[data-role="area"]').textContent = t.area || '';
    root.querySelector('[data-role="titulo"]').textContent = t.titulo;
    root.querySelector('[data-role="resumen"]').textContent = t.resumen || '';
    root.querySelector('[data-role="explicacion"]').textContent = t.explicacion || '';
    fillList(root, 'plazos', t.plazos, 'plazosWrap');
    fillList(root, 'pasos', t.pasos, 'pasosWrap');
    fillList(root, 'baseLegal', t.baseLegal, 'baseLegalWrap');
    fillList(root, 'documentos', t.documentos, 'documentosWrap');
    fillList(root, 'donde', t.dondeAcudir, 'dondeWrap');
    fillText(root, 'consejo', t.consejo, 'consejoWrap');
    fillText(root, 'alerta', t.alerta, 'alertaWrap');

    const calcWrap = root.querySelector('[data-role="calcWrap"]');
    if (t.calculadora === 'indemnizacion') {
      root.querySelector('[data-role="calcBtn"]').addEventListener('click', () => showCalculator());
    } else {
      calcWrap.remove();
    }
    return root;
  }

  function addAssistantAnswer(answer) {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    const stack = document.createElement('div');
    stack.className = 'assistant-stack';

    (answer.urgent || []).forEach((u) => {
      const urgent = document.createElement('div');
      urgent.className = 'urgent-note';
      urgent.setAttribute('role', 'alert');
      urgent.textContent = u;
      stack.appendChild(urgent);
    });

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = `${answer.greeting || ''} ${answer.body || ''}`.trim();
    stack.appendChild(bubble);

    if (answer.leyes && answer.leyes.length) {
      const leyes = document.createElement('details');
      leyes.className = 'card card-details laws';
      leyes.innerHTML = '<summary>⚖️ Normas principales de esta área</summary>';
      const ul = document.createElement('ul');
      answer.leyes.forEach((l) => { const li = document.createElement('li'); li.textContent = l; ul.appendChild(li); });
      leyes.appendChild(ul);
      stack.appendChild(leyes);
    }

    if (answer.items && answer.items.length) {
      const cards = document.createElement('div');
      cards.className = 'cards';
      answer.items.forEach((item) => cards.appendChild(buildTopicCard(item)));
      stack.appendChild(cards);
    }

    if (answer.topicLinks && answer.topicLinks.length) stack.appendChild(chips(answer.topicLinks));

    if (answer.related && answer.related.length) {
      const label = document.createElement('p');
      label.className = 'related-label';
      label.textContent = 'También te puede servir:';
      stack.appendChild(label);
      stack.appendChild(chips(answer.related, 'chips-soft'));
    }

    if (answer.disclaimer) {
      const d = document.createElement('p');
      d.className = 'disclaimer';
      d.textContent = answer.disclaimer;
      stack.appendChild(d);
    }

    wrap.appendChild(stack);
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  // ---------- Calculator ----------
  function renderCalcResult(container, r) {
    container.innerHTML = '';
    if (!r.ok) {
      const p = document.createElement('p');
      p.className = 'card-alert';
      p.textContent = (r.errors || ['No se pudo calcular.']).join(' ');
      container.appendChild(p);
      return;
    }
    const a = r.antiguedad;
    const intro = document.createElement('p');
    intro.className = 'card-text';
    intro.textContent = `Antigüedad: ${a.anos} año(s), ${a.meses} mes(es) y ${a.dias} día(s) → ${a.anosIndemnizables} año(s) indemnizable(s). Base de cálculo: ${fmt(r.base)}.`;
    container.appendChild(intro);

    const table = document.createElement('table');
    table.className = 'calc-table';
    table.innerHTML = '<thead><tr><th>Concepto</th><th>Monto</th></tr></thead>';
    const tbody = document.createElement('tbody');
    r.lineas.forEach((l) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = l.concepto;
      const small = document.createElement('small');
      small.textContent = ` (${l.base})`;
      td1.appendChild(small);
      const td2 = document.createElement('td');
      td2.textContent = fmt(l.monto);
      tr.append(td1, td2);
      tbody.appendChild(tr);
    });
    const trTotal = document.createElement('tr');
    trTotal.className = 'total';
    trTotal.innerHTML = '<td>Total estimado</td>';
    const tdTotal = document.createElement('td');
    tdTotal.textContent = fmt(r.total);
    trTotal.appendChild(tdTotal);
    tbody.appendChild(trTotal);
    table.appendChild(tbody);
    container.appendChild(table);

    if (r.recargos && r.recargos.length) {
      const det = document.createElement('details');
      det.className = 'card-details';
      det.innerHTML = '<summary>Si un juez declara injustificado el despido (art. 168 CT)</summary>';
      const ul = document.createElement('ul');
      r.recargos.forEach((x) => {
        const li = document.createElement('li');
        li.textContent = `${x.escenario}: recargo ${x.porcentaje}% = ${fmt(x.recargo)} · indemnizaciones totales ≈ ${fmt(x.totalConIAS)}`;
        ul.appendChild(li);
      });
      det.appendChild(ul);
      container.appendChild(det);
    }

    const notas = document.createElement('details');
    notas.className = 'card-details';
    notas.innerHTML = '<summary>Cómo se calculó y advertencias</summary>';
    const ul = document.createElement('ul');
    r.notas.forEach((n) => { const li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
    notas.appendChild(ul);
    container.appendChild(notas);
  }

  function showCalculator() {
    closeSidebar();
    const node = tplCalc.content.cloneNode(true);
    const card = node.querySelector('.card-calc');
    const calcForm = card.querySelector('.calc-form');
    const result = card.querySelector('[data-role="result"]');
    calcForm.fechaTermino.value = new Date().toISOString().slice(0, 10);

    calcForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        fechaInicio: calcForm.fechaInicio.value,
        fechaTermino: calcForm.fechaTermino.value,
        remuneracion: calcForm.remuneracion.value,
        valorUF: calcForm.valorUF.value,
        causal: calcForm.causal.value,
        avisoDado: calcForm.avisoDado.checked,
        feriadoPendienteDias: calcForm.feriadoPendienteDias.value,
      };
      result.textContent = 'Calculando…';
      try {
        const res = await fetch('/api/calc/indemnizacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        renderCalcResult(result, await res.json());
      } catch {
        renderCalcResult(result, { ok: false, errors: ['No pude conectarme con el servidor. Intenta de nuevo.'] });
      }
    });

    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    const stack = document.createElement('div');
    stack.className = 'assistant-stack';
    stack.appendChild(card);
    wrap.appendChild(stack);
    messagesEl.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  openCalcBtn.addEventListener('click', showCalculator);

  // ---------- Ask ----------
  function addAssistantTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    wrap.innerHTML = '<div class="bubble">Revisando la ley…</div>';
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  // Render's free tier sleeps after inactivity; wake it as soon as the page loads.
  fetch('/api/health', { cache: 'no-store' }).catch(() => {});

  async function ask(message) {
    closeSidebar();
    addUserMessage(message);
    const typing = addAssistantTyping();
    const slowNotice = setTimeout(() => {
      const b = typing.querySelector('.bubble');
      if (b) b.textContent = 'Revisando la ley… el servidor estaba dormido y está despertando, puede tardar hasta un minuto la primera vez.';
    }, 6000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      typing.remove();
      const node = addAssistantAnswer(data.answer);
      if (data.answer.items && data.answer.items.length) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      typing.remove();
      addAssistantAnswer({
        greeting: 'Ups.',
        body: err && err.name === 'AbortError'
          ? 'El servidor está tardando más de lo normal (puede estar despertando). Espera unos segundos y vuelve a enviar tu consulta.'
          : 'Tuve un problema de conexión para responder. Revisa tu internet e intenta de nuevo.',
      });
    } finally {
      clearTimeout(slowNotice);
      clearTimeout(timeoutId);
    }
  }

  function submitComposer() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    ask(text);
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); submitComposer(); });
  // requestSubmit() isn't available on older iOS Safari; handle Enter directly.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComposer(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 136) + 'px';
  });

  // ---------- Sidebar content ----------
  async function loadAreas() {
    try {
      const res = await fetch('/api/areas');
      const data = await res.json();
      data.areas.forEach((a) => {
        const det = document.createElement('details');
        det.className = 'area-group';
        det.dataset.area = a.id;
        const sum = document.createElement('summary');
        sum.textContent = `${a.num}. ${a.titulo}`;
        det.appendChild(sum);
        const ul = document.createElement('ul');
        ul.className = 'topic-list';
        a.temas.forEach((t) => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = t.titulo;
          btn.addEventListener('click', () => ask(t.titulo));
          li.appendChild(btn);
          ul.appendChild(li);
        });
        det.appendChild(ul);
        areaList.appendChild(det);
      });
    } catch { /* the sidebar is a convenience; leave it empty on failure */ }
  }
  loadAreas();

  // ---------- Welcome ----------
  function showWelcome() {
    messagesEl.innerHTML = '';
    addAssistantAnswer({
      greeting: '¡Hola! Soy BUSCALEGAL, tu asistente legal.',
      body: 'Cuéntame tu caso con tus palabras y te explico qué dice la ley chilena, qué plazos corren y qué hacer paso a paso. Manejo Derecho Laboral, Tributario, Penal, Comercial y Administrativo.',
      topicLinks: [
        'Me despidieron, ¿cuánto me corresponde?',
        'Me llegó una citación del SII',
        'Detuvieron a un familiar',
        'Quiero constituir una SpA',
        'Un cliente no me paga una factura',
        'La municipalidad rechazó mi patente',
      ],
      disclaimer: 'Orientación general. No reemplaza la asesoría de un abogado que revise tu caso concreto.',
    });
  }
  newChatBtn.addEventListener('click', () => {
    showWelcome();
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    closeSidebar();
  });
  showWelcome();
})();
