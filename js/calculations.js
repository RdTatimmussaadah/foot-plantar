/**
 * calculations.js
 * All sensor data calculations for Foot Plantar Monitoring
 *
 * Data flow:
 *   ESP32 → Firebase (raw ADC/Newton/Percent per sensor)
 *   → JS calculates: total weight, ASI, Balance Score, Heel Load, Classification
 *   → Results written back to Firebase `current/` node
 *   → UI reads and displays
 *
 * References:
 *   - Sazonov et al. (2020)  — Weight estimation
 *   - Robinson et al. (1987) — Asymmetry Index
 *   - Błażkiewicz et al. (2014) — Balance Score
 *   - Putti et al. (2007)    — Heel Load normal range
 *   - Wang et al. (2023)     — Classification thresholds
 */

'use strict';
// ============================================================
// KONVERSI DIGITAL → NEWTON → PERCENT
// FSR402 + Voltage Divider 3.3V, ADC 12-bit (0–4095)
//
// Referensi konversi:
//   digital → volt  : V = (digital / 4095) * 3.3
//   volt → newton   : F = (V / Vcc) * F_max  (linear approx FSR402)
//   F_max FSR402     : ~100 Newton per sensor (bisa dikalibrasi)
//   newton → percent : pct = F_i / sum(F_all) * 100  (per kaki)
//
// Catatan:
//   - Ini pendekatan linear, cukup untuk perbandingan relatif antar sensor
//   - Untuk akurasi absolut berat badan, perlu kalibrasi dengan beban diketahui
//   - Python (plantar_ml_lokal.py) pakai digital langsung tanpa konversi Newton
//     karena hanya butuh persentase, bukan nilai absolut
// ============================================================

const FSR_CONFIG = {
  ADC_MAX:   4095,    // resolusi ADC 12-bit ESP32
  VCC:       3.3,     // tegangan referensi ESP32
  F_MAX:     100,     // Newton maksimum per sensor FSR402 (dapat dikalibrasi)
  // Threshold minimum — di bawah ini dianggap tidak ada tekanan (noise floor)
  DIGITAL_MIN: 50,
};

/**
 * Konversi satu array digital → Newton
 * F = (digital / ADC_MAX) * F_MAX
 * @param {number[]} digitalArr — array 4 nilai ADC (0–4095)
 * @returns {number[]} array 4 nilai Newton
 */
function digitalToNewton(digitalArr) {
  return digitalArr.map(d => {
    const clamped = Math.max(0, d - FSR_CONFIG.DIGITAL_MIN); // hilangkan noise floor
    return Math.round((clamped / FSR_CONFIG.ADC_MAX) * FSR_CONFIG.F_MAX * 10) / 10;
  });
}

/**
 * Konversi array Newton → percent relatif (per kaki)
 * pct_i = newton_i / sum(newton) * 100
 * Sama dengan cara Python: percent dari total per kaki
 * @param {number[]} newtonArr
 * @returns {number[]} percent 0–100 per sensor
 */
function newtonToPercent(newtonArr) {
  const total = newtonArr.reduce((a, b) => a + b, 0);
  if (total === 0) return [0, 0, 0, 0];
  return newtonArr.map(n => Math.round((n / total) * 100));
}

/**
 * Konversi digital → volt (untuk ditampilkan di UI sensor bar)
 * @param {number} digital
 * @returns {number} volt
 */
function digitalToVolt(digital) {
  return Math.round((digital / FSR_CONFIG.ADC_MAX) * FSR_CONFIG.VCC * 100) / 100;
}

/**
 * Proses raw data dari ESP32 (hanya digital) menjadi
 * struktur lengkap dengan Newton dan Percent.
 *
 * Input dari Firebase/ESP32:
 * {
 *   left_fsr_digital:  [512, 620, 450, 580],
 *   right_fsr_digital: [530, 610, 480, 590],
 *   timestamp: 1234567890
 * }
 *
 * Output:
 * {
 *   left_fsr_digital,  right_fsr_digital,   ← dari ESP32
 *   left_fsr_newton,   right_fsr_newton,    ← dihitung JS
 *   left_fsr_percent,  right_fsr_percent,   ← dihitung JS
 *   timestamp
 * }
 */
