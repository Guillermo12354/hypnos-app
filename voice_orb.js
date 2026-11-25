(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Buscar la tarjeta de Guía Nocturna IA
  const panels = Array.from(document.querySelectorAll('.panel'));
  const aiPanel = panels.find(p => {
    const h = p.querySelector('h2, h3');
    return h && /gu[ií]a nocturna|ia/i.test(h.textContent);
  });
  if (!aiPanel) return;

  const aiInput = aiPanel.querySelector('input[type="text"], input:not([type="password"]):not([type="checkbox"]), textarea');
  const sendBtn = Array.from(aiPanel.querySelectorAll('button')).find(b => /enviar/i.test(b.textContent));

  // Estilos de la esfera
  const style = document.createElement('style');
  style.textContent = `
    .orb-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 6px 0 10px;
      padding: 10px 8px 6px;
      border-radius: 16px;
      background: radial-gradient(circle at 50% 45%, rgba(94, 106, 210, 0.14), rgba(11, 17, 43, 0.35) 70%);
      border: 1px solid rgba(238, 242, 255, 0.07);
    }
    .orb-btn {
      position: relative;
      width: 124px;
      height: 124px;
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    #ai-voice-orb {
      width: 124px;
      height: 124px;
      display: block;
    }
    .orb-caption {
      font-size: 0.78rem;
      color: var(--text-muted, #94a3b8);
      text-align: center;
      min-height: 1.2em;
      max-width: 92%;
      line-height: 1.35;
    }
    .orb-caption.live { color: #f2a663; font-weight: 500; }
  `;
  document.head.appendChild(style);

  // Insertar esfera justo debajo del encabezado de Guía Nocturna IA
  const orbWrap = document.createElement('div');
  orbWrap.className = 'orb-wrap';
  orbWrap.innerHTML = `
    <button type="button" class="orb-btn" id="btn-voice-orb" aria-label="Hablar con la IA">
      <canvas id="ai-voice-orb"></canvas>
    </button>
    <div class="orb-caption" id="orb-caption">Toca la esfera para hablar con Hypnos</div>
  `;

  const header = aiPanel.querySelector('.panel-header');
  if (header && header.nextSibling) {
    aiPanel.insertBefore(orbWrap, header.nextSibling);
  } else {
    aiPanel.prepend(orbWrap);
  }

  const orbBtn = document.getElementById('btn-voice-orb');
  const canvas = document.getElementById('ai-voice-orb');
  const caption = document.getElementById('orb-caption');
  const ctx = canvas.getContext('2d');

  // Estados: idle | listening | thinking | speaking
  let mode = 'idle';
  let energy = 0.15;
  let targetEnergy = 0.15;
  let recognition = null;
  let thinkTimer = null;
  let finalText = '';

  function setStatus(newMode, text, isLive = false) {
    mode = newMode;
    if (text !== undefined) {
      caption.textContent = text;
      caption.classList.toggle('live', isLive);
    }
  }

  function submitVoiceText(text) {
    const clean = (text || '').trim();
    if (!clean) {
      setStatus('idle', 'No escuché nada. Toca la esfera para intentar de nuevo.');
      return;
    }
    if (aiInput && sendBtn) {
      aiInput.value = clean;
      aiInput.dispatchEvent(new Event('input', { bubbles: true }));
      setStatus('thinking', `“${clean}” · Pensando...`, true);
      clearTimeout(thinkTimer);
      thinkTimer = setTimeout(() => {
        if (mode === 'thinking') setStatus('idle', 'Toca la esfera para hablar con Hypnos');
      }, 14000);
      sendBtn.click();
    } else {
      setStatus('idle', `Escuché: "${clean}"`);
    }
  }

  function startListening() {
    if (!SR) {
      setStatus('idle', 'Tu navegador no soporta voz. Usa Chrome.');
      return;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }

    finalText = '';
    recognition = new SR();
    recognition.lang = 'es-MX';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening', 'Escuchando... habla ahora', true);
      targetEnergy = 0.45;
    };

    recognition.onspeechstart = () => {
      targetEnergy = 0.85;
    };

    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      const preview = (finalText + interim).trim();
      if (preview) {
        caption.textContent = `“${preview}”`;
        caption.classList.add('live');
        targetEnergy = 0.95;
      }
    };

    recognition.onerror = (e) => {
      const msg = e.error === 'not-allowed'
        ? 'Permite el micrófono en Chrome para usar la voz.'
        : 'Toca la esfera para hablar con Hypnos';
      setStatus('idle', msg);
    };

    recognition.onend = () => {
      const spoken = finalText.trim();
      recognition = null;
      if (spoken) {
        submitVoiceText(spoken);
      } else if (mode === 'listening') {
        setStatus('idle', 'Toca la esfera para hablar con Hypnos');
      }
    };

    try {
      recognition.start();
    } catch (_) {
      setStatus('idle', 'Toca la esfera para hablar con Hypnos');
    }
  }

  orbBtn.addEventListener('click', () => {
    if (mode === 'listening' && recognition) {
      try { recognition.stop(); } catch (_) {}
      return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    startListening();
  });

  // Render de la esfera animada en 60 FPS
  const size = 124;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let t = 0;

  function drawBlob(cx, cy, baseR, amp, speed, freqA, freqB, color, alpha) {
    ctx.beginPath();
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wave =
        Math.sin(a * freqA + t * speed) * amp +
        Math.cos(a * freqB - t * speed * 1.3) * (amp * 0.6);
      const r = baseR + wave;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  }

  function animate() {
    requestAnimationFrame(animate);

    // Sincronizar automáticamente cuando la IA está hablando
    const isSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
    if (isSpeaking && mode !== 'listening') {
      if (mode !== 'speaking') {
        clearTimeout(thinkTimer);
        setStatus('speaking', 'Hypnos está hablando... (toca para interrumpir)', true);
      }
    } else if (!isSpeaking && mode === 'speaking') {
      setStatus('idle', 'Toca la esfera para hablar con Hypnos');
    }

    if (mode === 'idle') targetEnergy = 0.16;
    else if (mode === 'listening') targetEnergy = Math.max(0.45, targetEnergy * 0.96);
    else if (mode === 'thinking') targetEnergy = 0.55;
    else if (mode === 'speaking') {
      targetEnergy = 0.55 + Math.abs(Math.sin(t * 5.2)) * 0.45;
    }

    energy += (targetEnergy - energy) * 0.12;
    t += mode === 'thinking' ? 0.075 : (mode === 'speaking' ? 0.065 : 0.035);

    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;

    // Paleta por estado
    let c1 = '#5E6AD2', c2 = '#818CF8', c3 = '#F2A663';
    if (mode === 'listening') { c1 = '#0EA5E9'; c2 = '#38BDF8'; c3 = '#F2A663'; }
    else if (mode === 'thinking') { c1 = '#7C3AED'; c2 = '#A855F7'; c3 = '#6366F1'; }
    else if (mode === 'speaking') { c1 = '#F2A663'; c2 = '#FB923C'; c3 = '#818CF8'; }

    // Halo externo difuso
    const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 56 + energy * 6);
    halo.addColorStop(0, c1);
    halo.addColorStop(0.55, 'rgba(94, 106, 210, 0.18)');
    halo.addColorStop(1, 'rgba(11, 17, 43, 0)');
    ctx.globalAlpha = 0.55 + energy * 0.35;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();

    // 3 capas orgánicas que se deforman al hablar
    const baseR = 31 + energy * 7;
    const amp = 2.2 + energy * 7.5;

    ctx.globalCompositeOperation = 'lighter';
    drawBlob(cx, cy, baseR, amp, 1.4, 3, 5, c1, 0.52);
    drawBlob(cx, cy, baseR * 0.92, amp * 0.9, -1.8, 4, 2, c2, 0.45);
    drawBlob(cx, cy, baseR * 0.78, amp * 0.7, 2.3, 2, 6, c3, 0.48);

    // Núcleo brillante central
    ctx.globalCompositeOperation = 'source-over';
    const core = ctx.createRadialGradient(cx - 6, cy - 6, 3, cx, cy, baseR * 0.85);
    core.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    core.addColorStop(0.35, c3);
    core.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  animate();
})();