/**
 * components.js
 * Reusable UI components: Sidebar, Topbar, Toast, Modals
 */


window.addEventListener("languagechange", function () {
  const snapModal = document.getElementById("modal-snap-ov");
  const logoutModal = document.getElementById("modal-logout-ov");

  const snapWasOpen = snapModal && snapModal.classList.contains("show");
  const logoutWasOpen = logoutModal && logoutModal.classList.contains("show");

  if (snapModal) snapModal.remove();
  if (logoutModal) logoutModal.remove();

  if (snapWasOpen && typeof openSnapModal === "function") {
    openSnapModal();
  }

  if (logoutWasOpen && typeof openLogoutModal === "function") {
    openLogoutModal();
  }
});

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar(container, activePage) {
  // Sidebar tidak dirender — navigasi sudah pindah ke topbar
  // Container tetap ada di DOM tapi display:none via CSS (base.css)
  container.innerHTML = '';
  container.dataset.active = activePage;
 
  // Fallback: kalau topbar belum dirender, render sekarang
  const topbarEl = document.getElementById('topbar');
  if (topbarEl && topbarEl.innerHTML.trim() === '') {
    renderTopbar(topbarEl, '');
  }
}

// ============================================================
// TOPBAR
// ============================================================
function renderTopbar(container, pageTitle) {
  // Deteksi halaman aktif dari URL
  const path = window.location.pathname;
  const isDashboard  = path.includes('dashboard');
  const isReport  = path.includes('report');
 
  const patient = getActivePatient();
  const initials = (patient.name || 'P')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
 
  container.innerHTML = `
    <!-- Kiri: Logo -->
    <div class="topbar-left">
      <div class="logo-icon">
        <img src="../assets/images/logo-foot.png"
             alt="FPS Logo"
             style="width:20px;height:20px;object-fit:contain"
             onerror="this.style.display='none'"
        />
      </div>
      <span class="topbar-title">Foot Plantar Monitoring</span>
    </div>
 
    <!-- Tengah: Navigasi 2 tab -->
    <div class="topbar-nav">
      <button
        class="nav-tab ${isDashboard ? 'active' : ''}"
        onclick="window.location.href='dashboard.html'"
      >${tr("Dashboard")}</button>
      <button
        class="nav-tab ${isReport ? 'active' : ''}"
        onclick="window.location.href='report.html'"
      >${tr("Report")}</button>
    </div>
 
    <!-- Kanan: Rekam + User -->
    <div class="topbar-right">
      <button class="btn-snapshot" onclick="openSnapModal()">
        <svg width="10" height="10" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
        ${tr("Take Snapshot")}
      </button>
      <div class="user-chip">
        <div class="patient-avatar">${initials}</div>
        <span class="patient-name">${patient.name || tr("Patient")}</span>
      </div>
      <button class="logout-btn" onclick="openLogoutModal()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H2"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${tr("Logout")}
      </button>
    </div>
  `;
   if (window.simpleLang && typeof window.simpleLang.apply === "function") {
    window.simpleLang.apply();
  }
}

