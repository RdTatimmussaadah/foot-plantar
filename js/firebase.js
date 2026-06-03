'use strict';

/* ============================================================
   STEP 1: FIREBASE CONFIG
   Replace with your project config from Firebase Console
   ============================================================ */

/*
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
*/
const firebaseConfig = {
    apiKey: "AIzaSyAX4B6r8LEy3G1E2qE121EA30xZ4kvwj6U",
    authDomain: "foot-plantar-37353.firebaseapp.com",
    databaseURL: "https://foot-plantar-37353-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "foot-plantar-37353",
    storageBucket: "foot-plantar-37353.firebasestorage.app",
    messagingSenderId: "528147550135",
    appId: "1:528147550135:web:f06625ad8530f73ded6232",
    measurementId: "G-Q9CV660CMW"
};

/* ============================================================
   STEP 2: INITIALIZE FIREBASE
   ============================================================ */


firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();


/* ============================================================
   STEP 3: AUTHENTICATION
   ============================================================ */


// Login
function firebaseLogin(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Register
function firebaseRegister(email, password) {
  return auth.createUserWithEmailAndPassword(email, password);
}

// Logout
function firebaseLogout() {
  return auth.signOut();
}

// Get current user UID
function getCurrentUID() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// harus login dulu
function requireAuth(onReady) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = '../pages/login.html';
    } else {
      if (typeof onReady === 'function') onReady(user);
    }
  });
}

/* ============================================================
   STEP 4: LIVE SENSOR DATA LISTENER
   Replaces simulation.js startSimulation() + onDataUpdate()
   ============================================================ */


function startFirebaseListen(callback) {
  const ref = db.ref('sensor_data');

  ref.on('value', (snapshot) => {
    const raw = snapshot.val();
    if (!raw) return;

    // Compute all metrics from raw ESP32 data
    const withCalc = processRawDigital(raw);
    // const filtered = applyEMAFilter(withCalc);
    const computed = computeAll(withCalc);
    // const computed = computeAll(raw);

    // Write computed values back to Firebase current node
    // ref.update({
    //   total_weight:    String(computed.weight),
    //   balance_score:   String(computed.balanceScore),
    //   asi:             String(computed.asi),
    //   heel_load:       String(computed.heelLoad),
    //   classification:  computed.classification.status,
    //   left_percent:    String(computed.leftPercent),
    //   right_percent:   String(computed.rightPercent),
    // });

    callback(computed);
  });

  // Return unsubscribe function
  return () => ref.off('value');
}


/* ============================================================
   STEP 5: SNAPSHOT — save to Firebase history
   ============================================================ */


// function firebaseRecordSnapshot(computedData, postureLabel = 'Berdiri', note = '') {
//   const uid = getCurrentUID();
//   if (!uid) return Promise.reject('Belum login');
  
//   const now  = new Date();
//   const snap = {
//     posture:          postureLabel,
//     note,
//     snapshot_time:    now.toLocaleString('id-ID'),

//     left_fsr_newton:  computedData.left_fsr_newton,
//     right_fsr_newton: computedData.right_fsr_newton,
//     left_fsr_percent: computedData.left_fsr_percent,
//     right_fsr_percent:computedData.right_fsr_percent,

//     total_weight:     computedData.weight,
//     total_force:      computedData.totalForce,
//     balance_score:    computedData.balanceScore,
//     asi:              computedData.asi,
//     heel_load:        computedData.heelLoad,
//     left_percent:     computedData.leftPercent,
//     right_percent:    computedData.rightPercent,
//     classification:   computedData.classification.status,
//     zones:            computedData.zones,
//     pronation: {
//       ratioL: computedData.pronation.ratioL,
//       ratioR: computedData.pronation.ratioR,
//       labelL: computedData.pronation.labelL,
//       labelR: computedData.pronation.labelR,
//     },

//     archType:{
//       arch_label_l:    computedData.archType.labelL    || null,
//       arch_label_r:    computedData.archType.labelR    || null,
//       arch_heel_l:     computedData.archType.heelRatioL ?? null,
//       arch_heel_r:     computedData.archType.heelRatioR ?? null,
//       arch_ff_l:       computedData.archType.ffRatioL  ?? null,
//       arch_ff_r:       computedData.archType.ffRatioR  ?? null,
//     }
//   };

//   return db.ref(`users/${uid}/history`).push(snap);
// }

