/**
 * components.js
 * Reusable UI components: Sidebar, Topbar, Toast, Modals
 */

const Icons = {
  monitor: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none"><path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7A1.5 1.5 0 0112.5 12h-9A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" stroke-width="1.5"/><path d="M5 15h6M8 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  balance: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none"><path d="M8 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 5l5 3 5-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 11h5M10 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  history: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.5L10.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  profile: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  logout:  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  camera:  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="9" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 5.5A1.5 1.5 0 012.5 4h1l1-2h7l1 2h1A1.5 1.5 0 0115 5.5v7A1.5 1.5 0 0113.5 14h-11A1.5 1.5 0 011 12.5v-7z" stroke="currentColor" stroke-width="1.3"/></svg>`,
  download:`<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rec:     `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>`,
};

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar(container, activePage) {
  const patient = getActivePatient();
  const navItems = [
    { id: 'monitor',      label: 'Monitor',       icon: Icons.monitor,  href: '../pages/monitoring.html' },
    { id: 'keseimbangan', label: 'Analisis',      icon: Icons.balance,  href: '../pages/analisis.html' },
    { id: 'riwayat',      label: 'Riwayat',       icon: Icons.history,  href: '../pages/riwayat.html' },
    { id: 'profil',       label: 'Profil Pasien', icon: Icons.profile,  href: '../pages/profil.html' },
  ];

  const navHTML = navItems.map(item => `
    <a class="nav-item ${activePage === item.id ? 'active' : ''}" href="${item.href}">
      ${item.icon}<span>${item.label}</span>
    </a>
  `).join('');

  // <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
  //   <ellipse cx="12" cy="15" rx="6" ry="7"/>
  //   <path d="M9 8c0-1.66 1.34-3 3-3s3 1.34 3 3"/>
  //   <circle cx="12" cy="15" r="2"/>
  // </svg>
  container.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">
        <img src="../assets/images/logo-foot.png" alt="FPS Logo" style="width:25px;height:25px;object-fit:contain">
      </div>
      <div class="logo-text">Foot Plantar <span>Sense</span></div>
    </div>

    <div class="sidebar-patient">
      <div class="patient-avatar">${patient.initials}</div>
      <div class="patient-info">
        <div class="patient-name">${patient.name}</div>
        <div class="patient-meta">${patient.age} th · ${patient.gender}</div>
      </div>
    </div>

    <div class="sidebar-nav-label">MENU UTAMA</div>
    <nav class="sidebar-nav">${navHTML}</nav>

    <div class="sidebar-bottom">
      <button class="logout-btn" onclick="openLogoutModal()">
        ${Icons.logout}<span>Keluar dari Akun</span>
      </button>
    </div>
  `;

  container.dataset.active = activePage;
}

// ============================================================
// TOPBAR
// ============================================================
function renderTopbar(container, pageTitle) {
  container.innerHTML = `
    <div class="topbar-title">${pageTitle}</div>
    <div class="topbar-actions">
      <button class="btn-snapshot" onclick="openSnapModal()">
        ${Icons.rec} Rekam Snapshot
      </button>
      <!--
      <button class="btn-export" onclick="exportData()">
        ${Icons.download} Export
      </button>
      -->
    </div>
  `;
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
        <div class="modal-title">Keluar dari Akun?</div>
        <div class="modal-sub">Sesi monitoring akan tetap tersimpan.<br>Anda bisa masuk kembali kapan saja.</div>
        <div class="modal-btns">
          <button class="mbtn-cancel" onclick="closeLogoutModal()">Batal</button>
          <button class="mbtn-ok" onclick="doLogout()">Ya, Keluar</button>
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
        <div class="modal-title" style="margin-bottom:3px">⏺ Rekam Snapshot</div>
        <div class="modal-sub" style="margin-bottom:14px">Menyimpan data sensor saat ini ke riwayat</div>

        <!-- Postur aktif -->
        <div class="snap-postur-row" id="snap-postur-row">
          <span class="snap-postur-ic" id="snap-postur-ic">🧍</span>
          <div>
            <div style="font-size:9px;color:var(--text-secondary);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em">Postur</div>
            <div style="font-size:13px;font-weight:800;color:var(--red)" id="snap-postur-lbl">Berdiri</div>
          </div>
        </div>

        <!-- Preview 8 sensor -->
        <div class="snap-sensor-preview" id="snap-sensor-preview">
          <div class="snap-sensor-col">
            <div class="snap-sensor-side-lbl left">● KIRI</div>
            <div class="snap-sensor-grid">
              <div class="snap-sv"><div class="snap-sv-val" id="sp-hl">—</div><div class="snap-sv-k">Hallux</div></div>
              <div class="snap-sv"><div class="snap-sv-val" id="sp-ml">—</div><div class="snap-sv-k">Med.FF</div></div>
              <div class="snap-sv"><div class="snap-sv-val" id="sp-ll">—</div><div class="snap-sv-k">Lat.FF</div></div>
              <div class="snap-sv"><div class="snap-sv-val snap-sv-warn" id="sp-el">—</div><div class="snap-sv-k">Heel</div></div>
            </div>
          </div>
          <div class="snap-sensor-divider"></div>
          <div class="snap-sensor-col">
            <div class="snap-sensor-side-lbl right">● KANAN</div>
            <div class="snap-sensor-grid">
              <div class="snap-sv"><div class="snap-sv-val" id="sp-hr">—</div><div class="snap-sv-k">Hallux</div></div>
              <div class="snap-sv"><div class="snap-sv-val" id="sp-mr">—</div><div class="snap-sv-k">Med.FF</div></div>
              <div class="snap-sv"><div class="snap-sv-val" id="sp-lr">—</div><div class="snap-sv-k">Lat.FF</div></div>
              <div class="snap-sv"><div class="snap-sv-val snap-sv-warn" id="sp-er">—</div><div class="snap-sv-k">Heel</div></div>
            </div>
          </div>
        </div>
        <div class="snap-arch-row">
          <div>Arch Kiri: <span id="sp-arch-l" style="font-weight:700">—</span></div>
          <div>Arch Kanan: <span id="sp-arch-r" style="font-weight:700">—</span></div>
        </div>
        <!-- Totals row -->
        <div class="snap-totals-row">
          <div>Total Kiri: <span class="snap-tot-l" id="sp-total-l">—</span> N</div>
          <div>Total Kanan: <span class="snap-tot-r" id="sp-total-r">—</span> N</div>
          <div>Balance: <span class="snap-tot-b" id="sp-balance">—</span></div>
        </div>

        <!-- Catatan -->
        <div class="snap-note-wrap">
          <label class="snap-note-lbl">💬 &nbsp;Catatan (opsional)</label>
          <textarea class="snap-note-input" id="snap-note-inp" placeholder="Contoh: sebelum terapi, kondisi nyeri, dll..." rows="2"></textarea>
        </div>

        <div class="modal-btns">
          <button class="mbtn-cancel" onclick="closeSnapModal()">Batal</button>
          <button class="mbtn-ok" onclick="saveSnapshot()">💾 Simpan</button>
        </div>
      </div>
    `;
    ov.addEventListener('click', (e) => { if (e.target === ov) closeSnapModal(); });
    document.body.appendChild(ov);
  }

  // Populate preview from currentData (global set by monitoring.js)
  _populateSnapPreview();
  requestAnimationFrame(() => ov.classList.add('show'));
}

