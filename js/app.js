/* ============================================================
   SPKL RODA 2 - App Bootstrap
   app.js - Separation of Concerns: Entry Point
   ============================================================ */

'use strict';

(function bootstrap() {

  /**
   * Urutan inisialisasi:
   * 1. Pastikan DOM sudah siap
   * 2. Init Charts (perlu canvas ada di DOM)
   * 3. Init UI (cache elemen + pasang listener)
   * 4. Connect MQTT (mulai aliran data)
   */

  function onDOMReady() {
    console.log('[App] SPKL RODA 2 Dashboard starting...');

    // 1. Init Charts
    ChartManager.init();

    // 2. Init UI
    UIManager.init();

    // 3. Connect MQTT / start simulation
    MQTTManager.connect();

    console.log('[App] Dashboard ready ✓');
  }

  // Tunggu DOM + pastikan library chart sudah ada
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMReady);
  } else {
    onDOMReady();
  }

  // Expose untuk debugging
  window.SPKL = {
    mqtt:   MQTTManager,
    charts: ChartManager,
    ui:     UIManager,
    version: '1.0.0',
  };

})();
