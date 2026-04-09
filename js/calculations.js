/**
 * calculations.js
 * All sensor data calculations for Foot Plantar Sense
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

  const lN = digitalToNewton(lD);
  const rN = digitalToNewton(rD);

  return {
    left_fsr_digital:  lD,
    right_fsr_digital: rD,
    left_fsr_newton:   lN,
    right_fsr_newton:  rN,
    left_fsr_percent:  newtonToPercent(lN),
    right_fsr_percent: newtonToPercent(rN),
    timestamp: rawData.timestamp || Date.now(),
  };
}

// EMA FILTER
// Menghaluskan noise sensor sebelum kalkulasi
const EMA_ALPHA = 0.2;
let _emaState = null; // {left: [0,0,0,0], right: [0,0,0,0]}

/**
 * Terapkan EMA filter ke raw sensor array
 * y[n] = α × x[n] + (1−α) × y[n−1]
 * @param {number[]} rawArr  — array 4 nilai raw
 * @param {number[]} prevArr — array 4 nilai EMA sebelumnya
 * @returns {number[]} nilai ter-filter
 */
function applyEMA(rawArr, prevArr) {
  return rawArr.map((v, i) =>
    EMA_ALPHA * v + (1 - EMA_ALPHA) * prevArr[i]
  );
}

/**
 * Filter seluruh data L+R sekaligus, maintain state antar frame
 * @param {object} rawData — {left_fsr_newton, right_fsr_newton, ...}
 * @returns {object} data dengan nilai ter-filter
 */
// function applyEMAFilter(rawData) {
//   if (!_emaState) {
//     // Inisialisasi dengan nilai pertama
//     _emaState = {
//       left:  [...rawData.left_fsr_newton],
//       right: [...rawData.right_fsr_newton],
//     };
//     return rawData; // frame pertama: return as-is
//   }

//   const filteredLeft  = applyEMA(rawData.left_fsr_newton,  _emaState.left);
//   const filteredRight = applyEMA(rawData.right_fsr_newton, _emaState.right);

//   _emaState.left  = filteredLeft;
//   _emaState.right = filteredRight;

//   return {
//     ...rawData,
//     left_fsr_newton:  filteredLeft.map(Math.round),
//     right_fsr_newton: filteredRight.map(Math.round),
//   };
// }

// 

