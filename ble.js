window.addEventListener('DOMContentLoaded', () => {
  const btnBle = document.getElementById('btn-ble');
  const bleStatus = document.getElementById('ble-status');
  const bpmSlider = document.getElementById('bpm-slider');

  const COMMON_SERVICES = [
    'heart_rate', 'battery_service',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '0000fee0-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000feea-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '00006006-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '00000001-0000-1000-8000-00805f9b34fb'
  ];

  function pushBpm(bpm) {
    if (bpm >= 45 && bpm <= 165) {
      bpmSlider.value = bpm;
      bpmSlider.dispatchEvent(new Event('input'));
    }
  }

  btnBle.addEventListener('click', async () => {
    if (!navigator.bluetooth) { bleStatus.textContent = 'Usa Chrome para BLE'; return; }
    try {
      bleStatus.textContent = 'Buscando E19...';
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: COMMON_SERVICES
      });

      btnBle.textContent = `⌚ ${device.name || 'E19'}`;
      btnBle.classList.add('active');
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();

      let batText = '';
      let listening = 0;

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
              listening++;
              c.addEventListener('characteristicvaluechanged', e => {
                const dv = e.target.value;
                const bytes = Array.from({ length: dv.byteLength }, (_, i) => dv.getUint8(i));
                if (c.uuid.includes('2a37')) {
                  const bpm = (bytes[0] & 1) ? dv.getUint16(1, true) : bytes[1];
                  pushBpm(bpm);
                  bleStatus.textContent = `E19 en vivo${batText}`;
                } else {
                  const hex = bytes.slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join(' ');
                  bleStatus.textContent = `E19 datos${batText}: [${hex}]`;
                }
              });
            } catch (_) {}
          }
        }
      }

      if (listening > 0) {
        bleStatus.textContent = `E19 escuchando (${listening} canales)${batText} · mide pulso en el reloj`;
      } else {
        bleStatus.textContent = `E19 vinculado${batText} (UUID oculto · usa slider)`;
      }
    } catch {
      bleStatus.textContent = 'Sin conexión BLE · Modo manual';
    }
  });
});
