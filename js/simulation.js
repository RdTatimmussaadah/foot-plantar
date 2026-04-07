/**
 * simulation.js
 * Simulates real-time ESP32 sensor data for development/testing.
 * Replace this with Firebase Realtime Database listener when ready.
 *
 * To switch to Firebase:
 *   1. Delete this file import from HTML
 *   2. In firebase.js, set up onValue() listener on 'prototype/current'
 *   3. Call computeAll() on received data → update UI
 */

'use strict';

// {
//   "rules": {
//     "users": {
//       "$uid": {
//         ".read":  "$uid === auth.uid",
//         ".write": "$uid === auth.uid"
//       }
//     }
//   }
// }

// ============================================================
// SIMULATION CONFIGURATION
// ============================================================
const SIM_CONFIG = {
  updateIntervalMs: 1500,   // how often data "updates" from ESP32
  noiseLevel: 15,           // Newton noise amplitude per update
  baselineLeft:  [120, 150, 90, 180],   // [hallux, medFF, latFF, heel] in Newton
  baselineRight: [130, 140, 100, 170],
};

let _simInterval = null;
let _simCallbacks = [];

// ============================================================
// CORE SIMULATION
// ============================================================

/**
 * Generates one frame of simulated sensor data.
 * Adds smooth noise to baseline values.
 * @returns {object} Raw sensor data matching Firebase structure
 */
function generateSimulatedData() {
  const noise = (base) => Math.max(0, base + (Math.random() - 0.5) * SIM_CONFIG.noiseLevel * 2);

  const lN = SIM_CONFIG.baselineLeft.map(noise);
  const rN = SIM_CONFIG.baselineRight.map(noise);

  // Convert Newton → digital (ADC 0–4095, assuming 3.3V, FSR402)
  // Approximate: digital = (newton / maxForce) * 4095
  const toDigital = (n) => Math.round(Math.min(4095, (n / 300) * 4095));

  // Convert Newton → percent (relative to total in each foot)
  const sumL = lN.reduce((a, b) => a + b, 0);
  const sumR = rN.reduce((a, b) => a + b, 0);
  const toPct = (n, sum) => sum > 0 ? Math.round((n / sum) * 100) : 0;

  return {
    left_fsr_digital:  lN.map(toDigital),
    right_fsr_digital: rN.map(toDigital),
    left_fsr_newton:   lN.map(n => Math.round(n)),
    right_fsr_newton:  rN.map(n => Math.round(n)),
    left_fsr_percent:  lN.map(n => toPct(n, sumL)),
    right_fsr_percent: rN.map(n => toPct(n, sumR)),
    timestamp: Date.now(),
  };
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Start the simulation loop.
 * Calls all registered callbacks with new computed data every interval.
 */
function startSimulation() {
  if (_simInterval) stopSimulation();

  const tick = () => {
    const raw = generateSimulatedData();
    const computed = computeAll(raw);  // from calculations.js
    _simCallbacks.forEach(cb => cb(computed));
  };

  tick();  // fire immediately
  _simInterval = setInterval(tick, SIM_CONFIG.updateIntervalMs);
  console.log('[SIM] Simulation started');
}

/**
 * Stop the simulation loop.
 */
function stopSimulation() {
  clearInterval(_simInterval);
  _simInterval = null;
  console.log('[SIM] Simulation stopped');
}

/**
 * Register a callback to receive data updates.
 * @param {function} cb - receives a computed data object
 * @returns {function} unsubscribe function
 */
function onDataUpdate(cb) {
  _simCallbacks.push(cb);
  return () => {
    _simCallbacks = _simCallbacks.filter(f => f !== cb);
  };
}

// ============================================================
// SNAPSHOT STORAGE (local, before Firebase)
// ============================================================
let _snapshots = [];

/**
 * Records the current sensor state as a snapshot.
 * @param {object} computedData  — result from computeAll()
 * @param {string} postureLabel  — e.g. 'Berdiri', 'Jongkok'
 * @param {string} note          — optional clinician note
 * @returns {object} snapshot object
 */
function recordSnapshot(computedData, postureLabel = 'Berdiri', note = '') {
  const now = new Date();
  const snapshot = {
    id: `snap_${Date.now()}`,
    snapshot_time: now.toLocaleString('id-ID'),
    posture: postureLabel,
    note,

    // Sensor data
    left_fsr_newton:   computedData.left_fsr_newton,
    right_fsr_newton:  computedData.right_fsr_newton,
    left_fsr_percent:  computedData.left_fsr_percent,
    right_fsr_percent: computedData.right_fsr_percent,

    // Computed metrics
    total_weight:    computedData.weight,
    total_force:     computedData.totalForce,
    balance_score:   computedData.balanceScore,
    asi:             computedData.asi,
    heel_load:       computedData.heelLoad,
    left_percent:    computedData.leftPercent,
    right_percent:   computedData.rightPercent,
    classification:  computedData.classification.status,
    zones:           computedData.zones,
  };

  _snapshots.unshift(snapshot);  // newest first
  console.log('[SIM] Snapshot recorded:', snapshot.id);

  // TODO: Replace with Firebase push to `users/{uid}/history/`
  // firebase.database().ref(`users/${uid}/history`).push(snapshot);

  return snapshot;
}

/**
 * Get all recorded snapshots (newest first).
 * @returns {object[]}
 */
function getSnapshots() {
  return [..._snapshots];
}

/**
 * Generate initial mock history data for UI testing.
 */
function generateMockHistory() {
  const postures = ['Berdiri', 'Jongkok', '1 Kaki', '2 Kaki'];
  const dates = [
    new Date('2026-03-04T14:32:15'),
    new Date('2026-03-04T13:15:42'),
    new Date('2026-03-04T10:02:09'),
    new Date('2026-03-03T15:22:31'),
    new Date('2026-03-03T09:44:00'),
    new Date('2026-03-02T16:10:22'),
    new Date('2026-03-02T10:30:00'),
  ];

  _snapshots = dates.map((date, i) => {
    const raw = generateSimulatedData();
    const computed = computeAll(raw);
    return {
      id: `snap_mock_${i}`,
      snapshot_time: date.toLocaleString('id-ID'),
      posture: postures[i % postures.length],
      note: '',
      left_fsr_newton:  computed.left_fsr_newton,
      right_fsr_newton: computed.right_fsr_newton,
      left_fsr_percent: computed.left_fsr_percent,
      right_fsr_percent:computed.right_fsr_percent,
      total_weight:     computed.weight,
      total_force:      computed.totalForce,
      balance_score:    computed.balanceScore,
      asi:              computed.asi,
      heel_load:        computed.heelLoad,
      left_percent:     computed.leftPercent,
      right_percent:    computed.rightPercent,
      classification:   computed.classification.status,
      zones:            computed.zones,
      _date: date,
    };
  });
}