function firebaseRecordSnapshot(computedData, postureLabel = 'Berdiri', note = '') {
  const uid = getCurrentUID();
  if (!uid) return Promise.reject('Belum login');

  computedData = computedData || {};

  const now = new Date();
  const cop = computeFirebaseSnapshotCop(computedData);
  const structure = getFirebaseSnapshotArch(computedData);
  const motion = getFirebaseSnapshotMotion(computedData);

  const snap = {
    posture: postureLabel,

    posture_ml:            localStorage.getItem('fps_currentPostureML') || '',
    posture_ml_confidence: parseFloat(localStorage.getItem('fps_currentPostureMLConfidence') || '0'),
    note,
    snapshot_time: now.toLocaleString('id-ID'),
    tanggal: now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    jam: now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),

    left_fsr_newton: computedData.left_fsr_newton || [0, 0, 0, 0],
    right_fsr_newton: computedData.right_fsr_newton || [0, 0, 0, 0],
    left_fsr_percent: computedData.left_fsr_percent || [0, 0, 0, 0],
    right_fsr_percent: computedData.right_fsr_percent || [0, 0, 0, 0],
    right_fsr_digital: computedData.right_fsr_digital || [0, 0, 0, 0],
    left_fsr_digital: computedData.left_fsr_digital || [0, 0, 0, 0],

    total_weight: Number(computedData.weight) || Number(computedData.total_weight) || 0,
    total_force: Number(computedData.totalForce) || Number(computedData.total_force) || 0,
    asi: Number(computedData.asi) || 0,
    heel_load: Number(computedData.heelLoad) || Number(computedData.heel_load) || 0,
    left_percent: Number(computedData.leftPercent) || Number(computedData.left_percent) || 0,
    right_percent: Number(computedData.rightPercent) || Number(computedData.right_percent) || 0,

    cop_x: cop.x,
    cop_y: cop.y,
    cop_distance: cop.distance,
    cop_status: cop.label,
    cop_label: cop.label,
    cop_valid: cop.valid,
    // cop: {
    //   x: cop.x,
    //   y: cop.y,
    //   distance: cop.distance,
    //   status: cop.status,
    //   label: cop.label,
    //   valid: cop.valid,
    // },

    arch_label_l: structure.left,
    arch_label_r: structure.right,
    left_structure: structure.left,
    right_structure: structure.right,

    pronation_label_l: motion.left,
    pronation_label_r: motion.right,
    left_motion: motion.left,
    right_motion: motion.right,

    kelainan_kiri: combineFirebaseSnapshotCondition(structure.left, motion.left),
    kelainan_kanan: combineFirebaseSnapshotCondition(structure.right, motion.right),

    zones: computedData.zones || null,
    pronation: {
      ratioL: computedData.pronation?.ratioL ?? null,
      ratioR: computedData.pronation?.ratioR ?? null,
      labelL: motion.left,
      labelR: motion.right,
      cssClassL: computedData.pronation?.cssClassL || null,
      cssClassR: computedData.pronation?.cssClassR || null,
    },

    archType: {
      arch_label_l: structure.left,
      arch_label_r: structure.right,
      labelL: structure.left,
      labelR: structure.right,
      arch_heel_l: computedData.archType?.heelRatioL ?? computedData.archType?.arch_heel_l ?? null,
      arch_heel_r: computedData.archType?.heelRatioR ?? computedData.archType?.arch_heel_r ?? null,
      arch_ff_l: computedData.archType?.ffRatioL ?? computedData.archType?.arch_ff_l ?? null,
      arch_ff_r: computedData.archType?.ffRatioR ?? computedData.archType?.arch_ff_r ?? null,
    },
  };

  return db.ref(`users/${uid}/history`).push(snap);
}

const FIREBASE_SNAPSHOT_SENSOR_COORDS = {
  L0: { x: -6.5, y: 7.5 },
  L1: { x: -8.5, y: 0.5 },
  L2: { x: -12.5, y: 0.0 },
  L3: { x: -10.0, y: -9.5 },
  R0: { x: 6.5, y: 7.5 },
  R1: { x: 8.5, y: 0.5 },
  R2: { x: 12.5, y: 0.0 },
  R3: { x: 10.0, y: -9.5 },
};

function toFirebaseSnapshotForceArray(arr) {
  if (!Array.isArray(arr)) return [0, 0, 0, 0];

  return [0, 1, 2, 3].map((i) => {
    const n = Number(arr[i]);
    return Number.isFinite(n) ? n : 0;
  });
}

function computeFirebaseSnapshotCop(data) {
  data = data || {};

  const lN = toFirebaseSnapshotForceArray(data.left_fsr_newton);
  const rN = toFirebaseSnapshotForceArray(data.right_fsr_newton);

  let totalForce =
    lN.reduce((a, b) => a + b, 0) +
    rN.reduce((a, b) => a + b, 0);

  if (!totalForce || totalForce <= 0) {
    totalForce =
      Number(data.totalForce) ||
      Number(data.total_force) ||
      Number(data.totalWeight) ||
      0;
  }

  if (!totalForce || totalForce <= 0) {
    return {
      x: 0,
      y: 0,
      distance: 0,
      status: 'TIDAK ADA DATA',
      label: 'TIDAK ADA DATA',
      valid: false,
    };
  }

  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < 4; i++) {
    sumX += lN[i] * FIREBASE_SNAPSHOT_SENSOR_COORDS[`L${i}`].x;
    sumY += lN[i] * FIREBASE_SNAPSHOT_SENSOR_COORDS[`L${i}`].y;

    sumX += rN[i] * FIREBASE_SNAPSHOT_SENSOR_COORDS[`R${i}`].x;
    sumY += rN[i] * FIREBASE_SNAPSHOT_SENSOR_COORDS[`R${i}`].y;
  }

  const x = sumX / totalForce;
  const y = sumY / totalForce;
  const distance = Math.sqrt((x * x) + (y * y));
  const label = getFirebaseSnapshotCopLabel(distance);

  return {
    x,
    y,
    distance,
    status: label === 'STABIL' ? 'NORMAL' : label,
    label,
    valid: true,
  };
}

