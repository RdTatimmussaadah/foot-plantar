// data set orang, input newton
// 'use strict';

// let postureModel = null;
// let postureModelLoading = null;

// const POSTURE_MODEL_URL = '../models/tfjs_model/model.json';

// const POSTURE_MODEL_CLASSES = [
//   'condong_belakang',
//   'condong_depan',
//   'condong_kanan',
//   'condong_kiri',
//   'normal',
// ];

// const POSTURE_LABEL_MAP = {
//   condong_belakang: 'Condong Belakang',
//   condong_depan: 'Condong Depan',
//   condong_kanan: 'Condong Kanan',
//   condong_kiri: 'Condong Kiri',
//   normal: 'Normal',
// };

// const POSTURE_FEATURE_MIN = [21, 21, 20, 21];
// const POSTURE_FEATURE_MAX = [2140, 1355, 2036, 2758];

// async function loadPostureModel() {
//   if (postureModel) return postureModel;

//   if (!window.tf) {
//     throw new Error('TensorFlow.js belum dimuat.');
//   }

//   if (!postureModelLoading) {
//     postureModelLoading = tf.loadLayersModel(POSTURE_MODEL_URL)
//       .then((model) => {
//         postureModel = model;
//         return model;
//       });
//   }

//   return postureModelLoading;
// }

// function scalePostureFeature(value, index) {
//   const min = POSTURE_FEATURE_MIN[index];
//   const max = POSTURE_FEATURE_MAX[index];
//   const n = Number(value) || 0;

//   if (max === min) return 0;

//   const scaled = (n - min) / (max - min);

//   return Math.max(0, Math.min(1, scaled));
// }

// function getPostureRawFeatures(data) {
//   data = data || {};

//   if (Array.isArray(data.left_fsr_digital) && data.left_fsr_digital.length >= 4) {
//     return data.left_fsr_digital.slice(0, 4).map((v) => Number(v) || 0);
//   }

//   if (Array.isArray(data.left_fsr_newton) && data.left_fsr_newton.length >= 4) {
//     return data.left_fsr_newton.slice(0, 4).map((n) => {
//       const force = Number(n) || 0;
//       return Math.round((force / 100) * 4095 + 50);
//     });
//   }

//   return [0, 0, 0, 0];
// }

// function makePostureModelInput(data) {
//   const raw = getPostureRawFeatures(data);

//   return raw.map((value, index) => scalePostureFeature(value, index));
// }

// function formatPostureModelLabel(rawLabel) {
//   return POSTURE_LABEL_MAP[rawLabel] || rawLabel;
// }

// async function predictPostureML(data) {
//   const rawFeatures = getPostureRawFeatures(data);
//   const rawTotal = rawFeatures.reduce((a, b) => a + b, 0);

//   if (rawTotal < 80) {
//     return {
//       label: 'Belum Terdeteksi',
//       rawLabel: 'no_pressure',
//       confidence: 0,
//     };
//   }

//   const model = await loadPostureModel();
//   const scaledFeatures = makePostureModelInput(data);

//   const input = tf.tensor2d([scaledFeatures], [1, 4]);
//   const output = model.predict(input);
//   const probs = Array.from(await output.data());

//   input.dispose();
//   output.dispose();

//   let maxIndex = 0;

//   for (let i = 1; i < probs.length; i++) {
//     if (probs[i] > probs[maxIndex]) {
//       maxIndex = i;
//     }
//   }

//   const rawLabel = POSTURE_MODEL_CLASSES[maxIndex] || 'unknown';

//   return {
//     label: formatPostureModelLabel(rawLabel),
//     rawLabel,
//     confidence: probs[maxIndex] || 0,
//   };
// }

// window.loadPostureModel = loadPostureModel;
// window.predictPostureML = predictPostureML;
// window.formatPostureModelLabel = formatPostureModelLabel;
// window.POSTURE_MODEL_CLASSES = POSTURE_MODEL_CLASSES;


// data set orang, input digital
// 'use strict';

// let postureModel        = null;
// let postureModelLoading = null;

// const POSTURE_MODEL_URL = '../models/tfjs_model/model.json';

// const POSTURE_MODEL_CLASSES = [
//   'condong_belakang',
//   'condong_depan',
//   'condong_kanan',
//   'condong_kiri',
//   'normal',
// ];