function _populateSnapPreview() {
  if (typeof currentData === 'undefined' || !currentData) return;
  const d = currentData;

  // Postur
  const posture = (typeof currentPosture !== 'undefined') ? currentPosture : 'Berdiri';
  const postureIcons = { 'Berdiri':'🧍', 'Jongkok':'🏋️', '1 Kaki':'🦵', '2 Kaki':'👣' };
  const ic = document.getElementById('snap-postur-ic');
  const lb = document.getElementById('snap-postur-lbl');
  if (ic) ic.textContent = postureIcons[posture] || '🧍';
  if (lb) lb.textContent = posture;

  // Arch type preview di modal
  const arch = (typeof currentData !== 'undefined' && currentData)
    ? currentData.archType : null;
  const archL = document.getElementById('sp-arch-l');
  const archR = document.getElementById('sp-arch-r');
  if (archL && arch) {
    archL.textContent  = `${arch.emojiL} ${arch.labelL}`;
    archL.style.color  = arch.cssClassL === 'arch-flat' ? 'var(--red)'
                      : arch.cssClassL === 'arch-high' ? '#2266FF' : 'var(--green)';
  }
  if (archR && arch) {
    archR.textContent  = `${arch.emojiR} ${arch.labelR}`;
    archR.style.color  = arch.cssClassR === 'arch-flat' ? 'var(--red)'
                      : arch.cssClassR === 'arch-high' ? '#2266FF' : 'var(--green)';
  }

  // Sensor kPa values
  const lN = d.left_fsr_newton  || [0,0,0,0];
  const rN = d.right_fsr_newton || [0,0,0,0];
  // const toKpa = n => Math.round(n * 0.82);

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  // set('sp-hl', toKpa(lN[0])); set('sp-ml', toKpa(lN[1]));
  // set('sp-ll', toKpa(lN[2])); set('sp-el', toKpa(lN[3]));
  // set('sp-hr', toKpa(rN[0])); set('sp-mr', toKpa(rN[1]));
  // set('sp-lr', toKpa(rN[2])); set('sp-er', toKpa(rN[3]));
  set('sp-hl', lN[0]); set('sp-ml', lN[1]);
  set('sp-ll', lN[2]); set('sp-el', lN[3]);
  set('sp-hr', rN[0]); set('sp-mr', rN[1]);
  set('sp-lr', rN[2]); set('sp-er', rN[3]);

  const fL = Math.round(lN.reduce((a,b)=>a+b,0));
  const fR = Math.round(rN.reduce((a,b)=>a+b,0));
  set('sp-total-l', fL);
  set('sp-total-r', fR);
  set('sp-balance', (d.balanceScore||0).toFixed(0));
}

