/* ============================================================
   SPKL RODA 2 - MQTT & Data Manager
   mqtt.js - Separation of Concerns: Data Layer
   ============================================================ */

'use strict';

const MQTTManager = (() => {

  /* ----------------------------------------------------------
     CONFIGURATION - HiveMQ Cloud
     ---------------------------------------------------------- */
  const CONFIG = {
    broker:    'wss://bb83e828e0dc40b9833a06f8b556ff91.s1.eu.hivemq.cloud:8884/mqtt',
    clientId:  'spkl_roda2_web_' + Math.random().toString(36).substr(2, 8),
    username:  'SPKLRODA2',
    password:  'DimasIbuk1819@',
    keepAlive: 30,
    cleanSession: true,
    topics: {
      dcVoltage:    'spkl/roda2/dc_voltage',
      dcCurrent:    'spkl/roda2/dc_current',
      dcEnergy:     'spkl/roda2/dc_energy',
      dcPower:      'spkl/roda2/dc_power',
      panelTemp:    'spkl/roda2/suhu_panel',
      acVoltage:    'spkl/roda2/ac_voltage',
      acCurrent:    'spkl/roda2/ac_current',
      acPower:      'spkl/roda2/ac_daya',
      acFrequency:  'spkl/roda2/ac_frekuensi',
      invStatus:    'spkl/roda2/status_inverter',
      errorCode:    'spkl/roda2/error_code',
      rssiWifi:     'spkl/roda2/rssi_wifi',
      esp32Status:  'spkl/roda2/status_esp32',
      battVoltage:  'spkl/roda2/batt_voltage',
      battCapacity: 'spkl/roda2/batt_capacity',
    }
  };

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  let client       = null;
  let isConnected  = false;
  let reconnectTimer = null;
  let listeners    = {};
  let historyBuffer = {};

  const HISTORY_MAX = 60;

  const state = {
    dcVoltage:    48.25,
    dcCurrent:    12.35,
    dcEnergy:     1.58,
    dcPower:      593.98,
    panelTemp:    38.2,
    acVoltage:    221.4,
    acCurrent:    2.45,
    acPower:      540.33,
    acFrequency:  50.02,
    invStatus:    'Normal',
    errorCode:    0,
    rssiWifi:     -65,
    esp32Status:  'Online',
    battVoltage:  48.15,
    battCapacity: 78,
  };

  Object.keys(state).forEach(key => {
    historyBuffer[key] = [];
  });

  /* ----------------------------------------------------------
     EVENT EMITTER
     ---------------------------------------------------------- */
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data));
    }
  }

  /* ----------------------------------------------------------
     HISTORY BUFFER
     ---------------------------------------------------------- */
  function pushHistory(key, value) {
    if (!historyBuffer[key]) historyBuffer[key] = [];
    historyBuffer[key].push({ value, time: new Date() });
    if (historyBuffer[key].length > HISTORY_MAX) {
      historyBuffer[key].shift();
    }
  }

  function getHistory(key) {
    return historyBuffer[key] || [];
  }

  /* ----------------------------------------------------------
     TOPIC → STATE KEY MAPPING
     ---------------------------------------------------------- */
  const topicMap = {};
  Object.keys(CONFIG.topics).forEach(key => {
    topicMap[CONFIG.topics[key]] = key;
  });

  /* ----------------------------------------------------------
     CONNECT — menggunakan Paho MQTT (sesuai library di index.html)
     ---------------------------------------------------------- */
  function connect() {
    if (typeof Paho === 'undefined') {
      console.warn('[MQTT] Paho library not loaded. Using simulation mode.');
      startSimulation();
      return;
    }

    updateIndicator('connecting', 'Menghubungkan...');

    // Paho.Client untuk WSS: gunakan hostname + port + path secara terpisah
    const host = 'bb83e828e0dc40b9833a06f8b556ff91.s1.eu.hivemq.cloud';
    const port = 8884;
    const path = '/mqtt';

    try {
      client = new Paho.Client(host, port, path, CONFIG.clientId);
    } catch(e) {
      console.error('[MQTT] Gagal membuat Paho.Client:', e);
      startSimulation();
      return;
    }

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
      onSuccess:         onConnect,
      onFailure:         onConnectFail,
      keepAliveInterval: CONFIG.keepAlive,
      cleanSession:      CONFIG.cleanSession,
      useSSL:            true,
      userName:          CONFIG.username,
      password:          CONFIG.password,
      reconnect:         false,          // kita handle sendiri agar lebih terkontrol
      timeout:           10,
    };

    try {
      client.connect(options);
    } catch(e) {
      console.error('[MQTT] Connect error:', e);
      updateIndicator('error', 'Error');
      scheduleReconnect();
    }
  }

  function onConnect() {
    isConnected = true;
    stopSimulation();
    console.log('[MQTT] ✅ Terhubung ke HiveMQ:', CONFIG.broker);
    updateIndicator('connected', 'MQTT Terhubung');
    emit('connected', {});

    // Subscribe semua topik
    Object.values(CONFIG.topics).forEach(topic => {
      client.subscribe(topic, { qos: 1 });
    });

    updateSystemStatus(true);
  }

  function onConnectFail(err) {
    isConnected = false;
    console.warn('[MQTT] ❌ Koneksi gagal:', err.errorMessage, '| Code:', err.errorCode);
    updateIndicator('error', 'Gagal Terhubung');
    // Aktifkan simulasi sambil menunggu reconnect
    startSimulation();
    scheduleReconnect();
  }

  function onConnectionLost(response) {
    isConnected = false;
    if (response.errorCode !== 0) {
      console.warn('[MQTT] ⚠️ Koneksi terputus:', response.errorMessage);
    }
    updateIndicator('error', 'Terputus');
    updateSystemStatus(false);
    startSimulation();
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      console.log('[MQTT] 🔄 Mencoba reconnect...');
      stopSimulation();
      connect();
    }, 5000);
  }

  /* ----------------------------------------------------------
     MESSAGE HANDLER
     ---------------------------------------------------------- */
  function onMessageArrived(message) {
    const topic   = message.destinationName;
    const payload = message.payloadString.trim();
    const key     = topicMap[topic];

    if (!key) return;

    let value = parseFloat(payload);
    if (isNaN(value)) value = payload;

    state[key] = value;
    pushHistory(key, value);

    emit('dataUpdate', { key, value, topic });
  }

  /* ----------------------------------------------------------
     SIMULATION MODE (fallback jika broker tidak tersedia)
     ---------------------------------------------------------- */
  let simInterval = null;

  function startSimulation() {
    if (simInterval) return;   // sudah berjalan
    console.log('[MQTT] 🎮 Mode simulasi aktif');
    updateIndicator('connecting', 'Simulasi Aktif');

    // Pre-fill history
    const now = new Date();
    for (let i = HISTORY_MAX; i >= 0; i--) {
      pushHistory('dcVoltage', 47.5 + Math.sin(i * 0.2) * 1.2 + Math.random() * 0.3);
      pushHistory('acVoltage', 220  + Math.sin(i * 0.15) * 4  + Math.random() * 1);
    }

    simInterval = setInterval(() => {
      const updates = {
        dcVoltage:    +(47   + Math.random() * 3).toFixed(2),
        dcCurrent:    +(11   + Math.random() * 3).toFixed(2),
        dcEnergy:     +(state.dcEnergy + 0.001).toFixed(3),
        dcPower:      +(580  + Math.random() * 30).toFixed(2),
        panelTemp:    +(37   + Math.random() * 3).toFixed(1),
        acVoltage:    +(219  + Math.random() * 5).toFixed(1),
        acCurrent:    +(2.2  + Math.random() * 0.5).toFixed(2),
        acPower:      +(520  + Math.random() * 40).toFixed(2),
        acFrequency:  +(49.95 + Math.random() * 0.1).toFixed(2),
        rssiWifi:     -Math.floor(60 + Math.random() * 10),
        battVoltage:  +(47.8 + Math.random() * 0.6).toFixed(2),
        battCapacity: state.battCapacity,
      };

      Object.entries(updates).forEach(([key, value]) => {
        state[key] = value;
        pushHistory(key, value);
        emit('dataUpdate', { key, value });
      });
    }, 2000);

    updateSystemStatus(true);
    updateIndicator('connected', 'Simulasi');
  }

  function stopSimulation() {
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
      console.log('[MQTT] Simulasi dihentikan (MQTT aktif)');
    }
  }

  /* ----------------------------------------------------------
     PUBLISH
     ---------------------------------------------------------- */
  function publish(topic, payload) {
    if (!isConnected || !client) return false;
    try {
      const msg = new Paho.Message(String(payload));
      msg.destinationName = topic;
      msg.qos = 1;
      client.send(msg);
      return true;
    } catch(e) {
      console.error('[MQTT] Publish error:', e);
      return false;
    }
  }

  /* ----------------------------------------------------------
     HELPERS - UPDATE UI ELEMENTS
     ---------------------------------------------------------- */
  function updateIndicator(status, text) {
    const dot   = document.querySelector('.mqtt-dot');
    const label = document.querySelector('.mqtt-label');
    if (dot)   dot.className = 'mqtt-dot ' + status;
    if (label) label.textContent = text;
  }

  function updateSystemStatus(online) {
    const badge = document.getElementById('systemStatusBadge');
    const dot   = badge?.querySelector('.status-dot');
    const text  = badge?.querySelector('.status-text');
    if (!badge) return;
    if (online) {
      badge.className = 'status-badge';
      if (dot)  dot.className = 'status-dot';
      if (text) text.textContent = 'Sistem Online';
    } else {
      badge.className = 'status-badge offline';
      if (dot)  dot.className = 'status-dot offline';
      if (text) text.textContent = 'Sistem Offline';
    }
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  return {
    connect,
    disconnect: () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopSimulation();
      if (client && isConnected) { try { client.disconnect(); } catch(e) {} }
    },
    publish,
    on,
    getState:    () => ({ ...state }),
    getHistory,
    get isConnected() { return isConnected; },
    CONFIG,
  };

})();

window.MQTTManager = MQTTManager;