// const POSTURE_LABEL_MAP = {
//   condong_belakang: 'Condong Belakang',
//   condong_depan:    'Condong Depan',
//   condong_kanan:    'Condong Kanan',
//   condong_kiri:     'Condong Kiri',
//   normal:           'Normal',
// };

// // Urutan fitur: [HL, M1L, M3L, HeelL, HR, M1R, M3R, HeelR]
// // Min/Max dari dataset plantar_posture_dataset.csv (143k sampel)
// const POSTURE_FEATURE_MIN = [21, 21, 20, 21, 19, 20, 20, 22];
// const POSTURE_FEATURE_MAX = [2140, 1355, 2036, 2758, 1654, 1830, 1688, 3108];

// // ─── Load model (lazy, singleton) ───────────────────────────
// async function loadPostureModel() {
//   if (postureModel) return postureModel;
//   if (!window.tf) throw new Error('TensorFlow.js belum dimuat.');
//   if (!postureModelLoading) {
//     postureModelLoading = tf.loadLayersModel(POSTURE_MODEL_URL)
//       .then((m) => { postureModel = m; return m; });
//   }
//   return postureModelLoading;
// }

// // ─── Scaling Min-Max ─────────────────────────────────────────
// function scaleFeature(value, index) {
//   const min = POSTURE_FEATURE_MIN[index];
//   const max = POSTURE_FEATURE_MAX[index];
//   if (max === min) return 0;
//   return Math.max(0, Math.min(1, ((Number(value) || 0) - min) / (max - min)));
// }

// // ─── Ekstrak 8 fitur digital langsung dari data ──────────────
// // data.left_fsr_digital  = [HL, M1L, M3L, HeelL]
// // data.right_fsr_digital = [HR, M1R, M3R, HeelR]
// function getPostureRawFeatures(data) {
//   data = data || {};
//   const lD = (Array.isArray(data.left_fsr_digital)  ? data.left_fsr_digital  : [0,0,0,0])
//                .slice(0, 4).map((v) => Number(v) || 0);
//   const rD = (Array.isArray(data.right_fsr_digital) ? data.right_fsr_digital : [0,0,0,0])
//                .slice(0, 4).map((v) => Number(v) || 0);
//   return [...lD, ...rD];
// }

// // ─── Predict — dipanggil otomatis setiap Firebase update ─────
// async function predictPostureML(data) {
//   const rawFeatures = getPostureRawFeatures(data);
//   const totalRaw    = rawFeatures.reduce((a, b) => a + b, 0);

//   if (totalRaw < 100) {
//     return { label: 'Belum Terdeteksi', rawLabel: 'no_pressure', confidence: 0 };
//   }

//   const model          = await loadPostureModel();
//   const scaledFeatures = rawFeatures.map((v, i) => scaleFeature(v, i));
//   const input          = tf.tensor2d([scaledFeatures], [1, 8]);
//   const output         = model.predict(input);
//   const probs          = Array.from(await output.data());

//   input.dispose();
//   output.dispose();

//   const maxIndex = probs.indexOf(Math.max(...probs));
//   const rawLabel = POSTURE_MODEL_CLASSES[maxIndex] || 'unknown';

//   return {
//     label:      POSTURE_LABEL_MAP[rawLabel] || rawLabel,
//     rawLabel,
//     confidence: probs[maxIndex] || 0,
//   };
// }

// window.loadPostureModel       = loadPostureModel;
// window.predictPostureML       = predictPostureML;
// window.POSTURE_MODEL_CLASSES  = POSTURE_MODEL_CLASSES;

// data set sendiri, input newton


// 'use strict';

// let postureModel = null;
// let postureModelLoading = null;

// const POSTURE_MODEL_URL = '../models/tfjs_model/model.json';

// const POSTURE_MODEL_CLASSES = [
//   'condong_belakang',
//   'condong_depan',
//   'condong_kanan',
//   'condong_kiri',
//   'normal',
// ];

// const POSTURE_LABEL_MAP = {
//   condong_belakang: 'Condong Belakang',
//   condong_depan: 'Condong Depan',
//   condong_kanan: 'Condong Kanan',
//   condong_kiri: 'Condong Kiri',
//   normal: 'Normal',
// };

