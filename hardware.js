import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BOM_ITEMS = [
  { id: 'esp32', name: 'Placa ESP32 (NodeMCU-32S)', role: 'Cerebro con Wi-Fi y Bluetooth para recibir datos y controlar la caja.', price: '$110 – $140' },
  { id: 'ws2812b', name: 'Tira o Anillo LED WS2812B (8 a 16 LEDs)', role: 'Iluminación circadiana programable (cálida, apagado gradual y amanecer).', price: '$60 – $90' },
  { id: 'oled', name: 'Pantalla OLED 0.96" I2C (SSD1306)', role: 'Muestra en el frente la hora, temperatura, humedad y los BPM recibidos.', price: '$65 – $85' },
  { id: 'dht11', name: 'Sensor DHT11', role: 'Mide temperatura y humedad de la habitación en tiempo real.', price: '$35 – $50' },
  { id: 'audio', name: 'Módulo DFPlayer Mini + Bocina 3W', role: 'Reproduce los sonidos relajantes (lluvia, ruido blanco, alarma) desde una MicroSD.', price: '$95 – $135' },
  { id: 'proto', name: 'Protoboard + Cables Dupont + Cable USB', role: 'Conexiones internas sin soldar y alimentación eléctrica.', price: '$110 – $150' },
  { id: 'case', name: 'Carcasa (Cartón batería negro o MDF 3mm + Albanene)', role: 'Estructura física de la caja (14 x 14 x 16 cm) con difusor de luz.', price: '$80 – $120' }
];

function makeCanvasTex(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawFn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildESP32() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.024, 0.29), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 })));
  const shieldTex = makeCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#334155'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ESP-WROOM', w / 2, 108); ctx.fillText('32', w / 2, 146);
    ctx.font = '18px monospace'; ctx.fillText('WiFi + BLE', w / 2, 190);
  });
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.036, 0.20), new THREE.MeshStandardMaterial({ map: shieldTex, metalness: 0.8, roughness: 0.25 }));
  shield.position.set(-0.08, 0.03, 0);
  g.add(shield);

  const ant = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.16), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 }));
  ant.position.set(-0.23, 0.014, 0);
  g.add(ant);

  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.032, 0.09), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }));
  usb.position.set(0.27, 0.025, 0);
  g.add(usb);

  [-0.08, 0.08].forEach(z => {
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.022, 0.03), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 }));
    btn.position.set(0.21, 0.022, z);
    g.add(btn);
  });

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
  const hdrMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  [-0.125, 0.125].forEach(z => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.028, 0.024), hdrMat);
    strip.position.set(0.01, -0.022, z);
    g.add(strip);
    for (let i = -7; i <= 7; i++) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.008), pinMat);
      pin.position.set(0.01 + i * 0.03, -0.04, z);
      g.add(pin);
    }
  });
  return g;
}

function buildWS2812B() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.048, 10, 40), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1, 1, 0.28);
  g.add(ring);

  const housingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xF2A663, emissive: 0xF2A663, emissiveIntensity: 1.8 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const smd = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.024, 0.065), housingMat);
    smd.position.set(Math.cos(a) * 0.52, 0.018, Math.sin(a) * 0.52);
    smd.rotation.y = -a;
    const die = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 12), ledMat);
    die.position.y = 0.013;
    smd.add(die);
    g.add(smd);
  }
  return g;
}

function buildOLED() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.022), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })));
  const screenTex = makeCanvasTex(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 24px monospace'; ctx.fillText('SleepBox  22°C', 14, 30);
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 52px monospace'; ctx.fillText('02:50', 34, 102);
    ctx.font = 'bold 22px monospace'; ctx.fillText('68 BPM  HR:48%', 22, 142);
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.018), new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0x0ea5e9, emissiveMap: screenTex, emissiveIntensity: 0.75, roughness: 0.15 }));
  glass.position.set(0, -0.02, 0.018);
  g.add(glass);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85 });
  [-0.06, -0.02, 0.02, 0.06].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.055, 0.012), pinMat);
    p.position.set(x, 0.15, -0.02);
    p.rotation.x = Math.PI / 2;
    g.add(p);
  });
  return g;
}

function buildDHT11() {
  const g = new THREE.Group();
  const gridTex = makeCanvasTex(128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#082f49';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) ctx.fillRect(16 + c * 26, 22 + r * 24, 16, 15);
  });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.18), new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.35 })));
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.20), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  pcb.position.set(-0.08, -0.02, 0);
  g.add(pcb);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85 });
  [-0.04, 0, 0.04].forEach(z => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.09, 0.008), pinMat);
    leg.position.set(-0.04, -0.15, z);
    g.add(leg);
  });
  return g;
}