function getFirebaseSnapshotCopLabel(distance) {
  if (distance < 2.5) return 'STABIL';
  if (distance <= 4.5) return 'SEDANG';
  return 'ABNORMAL';
}

function getFirebaseSnapshotArch(data) {
  const archType = data.archType || {};

  return {
    left: normalizeFirebaseSnapshotLabel(
      data.arch_label_l ||
      data.arch_l ||
      data.left_arch ||
      archType.arch_label_l ||
      archType.labelL ||
      archType.left ||
      'Normal'
    ),
    right: normalizeFirebaseSnapshotLabel(
      data.arch_label_r ||
      data.arch_r ||
      data.right_arch ||
      archType.arch_label_r ||
      archType.labelR ||
      archType.right ||
      'Normal'
    ),
  };
}

function getFirebaseSnapshotMotion(data) {
  const pronation = data.pronation || {};

  return {
    left: normalizeFirebaseSnapshotLabel(
      data.pronation_label_l ||
      data.pron_label_l ||
      data.left_pronation ||
      pronation.labelL ||
      pronation.left ||
      'Normal'
    ),
    right: normalizeFirebaseSnapshotLabel(
      data.pronation_label_r ||
      data.pron_label_r ||
      data.right_pronation ||
      pronation.labelR ||
      pronation.right ||
      'Normal'
    ),
  };
}

function normalizeFirebaseSnapshotLabel(label) {
  const raw = String(label || '').trim();
  if (!raw || raw === '—') return 'Normal';

  const lower = raw.toLowerCase();

  if (lower.includes('flat')) return 'Flat Foot';
  if (lower.includes('high')) return 'High Arch';
  if (lower.includes('over')) return 'Overpronation';
  if (lower.includes('supin')) return 'Supinasi';
  if (lower.includes('normal') || lower.includes('netral')) return 'Normal';

  return raw;
}

function combineFirebaseSnapshotCondition(structure, motion) {
  const structureNorm = normalizeFirebaseSnapshotLabel(structure);
  const motionNorm = normalizeFirebaseSnapshotLabel(motion);

  const structureNormal = structureNorm === 'Normal';
  const motionNormal = motionNorm === 'Normal';

  if (structureNormal && motionNormal) return 'Normal';
  if (!structureNormal && !motionNormal) return `${structureNorm} dengan ${motionNorm}`;
  if (!structureNormal) return structureNorm;
  return motionNorm;
}



/* ============================================================
   STEP 6: LOAD HISTORY
   ============================================================ */


function firebaseLoadHistory(callback) {
  const uid = getCurrentUID();
  if (!uid) return;

  db.ref(`users/${uid}/history`)
    .orderByKey()
    .on('value', (snapshot) => {
      const history = [];

      snapshot.forEach((child) => {
        history.unshift({ id: child.key, ...child.val() });
      });

      _firebaseHistory = history;

      /*
        Fungsi ini hanya ada di halaman tertentu.
        Dashboard tidak punya renderHistoryList(), jadi harus dicek dulu.
      */
      if (typeof renderHistoryList === 'function') {
        renderHistoryList();
      }

      if (typeof renderSummaryStats === 'function') {
        renderSummaryStats();
      }

      if (typeof drawTrendCharts === 'function') {
        drawTrendCharts();
      }

      if (typeof callback === 'function') {
        callback(history);
      }
    });
}


/* ============================================================
   STEP 7: USER PROFILE
   ============================================================ */


function firebaseSaveProfile(profileData) {
  const uid = getCurrentUID();
  if (!uid) return Promise.reject('Belum login');
  return db.ref(`users/${uid}/profile`).set(profileData);
}

function firebaseLoadProfile(callback) {
  const uid = getCurrentUID();
  if (!uid) return;
  db.ref(`users/${uid}/profile`).on('value', (snap) => {
    callback(snap.val());
  });
}

// Menghapus satu snapshot berdasarkan ID
function firebaseDeleteSnapshot(snapId) {
  const uid = getCurrentUID();
  if (!uid) return Promise.reject('Belum login');
  return db.ref(`users/${uid}/history/${snapId}`).remove();
}

// Menghapus seluruh riwayat
function firebaseDeleteAllHistory() {
  const uid = getCurrentUID();
  if (!uid) return Promise.reject('Belum login');
  return db.ref(`users/${uid}/history`).remove();
  return Promise.resolve(false);
}


/* ============================================================
   FIREBASE SDK SCRIPT TAGS (add to HTML <head> when ready)
   ============================================================

  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>

   ============================================================ */

console.log('[Firebase] firebase.js loaded — currently using simulation mode.');
console.log('[Firebase] To activate: uncomment firebase.js and fill firebaseConfig.');
