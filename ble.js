window.addEventListener('DOMContentLoaded', () => {
  const btnBle = document.getElementById('btn-ble');
  const bleStatus = document.getElementById('ble-status');
  const bpmSlider = document.getElementById('bpm-slider');

  const SERVICES = [
    'heart_rate', 'battery_service',
    '0000feea-0000-1000-8000-00805f9b34fb',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '0000fee0-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb'
  ];

  // Comandos corregidos (longitud exacta 0x06 para MoYoung/Tefiti + WearFit)
  const HR_CMDS = [
    [0xFE, 0xEA, 0x10, 0x06, 0x6B, 0x01],
    [0xFE, 0xEA, 0x10, 0x06, 0x69, 0x01],
    [0xFE, 0xEA, 0x10, 0x05, 0x69],
    [0xAB, 0x00, 0x04, 0xFF, 0x31, 0x09, 0x01],
    [0xAB, 0x00, 0x04, 0xFF, 0x31, 0x0A, 0x01]
  ];

  function pushBpm(bpm) {
    if (bpm >= 45 && bpm <= 185) {
      bpmSlider.value = bpm;
      bpmSlider.dispatchEvent(new Event('input'));
      return true;
    }
    return false;
  }

  async function writeBytes(c, arr) {
    const d = new Uint8Array(arr);
    try {
      if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(d);
      else if (c.properties.write) await c.writeValue(d);
    } catch (_) {}
  }

  async function connectDevice(device) {
    let gotPacket = false;
    let batText = '';
    const writeChars = [];
    const ids = [];

    btnBle.textContent = `⌚ ${device.name || 'E19'}`;
    btnBle.classList.add('active');
    bleStatus.textContent = 'Conectando E19...';

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    for (const svc of services) {
      ids.push(svc.uuid.slice(4, 8));
      const chars = await svc.getCharacteristics();
      for (const c of chars) {
        if (c.uuid.includes('2a19') && c.properties.read) {
          const v = await c.readValue();
          batText = ` · 🔋${v.getUint8(0)}%`;
        }
        if (c.properties.write || c.properties.writeWithoutResponse) writeChars.push(c);
        if (c.properties.notify || c.properties.indicate) {
          try {
            await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', e => {
              gotPacket = true;
              const dv = e.target.value;
              const b = Array.from({ length: dv.byteLength }, (_, i) => dv.getUint8(i));
              const hex = b.slice(0, 7).map(x => x.toString(16).padStart(2, '0')).join(' ');

              let ok = false;
              if (c.uuid.includes('2a37')) ok = pushBpm((b[0] & 1) ? dv.getUint16(1, true) : b[1]);
              else if (b[0] === 0xFE && b[1] === 0xEA && b.length >= 6) ok = pushBpm(b[5]);
              else if (b[0] === 0xAB && b[4] === 0x31 && b.length >= 7) ok = pushBpm(b[6]);

              bleStatus.textContent = ok ? `E19 en vivo${batText}` : `E19${batText} [${hex}]`;
            });
          } catch (_) {}
        }
      }
    }

    bleStatus.textContent = `Activando sensor E19${batText}...`;
    for (const c of writeChars) {
      for (const cmd of HR_CMDS) {
        await writeBytes(c, cmd);
        await new Promise(r => setTimeout(r, 120));
      }
    }

    // Límite de 5 segundos para nunca quedarse colgado
    setTimeout(() => {
      if (!gotPacket) {
        bleStatus.textContent = `E19${batText} · IDs:${ids.join(',')} (sin eco HR)`;
      }
    }, 5000);
  }

  // Intento automático al abrir la app si ya fue vinculado antes
  if (navigator.bluetooth && navigator.bluetooth.getDevices) {
    navigator.bluetooth.getDevices().then(devs => {
      const e19 = devs.find(d => /E19/i.test(d.name || ''));
      if (e19) connectDevice(e19).catch(() => {});
    }).catch(() => {});
  }

  btnBle.addEventListener('click', async () => {
    if (!navigator.bluetooth) { bleStatus.textContent = 'Usa Chrome para BLE'; return; }
    try {
      bleStatus.textContent = 'Buscando E19...';
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICES
      });
      await connectDevice(device);
    } catch {
      bleStatus.textContent = 'Sin conexión BLE · Modo manual';
    }
  });
});
