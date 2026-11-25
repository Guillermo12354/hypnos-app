window.addEventListener('DOMContentLoaded', () => {
  const btnBle = document.getElementById('btn-ble');
  const bleStatus = document.getElementById('ble-status');
  const bpmSlider = document.getElementById('bpm-slider');

  const SERVICES = [
    'heart_rate', 'battery_service',
    '0000feea-0000-1000-8000-00805f9b34fb',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '0000fee0-0000-1000-8000-00805f9b34fb',
    '000055ff-0000-1000-8000-00805f9b34fb',
    '000056ff-0000-1000-8000-00805f9b34fb',
    '0000d0ff-3c17-d293-8e48-14fe2e4da212',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb'
  ];

  function pushBpm(bpm) {
    if (bpm >= 45 && bpm <= 185) {
      bpmSlider.value = bpm;
      bpmSlider.dispatchEvent(new Event('input'));
      return true;
    }
    return false;
  }

  function extractBpmFromPacket(c, dv, b) {
    if (c.uuid.includes('2a37') && b.length >= 2) {
      return (b[0] & 1) ? dv.getUint16(1, true) : b[1];
    }
    // Paquetes tipo [e5, 11, 00, 52] donde el último byte o byte de datos trae el BPM
    if (b.length >= 4 && b[0] === 0xe5 && b[3] >= 45 && b[3] <= 185) {
      return b[3];
    }
    if (b[0] === 0xFE && b[1] === 0xEA && b.length >= 6) return b[5];
    if (b[0] === 0xAB && b[4] === 0x31 && b.length >= 7) return b[6];
    // Respaldo genérico: busca un byte plausible de pulso si el paquete es corto (3 a 8 bytes)
    if (b.length >= 3 && b.length <= 8) {
      for (let i = b.length - 1; i >= 1; i--) {
        if (b[i] >= 50 && b[i] <= 165) return b[i];
      }
    }
    return null;
  }

  async function connectDevice(device) {
    let batText = '';
    let gotBpm = false;

    btnBle.textContent = `⌚ ${device.name || 'E19'}`;
    btnBle.classList.add('active');
    bleStatus.textContent = 'Conectando E19...';

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      for (const c of chars) {
        if (c.uuid.includes('2a19') && c.properties.read) {
          const v = await c.readValue();
          batText = ` · 🔋${v.getUint8(0)}%`;
        }
        if (c.properties.notify || c.properties.indicate) {
          try {
            await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', e => {
              const dv = e.target.value;
              const b = Array.from({ length: dv.byteLength }, (_, i) => dv.getUint8(i));
              const hex = b.slice(0, 7).map(x => x.toString(16).padStart(2, '0')).join(' ');
              const bpm = extractBpmFromPacket(c, dv, b);

              if (bpm && pushBpm(bpm)) {
                gotBpm = true;
                bleStatus.textContent = `E19 en vivo${batText} [${hex}]`;
              } else if (!gotBpm) {
                bleStatus.textContent = `E19${batText} · mide pulso [${hex}]`;
              }
            });
          } catch (_) {}
        }
      }
    }

    if (!gotBpm) {
      bleStatus.textContent = `E19${batText} · mide pulso en el reloj`;
    }
  }

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