// ============================================================
// MODAL — LOGOUT
// ============================================================
function openLogoutModal() {
  let ov = document.getElementById('modal-logout-ov');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'modal-logout-ov';
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal-box" id="modal-logout-box">
        <div class="modal-icon-wrap">
          <span style="font-size:36px">👋</span>
        </div>
        <div class="modal-title">${tr("Logout from Account?")}</div>
        <div class="modal-sub">
          ${tr("Monitoring sessions will remain saved.")}<br>
          ${tr("You can log back in at any time.")}
        </div>
        <div class="modal-btns">
          <button class="mbtn-cancel" onclick="closeLogoutModal()">${tr("Cancel")}</button>
          <button class="mbtn-ok" onclick="doLogout()">${tr("Yes, Logout")}</button>
        </div>
      </div>
    `;
    ov.addEventListener('click', (e) => { if (e.target === ov) closeLogoutModal(); });
    document.body.appendChild(ov);
  }
  requestAnimationFrame(() => ov.classList.add('show'));
}

function closeLogoutModal() {
  const ov = document.getElementById('modal-logout-ov');
  if (ov) {
    ov.classList.remove('show');
  }
}

function doLogout() {
  closeLogoutModal();
  if (typeof firebaseLogout === 'function') {
    firebaseLogout()
      .then(function() {
        window.location.href = '../pages/login.html';
      })
      .catch(function() {
        window.location.href = '../pages/login.html';
      });
  } else {
    window.location.href = '../pages/login.html';
  }
}

// ============================================================
// MODAL — SNAPSHOT
// ============================================================
function openSnapModal() {
  let ov = document.getElementById('modal-snap-ov');

  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'modal-snap-ov';
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal-box snap-modal-box" id="modal-snap-box">
        <div class="modal-title" style="margin-bottom:3px">⏺ ${tr("Take Snapshot")}</div>
        <div class="modal-sub" style="margin-bottom:14px">
          ${tr("Saving CoP, foot structure, movement, and sensor data to history")}
        </div>

        <div class="snap-postur-row" id="snap-postur-row">
          <span class="snap-postur-ic" id="snap-postur-ic">🧍</span>
          <div>
            <div style="font-size:9px;color:var(--text-secondary);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em">
              ${tr("Posture")}
            </div>
            <div style="font-size:13px;font-weight:800;color:var(--red)" id="snap-postur-lbl">Standing</div>
          </div>
        </div>



        <div class="snap-arch-row">
          <div>${tr("Left Foot Structure")}: <span id="sp-arch-l" style="font-weight:700">—</span></div>
          <div>${tr("Right Foot Structure")}: <span id="sp-arch-r" style="font-weight:700">—</span></div>
        </div>

        <div class="snap-arch-row">
          <div>${tr("Left Movement")}: <span id="sp-pron-l" style="font-weight:700">—</span></div>
          <div>${tr("Right Movement")}: <span id="sp-pron-r" style="font-weight:700">—</span></div>
        </div>

        <div class="snap-totals-row">

          <div>CoP: <span class="snap-tot-b" id="sp-cop-status">—</span></div>
        </div>

        <div class="snap-note-wrap">
          <label class="snap-note-lbl">💬 &nbsp;${tr("Note (optional)")}</label>
          <textarea class="snap-note-input" id="snap-note-inp" placeholder="${tr("Example: before therapy, pain condition, etc...")}" rows="2"></textarea>
        </div>

        <div class="modal-btns">
          <button class="mbtn-cancel" onclick="closeSnapModal()">${tr("Cancel")}</button>
          <button class="mbtn-ok" onclick="saveSnapshot()">${tr("Save")}</button>
        </div>
      </div>
    `;

    ov.addEventListener('click', (e) => {
      if (e.target === ov) closeSnapModal();
    });

    document.body.appendChild(ov);
  }

  _populateSnapPreview();
  requestAnimationFrame(() => ov.classList.add('show'));
}

function _populateSnapPreview() {
  if (typeof currentData === 'undefined' || !currentData) return;

  const d = currentData;

  const postureML = localStorage.getItem('fps_currentPostureML') || '';
const posture = {
  'normal':            'Normal',
  'condong_depan':     'Forward Lean',
  'condong_belakang':  'Backward Lean',
  'condong_kanan':     'Right Lean',
  'condong_kiri':      'Left Lean',
}[postureML] || 'Not Detected';


const postureIcons = {
  'Normal':            '🧍',
  'Forward Lean':      '⬆️',
  'Backward Lean':     '⬇️',
  'Right Lean':        '➡️',
  'Left Lean':         '⬅️',
  'Not Detected':      '❓',
};

  const ic = document.getElementById('snap-postur-ic');
  const lb = document.getElementById('snap-postur-lbl');

  if (ic) ic.textContent = postureIcons[posture] || '🧍';
  // if (lb) lb.textContent = posture;
  if (lb) lb.textContent = `${tr(posture)}`;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const setColor = (id, color) => {
    const el = document.getElementById(id);
    if (el) el.style.color = color;
  };

  const lN = toSnapshotForceArray(d.left_fsr_newton);
  const rN = toSnapshotForceArray(d.right_fsr_newton);

  const fL = Math.round(lN.reduce((a, b) => a + b, 0));
  const fR = Math.round(rN.reduce((a, b) => a + b, 0));

  const arch = getSnapshotArchPreview(d);
  const motion = getSnapshotMotionPreview(d);

  set('sp-arch-l', tr(arch.left));
  set('sp-arch-r', tr(arch.right));
  set('sp-pron-l', tr(motion.left));
  set('sp-pron-r', tr(motion.right));

  setColor('sp-arch-l', getSnapshotStructureColor(arch.left));
  setColor('sp-arch-r', getSnapshotStructureColor(arch.right));
  setColor('sp-pron-l', getSnapshotMotionColor(motion.left));
  setColor('sp-pron-r', getSnapshotMotionColor(motion.right));

  const cop = computeSnapshotCop(d);
  set('sp-cop-status', tr(cop.label));

  setColor('sp-cop-status', getSnapshotCopColor(cop.label));
  setColor('sp-cop-distance', getSnapshotCopColor(cop.label));
}

