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

  let writeChars = [];
  let batText = '';
  let lastBytes = '';

  const pollBtn = document.createElement('button');
  pollBtn.className = 'text-btn hidden';
  pollBtn.textContent = '📡 Pedir HR';
  pollBtn.style.marginLeft = '8px';
  bleStatus.parentElement.appendChild(pollBtn);

  function pushBpm(bpm) {
    if (bpm >= 45 && bpm <= 185) {
      bpmSlider.value = bpm;
      bpmSlider.dispatchEvent(new Event('input'));
      return true;
    }
    return false;
  }

  function decodeBpm(c, dv, b) {
    if (c.uuid.includes('2a37') && b.length >= 2) {
      return (b[0] & 1) ? dv.getUint16(1, true) : b[1];
    }
    // Si el byte 0 es comando/tipo y alguno de los bytes siguientes está en rango de pulso (50-170)
    if (b.length >= 3 && b.length <= 10) {
      for (let i = 1; i < b.length; i++) {
        if (b[i] >= 50 && b[i] <= 170) return b[i];
      }
    }
    return null;
  }

  async function sendPulseRequests() {
    const reqs = [
      [0xFE, 0xEA, 0x10, 0x06, 0x6B, 0x01],
      [0xFE, 0xEA, 0x10, 0x06, 0x69, 0x01],
      [0xAB, 0x00, 0x04, 0xFF, 0x31, 0x0A, 0x01],
      [0xAB, 0x00, 0x04, 0xFF, 0x31, 0x09, 0x01]
    ];
    for (const c of writeChars) {
      for (const r of reqs) {
        const d = new Uint8Array(r);
        try {
          if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(d);
          else if (c.properties.write) await c.writeValue(d);
        } catch (_) {}
        await new Promise(ok => setTimeout(ok, 140));
      }
    }
  }

  pollBtn.addEventListener('click', async () => {
    bleStatus.textContent = `Solicitando pulso${batText}...`;
    await sendPulseRequests();
  });

  async function connectDevice(device) {
    writeChars = [];
    batText = '';
    lastBytes = '';

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
        if (c.properties.write || c.properties.writeWithoutResponse) writeChars.push(c);
        if (c.properties.notify || c.properties.indicate) {
          try {
            await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', e => {
              const dv = e.target.value;
              const b = Array.from({ length: dv.byteLength }, (_, i) => dv.getUint8(i));
              const hex = b.map(x => x.toString(16).padStart(2, '0')).join(' ');
              lastBytes = hex;
              const bpm = decodeBpm(c, dv, b);
              if (bpm && pushBpm(bpm)) {
                bleStatus.textContent = `E19 en vivo${batText} [${hex}]`;
              } else {
                bleStatus.textContent = `E19${batText} rx:[${hex}]`;
              }
            });
          } catch (_) {}
        }
      }
    }

    if (writeChars.length > 0) pollBtn.classList.remove('hidden');
    bleStatus.textContent = `E19 listo${batText} · mide o toca Pedir HR`;
    await sendPulseRequests();
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
