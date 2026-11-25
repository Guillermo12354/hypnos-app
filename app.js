const presetBtns = document.querySelectorAll('.preset-btn');
const slider = document.getElementById('brightness-slider');
const brightnessVal = document.getElementById('brightness-val');
const toggleBreath = document.getElementById('toggle-breath');
const statusText = document.getElementById('led-status-text');
const audioBtns = document.querySelectorAll('.audio-btn');
const audioStatus = document.getElementById('audio-status');
const volumeSlider = document.getElementById('volume-slider');
const volumeVal = document.getElementById('volume-val');
const btnBle = document.getElementById('btn-ble');
const bleStatus = document.getElementById('ble-status');
const bpmValue = document.getElementById('bpm-value');
const bpmSlider = document.getElementById('bpm-slider');
const bpmStateLabel = document.getElementById('bpm-state-label');
const btnToggleKey = document.getElementById('btn-toggle-key');
const keyBox = document.getElementById('key-box');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveKey = document.getElementById('btn-save-key');
const aiForm = document.getElementById('ai-form');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiResponse = document.getElementById('ai-response');
const chips = document.querySelectorAll('.chip');
const btnSaveSession = document.getElementById('btn-save-session');
const historyList = document.getElementById('history-list');

let currentColorName = 'Ámbar Crepúsculo';
let currentSoundLabel = 'Silencio';
let currentBpm = 68;

function applyLedUI(colorHex, colorName, brightness, breathing) {
  currentColorName = colorName;
  slider.value = brightness;
  brightnessVal.textContent = `${brightness}%`;
  toggleBreath.checked = breathing;
  presetBtns.forEach(b => b.classList.toggle('active', b.dataset.color.toUpperCase() === colorHex.toUpperCase()));
  window.SleepBox3D.setColor(colorHex);
  window.SleepBox3D.setBrightness(brightness);
  window.SleepBox3D.setBreathing(breathing);
  statusText.textContent = `${currentColorName} · ${brightness}%`;
}

presetBtns.forEach(btn => btn.addEventListener('click', () => applyLedUI(btn.dataset.color, btn.dataset.name, Number(slider.value), toggleBreath.checked)));
slider.addEventListener('input', () => {
  brightnessVal.textContent = `${slider.value}%`;
  window.SleepBox3D.setBrightness(slider.value);
  statusText.textContent = `${currentColorName} · ${slider.value}%`;
});
toggleBreath.addEventListener('change', () => window.SleepBox3D.setBreathing(toggleBreath.checked));

function applyAudioUI(soundMode, volumePercent) {
  const btn = Array.from(audioBtns).find(b => b.dataset.sound === soundMode) || audioBtns[0];
  audioBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentSoundLabel = btn.dataset.label;
  audioStatus.textContent = currentSoundLabel;
  volumeSlider.value = volumePercent;
  volumeVal.textContent = `${volumePercent}%`;
  window.HypnosAudio.setVolume(volumePercent);
  window.HypnosAudio.play(soundMode);
}

audioBtns.forEach(btn => btn.addEventListener('click', () => applyAudioUI(btn.dataset.sound, Number(volumeSlider.value))));
volumeSlider.addEventListener('input', () => {
  volumeVal.textContent = `${volumeSlider.value}%`;
  window.HypnosAudio.setVolume(volumeSlider.value);
});

function updateBpmUI(bpm) {
  currentBpm = bpm;
  bpmValue.textContent = bpm;
  bpmSlider.value = bpm;
  bpmStateLabel.textContent = bpm < 65 ? 'Descanso profundo' : (bpm <= 82 ? 'Relajado' : 'Activado / Tenso');
}
bpmSlider.addEventListener('input', () => updateBpmUI(Number(bpmSlider.value)));

btnBle.addEventListener('click', async () => {
  if (!navigator.bluetooth) { bleStatus.textContent = 'Usa Chrome para BLE'; return; }
  try {
    bleStatus.textContent = 'Buscando E19...';
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'heart_rate',
        'battery_service',
        '0000fff0-0000-1000-8000-00805f9b34fb',
        '0000fee0-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
      ]
    });
    btnBle.textContent = `⌚ ${device.name || 'E19'}`;
    btnBle.classList.add('active');
    const server = await device.gatt.connect();
    try {
      const service = await server.getPrimaryService('heart_rate');
      const char = await service.getCharacteristic('heart_rate_measurement');
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', e => {
        const val = e.target.value;
        const bpm = (val.getUint8(0) & 1) ? val.getUint16(1, true) : val.getUint8(1);
        updateBpmUI(bpm);
      });
      bleStatus.textContent = 'E19 en vivo (BLE)';
    } catch {
      bleStatus.textContent = 'E19 vinculado (protocolo cerrado · usa slider)';
    }
  } catch {
    bleStatus.textContent = 'Sin conexión BLE · Modo manual';
  }
});