function closeSnapModal() {
  const ov = document.getElementById('modal-snap-ov');
  if (ov) ov.classList.remove('show');
}

function saveSnapshot() {
  closeSnapModal();

  if (typeof currentData === 'undefined' || !currentData) {
    showToast(tr('Sensor data not available.'), 'error');
    return;
  }

  const note = document.getElementById('snap-note-inp')?.value || '';

  // BARU
  const postureML = localStorage.getItem('fps_currentPostureML') || '';
  const posture = {
    'normal':            'Normal',
    'condong_depan':     'Forward Lean',
    'condong_belakang':  'Backward Lean',
    'condong_kanan':     'Right Lean',
    'condong_kiri':      'Left Lean',
  }[postureML] || 'Not Detected';

  const cop = computeSnapshotCop(currentData);

  if (typeof firebaseRecordSnapshot === 'function') {
    firebaseRecordSnapshot(currentData, posture, note)
      .then(function () {
        showToast(`✅ ${tr("Snapshot saved")} — CoP ${tr(cop.label)}`, 'success');
      })
      .catch(function (err) {
        console.warn('Firebase snapshot failed:', err);
        showToast(`${tr("Snapshot failed to save")}: ${err.message || err}`, 'error');
      });
  } else {
    showToast(`✅ ${tr("Snapshot saved")} — CoP ${tr(cop.label)}`, 'success');
  }

  const noteInput = document.getElementById('snap-note-inp');
  if (noteInput) noteInput.value = '';

  if (typeof renderHistoryList === 'function') renderHistoryList();
  if (typeof renderSummaryStats === 'function') renderSummaryStats();
  if (typeof drawTrendCharts === 'function') drawTrendCharts();
}

const SNAPSHOT_SENSOR_COORDS = {
  L0: { x: -6.5, y: 7.5 },
  L1: { x: -8.5, y: 0.5 },
  L2: { x: -12.5, y: 0.0 },
  L3: { x: -10.0, y: -9.5 },
  R0: { x: 6.5, y: 7.5 },
  R1: { x: 8.5, y: 0.5 },
  R2: { x: 12.5, y: 0.0 },
  R3: { x: 10.0, y: -9.5 },
};

function toSnapshotForceArray(arr) {
  if (!Array.isArray(arr)) return [0, 0, 0, 0];

  return [0, 1, 2, 3].map((i) => {
    const n = Number(arr[i]);
    return Number.isFinite(n) ? n : 0;
  });
}

function computeSnapshotCop(data) {
  data = data || {};

  const lN = toSnapshotForceArray(data.left_fsr_newton);
  const rN = toSnapshotForceArray(data.right_fsr_newton);

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
      status: 'NO DATA AVAILABLE',
      label: 'NO DATA AVAILABLE',
      valid: false,
    };
  }

  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < 4; i++) {
    sumX += lN[i] * SNAPSHOT_SENSOR_COORDS[`L${i}`].x;
    sumY += lN[i] * SNAPSHOT_SENSOR_COORDS[`L${i}`].y;

    sumX += rN[i] * SNAPSHOT_SENSOR_COORDS[`R${i}`].x;
    sumY += rN[i] * SNAPSHOT_SENSOR_COORDS[`R${i}`].y;
  }

  const x = sumX / totalForce;
  const y = sumY / totalForce;
  const distance = Math.sqrt((x * x) + (y * y));
  const label = getSnapshotCopLabel(distance);

  return {
    x,
    y,
    distance,
    status: label === 'STABLE' ? 'NORMAL' : label,
    label,
    valid: true,
  };
}