function applyEMAFilter(rawData) {
  // Jika data dari ESP32 (hanya digital), proses dulu ke newton+percent
  const data = (rawData.left_fsr_newton)
    ? rawData                    // sudah ada newton (dari simulasi)
    : processRawDigital(rawData); // hanya digital (dari ESP32 real)

  if (!_emaState) {
    _emaState = {
      left:  [...data.left_fsr_newton],
      right: [...data.right_fsr_newton],
    };
    return data;
  }

  const filteredLeft  = applyEMA(data.left_fsr_newton,  _emaState.left);
  const filteredRight = applyEMA(data.right_fsr_newton, _emaState.right);

  _emaState.left  = filteredLeft;
  _emaState.right = filteredRight;

  // Rebuild percent dari Newton ter-filter
  const lFiltered = filteredLeft.map(Math.round);
  const rFiltered = filteredRight.map(Math.round);

  return {
    ...data,
    left_fsr_newton:   lFiltered,
    right_fsr_newton:  rFiltered,
    left_fsr_percent:  newtonToPercent(lFiltered),
    right_fsr_percent: newtonToPercent(rFiltered),
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
// 9.4 HEEL LOAD RATIO
// HeelLoad = (F_heel_left + F_heel_right) / F_total × 100%
// Sensor index mapping: [0]=Hallux, [1]=Med.FF, [2]=Lat.FF, [3]=Heel
// ============================================================
/**
 * @param {number[]} leftNewton   - [hallux, medFF, latFF, heel]
 * @param {number[]} rightNewton  - [hallux, medFF, latFF, heel]
 * @param {number}   totalForce
 * @returns {number} heel load percentage
 */
function calcHeelLoad(leftNewton, rightNewton, totalForce) {
  if (totalForce === 0) return 0;
  const heelForce = leftNewton[3] + rightNewton[3];
  return Math.round((heelForce / totalForce) * 1000) / 10;  // 1 decimal
}

// ============================================================
// 9.5 CLASSIFICATION
// Status     | Balance Score | ASI         | Heel Load
// Normal     | ≥ 90          | ≤ 10%       | 50–65%
// Sedang     | 80–89         | 11–20%      | 40–49% or 66–75%
// Abnormal   | < 80          | > 20%       | < 40% or > 75%
// ============================================================
/**
 * @param {number} balanceScore
 * @param {number} asi
 * @param {number} heelLoad
 * @returns {{ status: string, emoji: string, label: string }}
 */
function classify(balanceScore, asi, heelLoad) {
  const heelAbnormal = heelLoad < 40 || heelLoad > 75;
  const heelWarning  = (heelLoad >= 40 && heelLoad <= 49) || (heelLoad >= 66 && heelLoad <= 75);

  if (balanceScore < 80 || asi > 20 || heelAbnormal) {
    return { status: 'ABNORMAL', emoji: '🚨', label: 'Kelainan / Abnormal', cssClass: 'abnormal' };
  }
  if (balanceScore <= 89 || asi > 10 || heelWarning) {
    return { status: 'SEDANG',   emoji: '⚠️', label: 'Sedang',             cssClass: 'warning' };
  }
  return { status: 'NORMAL', emoji: '✅', label: 'Baik / Normal', cssClass: 'normal' };
}

// ============================================================
// SENSOR DISTRIBUTION (percent per zone combined L+R)
// ============================================================
/**
 * @param {number[]} leftNewton
 * @param {number[]} rightNewton
 * @param {number}   totalForce
 * @returns {{ hallux, medFF, latFF, heel }} — each as %
 */
function calcZoneDistribution(leftNewton, rightNewton, totalForce) {
  if (totalForce === 0) return { hallux: 0, medFF: 0, latFF: 0, heel: 0 };
  const zone = (i) => Math.round(((leftNewton[i] + rightNewton[i]) / totalForce) * 1000) / 10;
  return {
    hallux: zone(0),
    medFF:  zone(1),
    latFF:  zone(2),
    heel:   zone(3),
  };
}


// ============================================================
// 9.6 MED-LAT RATIO & PRONATION CLASSIFICATION
// Mengukur dominasi medial (Med.FF) vs lateral (Lat.FF)
//
// Rumus: ratio = (MFF - LFF) / (MFF + LFF) * 100
//   > +15 → Overpronation  (kaki jatuh ke dalam / arch kolaps)
//   < -15 → Underpronation (kaki ke luar / supinasi)
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
    if (ratio < -15) return { label: 'Underpronation', cssClass: 'underpronation'};
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


// ============================================================
// HEATMAP COLOR (given percentage 0–100)
// ============================================================
/**
 * Smooth gradient: green-muted → green → blue → yellow → orange → red
 * @param {number} percent  0–100
 * @returns {string} CSS rgb() color
 */
function getHeatmapColor(percent) {
  if (percent <= 0) return 'rgb(200, 255, 200)';

  if (percent <= 20) {
    const t = percent / 20;
    return `rgb(200, ${Math.round(255 - 75 * t)}, 200)`;
  }
  if (percent <= 40) {
    const t = (percent - 20) / 20;
    return `rgb(${Math.round(100 * t)}, ${Math.round(100 + 55 * t)}, 255)`;
  }
  if (percent <= 60) {
    const t = (percent - 40) / 20;
    return `rgb(${Math.round(100 + 155 * t)}, 255, ${Math.round(255 - 95 * t)})`;
  }
  if (percent <= 80) {
    const t = (percent - 60) / 20;
    return `rgb(255, ${Math.round(255 - 105 * t)}, ${Math.round(55 * t)})`;
  }
  const t = (percent - 80) / 20;
  return `rgb(255, ${Math.round(75 - 75 * t)}, 0)`;
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

  const { totalForce, weight } = calcWeight(lN, rN);
  const { fLeft, fRight, asi } = calcASI(lN, rN);
  const balanceScore           = calcBalanceScore(asi);
  const heelLoad               = calcHeelLoad(lN, rN, totalForce);
  const classification         = classify(balanceScore, asi, heelLoad);
  const zones                  = calcZoneDistribution(lN, rN, totalForce);
  const pronation   = calcPronation(lN, rN);
  const archType = calcArchType(lN, rN);   

  // Left/Right distribution percentages
  const leftPercent  = totalForce > 0 ? Math.round((fLeft  / totalForce) * 100) : 50;
  const rightPercent = totalForce > 0 ? Math.round((fRight / totalForce) * 100) : 50;

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
    weight,
    fLeft,
    fRight,
    asi,
    balanceScore,
    heelLoad,
    classification,
    zones,
    pronation,
    leftPercent,
    rightPercent,
    archType,

    timestamp: sensorData.timestamp || Date.now(),
  };
}
