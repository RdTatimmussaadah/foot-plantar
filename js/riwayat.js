/**
 * riwayat.js — History / snapshot list
 */
'use strict';

let currentData = null; // needed for snapshot modal

let _firebaseHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');

  // LANGSUNG gambar sidebar pakai data default (biar gak kosong)
  renderSidebar(sidebarEl, 'riwayat');
  // 1. UI Statis (Langsung Muncul)
  renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');

  // 2. Cek Auth & Jalankan Logic (Tunggu Fireb ase)
  requireAuth((user) => {
    // Kode di dalam sini hanya jalan jika USER SUDAH LOGIN
    
    loadPatientToSidebar();

    const container = document.getElementById('history-list-body');
    if (container) {
      container.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-dim);
          font-family:var(--font-mono);font-size:11px">
          Memuat riwayat...
        </div>`;
    }

    // generateMockHistory();
    // renderHistoryList();
    // renderSummaryStats();
    // drawTrendCharts();

    firebaseLoadHistory((list) => {
      _firebaseHistory = list;
      renderHistoryList();
      renderSummaryStats();
      drawTrendCharts();
      renderHistoryBars();
      renderHistoryBars();
    });

    // onDataUpdate((data) => {
    //   const filteredData = applyEMAFilter(data);
    //   currentData = computeAll(filteredData);
    //   // updateUI(currentData);
    // });
    // startSimulation();

    startFirebaseListen(function(data) {
      const filteredData = applyEMAFilter(data);
      currentData = computeAll(filteredData);
      updateUI(currentData); // atau updateBalanceUI(data)
    });
  });
  
  // requireAuth();
  // renderSidebar(document.getElementById('sidebar'), 'riwayat');
  // renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');
  // loadPatientToSidebar();
  // generateMockHistory();
  // renderHistoryList();
  // renderSummaryStats();
  // drawTrendCharts();
});

// ============================================================
// HISTORY LIST
// ============================================================
function renderHistoryList() {
  const snaps = _firebaseHistory;
  const container = document.getElementById('history-list-body');
  if (!container) return;

  if (snaps.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-family:var(--font-mono);font-size:11px">Belum ada snapshot.</div>`;
    return;
  }
  const groups = {};

  // Group by date
  // const groups = {};
  // snaps.forEach(snap => {
  //   const d = snap._date
  //     ? snap._date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  //     : snap.snapshot_time.split(',')[0];
  //   if (!groups[d]) groups[d] = [];
  //   groups[d].push(snap);
  // });

  snaps.forEach(snap => {
    // Coba parse tanggal dari snapshot_time
    let dateKey;
    try {
      const parsed = new Date(snap.snapshot_time);
      if (!isNaN(parsed)) {
        dateKey = parsed.toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
      } else {
        // Fallback: ambil sebelum koma
        dateKey = snap.snapshot_time.split(',')[0];
      }
    } catch (e) {
      dateKey = snap.snapshot_time.split(',')[0];
    }

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(snap);
  });

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let html = '';
  Object.entries(groups).forEach(([date, items]) => {
    const label = date === today ? `Hari Ini — ${date}` : date;
    html += `
      <div class="date-group">
        <div class="date-group-header">
          <span>${label}</span>
          <div class="date-line"></div>
          <span class="date-count">${items.length} snapshot</span>
        </div>
        ${items.map(s => renderSnapRow(s)).join('')}
      </div>
    `;
  });
  container.innerHTML = html;
}

// function renderSnapRow(snap) {
//   const time = snap._date
//     ? snap._date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
//     : snap.snapshot_time;

//   const scoreColor = snap.balance_score >= 90 ? 'var(--green)'
//                    : snap.balance_score >= 80 ? 'var(--yellow)' : 'var(--red)';
//   const clsColor   = snap.classification === 'NORMAL' ? 'var(--green)'
//                    : snap.classification === 'SEDANG'  ? 'var(--yellow)' : 'var(--red)';
//   const sym = Math.round(100 - (snap.asi || 0));
//   const fL  = snap.fLeft  || (snap.left_fsr_newton  ? Math.round(snap.left_fsr_newton.reduce((a,b)=>a+b,0)) : '—');
//   const fR  = snap.fRight || (snap.right_fsr_newton ? Math.round(snap.right_fsr_newton.reduce((a,b)=>a+b,0)) : '—');