const savedKey = localStorage.getItem('hypnos_gemini_key') || '';
if (savedKey) apiKeyInput.value = savedKey;
else keyBox.classList.remove('hidden');

btnToggleKey.addEventListener('click', () => keyBox.classList.toggle('hidden'));
btnSaveKey.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  localStorage.setItem('hypnos_gemini_key', key);
  keyBox.classList.add('hidden');
  aiResponse.textContent = 'Clave guardada. Tu guía nocturna IA está lista.';
});

async function getAvailableModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    if (!res.ok || !data.models) return [];
    return data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini'))
      .map(m => m.name.replace('models/', ''))
      .filter(n => !/(image|tts|embedding|aqa|robotics|computer)/i.test(n));
  } catch { return []; }
}

async function callGeminiAuto(apiKey, payload) {
  const discovered = await getAvailableModels(apiKey);
  const prioritized = [
    'gemini-3.8-flash',
    ...discovered.filter(m => m.includes('lite')),
    ...discovered.filter(m => m.includes('flash')),
    ...discovered
  ];
  const queue = [...new Set(prioritized)].slice(0, 8);
  let lastErr = 'Sin respuesta del servidor';

  for (const model of queue) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    lastErr = `${model}: ${data.error?.message || res.status}`;
  }
  throw new Error(lastErr);
}

async function askHypnosAI(userMessage) {
  const apiKey = localStorage.getItem('hypnos_gemini_key');
  if (!apiKey) {
    keyBox.classList.remove('hidden');
    aiResponse.textContent = 'Primero pega y guarda tu Gemini API Key arriba.';
    return;
  }
  aiSendBtn.disabled = true;
  aiResponse.textContent = 'Analizando tu estado y calibrando SleepBox...';

  const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const systemPrompt = `Eres la guía nocturna de Hypnos App (SleepBox de Hypnos Labs).
Voz de marca: tranquila, cálida, empática, breve (máximo 2-3 frases) y respaldada por datos reales. NUNCA uses lenguaje clínico ni alarmista.
Responde ÚNICAMENTE con un objeto JSON válido:
{"mensaje":"Texto breve en español","color":"#F2A663|#5E6AD2|#EEF2FF|#000000","colorNombre":"Ámbar Crepúsculo|Índigo Onírico|Niebla Lunar|Apagado","brillo":0-100,"respiracion":true,"sonido":"rain|brown|warm|off","volumen":0-100}`;

  try {
    const rawText = await callGeminiAuto(apiKey, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: `Hora: ${now}. Pulso E19: ${currentBpm} BPM. Usuario: "${userMessage}"` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    });
    const plan = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    aiResponse.textContent = plan.mensaje;
    applyLedUI(plan.color, plan.colorNombre, plan.brillo, plan.respiracion);
    applyAudioUI(plan.sonido, plan.volumen);
    saveSession(`IA · ${plan.colorNombre} + ${currentSoundLabel}`);
  } catch (err) {
    aiResponse.textContent = `Error Gemini: ${err.message}`;
  } finally {
    aiSendBtn.disabled = false;
  }
}

aiForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = aiInput.value.trim();
  if (!msg) return;
  aiInput.value = '';
  askHypnosAI(msg);
});
chips.forEach(chip => chip.addEventListener('click', () => askHypnosAI(chip.dataset.prompt)));

function loadHistory() {
  const items = JSON.parse(localStorage.getItem('hypnos_history') || '[]');
  if (!items.length) {
    historyList.innerHTML = '<li class="muted-note">Aún no hay sesiones registradas esta noche.</li>';
    return;
  }
  historyList.innerHTML = items.slice(0, 6).map(item => `
    <li class="history-item">
      <div><div>${item.label}</div><div class="history-meta">${item.time}</div></div>
      <span class="mono-tag">${item.bpm} BPM</span>
    </li>`).join('');
}

function saveSession(customLabel) {
  const items = JSON.parse(localStorage.getItem('hypnos_history') || '[]');
  const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  items.unshift({ label: customLabel || `${currentColorName} · ${currentSoundLabel}`, bpm: currentBpm, time });
  localStorage.setItem('hypnos_history', JSON.stringify(items.slice(0, 15)));
  loadHistory();
}

btnSaveSession.addEventListener('click', () => saveSession());
loadHistory();