function processRawDigital(rawData) {
  const lD = rawData.left_fsr_digital  || [0, 0, 0, 0];
  const rD = rawData.right_fsr_digital || [0, 0, 0, 0];
  const lB = rawData.left_balance_percent || [0, 0, 0, 0];
  const rB = rawData.right_balance_percent || [0, 0, 0, 0];

  const lN = (Array.isArray(rawData.left_fsr_newton) && rawData.left_fsr_newton.length === 4)
    ? rawData.left_fsr_newton
    : digitalToNewton(lD);

  const rN = (Array.isArray(rawData.right_fsr_newton) && rawData.right_fsr_newton.length === 4)
    ? rawData.right_fsr_newton
    : digitalToNewton(rD);

  const lP = Array.isArray(rawData.left_fsr_percent)
  ? rawData.left_fsr_percent
  : newtonToPercent(lN);

  const rP = Array.isArray(rawData.right_fsr_percent)
    ? rawData.right_fsr_percent
    : newtonToPercent(rN);

return {
    left_fsr_digital:  lD,
    right_fsr_digital: rD,
    left_fsr_newton:   lN,
    right_fsr_newton:  rN,
    left_fsr_percent:  lP,
    right_fsr_percent: rP,
    left_balance_percent: lB,
    right_balance_percent: rB,
    timestamp: rawData.timestamp || Date.now(),
  };
}

// ============================================================
// 9.1 ESTIMATED BODY WEIGHT
// W = F_total / 9.81  (Newton → kg)
// ============================================================
/**
 * @param {number[]} leftNewton  - Array of 4 Newton values from left sensors
 * @param {number[]} rightNewton - Array of 4 Newton values from right sensors
 * @returns {{ totalForce: number, weight: number }}
 */
function calcWeight(leftNewton, rightNewton) {
  const totalForce = [...leftNewton, ...rightNewton].reduce((a, b) => a + b, 0);
  const weight = totalForce / 9.81;
  return {
    totalForce: Math.round(totalForce),
    weight: Math.round(weight * 10) / 10,  // 1 decimal
  };
}

// ============================================================
// 9.2 ASYMMETRY INDEX (ASI)
// ASI = |F_left - F_right| / (0.5 × (F_left + F_right)) × 100%
// ============================================================
/**
 * @param {number[]} leftNewton
 * @param {number[]} rightNewton
 * @returns {{ fLeft: number, fRight: number, asi: number }}
 */
function calcASI(leftNewton, rightNewton) {
  const fLeft  = leftNewton.reduce((a, b) => a + b, 0);
  const fRight = rightNewton.reduce((a, b) => a + b, 0);
  const total  = fLeft + fRight;

  if (total === 0) return { fLeft: 0, fRight: 0, asi: 0 };

  const asi = (Math.abs(fLeft - fRight) / (0.5 * total)) * 100;
  return {
    fLeft:  Math.round(fLeft),
    fRight: Math.round(fRight),
    asi:    Math.round(asi * 10) / 10,
  };
}

// ============================================================
// 9.3 BALANCE SCORE
// Balance Score = 100 - ASI
// ============================================================
/**
 * @param {number} asi
 * @returns {number}
 */
function calcBalanceScore(asi) {
  return Math.max(0, Math.round((100 - asi) * 10) / 10);
}


// ============================================================
// 9.6 MED-LAT RATIO & PRONATION CLASSIFICATION
// Mengukur dominasi medial (Med.FF) vs lateral (Lat.FF)
//
// Rumus: ratio = (MFF - LFF) / (MFF + LFF) * 100
//   > +15 → Overpronation  (kaki jatuh ke dalam / arch kolaps)
//   < -15 → supination (kaki ke luar / supinasi)
//   else  → Normal
//
// Index sensor: [0]=Hallux, [1]=Med.FF, [2]=Lat.FF, [3]=Heel
// ============================================================

/**
 * @param {number[]} leftNewton   - [hallux, medFF, latFF, heel]
 * @param {number[]} rightNewton  - [hallux, medFF, latFF, heel]
 * @returns {{
 *   ratioL: number, ratioR: number,
 *   classL: string, classR: string,
 *   cssClassL: string, cssClassR: string
 * }}
 */
function calcPronation(leftNewton, rightNewton) {
  function medLatRatio(newton) {
    const mff = newton[1];
    const lff = newton[2];
    const denom = mff + lff;
    if (denom === 0) return 0;
    return (mff - lff) / denom * 100;
  }

  function classifyPronation(ratio) {
    if (ratio > 15)  return { label: 'Overpronation',  cssClass: 'overpronation'};
    if (ratio < -15) return { label: 'Supination', cssClass: 'supination'};
    return             { label: 'Normal',          cssClass: 'pronation-normal'};
  }

  const ratioL = Math.round(medLatRatio(leftNewton) * 10) / 10;
  const ratioR = Math.round(medLatRatio(rightNewton) * 10) / 10;
  const classL = classifyPronation(ratioL);
  const classR = classifyPronation(ratioR);

  return {
    ratioL, ratioR,
    labelL: classL.label,   labelR: classR.label,
    cssClassL: classL.cssClass, cssClassR: classR.cssClass
  };
}

// Heel load tinggi + forefoot rendah → High Arch (Hollow foot)
// Heel load rendah + forefoot tinggi → Flat foot
// Seimbang → Normal

