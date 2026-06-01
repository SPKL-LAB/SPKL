/* ============================================================
   SPKL RODA 2 - UI Manager
   ui.js - Separation of Concerns: UI / DOM Layer
   ============================================================ */

'use strict';

const UIManager = (() => {

  /* ----------------------------------------------------------
     ELEMENT CACHE - ambil sekali, pakai berkali
     ---------------------------------------------------------- */
  const els = {};

  function cacheElements() {
    els.dcVoltage    = document.getElementById('valDcVoltage');
    els.dcCurrent    = document.getElementById('valDcCurrent');
    els.dcEnergy     = document.getElementById('valDcEnergy');
    els.dcPower      = document.getElementById('valDcPower');
    els.panelTemp    = document.getElementById('valPanelTemp');
    els.acVoltage    = document.getElementById('valAcVoltage');
    els.acCurrent    = document.getElementById('valAcCurrent');
    els.acPower      = document.getElementById('valAcPower');
    els.acFrequency  = document.getElementById('valAcFrequency');
    els.invStatus    = document.getElementById('valInvStatus');
    els.invSubtext   = document.getElementById('valInvSubtext');
    els.invIcon      = document.getElementById('iconInvStatus');
    els.errorCode    = document.getElementById('valErrorCode');
    els.errorSubtext = document.getElementById('valErrorSubtext');
    els.rssiValue    = document.getElementById('valRssi');
    els.rssiLabel    = document.getElementById('labelRssi');
    els.esp32Status  = document.getElementById('valEsp32');
    els.esp32Icon    = document.getElementById('iconEsp32');
    els.battVoltage  = document.getElementById('valBattVoltage');
    els.battCapacity = document.getElementById('valBattCapacity');
    els.battBar      = document.getElementById('barBattCapacity');
    els.battVBar     = document.getElementById('barBattVoltage');
    els.dateDisplay  = document.getElementById('dateDisplay');
    els.timeDisplay  = document.getElementById('timeDisplay');
    els.sysDevice    = document.getElementById('sysDevice');
    els.sysMcu       = document.getElementById('sysMcu');
    els.sysUptime    = document.getElementById('sysUptime');
    els.sysUpdate    = document.getElementById('sysUpdate');
  }

  /* ----------------------------------------------------------
     DATETIME CLOCK
     ---------------------------------------------------------- */
  let uptimeSeconds = 0;
  let startTime = Date.now();

  function updateClock() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    if (els.dateDisplay) els.dateDisplay.textContent = dateStr;
    if (els.timeDisplay) els.timeDisplay.textContent = timeStr;

    // Update uptime
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    if (els.sysUptime) els.sysUptime.textContent = `${h} Jam ${m} Menit`;

    // Update last update time
    if (els.sysUpdate) els.sysUpdate.textContent = now.toLocaleString('id-ID').replace(',', '');
  }

  /* ----------------------------------------------------------
     VALUE UPDATER - animasi angka berubah
     ---------------------------------------------------------- */
  function setTextAnimated(el, newVal) {
    if (!el) return;
    const oldVal = el.textContent;
    if (oldVal === String(newVal)) return;
    el.style.transition = 'opacity 0.15s';
    el.style.opacity = '0.3';
    setTimeout(() => {
      el.textContent = newVal;
      el.style.opacity = '1';
    }, 150);
  }

  /* ----------------------------------------------------------
     RSSI Signal Strength Helper
     ---------------------------------------------------------- */
  function getRssiLabel(rssi) {
    if (rssi >= -50) return 'Sinyal Sangat Kuat';
    if (rssi >= -65) return 'Sinyal Kuat';
    if (rssi >= -75) return 'Sinyal Sedang';
    return 'Sinyal Lemah';
  }

  function getRssiColor(rssi) {
    if (rssi >= -65) return 'var(--accent-green)';
    if (rssi >= -75) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  }

  /* ----------------------------------------------------------
     INVERTER STATUS HELPER
     ---------------------------------------------------------- */
  function applyInverterStatus(status) {
    if (!els.invStatus) return;
    const isNormal = String(status).toLowerCase() === 'normal' || status === 1 || status === '1';
    els.invStatus.textContent = isNormal ? 'Normal' : 'Fault';
    els.invStatus.style.color = isNormal ? 'var(--accent-green)' : 'var(--accent-red)';
    if (els.invSubtext) els.invSubtext.textContent = isNormal ? 'Inverter OK' : 'Periksa Inverter';
    if (els.invIcon) {
      els.invIcon.textContent = isNormal ? '✅' : '❌';
      els.invIcon.className = isNormal ? 'status-check green' : 'status-check red';
    }
  }

  /* ----------------------------------------------------------
     ESP32 STATUS HELPER
     ---------------------------------------------------------- */
  function applyEsp32Status(status) {
    if (!els.esp32Status) return;
    const isOnline = String(status).toLowerCase() === 'online' || status === 1;
    els.esp32Status.textContent = isOnline ? 'Online' : 'Offline';
    els.esp32Status.style.color = isOnline ? 'var(--accent-green)' : 'var(--accent-red)';
    if (els.esp32Icon) {
      els.esp32Icon.style.color = isOnline ? 'var(--accent-green)' : 'var(--accent-red)';
    }
  }

  /* ----------------------------------------------------------
     MAIN UPDATE FUNCTION - dipanggil setiap ada data baru
     ---------------------------------------------------------- */
  function onDataUpdate({ key, value }) {
    switch (key) {
      case 'dcVoltage':
        setTextAnimated(els.dcVoltage, value.toFixed(2));
        ChartManager.updateSparkline('dcVoltage', value);
        ChartManager.updateMainChart('dcVoltage', MQTTManager.getHistory('dcVoltage'));
        break;

      case 'dcCurrent':
        setTextAnimated(els.dcCurrent, value.toFixed(2));
        ChartManager.updateSparkline('dcCurrent', value);
        break;

      case 'dcEnergy':
        setTextAnimated(els.dcEnergy, value.toFixed(2));
        ChartManager.updateSparkline('dcEnergy', value);
        break;

      case 'dcPower':
        setTextAnimated(els.dcPower, value.toFixed(2));
        ChartManager.updateSparkline('dcPower', value);
        break;

      case 'panelTemp':
        setTextAnimated(els.panelTemp, value.toFixed(1));
        ChartManager.updateSparkline('panelTemp', value);
        break;

      case 'acVoltage':
        setTextAnimated(els.acVoltage, value.toFixed(1));
        ChartManager.updateMainChart('acVoltage', MQTTManager.getHistory('acVoltage'));
        break;

      case 'acCurrent':
        setTextAnimated(els.acCurrent, value.toFixed(2));
        break;

      case 'acPower':
        setTextAnimated(els.acPower, value.toFixed(2));
        break;

      case 'acFrequency':
        setTextAnimated(els.acFrequency, value.toFixed(2));
        break;

      case 'invStatus':
        applyInverterStatus(value);
        break;

      case 'errorCode':
        setTextAnimated(els.errorCode, value);
        if (els.errorSubtext) {
          els.errorSubtext.textContent = value == 0 ? 'Tidak ada error' : `Kode Error: ${value}`;
          els.errorCode.style.color = value == 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        break;

      case 'rssiWifi':
        setTextAnimated(els.rssiValue, `${value} dBm`);
        if (els.rssiLabel) {
          els.rssiLabel.textContent = getRssiLabel(value);
          els.rssiValue.style.color = getRssiColor(value);
        }
        break;

      case 'esp32Status':
        applyEsp32Status(value);
        break;

      case 'battVoltage':
        setTextAnimated(els.battVoltage, value.toFixed(2));
        // Progress bar voltage (48V = 100%, 42V = 0%)
        const vPct = Math.max(0, Math.min(100, ((value - 42) / 6) * 100));
        if (els.battVBar) els.battVBar.style.width = vPct + '%';
        break;

      case 'battCapacity':
        setTextAnimated(els.battCapacity, Math.round(value));
        if (els.battBar) els.battBar.style.width = Math.round(value) + '%';
        break;
    }
  }

  /* ----------------------------------------------------------
     SIDEBAR NAVIGATION
     ---------------------------------------------------------- */
  function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  /* ----------------------------------------------------------
     LOAD INITIAL VALUES (dari state MQTTManager)
     ---------------------------------------------------------- */
  function loadInitialState() {
    const s = MQTTManager.getState();
    Object.entries(s).forEach(([key, value]) => {
      onDataUpdate({ key, value });
    });
  }

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */
  function init() {
    cacheElements();
    initNavigation();
    loadInitialState();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // System info static
    if (els.sysDevice) els.sysDevice.textContent = 'SPKL RODA 2';
    if (els.sysMcu)    els.sysMcu.textContent    = 'ESP32';

    // Listen to MQTT data events
    MQTTManager.on('dataUpdate', onDataUpdate);
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  return { init };

})();

window.UIManager = UIManager;
