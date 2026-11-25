window.addEventListener('DOMContentLoaded', () => {
  const btnBle = document.getElementById('btn-ble');
  const bleStatus = document.getElementById('ble-status');
  const bpmSlider = document.getElementById('bpm-slider');

  const SERVICES = [
    'heart_rate', 'battery_service',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '0000fee0-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000feea-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '00006006-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb'
  ];

  let writeChars = [];
  let batText = '';
  let foundSvcs = [];

  // Botón para disparar medición remota desde la app
  const hrBtn = document.createElement('button');
  hrBtn.className = 'text-btn hidden';
  hrBtn.textContent = '❤️ Medir HR';
  hrBtn.style.marginLeft = '8px';
  bleStatus.parentElement.appendChild(hrBtn);

  function pushBpm(bpm) {
    if (bpm >= 45 && bpm <= 180) {
      bpmSlider.value = bpm;
      bpmSlider.dispatchEvent(new Event('input'));
    }
  }

  async function sendCmd(c, bytes) {
    const data = new Uint8Array(bytes);
    try {
      if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(data);
      else await c.writeValue(data);
    } catch (_) {}
  }

  hrBtn.addEventListener('click', async () => {
    bleStatus.textContent = `Enviando orden HR${batText}...`;
    // Comandos estándar de inicio de HR (DaFit/MoYoung, WearFit/Tefiti, Colmi, FitPro)
    const cmds = [
      [0xFE, 0xEA, 0x10, 0x05, 0x69, 0x01],
      [0xFE, 0xEA, 0x10, 0x05, 0x6B, 0x01],
      [0xAB, 0x00, 0x04, 0xFF, 0x31, 0x0A, 0x01],
      [0xAB, 0x00, 0x04, 0xFF, 0x84, 0x80, 0x01],
      [0x15, 0x01, 0x01, 0,0,0,0,0,0,0,0,0,0,0,0, 0x17]
    ];
    for (const c of writeChars) {
      for (const cmd of cmds) {
        await sendCmd(c, cmd);
        await new Promise(r => setTimeout(r, 150));
      }
    }
  });

  btnBle.addEventListener('click', async () => {
    if (!navigator.bluetooth) { bleStatus.textContent = 'Usa Chrome para BLE'; return; }
    try {
      bleStatus.textContent = 'Buscando E19...';
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICES
      });

      btnBle.textContent = `⌚ ${device.name || 'E19'}`;
      btnBle.classList.add('active');
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();

      writeChars = [];
      foundSvcs = [];
      batText = '';

      for (const svc of services) {
        foundSvcs.push(svc.uuid.slice(4, 8));
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
          if (c.uuid.includes('2a19') && c.properties.read) {
            const v = await c.readValue();
            batText = ` · 🔋${v.getUint8(0)}%`;
          }
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChars.push(c);
          }
          if (c.properties.notify || c.properties.indicate) {
            try {
              await c.startNotifications();
              c.addEventListener('characteristicvaluechanged', e => {
                const dv = e.target.value;
                const b = Array.from({ length: dv.byteLength }, (_, i) => dv.getUint8(i));
                const hex = b.slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(' ');
                bleStatus.textContent = `E19${batText} [${hex}]`;

                if (c.uuid.includes('2a37')) pushBpm((b[0] & 1) ? dv.getUint16(1, true) : b[1]);
                else if (b[0] === 0xFE && b[1] === 0xEA && b.length > 5 && b[5] > 40) pushBpm(b[5]);
                else if (b[0] === 0xAB && b[4] === 0x31 && b.length > 6 && b[6] > 40) pushBpm(b[6]);
                else if (b[0] === 0x15 && b.length > 3 && b[3] > 40) pushBpm(b[3]);
              });
            } catch (_) {}
          }
        }
      }

      if (writeChars.length > 0) hrBtn.classList.remove('hidden');
      bleStatus.textContent = `E19${batText} · IDs: ${foundSvcs.join(',')}`;
    } catch {
      bleStatus.textContent = 'Sin conexión BLE · Modo manual';
    }
  });
});