function closeSnapModal() {
  const ov = document.getElementById('modal-snap-ov');
  if (ov) ov.classList.remove('show');
}

function saveSnapshot() {
  closeSnapModal();
  if (typeof currentData === 'undefined' || !currentData) {
    showToast('Data sensor belum tersedia.', 'error');
    return;
  }

  const note    = document.getElementById('snap-note-inp')?.value || '';
  const posture = (typeof currentPosture !== 'undefined') ? currentPosture : 'Berdiri';


  // Tetap simpan ke local simulation (untuk tampil di riwayat sesi ini)
  recordSnapshot(currentData, posture, note);

  // Simpan ke Firebase
  if (typeof firebaseRecordSnapshot === 'function') {
    firebaseRecordSnapshot(currentData, posture, note)
      .then(function() {
        showToast('✅ Snapshot tersimpan — ' + posture, 'success');
      })
      .catch(function(err) {
        console.warn('Firebase snapshot gagal:', err);
        showToast('✅ Snapshot tersimpan lokal — ' + posture, 'success');
      });
  } else {
    showToast('✅ Snapshot tersimpan — ' + posture, 'success');
  }

  if (document.getElementById('snap-note-inp')) {
    document.getElementById('snap-note-inp').value = '';
  }

  if (typeof renderHistoryList === 'function') {
    renderHistoryList();
    renderSummaryStats();
    drawTrendCharts();
  }
  // closeSnapModal();
  // if (typeof currentData === 'undefined' || !currentData) {
  //   showToast('Data sensor belum tersedia.', 'error');
  //   return;
  // }
  // const note = document.getElementById('snap-note-inp')?.value || '';
  // const posture = (typeof currentPosture !== 'undefined') ? currentPosture : 'Berdiri';
  // const snap = recordSnapshot(currentData, posture, note);
  // document.getElementById('snap-note-inp') && (document.getElementById('snap-note-inp').value = '');
  // showToast(`✅ Snapshot disimpan — ${posture} · ${currentData.classification.label}`, 'success');

  // // Refresh riwayat if on that page
  // if (typeof renderHistoryList === 'function') {
  //   renderHistoryList();
  //   renderSummaryStats();
  //   drawTrendCharts();
  // }
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
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
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
  
  // return {
  //   uid: 'uid_suwardi', name: 'Suwardi', initials: 'SW',
  //   age: 68, gender: 'Laki-laki', weight: 72, height: 168,
  //   bloodType: 'O', dob: '15 Maret 1957',
  //   phone: '+62 812 3456 7890', email: 'suwardi@gmail.com',
  //   address: 'Jl. Mawar No. 12, Depok, Jawa Barat',
  // };
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
  });
}

function exportData() {
  showToast('Fitur export tersedia setelah integrasi Firebase.', 'success');
}
