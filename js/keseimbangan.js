/**
 * keseimbangan.js
 * Balance analysis page logic.
 */

'use strict';

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 50;  // r=50
let currentData    = null;
let currentPosture = 'Berdiri';

document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');

  // LANGSUNG gambar sidebar pakai data default (biar gak kosong)
  renderSidebar(sidebarEl, 'keseimbangan');
  // 1. UI Statis (Langsung Muncul)
  renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');

  // 2. Cek Auth & Jalankan Logic (Tunggu Firebase)
  requireAuth((user) => {
    // Kode di dalam sini hanya jalan jika USER SUDAH LOGIN
    
    // Ambil data profil (ini akan memicu renderSidebar otomatis)
    loadPatientToSidebar();
    generateMockHistory();
    renderHistoryBars();

    // onDataUpdate((data) => {
    //   const filteredData = applyEMAFilter(data);
    //   currentData = computeAll(filteredData);
    //   updateBalanceUI(currentData);
    // });
    // startSimulation();

    startFirebaseListen(function(data) {
      const filteredData = applyEMAFilter(data);
      currentData = computeAll(filteredData);
      updateBalanceUI(currentData); // atau updateBalanceUI(data)
    });
    
    // onDataUpdate((data) => {
      
    //   currentData = data;
    //   updateBalanceUI(data);
    // });
    // startSimulation();
  });
  // requireAuth();
  // renderSidebar(document.getElementById('sidebar'), 'keseimbangan');
  // renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');
  // loadPatientToSidebar();
  // generateMockHistory();
  // renderHistoryBars();

  // const unsubscribe = onDataUpdate((data) => {
  //   currentData = data;
  //   updateBalanceUI(data);
  // });
  // startSimulation();
});

// ============================================================
// UI UPDATE
// ============================================================
function updateBalanceUI(data) {
  const score = data.balanceScore;
  const asi   = data.asi;
  const hl    = data.heelLoad;
  const cls   = data.classification;

  // ── Gauge ──
  document.getElementById('b-score').textContent = score.toFixed(0);
  const arc = document.getElementById('gauge-arc');
  const offset = GAUGE_CIRCUMFERENCE * (1 - score / 100);
  arc.style.strokeDashoffset = offset;
  arc.style.stroke = score >= 90 ? 'var(--green)' : score >= 80 ? 'var(--yellow)' : 'var(--red)';

  // ── Status badge ──
  const badge = document.getElementById('b-status-badge');
  badge.textContent = cls.label;
  badge.className = `badge badge-${cls.cssClass === 'normal' ? 'normal' : cls.cssClass === 'warning' ? 'warning' : 'abnormal'}`;

  // ── L/R bars ──
  document.getElementById('b-left-pct').textContent = `${data.leftPercent}%`;
  document.getElementById('b-right-pct').textContent = `${data.rightPercent}%`;
  document.getElementById('lr-bar-l').style.width = `${data.leftPercent}%`;
  document.getElementById('lr-bar-r').style.width = `${data.rightPercent}%`;

  // ── ASI note ──
  const asiNote = document.getElementById('b-asi-note');
  const asiText = document.getElementById('b-asi-text');
  asiText.textContent = `Asimetri ${asi.toFixed(1)}% — batas normal ≤ 10%`;
  asiNote.style.color = asi <= 10 ? 'var(--green)' : asi <= 20 ? 'var(--yellow)' : 'var(--red)';

  // ── Zone bars ──
  setZoneBar('z-hallux', 'z-hallux-pct', data.zones.hallux);
  setZoneBar('z-medff',  'z-medff-pct',  data.zones.medFF);
  setZoneBar('z-latff',  'z-latff-pct',  data.zones.latFF);
  setZoneBar('z-heel',   'z-heel-pct',   data.zones.heel);

  // ── Classification card ──
  document.getElementById('cls-emoji').textContent = cls.emoji;
  document.getElementById('cls-name').textContent  = cls.label;
  document.getElementById('cls-score').textContent = `${score.toFixed(0)}`;
  document.getElementById('cls-asi').textContent   = `${asi.toFixed(1)}%`;
  document.getElementById('cls-heel').textContent  = `${hl.toFixed(1)}%`;

  updatePronationUI(data.pronation);
  updateArchUI(data.archType);

  const descriptions = {
    NORMAL:   'Keseimbangan dalam batas normal. Distribusi tekanan L/R simetris. Tidak ada indikasi gangguan keseimbangan yang signifikan.',
    SEDANG:   'Keseimbangan dalam batas perlu perhatian. Asimetri atau distribusi heel masih dapat dikompensasi namun perlu dipantau.',
    ABNORMAL: 'Terdapat ketidakseimbangan yang signifikan. Asimetri tinggi atau distribusi heel di luar rentang normal. Perlu evaluasi klinis lebih lanjut.',
  };
  document.getElementById('cls-desc').textContent = descriptions[cls.status] || '';
}

