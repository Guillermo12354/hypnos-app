(() => {
  const bpmSlider = document.getElementById('bpm-slider');
  const bioPanel = bpmSlider ? bpmSlider.closest('.panel') : null;
  const shell = document.querySelector('.app-shell') || document.querySelector('main') || document.body;

  // Buscar paneles existentes por su título
  function findPanelByTitle(keyword) {
    const panels = Array.from(document.querySelectorAll('.panel'));
    return panels.find(p => {
      const h = p.querySelector('h2, h3');
      return h && h.textContent.toLowerCase().includes(keyword.toLowerCase());
    }) || null;
  }

  function clickBtnInPanel(panel, label) {
    if (!panel) return;
    const btns = Array.from(panel.querySelectorAll('button'));
    const target = btns.find(b => b.textContent.trim().toLowerCase() === label.toLowerCase());
    if (target) target.click();
  }

  function setRangeInPanel(panel, val) {
    if (!panel) return;
    const range = panel.querySelector('input[type="range"]');
    if (range) {
      range.value = String(val);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function setCheckboxInPanel(panel, checked) {
    if (!panel) return;
    const cb = panel.querySelector('input[type="checkbox"]');
    if (cb && cb.checked !== checked) {
      cb.checked = checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Estilos del panel autónomo
  const style = document.createElement('style');
  style.textContent = `
    .auto-controls { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
    .auto-status-box {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(11, 17, 43, 0.72);
      border: 1px solid var(--surface-border);
      font-size: 0.8rem;
      line-height: 1.4;
      color: var(--text-main, #eef2ff);
    }
    .auto-status-box.alert { border-color: rgba(242, 166, 99, 0.7); background: rgba(242, 166, 99, 0.12); }
    .auto-check { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--text-muted, #94a3b8); cursor: pointer; }
  `;
  document.head.appendChild(style);

  // Crear tarjeta de Modo Autónomo
  const autoSection = document.createElement('section');
  autoSection.className = 'panel';
  autoSection.id = 'auto-pilot-section';
  autoSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>Modo Autónomo (Sin IA)</h2>
        <span class="muted-note">Ajuste automático por hora y pulsaciones</span>
      </div>
      <button class="primary-btn" id="btn-auto-toggle" style="padding:7px 12px; font-size:0.78rem;">🤖 OFF</button>
    </div>
    <div class="auto-controls">
      <label class="auto-check">
        <input type="checkbox" id="chk-force-night" />
        <span>🌙 Simular madrugada (para pruebas de día)</span>
      </label>
      <span class="mono-tag" id="auto-clock-tag" style="font-size:0.74rem; color:var(--indigo);">--:--</span>
    </div>
    <div class="auto-status-box" id="auto-status-box">
      Activa el modo autónomo para que SleepBox regule luz y sonido automáticamente según tus BPM.
    </div>
  `;

  if (bioPanel && bioPanel.parentNode) {
    bioPanel.parentNode.insertBefore(autoSection, bioPanel.nextSibling);
  } else {
    shell.appendChild(autoSection);
  }

  const btnToggle = document.getElementById('btn-auto-toggle');
  const chkNight = document.getElementById('chk-force-night');
  const statusBox = document.getElementById('auto-status-box');
  const clockTag = document.getElementById('auto-clock-tag');

  let enabled = localStorage.getItem('hypnos_auto_enabled') === '1';
  let forceNight = localStorage.getItem('hypnos_auto_force_night') === '1';
  let lastZone = '';

  chkNight.checked = forceNight;

  function isLateNight() {
    if (forceNight) return true;
    const h = new Date().getHours();
    return h >= 22 || h < 6;
  }

  function applyScene(zone, bpm) {
    const lightPanel = findPanelByTitle('Iluminación');
    const soundPanel = findPanelByTitle('Sonido');

    statusBox.classList.remove('alert');

    if (zone === 'day') {
      statusBox.innerHTML = `☀️ <strong>Horario diurno (${bpm} BPM):</strong> En espera del horario nocturno (22:00–06:00). Marca <em>Simular madrugada</em> para probar ahora.`;
      return;
    }

    if (zone === 'high') {
      clickBtnInPanel(lightPanel, 'Índigo');
      setCheckboxInPanel(lightPanel, true);
      setRangeInPanel(lightPanel, 45);
      clickBtnInPanel(soundPanel, 'Ruido café');
      setRangeInPanel(soundPanel, 50);
      statusBox.classList.add('alert');
      statusBox.innerHTML = `⚡ <strong>Pulso alto nocturno (${bpm} BPM):</strong> Activando luz <strong>Índigo (45%)</strong> con respiración + <strong>Ruido café</strong> automáticamente.`;
    } else if (zone === 'mid') {
      clickBtnInPanel(lightPanel, 'Ámbar');
      setCheckboxInPanel(lightPanel, true);
      setRangeInPanel(lightPanel, 35);
      clickBtnInPanel(soundPanel, 'Lluvia');
      setRangeInPanel(soundPanel, 35);
      statusBox.innerHTML = `🌙 <strong>Relajación nocturna (${bpm} BPM):</strong> Ajustando a luz <strong>Ámbar (35%)</strong> + <strong>Lluvia suave</strong>.`;
    } else if (zone === 'low') {
      clickBtnInPanel(lightPanel, 'Ámbar');
      setCheckboxInPanel(lightPanel, false);
      setRangeInPanel(lightPanel, 10);
      clickBtnInPanel(soundPanel, 'Silencio');
      statusBox.innerHTML = `💤 <strong>Descanso profundo (${bpm} BPM):</strong> Atenuando luz a <strong>10%</strong> y silenciando audio para cuidar tu sueño.`;
    }
  }

  function evaluate(forceApply = false) {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    clockTag.textContent = forceNight ? `${hhmm} (Modo noche)` : hhmm;

    btnToggle.textContent = enabled ? '🤖 ACTIVO' : '🤖 OFF';
    if (!enabled) {
      lastZone = '';
      statusBox.classList.remove('alert');
      statusBox.textContent = 'Modo autónomo apagado. Control manual o por IA activo.';
      return;
    }

    const bpm = bpmSlider ? Number(bpmSlider.value) || 68 : 68;
    let zone = 'day';
    if (isLateNight()) {
      if (bpm >= 85) zone = 'high';
      else if (bpm >= 65) zone = 'mid';
      else zone = 'low';
    }

    if (forceApply || zone !== lastZone) {
      lastZone = zone;
      applyScene(zone, bpm);
    }
  }

  btnToggle.addEventListener('click', () => {
    enabled = !enabled;
    localStorage.setItem('hypnos_auto_enabled', enabled ? '1' : '0');
    evaluate(true);
  });

  chkNight.addEventListener('change', () => {
    forceNight = chkNight.checked;
    localStorage.setItem('hypnos_auto_force_night', forceNight ? '1' : '0');
    evaluate(true);
  });

  if (bpmSlider) {
    bpmSlider.addEventListener('input', () => evaluate(false));
  }

  evaluate(true);
  setInterval(() => evaluate(false), 5000);
})();