function getSnapshotCopLabel(distance) {
  if (distance < 2.5) return 'STABLE';
  if (distance <= 4.5) return 'MODERATE';
  return 'UNSTABLE';
}

function getSnapshotCopColor(label) {
  if (label === 'STABLE') return 'var(--green)';
  if (label === 'MODERATE') return 'var(--yellow)';
  if (label === 'UNSTABLE') return 'var(--red)';
  return 'var(--text-secondary)';
}

function getSnapshotArchPreview(data) {
  const archType = data.archType || {};

  return {
    left: normalizeSnapshotLabel(
      data.arch_label_l ||
      data.arch_l ||
      data.left_arch ||
      archType.arch_label_l ||
      archType.labelL ||
      archType.left ||
      'Normal'
    ),
    right: normalizeSnapshotLabel(
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

function getSnapshotMotionPreview(data) {
  const pronation = data.pronation || {};

  return {
    left: normalizeSnapshotLabel(
      data.pronation_label_l ||
      data.pron_label_l ||
      data.left_pronation ||
      pronation.labelL ||
      pronation.left ||
      'Normal'
    ),
    right: normalizeSnapshotLabel(
      data.pronation_label_r ||
      data.pron_label_r ||
      data.right_pronation ||
      pronation.labelR ||
      pronation.right ||
      'Normal'
    ),
  };
}

function normalizeSnapshotLabel(label) {
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

function getSnapshotStructureColor(label) {
  const text = normalizeSnapshotLabel(label);

  if (text === 'Normal') return 'var(--green)';
  if (text === 'Flat Foot') return 'var(--red)';
  if (text === 'High Arch') return '#2266FF';

  return 'var(--text-secondary)';
}

function getSnapshotMotionColor(label) {
  const text = normalizeSnapshotLabel(label);

  if (text === 'Normal') return 'var(--green)';
  if (text === 'Overpronation') return 'var(--red)';
  if (text === 'Supinasi') return '#2266FF';

  return 'var(--text-secondary)';
}

// Expose
window.openSnapModal  = openSnapModal;
window.closeSnapModal = closeSnapModal;
window.saveSnapshot   = saveSnapshot;
window.openLogoutModal= openLogoutModal;
window.closeLogoutModal=closeLogoutModal;
window.doLogout       = doLogout;

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${tr(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ============================================================
// PATIENT DATA
// ============================================================
function getActivePatient() {
  // Fallback default selama belum load dari Firebase
  return window._activePatient || {
    uid:       '—',
    name:      '....',
    initials:  '....',
    age:       0,
    gender:    '—',
    weight:    0,
    height:    0,
    bloodType: '—',
    dob:       '—',
    phone:     '—',
    email:     '—',
    address:   '—',
  };
}

// Load profil dari Firebase lalu update sidebar
function loadPatientToSidebar() {
  if (typeof firebaseLoadProfile !== 'function') return;
  firebaseLoadProfile(function(profil) {
    if (!profil) return;

    // Hitung usia dari dob
    let age = 0;
    if (profil.dob) {
      age = Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000));
    }

    // Buat initials dari nama
    const initials = (profil.name || 'P')
      .split(' ').map(function(w) { return w[0]; })
      .join('').toUpperCase().slice(0, 2);

    window._activePatient = {
      uid:       getCurrentUID(),
      name:      profil.name      || '—',
      initials:  initials,
      age:       age,
      gender:    profil.gender    || '—',
      weight:    profil.weight    || 0,
      height:    profil.height    || 0,
      bloodType: profil.blood_type|| '—',
      dob:       profil.dob       || '—',
      phone:     profil.phone     || '—',
      email:     profil.email     || '—',
      address:   profil.address   || '—',
    };

    // Re-render sidebar dengan data baru
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const activePage = sidebar.dataset.active || 'monitor';
      renderSidebar(sidebar, activePage);
      sidebar.dataset.active = activePage;
    }

    const topbar = document.getElementById('topbar');
    if (topbar) {
      renderTopbar(topbar, '');
    }
    
  });
}