function setZoneBar(barId, pctId, pct) {
  const bar = document.getElementById(barId);
  const lbl = document.getElementById(pctId);
  if (bar) bar.style.width = `${pct}%`;
  if (lbl) lbl.textContent = `${pct}%`;
}

// function updatePronationUI(p) {
//   if (!p) return;

//   // Ratio values
//   const elRatioL = document.getElementById('pron-ratio-l');
//   const elRatioR = document.getElementById('pron-ratio-r');
//   if (elRatioL) elRatioL.textContent = (p.ratioL > 0 ? '+' : '') + p.ratioL.toFixed(1);
//   if (elRatioR) elRatioR.textContent = (p.ratioR > 0 ? '+' : '') + p.ratioR.toFixed(1);

//   // Labels
//   const setLabel = (id, label, cssClass, emoji) => {
//     const el = document.getElementById(id);
//     if (!el) return;
//     el.textContent = `${emoji} ${label}`;
//     el.className = 'pron-label ' + cssClass;
//   };
//   setLabel('pron-label-l', p.labelL, p.cssClassL, p.emojiL);
//   setLabel('pron-label-r', p.labelR, p.cssClassR, p.emojiR);

//   // Bar visual (ratio range -100 to +100, center = 0)
//   const toBarPct = r => Math.min(100, Math.max(0, (r + 50)));  // shift ke 0-100
//   const elBarL = document.getElementById('pron-bar-fill-l');
//   const elBarR = document.getElementById('pron-bar-fill-r');
//   const colorL = p.cssClassL === 'overpronation' ? 'var(--red)'
//                : p.cssClassL === 'underpronation' ? '#2266FF' : 'var(--green)';
//   const colorR = p.cssClassR === 'overpronation' ? 'var(--red)'
//                : p.cssClassR === 'underpronation' ? '#2266FF' : 'var(--green)';
//   if (elBarL) { elBarL.style.width = `${toBarPct(p.ratioL)}%`; elBarL.style.background = colorL; }
//   if (elBarR) { elBarR.style.width = `${toBarPct(p.ratioR)}%`; elBarR.style.background = colorR; }
// }