// const POSTURE_FEATURE_MIN = [0.0, 2.7, 0.0, 16.4, 4.6, 0.0, 14.8, 0.0, 30.0, 39.0, 0.4, 2.3, -1.9299, -9.2172];
// const POSTURE_FEATURE_MAX = [749.0, 629.4, 629.4, 620.4, 625.5, 616.1, 623.5, 622.4, 61.0, 70.0, 97.7, 99.57, 3.2754, 2.9927];

// async function loadPostureModel() {
//   if (postureModel) return postureModel;

//   if (!window.tf) {
//     throw new Error('TensorFlow.js belum dimuat.');
//   }

//   if (!postureModelLoading) {
//     postureModelLoading = tf.loadLayersModel(POSTURE_MODEL_URL)
//       .then((model) => {
//         postureModel = model;
//         return model;
//       });
//   }

//   return postureModelLoading;
// }

// function scalePostureFeature(value, index) {
//   const min = POSTURE_FEATURE_MIN[index];
//   const max = POSTURE_FEATURE_MAX[index];
//   const n = Number(value) || 0;

//   if (max === min) return 0;

//   const scaled = (n - min) / (max - min);

//   return Math.max(0, Math.min(1, scaled));
// }

// function getPostureRawFeatures(data) {
//   data = data || {};

//   const lN = (data.left_fsr_newton  || [0, 0, 0, 0]).map((v) => Number(v) || 0);
//   const rN = (data.right_fsr_newton || [0, 0, 0, 0]).map((v) => Number(v) || 0);
//   const totalForce = (lN.reduce((a, b) => a + b, 0) + rN.reduce((a, b) => a + b, 0)) || 1;

//   const forefootPct  = (lN[0] + lN[1] + lN[2] + rN[0] + rN[1] + rN[2]) / totalForce * 100;
//   const leftPercent  = data.left_percent  != null ? data.left_percent  : Math.round(lN.reduce((a, b) => a + b, 0) / totalForce * 100);
//   const rightPercent = data.right_percent != null ? data.right_percent : (100 - leftPercent);
//   const heelLoad     = data.heel_load     != null ? data.heel_load     : ((lN[3] + rN[3]) / totalForce * 100);
//   const copX         = data.cop_x         != null ? data.cop_x         : 0;
//   const copY         = data.cop_y         != null ? data.cop_y         : 0;

//   return [
//     lN[0], lN[1], lN[2], lN[3],  // l_hallux, l_med_ff, l_lat_ff, l_heel
//     rN[0], rN[1], rN[2], rN[3],  // r_hallux, r_med_ff, r_lat_ff, r_heel
//     leftPercent, rightPercent,     // left_percent, right_percent
//     heelLoad, forefootPct,         // heel_load, forefoot_pct
//     copX, copY,                    // cop_x, cop_y
//   ];
// }

// function makePostureModelInput(data) {
//   const raw = getPostureRawFeatures(data);

//   return raw.map((value, index) => scalePostureFeature(value, index));
// }

// function formatPostureModelLabel(rawLabel) {
//   return POSTURE_LABEL_MAP[rawLabel] || rawLabel;
// }

// async function predictPostureML(data) {
//   const rawFeatures = getPostureRawFeatures(data);
//   // 8 sensor newton (index 0–7), threshold: total force minimal 5 Newton
//   const totalNewton = rawFeatures.slice(0, 8).reduce((a, b) => a + b, 0);

//   if (totalNewton < 5) {
//     return {
//       label: 'Belum Terdeteksi',
//       rawLabel: 'no_pressure',
//       confidence: 0,
//     };
//   }

//   const model = await loadPostureModel();
//   const scaledFeatures = makePostureModelInput(data);

//   const input = tf.tensor2d([scaledFeatures], [1, 14]);
//   const output = model.predict(input);
//   const probs = Array.from(await output.data());

//   input.dispose();
//   output.dispose();

//   let maxIndex = 0;

//   for (let i = 1; i < probs.length; i++) {
//     if (probs[i] > probs[maxIndex]) {
//       maxIndex = i;
//     }
//   }

//   const rawLabel = POSTURE_MODEL_CLASSES[maxIndex] || 'unknown';