//   return `
//     <div class="snapshot-row" onclick="selectSnapshot('${snap.id}')" id="row-${snap.id}">
//       <span class="snap-time">${time}</span>
//       <div class="snap-info">
//         <div class="snap-posture-lbl">${snap.posture}${snap.note ? ' — ' + snap.note : ''}</div>
//         <div class="snap-tags">
//           <span class="snap-tag" style="color:${clsColor}">${snap.classification.toLowerCase()}</span>
//           <span class="snap-tag">Sym ${sym}%</span>
//           <span class="snap-tag">Heel ${(snap.heel_load||0).toFixed(0)}%</span>
//           <span class="snap-tag" style="color:var(--red)">L ${fL}kPa</span>
//           <span class="snap-tag" style="color:#2266FF">R ${fR}kPa</span>
//         </div>
//       </div>
//       <span class="snap-score" style="color:${scoreColor}">${snap.balance_score.toFixed(0)}</span>
//     </div>
//   `;
// }

function renderSnapRow(snap) {
  // Format waktu dari snapshot_time
  let timeDisplay = snap.snapshot_time || '—';
  try {
    const parsed = new Date(snap.snapshot_time);
    if (!isNaN(parsed)) {
      timeDisplay = parsed.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  } catch (e) {}

  const score      = parseFloat(snap.balance_score) || 0;
  const heelLoad   = parseFloat(snap.heel_load)     || 0;
  const asi        = parseFloat(snap.asi)            || 0;
  const sym        = Math.round(100 - asi);
  const cls        = snap.classification || 'NORMAL';

  const scoreColor = score >= 90 ? 'var(--green)' : score >= 80 ? 'var(--yellow)' : 'var(--red)';
  const clsColor   = cls === 'NORMAL' ? 'var(--green)' : cls === 'SEDANG' ? 'var(--yellow)' : 'var(--red)';

  // Hitung total newton kiri dan kanan
  const lN = snap.left_fsr_newton  || [0,0,0,0];
  const rN = snap.right_fsr_newton || [0,0,0,0];
  const fL = Array.isArray(lN) ? Math.round(lN.reduce((a,b)=>a+b,0)) : '—';
  const fR = Array.isArray(rN) ? Math.round(rN.reduce((a,b)=>a+b,0)) : '—';
  const pronL = snap.pronation ? snap.pronation.labelL : 'Normal';
  const pronR = snap.pronation ? snap.pronation.labelR : 'Normal';
  // Arch type — fallback '—' untuk snapshot lama
  const archL     = snap.arch_label_l || null;
  const archR     = snap.arch_label_r || null;

  const archColor = (label) =>
    label === 'Flat Foot'  ? 'var(--red)'  :
    label === 'High Arch'  ? '#2266FF'     :
    label === 'Normal'     ? 'var(--green)': 'var(--text-dim)';

  const archTagL = archL
    ? `<span class="snap-tag" style="color:${archColor(archL)}">Arch L: ${archL}</span>`
    : '';
  const archTagR = archR
    ? `<span class="snap-tag" style="color:${archColor(archR)}">Arch R: ${archR}</span>`
    : '';

  // Tambahkan ${archTagL} ${archTagR} di dalam snap-tags


  // Gunakan snap.id (key Firebase) sebagai identifier
  const rowId = snap.id || snap.snapshot_time;

  return `
    <div class="snapshot-row" onclick="selectSnapshot('${rowId}')" id="row-${rowId}">
      <span class="snap-time">${timeDisplay}</span>
      <div class="snap-info">
        <div class="snap-posture-lbl">
          ${snap.posture || 'Berdiri'}${snap.note ? ' — ' + snap.note : ''}
        </div>
        <div class="snap-tags">
          <span class="snap-tag" style="color:${clsColor}">${cls.toLowerCase()}</span>
          <span class="snap-tag">Sym ${sym}%</span>
          <span class="snap-tag">Heel ${heelLoad.toFixed(0)}%</span>
          <span class="snap-tag" style="color:var(--red)">L ${fL}N</span>
          <span class="snap-tag" style="color:#2266FF">R ${fR}N</span>
          <span class="snap-tag" style="color:var(--orange)">Pron L: ${pronL}</span>
          <span class="snap-tag" style="color:var(--orange)">Pron R: ${pronR}</span>
          ${archTagL}
          ${archTagR}
        </div>
      </div>
      <span class="snap-score" style="color:${scoreColor}">${score.toFixed(0)}</span>
    </div>
  `;
}

function selectSnapshot(id) {
  document.querySelectorAll('.snapshot-row').forEach(r => r.classList.remove('selected'));
  const el = document.getElementById(`row-${id}`);
  if (el) el.classList.add('selected');
}

// ============================================================
// SUMMARY STATS
// ============================================================
function renderSummaryStats() {
  const snaps = _firebaseHistory.slice(0, 10);
  if (!snaps.length) return;

  const avgScore = snaps.reduce((s,x) => s + x.balance_score, 0) / snaps.length;
  const avgHeel  = snaps.reduce((s,x) => s + (x.heel_load||0), 0) / snaps.length;
  const avgSym   = snaps.reduce((s,x) => s + (100 - (x.asi||0)), 0) / snaps.length;

  const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('avg-score', avgScore.toFixed(0));
  set('avg-heel',  avgHeel.toFixed(0) + '%');
  set('avg-sym',   avgSym.toFixed(0)  + '%');
  set('total-snaps', _firebaseHistory.length);
}

// ============================================================
// TREND CHART (Balance Score only)
// ============================================================
function drawTrendCharts() {
  const snaps  = _firebaseHistory.slice(0, 10).reverse();
  if (!snaps.length) return;
  const scores = snaps.map(s => s.balance_score);

  // Trend delta
  if (scores.length >= 2) {
    const delta = scores[scores.length-1] - scores[0];
    const el = document.getElementById('trend-delta');
    if (el) {
      el.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(0) + '%';
      el.style.color = delta >= 0 ? 'var(--green)' : 'var(--red)';
    }
  }

  const cv = document.getElementById('trend-canvas');
  if (!cv) return;
  const W = cv.offsetWidth || 300, H = 100;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const pad = { t: 12, b: 20, l: 10, r: 10 };
  const n   = scores.length;
  const minV = Math.min(...scores) - 5;
  const maxV = Math.max(...scores) + 5;
  const xPos = i => pad.l + (i / (n-1)) * (W - pad.l - pad.r);
  const yPos = v => H - pad.b - ((v - minV) / (maxV - minV)) * (H - pad.t - pad.b);

  // Fill area
  const grad = ctx.createLinearGradient(0, pad.t, 0, H-pad.b);
  grad.addColorStop(0, 'rgba(231,48,42,0.25)');
  grad.addColorStop(1, 'rgba(231,48,42,0)');
  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(scores[0]));
  scores.forEach((v, i) => { if(i>0) ctx.lineTo(xPos(i), yPos(v)); });
  ctx.lineTo(xPos(n-1), H-pad.b);
  ctx.lineTo(xPos(0),   H-pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(scores[0]));
  scores.forEach((v, i) => { if(i>0) ctx.lineTo(xPos(i), yPos(v)); });
  ctx.strokeStyle = '#E7302A';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Points + values
  scores.forEach((v, i) => {
    const x = xPos(i), y = yPos(v);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = '#E7302A';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(220,220,230,0.8)';
    ctx.font = 'bold 8px JetBrains Mono,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(v.toFixed(0), x, y - 7);
  });
}

function exportCSV()  { showToast('Mengekspor CSV...', 'success'); }
function exportPDF()  { showToast('Membuat laporan PDF...', 'success'); }