function updatePronationUI(p) {
  if (!p) return;

  const elRatioL = document.getElementById('pron-ratio-l');
  const elRatioR = document.getElementById('pron-ratio-r');
  if (elRatioL) elRatioL.textContent = (p.ratioL > 0 ? '+' : '') + p.ratioL.toFixed(1);
  if (elRatioR) elRatioR.textContent = (p.ratioR > 0 ? '+' : '') + p.ratioR.toFixed(1);

  const setLabel = (id, label, cssClass) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${label}`;
    el.className = 'pron-label ' + cssClass;
  };
  setLabel('pron-label-l', p.labelL, p.cssClassL);
  setLabel('pron-label-r', p.labelR, p.cssClassR);
  // ── Bar ──
  const toBarPct = r => Math.min(100, Math.max(0, (r + 50)));
  const elBarL = document.getElementById('pron-bar-fill-l');
  const elBarR = document.getElementById('pron-bar-fill-r');
  const colorL = p.cssClassL === 'overpronation' ? 'var(--red)' : p.cssClassL === 'underpronation' ? '#2266FF' : 'var(--green)';
  const colorR = p.cssClassR === 'overpronation' ? 'var(--red)' : p.cssClassR === 'underpronation' ? '#2266FF' : 'var(--green)';
  if (elBarL) { elBarL.style.width = `${toBarPct(p.ratioL)}%`; elBarL.style.background = colorL; }
  if (elBarR) { elBarR.style.width = `${toBarPct(p.ratioR)}%`; elBarR.style.background = colorR; }

  // ── SVG Ilustrasi ──
  const illL = document.getElementById('pron-illus-l');
  const illR = document.getElementById('pron-illus-r');
  if (illL) illL.innerHTML = getPronationSVG(p.cssClassL, 'left');
  if (illR) illR.innerHTML = getPronationSVG(p.cssClassR, 'right');
}

function updateArchUI(arch) {
  if (!arch) return;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Kiri
  setEl('arch-heel-l', arch.heelRatioL.toFixed(1) + '%');
  setEl('arch-ff-l',   arch.ffRatioL.toFixed(1)   + '%');
  setEl('arch-desc-l', arch.descL);

  const elLabelL = document.getElementById('arch-label-l');
  if (elLabelL) {
    elLabelL.textContent = `${arch.emojiL} ${arch.labelL}`;
    elLabelL.className   = 'arch-label ' + arch.cssClassL;
  }

  // Kanan
  setEl('arch-heel-r', arch.heelRatioR.toFixed(1) + '%');
  setEl('arch-ff-r',   arch.ffRatioR.toFixed(1)   + '%');
  setEl('arch-desc-r', arch.descR);

  const elLabelR = document.getElementById('arch-label-r');
  if (elLabelR) {
    elLabelR.textContent = `${arch.emojiR} ${arch.labelR}`;
    elLabelR.className   = 'arch-label ' + arch.cssClassR;
  }

  // Bar — heel ratio: 0%=kiri penuh(forefoot), 100%=kanan penuh(heel)
  // Center = 50% = seimbang normal
  const colorL = arch.cssClassL === 'arch-flat' ? 'var(--red)'
               : arch.cssClassL === 'arch-high' ? '#2266FF' : 'var(--green)';
  const colorR = arch.cssClassR === 'arch-flat' ? 'var(--red)'
               : arch.cssClassR === 'arch-high' ? '#2266FF' : 'var(--green)';

  const barL = document.getElementById('arch-bar-l');
  const barR = document.getElementById('arch-bar-r');

  // Map heel ratio (0-100) ke posisi bar (0-100%)
  // Heel 50% = tengah (normal), >50 = geser kanan (heel dominan = high arch)
  if (barL) {
    barL.style.width      = arch.heelRatioL + '%';
    barL.style.background = colorL;
  }
  if (barR) {
    barR.style.width      = arch.heelRatioR + '%';
    barR.style.background = colorR;
  }
}

// ── SVG Generator ──
// Tampak depan kaki — badan kaki miring sesuai kondisi
function getPronationSVG(cssClass, side) {
  const color = cssClass === 'overpronation'  ? '#E7302A'
              : cssClass === 'underpronation' ? '#2266FF'
              :                                 '#22D48F';

  let tiltDeg;
  if      (cssClass === 'overpronation')  tiltDeg = side === 'left' ?  18 : -18;
  else if (cssClass === 'underpronation') tiltDeg = side === 'left' ? -18 :  18;
  else                                    tiltDeg = 0;

  // Pivot di tengah bawah (tumit)
  const cx = 40, cy = 88;

  return `
    <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-${cssClass}-${side}" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Ground line -->
      <line x1="6" y1="94" x2="74" y2="94"
        stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-linecap="round"/>

      <!-- Sol kaki — di-rotate dari pivot tumit -->
      <g transform="rotate(${tiltDeg}, ${cx}, ${cy})"
         filter="url(#glow-${cssClass}-${side})">

        <!-- Body sol kaki: tampak depan, bentuk oval/trapesium membulat -->
        <!-- Lebih lebar di atas (forefoot), mengecil di bawah (tumit) -->
        <path d="
          M 22 35
          C 20 42 17 58 18 72
          C 19 82 27 90 40 90
          C 53 90 61 82 62 72
          C 63 58 60 42 58 35
          C 54 26 46 22 40 22
          C 34 22 26 26 22 35
          Z
        " fill="${color}" opacity="0.5"/>

        <!-- Outline -->
        <path d="
          M 22 35
          C 20 42 17 58 18 72
          C 19 82 27 90 40 90
          C 53 90 61 82 62 72
          C 63 58 60 42 58 35
          C 54 26 46 22 40 22
          C 34 22 26 26 22 35
          Z
        " fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9"/>

        <!-- Arch highlight sesuai kondisi -->
        ${cssClass === 'overpronation' ? `
        ${side === 'left' ? `
          <!-- Kaki kiri overpronation: medial ada di KANAN canvas -->
          <path d="M 60 55 C 63 65 63 76 60 86"
            stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="1"/>
          <ellipse cx="61" cy="70" rx="4" ry="10"
            fill="${color}" opacity="0.35"/>
        ` : `
          <!-- Kaki kanan overpronation: medial ada di KIRI canvas -->
          <path d="M 20 55 C 17 65 17 76 20 86"
            stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="1"/>
          <ellipse cx="19" cy="70" rx="4" ry="10"
            fill="${color}" opacity="0.35"/>
        `}
      ` : cssClass === 'underpronation' ? `
        ${side === 'left' ? `
          <!-- Kaki kiri underpronation: lateral ada di KIRI canvas -->
          <path d="M 20 55 C 17 65 17 76 20 86"
            stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="1"/>
          <ellipse cx="19" cy="70" rx="4" ry="10"
            fill="${color}" opacity="0.35"/>
        ` : `
          <!-- Kaki kanan underpronation: lateral ada di KANAN canvas -->
          <path d="M 60 55 C 63 65 63 76 60 86"
            stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="1"/>
          <ellipse cx="61" cy="70" rx="4" ry="10"
            fill="${color}" opacity="0.35"/>
        `}
      ` : `
        <line x1="22" y1="89" x2="58" y2="89"
          stroke="${color}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
      `}

      </g>

    </svg>
  `;
}

// ============================================================
// HISTORY MINI CHART
// ============================================================
function renderHistoryBars() {
  const snaps = getSnapshots();
  const container = document.getElementById('history-bars');
  if (!container) return;

  const recent = snaps.slice(0, 7).reverse();

  if (recent.length === 0) {
    container.innerHTML = `<span style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono)">Belum ada snapshot.</span>`;
    return;
  }

  const maxScore = 100;
  container.innerHTML = recent.map(snap => {
    const pct   = Math.round((snap.balance_score / maxScore) * 100);
    const color = snap.balance_score >= 90 ? 'var(--green)' :
                  snap.balance_score >= 80 ? 'var(--yellow)' : 'var(--red)';
    return `
      <div class="h-bar-wrap" title="${snap.snapshot_time}: ${snap.balance_score}">
        <div class="h-bar" style="height:${pct}%; background:${color};"></div>
        <span class="h-bar-val">${snap.balance_score.toFixed(0)}</span>
      </div>
    `;
  }).join('');
}

// ── Snapshot support ──
function recordSnapshot() {
  showToast('Snapshot direkam dari halaman Keseimbangan.', 'success');
}
window.recordSnapshot = recordSnapshot;
