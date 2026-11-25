(() => {
  const STORAGE_ALARM = 'hypnos_alarm_cfg_v1';
  const STORAGE_BPM = 'hypnos_bpm_hist_v1';

  const bpmSlider = document.getElementById('bpm-slider');
  const bioPanel = bpmSlider ? bpmSlider.closest('.panel') : null;
  const shell = document.querySelector('.app-shell') || document.querySelector('main') || document.body;

  // --- 1. Inyectar estilos ---
  const style = document.createElement('style');
  style.textContent = `
    .hr-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .hr-stat-box {
      background: rgba(11, 17, 43, 0.7);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 8px 10px;
      text-align: center;
    }
    .hr-stat-label { display: block; font-size: 0.68rem; color: var(--text-muted, #94a3b8); }
    .hr-stat-val { font-size: 0.95rem; font-weight: 700; color: var(--text-main, #eef2ff); }
    .hr-canvas-wrap {
      width: 100%;
      height: 155px;
      background: rgba(8, 12, 32, 0.65);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 8px;
      box-sizing: border-box;
    }
    #hr-chart { width: 100%; height: 100%; display: block; }
    .alarm-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .alarm-time-input {
      background: rgba(11, 17, 43, 0.85);
      color: #eef2ff;
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 1.25rem;
      font-weight: 700;
      font-family: monospace;
      color-scheme: dark;
      flex: 1;
      min-width: 125px;
    }
    .alarm-banner {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: linear-gradient(90deg, rgba(242,166,99,0.22), rgba(94,106,210,0.22));
      border: 1px solid rgba(242,166,99,0.55);
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.82rem;
    }
    .alarm-banner.active { display: flex; }
  `;
  document.head.appendChild(style);

  // --- 2. Panel de Gráfica Cardíaca ---
  const chartSection = document.createElement('section');
  chartSection.className = 'panel';
  chartSection.id = 'hr-chart-section';
  chartSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>Gráfica de Pulsaciones</h2>
        <span class="muted-note" id="hr-live-note">Registro continuo en vivo (BPM)</span>
      </div>
      <button class="text-btn" id="btn-clear-hr">Limpiar</button>
    </div>
    <div class="hr-canvas-wrap">
      <canvas id="hr-chart"></canvas>
    </div>
    <div class="hr-stats">
      <div class="hr-stat-box"><span class="hr-stat-label">Mínimo</span><span class="hr-stat-val mono-tag" id="hr-min">--</span></div>
      <div class="hr-stat-box"><span class="hr-stat-label">Promedio</span><span class="hr-stat-val mono-tag" id="hr-avg" style="color:var(--amber);">--</span></div>
      <div class="hr-stat-box"><span class="hr-stat-label">Máximo</span><span class="hr-stat-val mono-tag" id="hr-max">--</span></div>
    </div>
  `;

  // --- 3. Panel de Despertador ---
  const alarmSection = document.createElement('section');
  alarmSection.className = 'panel';
  alarmSection.id = 'wake-alarm-section';
  alarmSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>Hora de Despertar</h2>
        <span class="muted-note" id="alarm-status-text">Sin alarma activa</span>
      </div>
      <button class="text-btn" id="btn-test-alarm">🌅 Probar</button>
    </div>
    <div class="alarm-row">
      <input type="time" id="alarm-time" class="alarm-time-input" value="06:00" />
      <button class="primary-btn" id="btn-toggle-alarm" style="padding:11px 16px;">⏰ Activar</button>
    </div>
    <div class="alarm-banner" id="alarm-banner">
      <span>☀️ <strong>¡Hora de despertar!</strong> Amanecer activo en SleepBox.</span>
      <button class="primary-btn" id="btn-stop-alarm" style="padding:6px 10px; font-size:0.75rem;">Detener</button>
    </div>
  `;

  if (bioPanel && bioPanel.parentNode) {
    bioPanel.parentNode.insertBefore(alarmSection, bioPanel.nextSibling);
    bioPanel.parentNode.insertBefore(chartSection, bioPanel.nextSibling);
  } else {
    shell.appendChild(chartSection);
    shell.appendChild(alarmSection);
  }

  // --- Lógica de Gráfica BPM ---
  const canvas = document.getElementById('hr-chart');
  const ctx = canvas.getContext('2d');
  const elMin = document.getElementById('hr-min');
  const elAvg = document.getElementById('hr-avg');
  const elMax = document.getElementById('hr-max');
  const elNote = document.getElementById('hr-live-note');

  let bpmHistory = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_BPM) || '[]');
    if (Array.isArray(saved)) bpmHistory = saved.slice(-36);
  } catch (_) {}

  function getCurrentBpm() {
    return bpmSlider ? Number(bpmSlider.value) || 68 : 68;
  }

  function recordBpm(val) {
    const bpm = Math.round(Number(val));
    if (!bpm || bpm < 35 || bpm > 210) return;
    const now = new Date();
    const t = now.toTimeString().slice(0, 5);
    bpmHistory.push({ bpm, t });
    if (bpmHistory.length > 36) bpmHistory.shift();
    try { localStorage.setItem(STORAGE_BPM, JSON.stringify(bpmHistory)); } catch (_) {}
    elNote.textContent = `Última lectura: ${bpm} BPM · ${t}`;
    drawChart();
  }

  function drawChart() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const padL = 32, padR = 12, padT = 12, padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    if (bpmHistory.length === 0) {
      recordBpm(getCurrentBpm());
      return;
    }

    const vals = bpmHistory.map(p => p.bpm);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const avgV = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

    elMin.textContent = `${minV} BPM`;
    elAvg.textContent = `${avgV} BPM`;
    elMax.textContent = `${maxV} BPM`;

    const yMin = Math.max(40, Math.floor((minV - 10) / 10) * 10);
    const yMax = Math.min(190, Math.ceil((maxV + 10) / 10) * 10);
    const ySpan = Math.max(20, yMax - yMin);

    // Rejilla horizontal
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.strokeStyle = 'rgba(238, 242, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const v = Math.round(yMin + (ySpan * i) / 3);
      const y = padT + plotH - ((v - yMin) / ySpan) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(String(v), 4, y + 3);
    }

    const pts = bpmHistory.map((p, idx) => {
      const x = bpmHistory.length === 1
        ? padL + plotW / 2
        : padL + (idx / (bpmHistory.length - 1)) * plotW;
      const y = padT + plotH - ((p.bpm - yMin) / ySpan) * plotH;
      return { x, y, bpm: p.bpm, t: p.t };
    });

    // Área degradada bajo la curva
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, 'rgba(242, 166, 99, 0.38)');
    grad.addColorStop(1, 'rgba(94, 106, 210, 0.02)');

    ctx.beginPath();
    pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.lineTo(pts[pts.length - 1].x, padT + plotH);
    ctx.lineTo(pts[0].x, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Línea principal
    ctx.beginPath();
    pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.strokeStyle = '#F2A663';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Punto brillante en la última lectura
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#F2A663';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(242, 166, 99, 0.25)';
    ctx.fill();

    // Etiquetas de tiempo inicio / fin
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.fillText(pts[0].t, padL, h - 4);
    if (pts.length > 1) {
      ctx.fillText(last.t, w - padR - 28, h - 4);
    }
  }

  if (bpmSlider) {
    bpmSlider.addEventListener('input', () => recordBpm(bpmSlider.value));
  }
  document.getElementById('btn-clear-hr').addEventListener('click', () => {
    bpmHistory = [];
    localStorage.removeItem(STORAGE_BPM);
    recordBpm(getCurrentBpm());
  });

  if (bpmHistory.length === 0) recordBpm(getCurrentBpm());
  else drawChart();

  // Muestreo automático cada 4 segundos para mantener la gráfica viva
  setInterval(() => recordBpm(getCurrentBpm()), 4000);
  window.addEventListener('resize', drawChart);

  // --- Lógica de Despertador Circadiano ---
  const timeInput = document.getElementById('alarm-time');
  const toggleBtn = document.getElementById('btn-toggle-alarm');
  const testBtn = document.getElementById('btn-test-alarm');
  const stopBtn = document.getElementById('btn-stop-alarm');
  const statusEl = document.getElementById('alarm-status-text');
  const bannerEl = document.getElementById('alarm-banner');

  let alarmCfg = { time: '06:00', enabled: false };
  let lastTriggeredMin = '';
  let chimeTimer = null;
  let audioCtx = null;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_ALARM) || 'null');
    if (saved && saved.time) alarmCfg = saved;
  } catch (_) {}

  timeInput.value = alarmCfg.time;

  function saveAlarm() {
    try { localStorage.setItem(STORAGE_ALARM, JSON.stringify(alarmCfg)); } catch (_) {}
  }

  function formatRemaining(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diffMin = Math.round((target - now) / 60000);
    const rh = Math.floor(diffMin / 60);
    const rm = diffMin % 60;
    return rh > 0 ? `Faltan ${rh}h ${rm}m` : `Faltan ${rm} min`;
  }

  function renderAlarmUI() {
    if (alarmCfg.enabled) {
      toggleBtn.textContent = '✅ Activa';
      statusEl.textContent = `Despertador a las ${alarmCfg.time} · ${formatRemaining(alarmCfg.time)}`;
    } else {
      toggleBtn.textContent = '⏰ Activar';
      statusEl.textContent = `Desactivado (${alarmCfg.time})`;
    }
  }

  function playGentleChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = audioCtx.currentTime + i * 0.25;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.95);
      });
    } catch (_) {}
  }

  function triggerAlarm() {
    bannerEl.classList.add('active');
    playGentleChime();
    if (!chimeTimer) chimeTimer = setInterval(playGentleChime, 3200);
    if ('speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance('Buenos días. Es hora de despertar.');
        u.lang = 'es-MX';
        window.speechSynthesis.speak(u);
      } catch (_) {}
    }
  }

  function stopAlarm() {
    bannerEl.classList.remove('active');
    if (chimeTimer) { clearInterval(chimeTimer); chimeTimer = null; }
  }

  timeInput.addEventListener('change', () => {
    alarmCfg.time = timeInput.value || '06:00';
    lastTriggeredMin = '';
    saveAlarm();
    renderAlarmUI();
  });

  toggleBtn.addEventListener('click', () => {
    alarmCfg.enabled = !alarmCfg.enabled;
    lastTriggeredMin = '';
    if (!alarmCfg.enabled) stopAlarm();
    saveAlarm();
    renderAlarmUI();
  });

  testBtn.addEventListener('click', triggerAlarm);
  stopBtn.addEventListener('click', stopAlarm);

  renderAlarmUI();
  setInterval(() => {
    renderAlarmUI();
    if (!alarmCfg.enabled) return;
    const now = new Date();
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (cur === alarmCfg.time && lastTriggeredMin !== cur) {
      lastTriggeredMin = cur;
      triggerAlarm();
    }
  }, 5000);
})();