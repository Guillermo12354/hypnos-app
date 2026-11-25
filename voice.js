let voiceEnabled = true;

function pickSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  const isSpanish = v => /^es([-_]|$)/i.test(v.lang);
  const notWeird = v => !/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Bahh|Bells|Boing|Bubbles/i.test(v.name);

  const esVoices = voices.filter(v => isSpanish(v) && notWeird(v));

  return (
    esVoices.find(v => /Google español de Estados Unidos/i.test(v.name)) ||
    esVoices.find(v => /Google español/i.test(v.name)) ||
    esVoices.find(v => /Paulina|Dalia|Sabina|Mónica|Monica|Sofía|Sofia/i.test(v.name)) ||
    esVoices.find(v => /es[-_]MX/i.test(v.lang)) ||
    esVoices.find(v => /es[-_]US|es[-_]419|es[-_]ES/i.test(v.lang)) ||
    esVoices[0] ||
    null
  );
}

function speakHypnos(text) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  if (/^(Analizando|Error|No pude|Primero pega|Clave guardada|Cuéntame)/i.test(text)) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickSpanishVoice();

  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = 'es-MX';
  }

  utter.rate = 0.94;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}

window.addEventListener('DOMContentLoaded', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = pickSpanishVoice;
  }

  const header = document.querySelector('.ai-panel .panel-header');
  if (header) {
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    const keyBtn = document.getElementById('btn-toggle-key');
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'text-btn';
    voiceBtn.textContent = '🔊 Voz ON';
    voiceBtn.addEventListener('click', () => {
      voiceEnabled = !voiceEnabled;
      voiceBtn.textContent = voiceEnabled ? '🔊 Voz ON' : '🔇 Voz OFF';
      if (!voiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    });
    header.appendChild(controls);
    controls.appendChild(voiceBtn);
    if (keyBtn) controls.appendChild(keyBtn);
  }

  document.querySelectorAll('.chip, #ai-send-btn').forEach(el => {
    el.addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    });
  });

  const bubble = document.getElementById('ai-response');
  if (bubble) {
    new MutationObserver(() => {
      const txt = bubble.textContent.trim();
      if (txt) speakHypnos(txt);
    }).observe(bubble, { childList: true, characterData: true, subtree: true });
  }
});
