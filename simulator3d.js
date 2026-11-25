import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(36, container.clientWidth / container.clientHeight, 0.1, 50);
camera.position.set(2.4, 1.85, 3.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.6;
controls.maxDistance = 5.5;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 0.45, 0);

// Iluminación ambiental nocturna
scene.add(new THREE.AmbientLight(0x5E6AD2, 0.35));
const keyLight = new THREE.DirectionalLight(0xEEF2FF, 0.85);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

// Mesa de noche oscura
const tableGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.12, 48);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x181c28, roughness: 0.72, metalness: 0.1 });
const table = new THREE.Mesh(tableGeo, tableMat);
table.position.y = -0.06;
table.receiveShadow = true;
scene.add(table);

// Grupo principal SleepBox
const sleepBox = new THREE.Group();
scene.add(sleepBox);

// Chasis Carbón Mate (#222836)
const bodyGeo = new RoundedBoxGeometry(2.05, 1.02, 1.45, 6, 0.24);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222836, roughness: 0.82, metalness: 0.15 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.56;
body.castShadow = true;
body.receiveShadow = true;
sleepBox.add(body);

// Base inferior rebajada
const baseGeo = new RoundedBoxGeometry(1.88, 0.12, 1.28, 4, 0.06);
const baseMat = new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.9 });
const baseMesh = new THREE.Mesh(baseGeo, baseMat);
baseMesh.position.y = 0.06;
sleepBox.add(baseMesh);

// Anillo LED perimetral
const ledGeo = new RoundedBoxGeometry(1.98, 0.055, 1.38, 4, 0.025);
const ledMat = new THREE.MeshStandardMaterial({
  color: 0xF2A663,
  emissive: 0xF2A663,
  emissiveIntensity: 2.2,
  roughness: 0.2
});
const ledRing = new THREE.Mesh(ledGeo, ledMat);
ledRing.position.y = 0.12;
sleepBox.add(ledRing);

// Luz real proyectada sobre la mesa
const ledLight = new THREE.PointLight(0xF2A663, 3.2, 5.5, 1.6);
ledLight.position.set(0, 0.18, 0.25);
sleepBox.add(ledLight);

const ledLightBack = new THREE.PointLight(0xF2A663, 2.0, 4.5, 1.6);
ledLightBack.position.set(0, 0.18, -0.5);
sleepBox.add(ledLightBack);

// Pantalla textil frontal con reloj digital en tiempo real
const clockCanvas = document.createElement('canvas');
clockCanvas.width = 512;
clockCanvas.height = 256;
const ctx = clockCanvas.getContext('2d');
const clockTex = new THREE.CanvasTexture(clockCanvas);

function drawClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  ctx.fillStyle = '#191e2b';
  ctx.fillRect(0, 0, 512, 256);

  // Sutil textura de malla acústica
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < 256; y += 6) {
    for (let x = 0; x < 512; x += 6) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.shadowColor = 'rgba(238, 242, 255, 0.55)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#EEF2FF';
  ctx.font = '600 96px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${hh}:${mm}`, 256, 132);
  ctx.shadowBlur = 0;

  clockTex.needsUpdate = true;
}
drawClock();
setInterval(drawClock, 5000);

const frontGeo = new THREE.PlaneGeometry(1.56, 0.68);
const frontMat = new THREE.MeshStandardMaterial({
  map: clockTex,
  roughness: 0.9,
  metalness: 0.05
});
const frontPanel = new THREE.Mesh(frontGeo, frontMat);
frontPanel.position.set(0, 0.58, 0.728);
sleepBox.add(frontPanel);

// Estado y API pública para controlar el 3D desde app.js e IA
const state = {
  color: '#F2A663',
  brightness: 75,
  breathing: true
};

function applyLights(factor = 1) {
  const isOff = state.color === '#000000' || state.brightness === 0;
  const col = new THREE.Color(isOff ? '#111520' : state.color);
  const intensity = isOff ? 0 : (state.brightness / 100) * factor;

  ledMat.color.copy(col);
  ledMat.emissive.copy(col);
  ledMat.emissiveIntensity = intensity * 3.0;
  ledLight.color.copy(col);
  ledLight.intensity = intensity * 4.2;
  ledLightBack.color.copy(col);
  ledLightBack.intensity = intensity * 2.5;
}

window.SleepBox3D = {
  setColor(hex) { state.color = hex; applyLights(); },
  setBrightness(val) { state.brightness = Number(val); applyLights(); },
  setBreathing(enabled) { state.breathing = Boolean(enabled); if (!enabled) applyLights(1); },
  getState() { return { ...state }; }
};

// Loop de animación
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  if (state.breathing && state.brightness > 0 && state.color !== '#000000') {
    const pulse = 0.72 + 0.28 * Math.sin(t * 1.4);
    applyLights(pulse);
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