//   return {
//     label: formatPostureModelLabel(rawLabel),
//     rawLabel,
//     confidence: probs[maxIndex] || 0,
//   };
// }

// window.loadPostureModel = loadPostureModel;
// window.predictPostureML = predictPostureML;
// window.formatPostureModelLabel = formatPostureModelLabel;
// window.POSTURE_MODEL_CLASSES = POSTURE_MODEL_CLASSES;


// data set sendiri, input digital
'use strict';

let postureModel        = null;
let postureModelLoading = null;

const POSTURE_MODEL_URL = '../models/tfjs_model/model.json';

const POSTURE_MODEL_CLASSES = ["condong_belakang", "condong_depan", "condong_kanan", "condong_kiri", "normal"];

const POSTURE_LABEL_MAP = {
  condong_belakang: 'Backward Lean',
  condong_depan:    'Forward Lean',
  condong_kanan:    'Right Lean',
  condong_kiri:     'Left Lean',
  normal:           'Normal',
};

// Urutan fitur: ['HL', 'M1L', 'M3L', 'HeelL', 'HR', 'M1R', 'M3R', 'HeelR']
// Min/Max dari dataset sendiri (digital / 16)
const POSTURE_FEATURE_MIN = [448.0, 896.0, 11472.0, 288.0, 48.0, 160.0, 10448.0, 16.0];
const POSTURE_FEATURE_MAX = [25296.0, 25248.0, 25328.0, 25344.0, 25344.0, 24848.0, 25440.0, 25344.0];

async function loadPostureModel() {
  if (postureModel) return postureModel;
  if (!window.tf) throw new Error('TensorFlow.js belum dimuat.');
  if (!postureModelLoading) {
    postureModelLoading = tf.loadLayersModel(POSTURE_MODEL_URL)
      .then((m) => { postureModel = m; return m; });
  }
  return postureModelLoading;
}

function scaleFeature(value, index) {
  const min = POSTURE_FEATURE_MIN[index];
  const max = POSTURE_FEATURE_MAX[index];
  if (max === min) return 0;
  return Math.max(0, Math.min(1, ((Number(value) || 0) - min) / (max - min)));
}

// Ambil 8 fitur digital langsung dari data Firebase
// ESP32 kirim nilai x16, dibagi 16 untuk normalisasi
function getPostureRawFeatures(data) {
  data = data || {};
  const lD = (Array.isArray(data.left_fsr_digital)  ? data.left_fsr_digital  : [0,0,0,0])
               .slice(0, 4).map((v) => Number(v) || 0);
  const rD = (Array.isArray(data.right_fsr_digital) ? data.right_fsr_digital : [0,0,0,0])
               .slice(0, 4).map((v) => Number(v) || 0);
  return [...lD, ...rD];
}

async function predictPostureML(data) {
  const rawFeatures = getPostureRawFeatures(data);
  const totalRaw    = rawFeatures.reduce((a, b) => a + b, 0);

  if (totalRaw < 50) {
    return { label: 'Belum Terdeteksi', rawLabel: 'no_pressure', confidence: 0 };
  }

  const model          = await loadPostureModel();
  const scaledFeatures = rawFeatures.map((v, i) => scaleFeature(v, i));
  const input          = tf.tensor2d([scaledFeatures], [1, 8]);
  const output         = model.predict(input);
  const probs          = Array.from(await output.data());

  input.dispose();
  output.dispose();

  const maxIndex = probs.indexOf(Math.max(...probs));
  const rawLabel = POSTURE_MODEL_CLASSES[maxIndex] || 'unknown';

  // Simpan ke localStorage untuk dipakai saat rekam snapshot
  localStorage.setItem('fps_currentPostureML', rawLabel);
  localStorage.setItem('fps_currentPostureMLConfidence', (probs[maxIndex] || 0).toFixed(4));

  return {
    label:      POSTURE_LABEL_MAP[rawLabel] || rawLabel,
    rawLabel,
    confidence: probs[maxIndex] || 0,
  };
}

window.loadPostureModel       = loadPostureModel;
window.predictPostureML       = predictPostureML;
window.POSTURE_MODEL_CLASSES  = POSTURE_MODEL_CLASSES;