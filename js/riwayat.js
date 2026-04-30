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
      // renderHistoryBars();
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

// function exportCSV()  { showToast('Mengekspor CSV...', 'success'); }
// function exportPDF()  { showToast('Membuat laporan PDF...', 'success'); }

// ── helper: format timestamp → lokal Indonesia ─────────────
function _fmtTime(raw) {
  try {
    const d = new Date(raw);
    if (!isNaN(d)) {
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  } catch (_) {}
  return raw || '—';
}
 
// ── helper: nama pasien dari sidebar ──────────────────────
function _getPatientName() {
  const el = document.querySelector('.patient-name, .sidebar-patient-name, #patient-name');
  return el ? el.textContent.trim() : 'Pasien';
}
 
// ── helper: set state tombol ──────────────────────────────
function _setBtnLoading(id, loading, labelDefault) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
  if (!loading) btn.querySelector('.export-label') && (btn.querySelector('.export-label').textContent = labelDefault);
}
 
// ============================================================
// EXPORT CSV
// ============================================================
function exportCSV() {
  const snaps = _firebaseHistory;
  if (!snaps || snaps.length === 0) {
    showToast('Belum ada snapshot untuk diekspor.', 'error');
    return;
  }
 
  const headers = [
    'No', 'Waktu', 'Postur',
    'Balance Score', 'ASI (%)', 'Simetri (%)', 'Heel Load (%)', 'Klasifikasi',
    'Total Berat (kg)', 'Total Gaya (N)',
    'Gaya Kiri (N)', 'Persen Kiri (%)',
    'Gaya Kanan (N)', 'Persen Kanan (%)',
    'Pronasi Kiri', 'Pronasi Kanan',
    'Arch Kiri', 'Arch Kanan',
    'L-Hallux (N)', 'L-MedFF (N)', 'L-LatFF (N)', 'L-Heel (N)',
    'R-Hallux (N)', 'R-MedFF (N)', 'R-LatFF (N)', 'R-Heel (N)',
    'Catatan',
  ];
 
  const rows = snaps.map((s, i) => {
    const lN   = s.left_fsr_newton  || [0, 0, 0, 0];
    const rN   = s.right_fsr_newton || [0, 0, 0, 0];
    const fL   = Array.isArray(lN) ? lN.reduce((a, b) => a + b, 0).toFixed(1) : '—';
    const fR   = Array.isArray(rN) ? rN.reduce((a, b) => a + b, 0).toFixed(1) : '—';
    const asi  = parseFloat(s.asi) || 0;
    const archL = s.arch_label_l || (s.archType && s.archType.arch_label_l) || '—';
    const archR = s.arch_label_r || (s.archType && s.archType.arch_label_r) || '—';
    const pronL = s.pronation ? s.pronation.labelL : '—';
    const pronR = s.pronation ? s.pronation.labelR : '—';
 
    return [
      i + 1,
      _fmtTime(s.snapshot_time),
      s.posture || 'Berdiri',
      (parseFloat(s.balance_score) || 0).toFixed(1),
      asi.toFixed(1),
      (100 - asi).toFixed(1),
      (parseFloat(s.heel_load) || 0).toFixed(1),
      s.classification || '—',
      (parseFloat(s.total_weight) || 0).toFixed(1),
      (parseFloat(s.total_force)  || 0).toFixed(1),
      fL, (parseFloat(s.left_percent)  || 0).toFixed(1),
      fR, (parseFloat(s.right_percent) || 0).toFixed(1),
      pronL, pronR, archL, archR,
      Array.isArray(lN) ? lN[0].toFixed(1) : '—',
      Array.isArray(lN) ? lN[1].toFixed(1) : '—',
      Array.isArray(lN) ? lN[2].toFixed(1) : '—',
      Array.isArray(lN) ? lN[3].toFixed(1) : '—',
      Array.isArray(rN) ? rN[0].toFixed(1) : '—',
      Array.isArray(rN) ? rN[1].toFixed(1) : '—',
      Array.isArray(rN) ? rN[2].toFixed(1) : '—',
      Array.isArray(rN) ? rN[3].toFixed(1) : '—',
      s.note || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
  });
 
  const csv  = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fps-riwayat-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✓ CSV berhasil diekspor — ${snaps.length} snapshot`, 'success');
}
 
// ============================================================
// EXPORT PDF — print-ready report, no external library
// ============================================================
function exportPDF() {
  const snaps = _firebaseHistory;
  if (!snaps || snaps.length === 0) {
    showToast('Belum ada snapshot untuk diekspor.', 'error');
    return;
  }
 
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) {
    showToast('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.', 'error');
    return;
  }
  showToast('Membuka laporan PDF...', 'success');
 
  // Hitung statistik ringkasan
  const avg = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const avgScore     = avg(snaps.map(s => parseFloat(s.balance_score) || 0)).toFixed(1);
  const avgHeel      = avg(snaps.map(s => parseFloat(s.heel_load) || 0)).toFixed(1);
  const avgSym       = (100 - avg(snaps.map(s => parseFloat(s.asi) || 0))).toFixed(1);
  const countNormal  = snaps.filter(s => s.classification === 'NORMAL').length;
  const countSedang  = snaps.filter(s => s.classification === 'SEDANG').length;
  const countAbnorm  = snaps.filter(s => s.classification === 'ABNORMAL').length;
  const patientName  = _getPatientName();
  const now = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
 
  // Warna kondisi
  const scoreColor = v => parseFloat(v) >= 90 ? '#22D48F' : parseFloat(v) >= 80 ? '#F5C842' : '#E7302A';
 
  // Baris tabel
  const tableRows = snaps.map((s, i) => {
    const asi   = parseFloat(s.asi)           || 0;
    const score = parseFloat(s.balance_score) || 0;
    const heel  = parseFloat(s.heel_load)     || 0;
    const cls   = s.classification || '—';
    const pronL = s.pronation ? s.pronation.labelL : '—';
    const pronR = s.pronation ? s.pronation.labelR : '—';
    const archL = s.arch_label_l || (s.archType && s.archType.arch_label_l) || '—';
    const archR = s.arch_label_r || (s.archType && s.archType.arch_label_r) || '—';
    const clsColor = cls === 'NORMAL' ? '#22D48F' : cls === 'SEDANG' ? '#F5C842' : '#E7302A';
    const lN = s.left_fsr_newton  || [0,0,0,0];
    const rN = s.right_fsr_newton || [0,0,0,0];
    const fL = Array.isArray(lN) ? lN.reduce((a,b) => a+b, 0).toFixed(0) : '—';
    const fR = Array.isArray(rN) ? rN.reduce((a,b) => a+b, 0).toFixed(0) : '—';
 
    return `<tr>
      <td class="tc dim">${i + 1}</td>
      <td>${_fmtTime(s.snapshot_time)}</td>
      <td class="tc mono" style="color:${scoreColor(score)};font-weight:900">${score.toFixed(1)}</td>
      <td class="tc mono">${asi.toFixed(1)}%</td>
      <td class="tc mono">${heel.toFixed(1)}%</td>
      <td class="tc" style="color:${clsColor};font-weight:700">${cls}</td>
      <td class="tc">${fL}N / ${fR}N</td>
      <td class="tc small">${pronL}<br>${pronR}</td>
      <td class="tc small">${archL}<br>${archR}</td>
      <td class="dim small">${s.note || '—'}</td>
    </tr>`;
  }).join('');
 
  win.document.write(`<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8"/>
<title>Laporan Riwayat — Foot Plantar Sense</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff}
  @page{size:A4 landscape;margin:14mm 12mm}
 
  /* Header */
  .hd{display:flex;align-items:center;justify-content:space-between;
      border-bottom:3px solid #E7302A;padding-bottom:12px;margin-bottom:16px}
  .brand{display:flex;align-items:center;gap:10px}
  .dot{width:36px;height:36px;border-radius:9px;background:#E7302A;
       color:#fff;font-weight:900;font-size:15px;
       display:flex;align-items:center;justify-content:center}
  .bname{font-size:17px;font-weight:900}
  .bsub{font-size:9px;color:#888;margin-top:2px}
  .meta{text-align:right;font-size:9px;color:#888;line-height:1.7}
  .meta strong{color:#1a1a2e;font-size:11px}
 
  /* Section title */
  .st{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;
      letter-spacing:.07em;margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .st::after{content:'';flex:1;height:1px;background:#e8e8f0}
 
  /* Summary cards */
  .sc-row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}
  .sc{border:1.5px solid #eee;border-radius:9px;padding:9px 6px;text-align:center}
  .sv{font-size:20px;font-weight:900;font-family:monospace;line-height:1}
  .sl{font-size:8px;color:#888;margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
 
  /* Table */
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  thead th{background:#f4f4f8;padding:6px 7px;text-align:left;
           font-weight:700;font-size:9px;color:#555;border-bottom:2px solid #ddd}
  tbody td{padding:5px 7px;border-bottom:1px solid #f0f0f4;vertical-align:middle}
  tbody tr:nth-child(even) td{background:#fafafa}
  tbody tr:last-child td{border-bottom:none}
  .tc{text-align:center}
  .mono{font-family:monospace}
  .dim{color:#aaa}
  .small{font-size:9.5px;line-height:1.5}
 
  /* Disclaimer */
  .disc{margin-top:14px;padding:9px 12px;background:#fff8e1;
        border-left:3px solid #F5C842;border-radius:6px;
        font-size:9.5px;color:#7a6500;line-height:1.6}
 
  /* Footer */
  .ft{margin-top:12px;padding-top:8px;border-top:1px solid #eee;
      display:flex;justify-content:space-between;font-size:8.5px;color:#bbb}
 
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
 
<div class="hd">
  <div class="brand">
    <div class="dot">FPS</div>
    <div>
      <div class="bname">Foot Plantar Sense</div>
      <div class="bsub">Laporan Riwayat Monitoring Tekanan Plantar Kaki</div>
    </div>
  </div>
  <div class="meta">
    <strong>${patientName}</strong><br>
    Dicetak: ${now}<br>
    Total data: ${snaps.length} snapshot
  </div>
</div>
 
<div class="st">Ringkasan</div>
<div class="sc-row">
  <div class="sc"><div class="sv" style="color:${scoreColor(avgScore)}">${avgScore}</div><div class="sl">Avg Balance Score</div></div>
  <div class="sc"><div class="sv" style="color:#60607A">${avgHeel}%</div><div class="sl">Avg Heel Load</div></div>
  <div class="sc"><div class="sv" style="color:#F5C842">${avgSym}%</div><div class="sl">Avg Simetri</div></div>
  <div class="sc"><div class="sv" style="color:#22D48F">${countNormal}</div><div class="sl">Normal</div></div>
  <div class="sc"><div class="sv" style="color:#F5C842">${countSedang}</div><div class="sl">Sedang</div></div>
  <div class="sc"><div class="sv" style="color:#E7302A">${countAbnorm}</div><div class="sl">Abnormal</div></div>
</div>
 
<div class="st">Detail Snapshot</div>
<table>
  <thead>
    <tr>
      <th style="width:24px">No</th>
      <th>Waktu</th>
      <th class="tc">Balance Score</th>
      <th class="tc">ASI</th>
      <th class="tc">Heel Load</th>
      <th class="tc">Klasifikasi</th>
      <th class="tc">Gaya L / R</th>
      <th class="tc">Pronasi L/R</th>
      <th class="tc">Arch L/R</th>
      <th>Catatan</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>
 
<div class="disc">
  ⚠ Laporan ini dihasilkan secara otomatis oleh sistem Foot Plantar Sense dan bersifat informatif.
  Bukan merupakan diagnosis medis. Konsultasikan dengan tenaga medis atau fisioterapis untuk interpretasi klinis lebih lanjut.
</div>
 
<div class="ft">
  <span>Foot Plantar Sense — IoT Plantar Pressure Monitoring</span>
  <span>Dicetak: ${now}</span>
</div>
 
<script>window.onload=function(){setTimeout(function(){window.print();},350)};<\/script>
</body></html>`);
  win.document.close();
}