function buildAudioModule() {
  const g = new THREE.Group();
  const spk = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.12, 28), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.4 }));
  const surround = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 12, 28), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
  surround.rotation.x = Math.PI / 2; surround.position.y = 0.06;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.07, 0.07, 24), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 }));
  cone.position.y = 0.03;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
  cap.position.y = 0.01;
  const magnet = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 }));
  magnet.position.y = -0.085;
  spk.add(frame, surround, cone, cap, magnet);
  spk.rotation.z = Math.PI / 2;
  g.add(spk);

  const dfp = new THREE.Group();
  dfp.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.024, 0.22), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })));
  const sdSlot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.026, 0.16), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }));
  sdSlot.position.set(0.02, 0.024, 0);
  dfp.add(sdSlot);
  const ledInd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.02), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.5 }));
  ledInd.position.set(-0.07, 0.018, 0.06);
  dfp.add(ledInd);
  dfp.position.set(0.20, -0.22, 0.18);
  g.add(dfp);
  return g;
}

function buildProtoAndWires() {
  const g = new THREE.Group();
  const bbTex = makeCanvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(16, 18); ctx.lineTo(w - 16, 18); ctx.moveTo(16, h - 32); ctx.lineTo(w - 16, h - 32); ctx.stroke();
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); ctx.moveTo(16, 32); ctx.lineTo(w - 16, 32); ctx.moveTo(16, h - 18); ctx.lineTo(w - 16, h - 18); ctx.stroke();
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, h / 2 - 8, w, 16);
    ctx.fillStyle = '#334155';
    for (let x = 22; x < w - 18; x += 16) for (let y = 50; y < h - 46; y += 16) if (Math.abs(y - h / 2) > 12) ctx.fillRect(x, y, 6, 6);
  });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.07, 0.52), new THREE.MeshStandardMaterial({ map: bbTex, roughness: 0.45 })));

  const wires = [
    { color: 0xef4444, pts: [[-0.25, 0.04, 0.18], [-0.15, 0.22, 0.35], [0, 0.45, 0.48]] },
    { color: 0x111827, pts: [[-0.18, 0.04, 0.18], [-0.08, 0.20, 0.32], [0.04, 0.45, 0.48]] },
    { color: 0xfacc15, pts: [[0.18, 0.04, 0.05], [0.35, 0.24, 0.04], [0.46, 0.35, 0]] },
    { color: 0x22c55e, pts: [[0.12, 0.04, -0.10], [0.28, 0.22, -0.05], [0.42, 0.35, 0.04]] },
    { color: 0x3b82f6, pts: [[-0.22, 0.04, -0.12], [-0.34, 0.26, -0.18], [-0.26, 0.42, -0.06]] }
  ];
  wires.forEach(w => {
    const curve = new THREE.CatmullRomCurve3(w.pts.map(p => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.011, 8, false), new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.5 })));
  });
  return g;
}

function buildCase() {
  const g = new THREE.Group();
  const shellGeo = new RoundedBoxGeometry(1.4, 1.6, 1.4, 4, 0.12);
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({ color: 0x222836, transparent: true, opacity: 0.22, roughness: 0.35, depthWrite: false }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: 0x5E6AD2, transparent: true, opacity: 0.7 }));
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 1.36), new THREE.MeshStandardMaterial({ color: 0xEEF2FF, transparent: true, opacity: 0.32, roughness: 0.6 }));
  diffuser.position.y = -0.68;
  g.add(shell, edges, diffuser);
  return g;
}

