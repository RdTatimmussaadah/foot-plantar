/**
 * firebase.js
 * Firebase Realtime Database integration (COMMENTED — use simulation.js first)
 *
 * HOW TO ACTIVATE:
 *   1. Create a Firebase project at console.firebase.google.com
 *   2. Enable Realtime Database & Authentication
 *   3. Fill in firebaseConfig below with your project credentials
 *   4. Uncomment all code in this file
 *   5. Remove simulation.js from HTML script tags
 *   6. Replace onDataUpdate() calls with onValue() listeners
 *
 * FIREBASE DATABASE STRUCTURE:
 * ─────────────────────────────
 * prototype/
 *   └── current/
 *       ├── left_fsr_digital:   [512, 620, 450, 580]
 *       ├── left_fsr_newton:    [120, 150, 90, 110]
 *       ├── left_fsr_percent:   [23, 31, 18, 22]
 *       ├── right_fsr_digital:  [530, 610, 480, 590]
 *       ├── right_fsr_newton:   [130, 140, 100, 120]
 *       ├── right_fsr_percent:  [25, 27, 19, 23]
 *       ├── total_weight:       "68.5"       (computed by JS, written back)
 *       ├── balance_score:      "92.0"       (computed by JS, written back)
 *       ├── asi:                "8.0"        (computed by JS, written back)
 *       ├── heel_load:          "57.3"       (computed by JS, written back)
 *       ├── classification:     "NORMAL"     (computed by JS, written back)
 *       └── timestamp:          1646776543210
 *
 * users/
 *   └── {uid}/
 *       ├── profile: { name, weight, height, dob, gender, blood_type, address, phone, email }
 *       └── history/
 *           └── {auto_id}:
 *               ├── left_fsr_newton:  [...]
 *               ├── right_fsr_newton: [...]
 *               ├── total_weight:     68.5
 *               ├── balance_score:    92.0
 *               ├── asi:              8.0
 *               ├── heel_load:        57.3
 *               ├── classification:   "NORMAL"
 *               ├── posture:          "Berdiri"
 *               ├── note:             ""
 *               └── snapshot_time:   "04/03/2026 14:32"
 */

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
    const computed = computeAll(raw);

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


function firebaseRecordSnapshot(computedData, postureLabel = 'Berdiri', note = '') {
  const uid = getCurrentUID();
  if (!uid) return Promise.reject('Belum login');
  
  const now  = new Date();
  const snap = {
    posture:          postureLabel,
    note,
    snapshot_time:    now.toLocaleString('id-ID'),

    left_fsr_newton:  computedData.left_fsr_newton,
    right_fsr_newton: computedData.right_fsr_newton,
    left_fsr_percent: computedData.left_fsr_percent,
    right_fsr_percent:computedData.right_fsr_percent,

    total_weight:     computedData.weight,
    total_force:      computedData.totalForce,
    balance_score:    computedData.balanceScore,
    asi:              computedData.asi,
    heel_load:        computedData.heelLoad,
    left_percent:     computedData.leftPercent,
    right_percent:    computedData.rightPercent,
    classification:   computedData.classification.status,
    zones:            computedData.zones,
    pronation: {
      ratioL: computedData.pronation.ratioL,
      ratioR: computedData.pronation.ratioR,
      labelL: computedData.pronation.labelL,
      labelR: computedData.pronation.labelR,
    },

    archType:{
      arch_label_l:    computedData.archType.labelL    || null,
      arch_label_r:    computedData.archType.labelR    || null,
      arch_heel_l:     computedData.archType.heelRatioL ?? null,
      arch_heel_r:     computedData.archType.heelRatioR ?? null,
      arch_ff_l:       computedData.archType.ffRatioL  ?? null,
      arch_ff_r:       computedData.archType.ffRatioR  ?? null,
    }
  };

  return db.ref(`users/${uid}/history`).push(snap);
}


/* ============================================================
   STEP 6: LOAD HISTORY
   ============================================================ */


function firebaseLoadHistory(callback) {
  const uid = getCurrentUID();
  if (!uid) return;

  db.ref(`users/${uid}/history`)
    .orderByKey()
    .limitToLast(50)
    .on('value', (snapshot) => {
      const history = [];
      snapshot.forEach((child) => {
        history.unshift({ id: child.key, ...child.val() });
      });
      callback(history);
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


/* ============================================================
   FIREBASE SDK SCRIPT TAGS (add to HTML <head> when ready)
   ============================================================

  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>

   ============================================================ */

console.log('[Firebase] firebase.js loaded — currently using simulation mode.');
console.log('[Firebase] To activate: uncomment firebase.js and fill firebaseConfig.');