function calcArchType(leftNewton, rightNewton) {
  // Index: [0]=Hallux, [1]=Med.FF, [2]=Lat.FF, [3]=Heel
  const totalL = leftNewton.reduce((a,b) => a+b, 0)  || 1;
  const totalR = rightNewton.reduce((a,b) => a+b, 0) || 1;

  // Heel ratio per kaki (heel / total kaki itu)
  const heelRatioL = (leftNewton[3]  / totalL) * 100;
  const heelRatioR = (rightNewton[3] / totalR) * 100;

  // Forefoot ratio per kaki
  const ffRatioL = ((leftNewton[0]  + leftNewton[1]  + leftNewton[2])  / totalL) * 100;
  const ffRatioR = ((rightNewton[0] + rightNewton[1] + rightNewton[2]) / totalR) * 100;

  function classify(heelRatio, ffRatio) {
    // High arch: heel sangat dominan, forefoot sangat kecil
    if (heelRatio > 65 && ffRatio < 35)
      return { label: 'High Arch',  cssClass: 'arch-high',   emoji: '🔵', desc: 'Hollow foot' };
    // Flat foot: forefoot dominan, heel sangat kecil
    if (ffRatio > 65 && heelRatio < 35)
      return { label: 'Flat Foot',  cssClass: 'arch-flat',   emoji: '🔴', desc: 'Fallen arch' };
    // Normal
    return   { label: 'Normal',     cssClass: 'arch-normal', emoji: '✅', desc: 'Normal foot' };
  }

  const clsL = classify(heelRatioL, ffRatioL);
  const clsR = classify(heelRatioR, ffRatioR);

  return {
    heelRatioL: Math.round(heelRatioL * 10) / 10,
    heelRatioR: Math.round(heelRatioR * 10) / 10,
    ffRatioL:   Math.round(ffRatioL   * 10) / 10,
    ffRatioR:   Math.round(ffRatioR   * 10) / 10,
    labelL:     clsL.label,    labelR:    clsR.label,
    cssClassL:  clsL.cssClass, cssClassR: clsR.cssClass,
    emojiL:     clsL.emoji,    emojiR:    clsR.emoji,
    descL:      clsL.desc,     descR:     clsR.desc,
  };
}

// ============================================================
// MASTER CALCULATE — combines everything into one result object
// ============================================================
/**
 * @param {object} sensorData  — raw data matching Firebase structure
 * @returns {object}           — full computed metrics
 *
 * sensorData shape:
 * {
 *   left_fsr_newton:  [number, number, number, number],
 *   right_fsr_newton: [number, number, number, number],
 *   left_fsr_percent: [number, number, number, number],
 *   right_fsr_percent:[number, number, number, number],
 *   left_fsr_digital: [number, number, number, number],
 *   right_fsr_digital:[number, number, number, number],
 * }
 */

function computeAll(sensorData) {
  const lN = sensorData.left_fsr_newton  || [0, 0, 0, 0];
  const rN = sensorData.right_fsr_newton || [0, 0, 0, 0];
  
  const { totalForce } = calcWeight(lN, rN);
  const { fLeft, fRight, asi } = calcASI(lN, rN);
  const balanceScore           = calcBalanceScore(asi);
  const pronation   = calcPronation(lN, rN);
  const archType = calcArchType(lN, rN);   

  // Left/Right distribution percentages
  // const leftPercent  = totalForce > 0 ? Math.round((fLeft  / totalForce) * 100) : 50;
  // const rightPercent = totalForce > 0 ? Math.round((fRight / totalForce) * 100) : 50;
// Mengambil langsung dari Firebase, jika kosong/undefined baru dihitung manual sebagai backup
  const leftPercent  = sensorData.left_balance_percent  != null ? Number(Math.round(sensorData.left_balance_percent))  : (totalForce > 0 ? Math.round((fLeft  / totalForce) * 100) : 50);
  const rightPercent = sensorData.right_balance_percent != null ? Number(Math.round(sensorData.right_balance_percent)) : (totalForce > 0 ? Math.round((fRight / totalForce) * 100) : 50);
  
  return {
    // Raw
    left_fsr_newton:   lN,
    right_fsr_newton:  rN,
    left_fsr_percent:  sensorData.left_fsr_percent  || [0, 0, 0, 0],
    right_fsr_percent: sensorData.right_fsr_percent || [0, 0, 0, 0],
    left_fsr_digital:  sensorData.left_fsr_digital  || [0, 0, 0, 0],
    right_fsr_digital: sensorData.right_fsr_digital || [0, 0, 0, 0],

    // Computed
    totalForce,
    fLeft,
    fRight,
    asi,
    balanceScore,
    pronation,
    leftPercent,
    rightPercent,
    archType,

    timestamp: sensorData.timestamp || Date.now(),
  };
}