function injectHardwareSection() {
  const shell = document.querySelector('.app-shell') || document.querySelector('main') || document.body;
  const section = document.createElement('section');
  section.className = 'panel';
  section.id = 'blueprint-section';
  section.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>Planos 3D y Arquitectura Interna</h2>
        <span class="muted-note">Carcasa 14 × 14 × 16 cm · Componentes detallados</span>
      </div>
      <button class="primary-btn" id="btn-explode" style="padding:7px 11px; font-size:0.75rem;">🧩 Despiece</button>
    </div>
    <div class="viewer-card" style="height:290px; margin-top:2px;">
      <div id="blueprint-canvas" style="width:100%; height:100%; cursor:grab;"></div>
      <div class="viewer-overlay">
        <span class="mono-tag" id="selected-part-label">Vista Ensamblada (Rayos X)</span>
        <span class="hint">Toca una pieza abajo</span>
      </div>
    </div>
    <div class="bom-table-wrap">
      <table class="bom-table">
        <thead><tr><th>Componente</th><th>Función en SleepBox</th><th>MXN</th></tr></thead>
        <tbody>
          ${BOM_ITEMS.map(item => `
            <tr class="bom-row" data-part="${item.id}">
              <td><strong>${item.name}</strong></td>
              <td>${item.role}</td>
              <td class="mono-tag" style="white-space:nowrap;">${item.price}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="2"><strong>Inversión total estimada de prototipo</strong></td><td class="mono-tag" style="color:var(--amber); white-space:nowrap;"><strong>$555 – $770</strong></td></tr>
        </tfoot>
      </table>
    </div>`;
  shell.appendChild(section);

  const style = document.createElement('style');
  style.textContent = `
    .bom-table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--surface-border); }
    .bom-table { width: 100%; border-collapse: collapse; font-size: 0.76rem; text-align: left; }
    .bom-table th { background: rgba(11,17,43,0.85); color: var(--indigo); padding: 9px 10px; border-bottom: 1px solid var(--surface-border); }
    .bom-table td { padding: 9px 10px; border-bottom: 1px solid rgba(238,242,255,0.05); vertical-align: top; line-height: 1.38; color: var(--text-main); }
    .bom-row { cursor: pointer; transition: background 0.2s; }
    .bom-row:hover, .bom-row.selected { background: rgba(242,166,99,0.16); }
    .bom-table tfoot td { background: rgba(11,17,43,0.75); border-bottom: none; }`;
  document.head.appendChild(style);
  initBlueprint3D();
}

function initBlueprint3D() {
  const container = document.getElementById('blueprint-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 50);
  camera.position.set(2.6, 2.1, 3.1);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(0, 0.72, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xEEF2FF, 1.4); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xF2A663, 0.7); rim.position.set(-4, 2, -3); scene.add(rim);
  scene.add(new THREE.GridHelper(4.2, 14, 0x5E6AD2, 0x1e2647));

  const parts = {};
  const basePos = {};
  const offsets = {
    case: new THREE.Vector3(0, 1.05, 0),
    oled: new THREE.Vector3(0, 0.12, 0.82),
    dht11: new THREE.Vector3(0.82, 0.22, 0),
    audio: new THREE.Vector3(-0.72, 0.35, -0.22),
    esp32: new THREE.Vector3(0, 0.38, -0.45),
    proto: new THREE.Vector3(0, 0.05, 0.08),
    ws2812b: new THREE.Vector3(0, -0.06, 0)
  };

  function add(id, obj, pos) {
    obj.position.copy(pos);
    basePos[id] = pos.clone();
    parts[id] = obj;
    scene.add(obj);
  }

  add('ws2812b', buildWS2812B(), new THREE.Vector3(0, 0.15, 0));
  add('proto', buildProtoAndWires(), new THREE.Vector3(0, 0.24, 0.04));
  add('esp32', buildESP32(), new THREE.Vector3(0, 0.35, -0.14));
  add('oled', buildOLED(), new THREE.Vector3(0, 0.92, 0.66));
  add('dht11', buildDHT11(), new THREE.Vector3(0.56, 0.64, 0));
  add('audio', buildAudioModule(), new THREE.Vector3(-0.42, 0.84, -0.14));
  add('case', buildCase(), new THREE.Vector3(0, 0.82, 0));

  let exploded = false;
  const btnExplode = document.getElementById('btn-explode');
  const label = document.getElementById('selected-part-label');

  btnExplode.addEventListener('click', () => {
    exploded = !exploded;
    btnExplode.textContent = exploded ? '📦 Ensamblar' : '🧩 Despiece';
    label.textContent = exploded ? 'Vista Exploded (Componentes separados)' : 'Vista Ensamblada (Rayos X)';
  });

  document.querySelectorAll('.bom-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.bom-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      const id = row.dataset.part;
      const item = BOM_ITEMS.find(x => x.id === id);
      if (item) label.textContent = `${item.name} · ${item.price} MXN`;
      Object.entries(parts).forEach(([k, obj]) => obj.scale.setScalar(k === id ? 1.22 : 1.0));
    });
  });

  function animate() {
    requestAnimationFrame(animate);
    Object.entries(parts).forEach(([id, obj]) => {
      const target = basePos[id].clone();
      if (exploded && offsets[id]) target.add(offsets[id]);
      obj.position.lerp(target, 0.1);
    });
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container.clientWidth) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

injectHardwareSection();