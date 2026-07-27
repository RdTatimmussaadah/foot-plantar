/**
 * laporan.js — Profile + history report page with CoP-based summary.
 */
'use strict';

var currentData = null;
var _firebaseHistory = [];
var _activeProfile = null;

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');

  renderSidebar(sidebarEl, 'laporan');
  renderTopbar(
    document.getElementById('topbar'),
    'Foot Plantar <span>Monitoring</span>'
  );

  requireAuth(() => {
    loadPatientToSidebar();

    const historyContainer = document.getElementById('history-list-body');
    if (historyContainer) {
      historyContainer.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-dim);
          font-family:var(--font-mono);font-size:11px">
          ${tr('Loading history...')}
        </div>`;
    }

    firebaseLoadProfile(function (profil) {
      const p = profil || getActivePatient();
      _activeProfile = p || {};
      fillProfile(_activeProfile);
    });

    firebaseLoadHistory((list) => {
      _firebaseHistory = Array.isArray(list) ? list : [];
      renderHistoryList();
      renderSummaryStats();
      drawCopHistoryCanvas();
      drawTrendCharts();
    });

    const _unsubscribeSensor = startFirebaseListen((data) => {
      currentData = data;
    });

    window.addEventListener('beforeunload', () => {
      if (_unsubscribeSensor) _unsubscribeSensor();
    });
  });
});

window.addEventListener("languagechange", function () {
  if (typeof renderHistoryList === "function") renderHistoryList();
  if (typeof renderSummaryStats === "function") renderSummaryStats();
  if (typeof drawCopHistoryCanvas === "function") drawCopHistoryCanvas();
  if (typeof drawTrendCharts === "function") drawTrendCharts();

  if (_activeProfile) {
    fillProfile(_activeProfile);
  }
});

/* ============================================================
   PROFILE
   ============================================================ */

function fillProfile(p) {
  p = p || {};

  let age = p.age || 0;
  if (p.dob && !p.age) {
    age = Math.floor(
      (Date.now() - new Date(p.dob)) / (365.25 * 24 * 3600 * 1000)
    );
  }

  const initials = (p.name || p.initials || 'P')
    .split(' ')
    .map(function (w) {
      return w[0];
    })
    .join('')
    .toUpperCase()
    .slice(0, 2);

  let dobFormatted = p.dob || '—';
  if (p.dob && String(p.dob).includes('-')) {
    dobFormatted = new Date(p.dob).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  setText('p-initials', initials);
  setText('p-name', p.name || '—');
  setText(
  'p-meta',
    age
      ? `${age} ${tr('years')} · ${tr('Patient')}`
      : `— ${tr('years')} · ${tr('Patient')}`
  );
  setText('p-email', p.email || '—');
  setText('p-phone', p.phone || '—');

  setText('b-nama', p.name || '—');
  setText('b-dob', dobFormatted);
  setText('b-age', age ? `(${age} ${tr('years')})` : `(— ${tr('years')})`);
  setText('b-gender', p.gender || '—');
  setText(
    'b-tbbb',
    p.height && p.weight ? `${p.height} cm / ${p.weight} kg` : '—'
  );
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ============================================================
   CoP COMPUTATION
   ============================================================ */

// const SENSOR_COORDS = {
//   L0: { x: -6.5, y: 7.5 },
//   L1: { x: -8.5, y: 0.5 },
//   L2: { x: -12.5, y: 0.0 },
//   L3: { x: -10.0, y: -9.5 },

//   R0: { x: 6.5, y: 7.5 },
//   R1: { x: 8.5, y: 0.5 },
//   R2: { x: 12.5, y: 0.0 },
//   R3: { x: 10.0, y: -9.5 },
// };

const SENSOR_COORDS = {
  L0: { x:  -4.0, y:  8.0 },  // Hallux kiri
  L1: { x:  -6.0, y:  2.0 },  // Med.FF kiri
  L2: { x:  -9.0, y:  1.5 },  // Lat.FF kiri
  L3: { x:  -7.0, y: -8.0 },  // Heel kiri
  R0: { x:   4.0, y:  8.0 },  // Hallux kanan
  R1: { x:   6.0, y:  2.0 },  // Med.FF kanan
  R2: { x:   9.0, y:  1.5 },  // Lat.FF kanan
  R3: { x:   7.0, y: -8.0 },  // Heel kanan
};

function toForceArray(arr) {
  if (!Array.isArray(arr)) return [0, 0, 0, 0];

  return [0, 1, 2, 3].map((i) => {
    const n = Number(arr[i]);
    return Number.isFinite(n) ? n : 0;
  });
}

function computeCopFromSnapshot(snap) {
  snap = snap || {};

  const lN = toForceArray(snap.left_fsr_newton);
  const rN = toForceArray(snap.right_fsr_newton);

  let totalForce =
    lN.reduce((a, b) => a + b, 0) +
    rN.reduce((a, b) => a + b, 0);

  if (!totalForce || totalForce <= 0) {
    totalForce =
      Number(snap.total_force) ||
      Number(snap.totalForce) ||
      Number(snap.totalWeight) ||
      0;
  }

  if (!totalForce || totalForce <= 0) {
    return {
      x: 0,
      y: 0,
      distance: 0,
      valid: false,
      status: 'TIDAK ADA DATA',
      cssClass: 'muted',
    };
  }

  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < 4; i++) {
    sumX += lN[i] * SENSOR_COORDS[`L${i}`].x;
    sumY += lN[i] * SENSOR_COORDS[`L${i}`].y;

    sumX += rN[i] * SENSOR_COORDS[`R${i}`].x;
    sumY += rN[i] * SENSOR_COORDS[`R${i}`].y;
  }

  const x = sumX / totalForce;
  const y = sumY / totalForce;
  const distance = Math.sqrt((x * x) + (y * y));
  const cls = classifyCop(x, y);

  return {
    x,
    y,
    distance,
    valid: true,
    status: cls.status,
    cssClass: cls.cssClass,
  };
}

// function classifyCop(x, y) {
//   if (Math.abs(x) <= 1.5 && Math.abs(y) <= 2) {
//     return { status: 'NORMAL', cssClass: 'normal' };
//   }

//   if (Math.abs(x) <= 2 && Math.abs(y) <= 3) {
//     return { status: 'SEDANG', cssClass: 'warning' };
//   }

//   return { status: 'ABNORMAL', cssClass: 'abnormal' };
// }
// laporan.js classifyCop — sesuaikan dengan dashboard
function classifyCop(x, y) {
  const distance = Math.sqrt(x * x + y * y);
  if (distance < 2.5)  return { status: 'STABLE',   cssClass: 'normal'   };
  if (distance <= 4.5) return { status: 'MODERATE',   cssClass: 'warning'  };
  return                      { status: 'ABNORMAL', cssClass: 'abnormal' };
}

function copPdfColor(cop) {
  if (!cop || !cop.valid) return '#999';
  if (cop.cssClass === 'normal') return '#1a7a4a';
  if (cop.cssClass === 'warning') return '#8a6200';
  return '#9b1c1c';
}

function copStatusBg(cop) {
  if (!cop || !cop.valid) return '#f8f8f8';
  if (cop.cssClass === 'normal') return '#e8f8f1';
  if (cop.cssClass === 'warning') return '#fef9e7';
  return '#fdf0ef';
}

/* ============================================================
   HISTORY LIST
   ============================================================ */

function renderHistoryList() {
  const snaps = _firebaseHistory;
  const container = document.getElementById('history-list-body');

  if (!container) return;

  if (!snaps || snaps.length === 0) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-dim);
        font-family:var(--font-mono);font-size:11px">
        ${tr('No snapshot available.')}
      </div>`;
    return;
  }

  let html = '';
  const groups = {};

  snaps.forEach((snap) => {
    const dt = getSnapshotDateTime(snap);
    const dateKey =
      dt.dateText && dt.dateText !== '—' ? dt.dateText : 'No Date';

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(snap);
  });

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  Object.entries(groups).forEach(([date, items]) => {
    const label = date === today ? `Hari Ini — ${date}` : date;

    html += `
      <div class="date-group">
        <div class="date-group-header">
          <span>${escapeHtml(label)}</span>
          <div class="date-line"></div>
          <span class="date-count">${items.length} snapshot</span>
        </div>

        <div class="snapshot-table-wrap">
          <table class="snapshot-table">
<colgroup>
  <col class="col-time" />
  <col class="col-posture" />
  <col class="col-foot" />
  <col class="col-foot" />
  <col class="col-foot" />
  <col class="col-foot" />
  <col class="col-cop" />
  <col class="col-action" />
</colgroup>

<thead>
  <tr>
    <th>${tr('Time')}</th>
    ${/*<th>${tr('Posture')}</th>*/ ''}
    <th>${tr('Left Structure')}</th>
    <th>${tr('Left Movement')}</th>
    <th>${tr('Right Structure')}</th>
    <th>${tr('Right Movement')}</th>
    <th>${tr('CoP')}</th>
    <th></th>
  </tr>
</thead>

            <tbody>
              ${items.map((s, index) => renderSnapRow(s, index)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function selectSnapshot(rowId) {
  document
    .querySelectorAll('.snapshot-table-row, .snapshot-row')
    .forEach(row => row.classList.remove('selected'));

  const el = document.getElementById(rowId);
  if (el) el.classList.add('selected');
}

function renderSnapRow(snap, index) {
  const summary = buildSnapshotSummary(snap);
  // const postureLabel = getSnapshotPostureLabel(snap);

  const rawId = snap.id || snap.snapshot_time || index;
  const rowId = `snap-row-${index}-${String(rawId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const snapId = snap.id || '';

  return `
    <tr class="snapshot-table-row" onclick="selectSnapshot('${rowId}')" id="${rowId}">
      <td class="snapshot-time-td">
        ${escapeHtml(summary.timeText)}
      </td>

      ${/*
      <td>
        <span class="snapshot-cell-value">
          ${et(postureLabel)}
        </span>
      </td>
      */ ''}
      
      <td>
        <span class="snapshot-cell-value" style="color:${summary.leftStructureColor}">
          ${et(summary.leftStructure)}
        </span>
      </td>

      <td>
        <span class="snapshot-cell-value" style="color:${summary.leftMotionColor}">
          ${et(summary.leftMotion)}
        </span>
      </td>

      <td>
        <span class="snapshot-cell-value" style="color:${summary.rightStructureColor}">
          ${et(summary.rightStructure)}
        </span>
      </td>

      <td>
        <span class="snapshot-cell-value" style="color:${summary.rightMotionColor}">
          ${et(summary.rightMotion)}
        </span>
      </td>

      <td class="snapshot-cop-td">
        <span class="snapshot-cop-badge" style="color:${summary.copColor};border-color:${summary.copColor}">
          ${et(summary.copDashboardLabel)}
        </span>
      </td>

      <td class="snapshot-action-td">
        <button
          class="btn-delete-snap"
          onclick="handleDeleteSnap(event, '${escapeJs(snapId)}')"
          title="${tr('Delete')}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    </tr>
  `;
}

/* ============================================================
   SUMMARY STATS
   ============================================================ */

function renderSummaryStats() {
  const snaps = _firebaseHistory;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setColor = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.color = value;
  };

  if (!snaps || snaps.length === 0) {
    set('latest-overall-status', tr('Data Not Available'));
    set('latest-overall-desc', tr('No snapshot available for analysis.'));

    set('latest-left-condition', '—');
    set('latest-right-condition', '—');

    set('latest-left-structure', '—');
    set('latest-left-motion', '—');
    set('latest-right-structure', '—');
    set('latest-right-motion', '—');

    set('latest-cop-condition', '—');
    set('total-snaps', '0');
    set('latest-snapshot-meta', `${tr('Last Snapshot')}: —`);

    set('stable-snaps', '—');
    set('attention-snaps', '—');
    set('dominant-condition', '—');
    set('dominant-structure', '—');
    set('dominant-motion', '—');

    set('cop-status-summary', '');
    set('cop-history-note', `${tr('Waiting for latest CoP data...')}`);
    return;
  }

  const latest = snaps[0];
  const latestSummary = buildSnapshotSummary(latest);

  set('latest-overall-status', tr(latestSummary.overallTitle));
  set('latest-overall-desc', tr(latestSummary.overallDescription));

  set('latest-left-condition', tr(latestSummary.leftCondition));
  set('latest-right-condition', tr(latestSummary.rightCondition));

  set('latest-left-structure', tr(latestSummary.leftStructure));
  set('latest-left-motion', tr(latestSummary.leftMotion));
  set('latest-right-structure', tr(latestSummary.rightStructure));
  set('latest-right-motion', tr(latestSummary.rightMotion));

  set('latest-cop-condition', tr(latestSummary.copDashboardLabel));
  set('total-snaps', `${snaps.length} ${tr('snapshot')}`);
  set('latest-snapshot-meta', `${tr('Last Snapshot')}: ${tr(latestSummary.copDashboardLabel)}`);

  setColor('latest-left-structure', latestSummary.leftStructureColor);
  setColor('latest-left-motion', latestSummary.leftMotionColor);
  setColor('latest-right-structure', latestSummary.rightStructureColor);
  setColor('latest-right-motion', latestSummary.rightMotionColor);
  setColor('latest-cop-condition', latestSummary.copColor);

  const summaries = snaps.map(buildSnapshotSummary);

  const stableCount = summaries.filter(
    (summary) => summary.copDashboardLabel === 'STABLE'
  ).length;

  const attentionCount = summaries.length - stableCount;

  set('stable-snaps', `${stableCount} ${tr("times")}`);
  set('attention-snaps', `${attentionCount} ${tr("times")}`);
  set('dominant-condition', tr(getDominantPatientCondition(summaries)));
  set('dominant-structure', tr(getDominantStructureCondition(summaries)));
  set('dominant-motion', tr(getDominantMotionCondition(summaries)));

  const statusEl = document.getElementById('cop-status-summary');
  if (statusEl) {
    statusEl.textContent = `${tr('Last Snapshot')}: ${tr(latestSummary.copDashboardLabel)}`;
    statusEl.style.color = latestSummary.copColor;
  }

  const note = document.getElementById('cop-history-note');
  if (note) {
    note.textContent =
      `${tr('Chart displays the entire CoP history')} (${snaps.length} ${tr('snapshot')}). ` +
      `${tr('Status label only shows the last snapshot')}: ${latestSummary.copDashboardLabel}.`;
  }
}

/* ============================================================
   CoP TRAJECTORY CANVAS
   ============================================================ */

function drawCopHistoryCanvas() {
  const cv = document.getElementById('cop-history-canvas');
  if (!cv) return;

  const box = cv.parentElement;

  const W = box ? Math.round(box.clientWidth) : 190;
  const H = box ? Math.round(box.clientHeight) : 190;

  cv.width = W;
  cv.height = H;

  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const snaps = _firebaseHistory.slice().reverse();

  const points = snaps
    .map((snap) => computeCopFromSnapshot(snap))
    .filter((cop) => cop.valid);

  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.42;

  drawReportCopDashboardGrid(ctx, W, H, cx, cy, radius);

  if (!points.length) {
    ctx.fillStyle = 'rgba(120,120,140,0.8)';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr('No CoP data available'), cx, cy);
    return;
  }

  const scale = radius / 15;

  ctx.save();
  ctx.beginPath();

  points.forEach((point, i) => {
    const x = cx + clamp(point.x, -15, 15) * scale;
    const y = cy - clamp(point.y, -15, 15) * scale;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = 'rgba(231, 48, 42, 0.38)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  points.forEach((point, i) => {
    const x = cx + clamp(point.x, -15, 15) * scale;
    const y = cy - clamp(point.y, -15, 15) * scale;
    const isLast = i === points.length - 1;

    ctx.save();

    if (isLast) {
      ctx.shadowColor = canvasCopColor(point);
      ctx.shadowBlur = 14;
    }

    ctx.beginPath();
    ctx.arc(x, y, isLast ? 6 : 3.6, 0, Math.PI * 2);
    ctx.fillStyle = canvasCopColor(point);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = isLast ? 2 : 1.1;
    ctx.stroke();

    ctx.restore();
  });
}

function drawReportCopDashboardGrid(ctx, W, H, cx, cy, radius) {
  ctx.save();

  ctx.strokeStyle = getCssVar('--border-color', 'rgba(150,150,170,0.45)');
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  [0.34, 0.67, 1].forEach((ratio) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ratio, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120,120,140,0.75)';
  ctx.fill();

  ctx.fillStyle = 'rgba(120,120,140,0.82)';
  ctx.font = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(tr('FRONT'), cx, 12);
  ctx.fillText(tr('BACK'), cx, H - 12);

  ctx.textAlign = 'left';
  ctx.fillText(tr('LEFT'), 10, cy + 4);

  ctx.textAlign = 'right';
  ctx.fillText(tr('RIGHT'), W - 10, cy + 4);

  ctx.restore();
}

function canvasCopColor(cop) {
  if (!cop || !cop.valid) return '#999999';
  if (cop.cssClass === 'normal') return '#22D48F';
  if (cop.cssClass === 'warning') return '#D4A017';
  return '#E7302A';
}

/* ============================================================
   TREND CHART — CoP DEVIATION
   ============================================================ */

function drawTrendCharts() {
  const snaps = _firebaseHistory.slice(0, 10).reverse();
  const cv = document.getElementById('trend-canvas');

  if (!cv) return;

  const W = cv.offsetWidth || 300;
  const H = 100;

  cv.width = W;
  cv.height = H;

  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  if (!snaps.length) return;

  const values = snaps.map((s) => computeCopFromSnapshot(s).distance);

  const trendEl = document.getElementById('trend-delta');
  if (trendEl && values.length >= 2) {
    const delta = values[values.length - 1] - values[0];

    trendEl.textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} cm`;
    trendEl.style.color = delta <= 0 ? 'var(--green)' : 'var(--red)';
  }

  const pad = { t: 12, b: 20, l: 12, r: 12 };
  const n = values.length;

  if (n === 1) {
    drawSingleTrendPoint(ctx, values[0], W, H);
    return;
  }

  const minV = Math.max(0, Math.min(...values) - 1);
  const maxV = Math.max(...values) + 1;

  const xPos = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const yPos = (v) =>
    H - pad.b - ((v - minV) / (maxV - minV || 1)) * (H - pad.t - pad.b);

  drawTrendThreshold(ctx, W, H, pad, minV, maxV, 2.5, 'NORMAL');
  drawTrendThreshold(ctx, W, H, pad, minV, maxV, 4.0, 'MODERATE');

  const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, 'rgba(231,48,42,0.20)');
  grad.addColorStop(1, 'rgba(231,48,42,0)');

  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(values[0]));

  values.forEach((v, i) => {
    if (i > 0) ctx.lineTo(xPos(i), yPos(v));
  });

  ctx.lineTo(xPos(n - 1), H - pad.b);
  ctx.lineTo(xPos(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(values[0]));

  values.forEach((v, i) => {
    if (i > 0) ctx.lineTo(xPos(i), yPos(v));
  });

  ctx.strokeStyle = '#E7302A';
  ctx.lineWidth = 2;
  ctx.stroke();

  values.forEach((v, i) => {
    const x = xPos(i);
    const y = yPos(v);

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = v <= 2.5 ? '#22D48F' : v <= 4 ? '#D4A017' : '#E7302A';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(80,80,100,0.85)';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(v.toFixed(1), x, y - 7);
  });
}

function drawSingleTrendPoint(ctx, value, W, H) {
  const x = W / 2;
  const y = H / 2;

  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = value <= 2.5 ? '#22D48F' : value <= 4 ? '#D4A017' : '#E7302A';
  ctx.fill();

  ctx.fillStyle = 'rgba(80,80,100,0.85)';
  ctx.font = 'bold 10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${value.toFixed(1)} cm`, x, y - 10);
}

function drawTrendThreshold(ctx, W, H, pad, minV, maxV, threshold, label) {
  if (threshold < minV || threshold > maxV) return;

  const y =
    H -
    pad.b -
    ((threshold - minV) / (maxV - minV || 1)) * (H - pad.t - pad.b);

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(120,120,140,0.35)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(pad.l, y);
  ctx.lineTo(W - pad.r, y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(120,120,140,0.7)';
  ctx.font = 'bold 7px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${tr(label)} ${threshold.toFixed(1)}`, W - pad.r, y - 3);

  ctx.restore();
}

/* ============================================================
   SNAPSHOT SUMMARY
   ============================================================ */

function buildSnapshotSummary(snap) {
  const cop = computeCopFromSnapshot(snap);
  const dateTime = getSnapshotDateTime(snap);

  const leftParts = getFootAnalysisPartsFromSnapshot(snap, 'l');
  const rightParts = getFootAnalysisPartsFromSnapshot(snap, 'r');

  const leftCondition = combineArchAndPronation(
    leftParts.arch,
    leftParts.pronation
  );

  const rightCondition = combineArchAndPronation(
    rightParts.arch,
    rightParts.pronation
  );

  const copStatus = snap.cop_status || cop.status;
  const copReadable = getCopReadableStatus(copStatus);
  const copDashboardLabel = getDashboardCopStatusLabel(copStatus);

  const leftStructureColor = getStructureConditionColor(leftParts.arch);
  const rightStructureColor = getStructureConditionColor(rightParts.arch);
  const leftMotionColor = getMotionConditionColor(leftParts.pronation);
  const rightMotionColor = getMotionConditionColor(rightParts.pronation);
  const copColor = getCopStatusColor(copStatus);

  const overall = getOverallPatientConclusionDetailed({
    leftStructure: leftParts.arch,
    rightStructure: rightParts.arch,
    leftMotion: leftParts.pronation,
    rightMotion: rightParts.pronation,
    copStatus,
    copDashboardLabel,
  });

  return {
    dateText: dateTime.dateText,
    timeText: dateTime.timeText,

    leftStructure: leftParts.arch,
    rightStructure: rightParts.arch,
    leftMotion: leftParts.pronation,
    rightMotion: rightParts.pronation,

    leftStructureColor,
    rightStructureColor,
    leftMotionColor,
    rightMotionColor,

    leftCondition,
    rightCondition,
    leftShort: simplifyFootCondition(leftCondition),
    rightShort: simplifyFootCondition(rightCondition),
    leftColor: getFootConditionColor(leftCondition),
    rightColor: getFootConditionColor(rightCondition),

    copStatus,
    copLabel: copDashboardLabel,
    copDashboardLabel,
    copBadge: copDashboardLabel,
    copDescription:
      snap.cop_kesimpulan ||
      copReadable.description,

    copColor,

    overallTitle:
      snap.kesimpulan_umum_title ||
      overall.title,

    overallDescription:
      snap.kesimpulan_umum ||
      overall.description,

    shortConclusion: overall.shortConclusion,
  };
}

function getSnapshotDateTime(snap) {
  if (snap.tanggal || snap.jam) {
    return {
      dateText: snap.tanggal || '—',
      timeText: snap.jam || '—',
    };
  }

  try {
    const d = new Date(snap.snapshot_time);

    if (!isNaN(d)) {
      return {
        dateText: d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        timeText: d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    }
  } catch (_) {}

  return {
    dateText: '—',
    timeText: snap.snapshot_time || '—',
  };
}

function getFootAnalysisPartsFromSnapshot(snap, side) {
  const archType = snap.archType || {};
  const pronation = snap.pronation || {};
  const isLeft = side === 'l';

  const archCandidates = isLeft
    ? [
        snap.arch_label_l,
        snap.arch_l,
        snap.left_arch,
        snap.archLeft,
        archType.arch_label_l,
        archType.labelL,
        archType.left,
      ]
    : [
        snap.arch_label_r,
        snap.arch_r,
        snap.right_arch,
        snap.archRight,
        archType.arch_label_r,
        archType.labelR,
        archType.right,
      ];

  const pronationCandidates = isLeft
    ? [
        snap.pronation_label_l,
        snap.pron_label_l,
        snap.left_pronation,
        snap.pronationLeft,
        pronation.labelL,
        pronation.left,
      ]
    : [
        snap.pronation_label_r,
        snap.pron_label_r,
        snap.right_pronation,
        snap.pronationRight,
        pronation.labelR,
        pronation.right,
      ];

  return {
    arch: normalizeConditionLabel(firstMeaningfulValue(archCandidates)),
    pronation: normalizeConditionLabel(firstMeaningfulValue(pronationCandidates)),
  };
}

function firstMeaningfulValue(values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (!text || text === '—') continue;

    return text;
  }

  return 'Normal';
}

function getFootConditionFromSnapshot(snap, side) {
  const parts = getFootAnalysisPartsFromSnapshot(snap, side);
  return combineArchAndPronation(parts.arch, parts.pronation);
}

function combineArchAndPronation(arch, pronation) {
  const archNorm = normalizeConditionLabel(arch);
  const pronationNorm = normalizeConditionLabel(pronation);

  const archIsNormal = isNormalCondition(archNorm);
  const pronationIsNormal = isNormalCondition(pronationNorm);

  if (archIsNormal && pronationIsNormal) {
    return 'Normal';
  }

  if (!archIsNormal && !pronationIsNormal) {
    return `${archNorm} dengan ${pronationNorm}`;
  }

  if (!archIsNormal) {
    return archNorm;
  }

  return pronationNorm;
}

function normalizeConditionLabel(label) {
  const raw = String(label || '').trim();

  if (!raw || raw === '—') return 'Normal';

  const lower = raw.toLowerCase();

  if (lower.includes('flat')) return 'Flat Foot';
  if (lower.includes('high')) return 'High Arch';
  if (lower.includes('over')) return 'Overpronation';
  if (lower.includes('supin')) return 'Supination';
  if (lower.includes('normal') || lower.includes('netral')) return 'Normal';

  return raw;
}

function isNormalCondition(label) {
  return normalizeConditionLabel(label).toLowerCase() === 'normal';
}

function simplifyFootCondition(label) {
  const text = String(label || 'Normal');

  if (text === 'Normal') return 'Normal';
  if (text.includes('Flat Foot')) return 'Flat Foot';
  if (text.includes('High Arch')) return 'High Arch';
  if (text.includes('Overpronation')) return 'Overpronation';
  if (text.includes('Supination')) return 'Supination';

  return text;
}

function getStructureConditionColor(label) {
  const text = normalizeConditionLabel(label);

  if (text === 'Normal') return 'var(--green)';
  if (text === 'Flat Foot') return 'var(--red)';
  if (text === 'High Arch') return '#2266FF';

  return 'var(--text-secondary)';
}

function getMotionConditionColor(label) {
  const text = normalizeConditionLabel(label);

  if (text === 'Normal') return 'var(--green)';
  if (text === 'Overpronation') return 'var(--red)';
  if (text === 'Supination') return '#2266FF';

  return 'var(--text-secondary)';
}

function getFootConditionColor(label) {
  const text = String(label || '');

  if (text === 'Normal') return 'var(--green)';
  if (text.includes('Flat Foot')) return 'var(--red)';
  if (text.includes('High Arch')) return '#2266FF';
  if (text.includes('Overpronation')) return 'var(--red)';
  if (text.includes('Supination')) return '#2266FF';

  return 'var(--text-secondary)';
}

function getDashboardCopStatusLabel(status) {
  const raw = String(status || '').toUpperCase();

  if (
    raw.includes('TIDAK ADA DATA') ||
    raw.includes('NO DATA AVAILABLE') ||
    raw.includes('DATA NOT AVAILABLE')
  ) return 'DATA NOT AVAILABLE';

  if (
    raw.includes('ABNORMAL') ||
    raw.includes('UNSTABLE') ||
    raw.includes('TIDAK STABIL')
  ) return 'ABNORMAL';

  if (
    raw.includes('MODERATE') ||
    raw.includes('SEDANG') ||
    raw.includes('CUKUP')
  ) return 'MODERATE';

  if (
    raw.includes('STABLE') ||
    raw.includes('NORMAL') ||
    raw.includes('STABIL')
  ) return 'STABLE';

  return 'UNKNOWN';
}

function getCopReadableStatus(status) {
  const label = getDashboardCopStatusLabel(status);

  if (label === 'DATA NOT AVAILABLE') {
    return {
      label: 'No data available',
      badge: '—',
      description: 'CoP data is not sufficient to conclude stability.',
    };
  }

  if (label === 'ABNORMAL') {
    return {
      label: 'Unstable',
      badge: 'Unstable',
      description:
        'Body weight pressure points are far from the center of pressure. There are signs of stability issues.',
    };
  }

  if (label === 'MODERATE') {
    return {
      label: 'Moderate',
      badge: 'Moderate',
      description:
        'Body weight pressure points are slightly offset from the center. Stability is acceptable but requires monitoring.',
    };
  }

  if (label === 'STABLE') {
    return {
      label: 'Stable',
      badge: 'Stable',
      description:
        'Body weight pressure points are near the center of pressure. Body stability is generally good.',
    };
  }

  return {
    label: 'Unknown',
    badge: '—',
    description: 'CoP data is not sufficient to conclude stability.',
  };
}

function getCopStatusColor(status) {
  const label = getDashboardCopStatusLabel(status);

  if (label === 'STABLE') return 'var(--green)';
  if (label === 'MODERATE') return 'var(--yellow)';
  if (label === 'ABNORMAL') return 'var(--red)';

  return 'var(--text-secondary)';
}

function getOverallPatientConclusionDetailed(data) {
  const leftStructureNormal = isNormalCondition(data.leftStructure);
  const rightStructureNormal = isNormalCondition(data.rightStructure);
  const leftMotionNormal = isNormalCondition(data.leftMotion);
  const rightMotionNormal = isNormalCondition(data.rightMotion);

  const structureNormal = leftStructureNormal && rightStructureNormal;
  const motionNormal = leftMotionNormal && rightMotionNormal;

  const copStable = data.copDashboardLabel === 'STABLE';
  const copModerate = data.copDashboardLabel === 'MODERATE';

  const isId = window.simpleLang && window.simpleLang.get() === 'id';

  const leftStructure = tr(data.leftStructure);
  const rightStructure = tr(data.rightStructure);
  const leftMotion = tr(data.leftMotion);
  const rightMotion = tr(data.rightMotion);
  const copStatus = tr(data.copDashboardLabel);

  const structureLine = isId
    ? `Struktur kaki: kiri ${leftStructure}, kanan ${rightStructure}.`
    : `Structure: left ${leftStructure}, right ${rightStructure}.`;

  const motionLine = isId
    ? `Gerakan kaki: kiri ${leftMotion}, kanan ${rightMotion}.`
    : `Movement: left ${leftMotion}, right ${rightMotion}.`;

  const copLine = isId
    ? `Status stabilitas CoP pada snapshot terakhir: ${copStatus}.`
    : `CoP Stability Status - Last Snapshot: ${copStatus}.`;

  if (structureNormal && motionNormal && copStable) {
    return {
      title: 'Good Patient Condition',
      description: isId
        ? `${structureLine} ${motionLine} ${copLine} Struktur, gerakan, dan stabilitas CoP secara umum berada dalam kondisi baik.`
        : `${structureLine} ${motionLine} ${copLine} Structure, movement, and CoP stability are generally good.`,
      shortConclusion: 'Structure, movement, and CoP stability are generally good.',
    };
  }

  if ((!structureNormal || !motionNormal) && copStable) {
    return {
      title: 'Indication of Foot Abnormality',
      description: isId
        ? `${structureLine} ${motionLine} ${copLine} Stabilitas masih tergolong baik, tetapi kelainan struktur atau gerakan kaki tetap perlu diperhatikan.`
        : `${structureLine} ${motionLine} ${copLine} Stability is still good, but structural/movement abnormalities still need to be noted.`,
      shortConclusion: 'There are indications of foot abnormalities, but the latest CoP is still stable.',
    };
  }

  if (copModerate) {
    return {
      title: 'Monitoring Required',
      description: isId
        ? `${structureLine} ${motionLine} ${copLine} Kondisi memerlukan pemantauan melalui snapshot berikutnya, terutama pada aspek stabilitas CoP.`
        : `${structureLine} ${motionLine} ${copLine} Condition requires monitoring through subsequent snapshots, especially CoP stability.`,
      shortConclusion: 'Condition requires monitoring, especially CoP stability.',
    };
  }

  return {
    title: 'Attention Needed',
    description: isId
      ? `${structureLine} ${motionLine} ${copLine} Pemeriksaan lanjutan disarankan apabila pola ini muncul berulang pada pengukuran berikutnya.`
      : `${structureLine} ${motionLine} ${copLine} Further examination is recommended if this pattern occurs repeatedly.`,
    shortConclusion: 'There are indications of stability issues or foot abnormalities that need attention.',
  };
}

function getDominantPatientCondition(summaries) {
  if (!summaries || summaries.length === 0) return '—';

  const structure = getDominantStructureCondition(summaries);
  const motion = getDominantMotionCondition(summaries);

  const unstable = summaries.filter(
    (summary) => summary.copDashboardLabel === 'ABNORMAL'
  ).length;

  if (unstable >= Math.ceil(summaries.length / 2)) {
    return 'Stability requires attention';
  }

  if (structure !== 'Structure generally normal') return structure;
  if (motion !== 'Movement generally normal') return motion;

  return 'Condition generally good';
}

function getDominantStructureCondition(summaries) {
  return getDominantPerFoot(
    summaries,
    'leftStructure',
    'rightStructure',
    'Structure'
  );
}

function getDominantMotionCondition(summaries) {
  return getDominantPerFoot(
    summaries,
    'leftMotion',
    'rightMotion',
    'Movement'
  );
}

function getDominantPerFoot(summaries, leftField, rightField, typeLabel) {
  if (!summaries || summaries.length === 0) return '—';

  const left = getDominantSingleFoot(summaries, leftField);
  const right = getDominantSingleFoot(summaries, rightField);

  return (
    `${tr('Left')} ${tr(typeLabel)}: ${formatDominantFootText(left, typeLabel)} · ` +
    `${tr('Right')} ${tr(typeLabel)}: ${formatDominantFootText(right, typeLabel)}`
  );
}

function getDominantSingleFoot(summaries, field) {
  const counts = {};

  summaries.forEach((summary) => {
    const label = normalizeConditionLabel(summary[field]);

    if (!label || label === 'Normal') return;

    counts[label] = (counts[label] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    return {
      label: 'Normal',
      count: 0,
    };
  }

  return {
    label: entries[0][0],
    count: entries[0][1],
  };
}

function formatDominantFootText(result, typeLabel) {
  if (!result || result.label === 'Normal') {
    return `${tr(typeLabel)} ${tr('generally normal')}`;
  }

  return `${tr('dominant')} ${tr(result.label)} (${result.count}x)`;
}

/* Fungsi ini tetap dipertahankan kalau masih dipakai bagian lain */
function getDominantByFields(summaries, fields, fallback) {
  const counts = {};

  summaries.forEach((summary) => {
    fields.forEach((field) => {
      const label = normalizeConditionLabel(summary[field]);
      if (label === 'Normal') return;

      counts[label] = (counts[label] || 0) + 1;
    });
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) return fallback;

  return `${entries[0][0]} (${entries[0][1]} findings)`;
}

/* ============================================================
   EXPORT CSV
   ============================================================ */

function exportCSV() {
  const snaps = _firebaseHistory;

  if (!snaps || snaps.length === 0) {
    showToast('No snapshots available for export.', 'error');
    return;
  }

  const headers = [
    'No',
    'Time',
    // 'Posture',
    'CoP X (cm)',
    'CoP Y (cm)',
    'CoP Deviation (cm)',
    'CoP Status',
    'ASI (%)',
    'Simetri (%)',
    'Total Force (N)',
    'Left Force (N)',
    'Right Force (N)',
    'Left Structure',
    'Left Movement',
    'Right Structure',
    'Right Movement',
    'L-Hallux (N)',
    'L-MedFF (N)',
    'L-LatFF (N)',
    'L-Heel (N)',
    'R-Hallux (N)',
    'R-MedFF (N)',
    'R-LatFF (N)',
    'R-Heel (N)',
    'Notes',
  ];

  const rows = snaps.map((s, i) => {
    const cop = computeCopFromSnapshot(s);
    const summary = buildSnapshotSummary(s);

    const lN = toForceArray(s.left_fsr_newton);
    const rN = toForceArray(s.right_fsr_newton);

    const fL = lN.reduce((a, b) => a + b, 0).toFixed(1);
    const fR = rN.reduce((a, b) => a + b, 0).toFixed(1);
    const asi = parseFloat(s.asi) || 0;

    return [
      i + 1,
      _fmtTime(s.snapshot_time),
      // s.posture || 'Berdiri',
      cop.x.toFixed(2),
      cop.y.toFixed(2),
      cop.distance.toFixed(2),
      summary.copDashboardLabel,
      asi.toFixed(1),
      (100 - asi).toFixed(1),
      (parseFloat(s.total_force) || 0).toFixed(1),
      fL,
      fR,
      summary.leftStructure,
      summary.leftMotion,
      summary.rightStructure,
      summary.rightMotion,
      lN[0].toFixed(1),
      lN[1].toFixed(1),
      lN[2].toFixed(1),
      lN[3].toFixed(1),
      rN[0].toFixed(1),
      rN[1].toFixed(1),
      rN[2].toFixed(1),
      rN[3].toFixed(1),
      s.note || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
  });

  const csv =
    [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))]
      .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `fps-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  URL.revokeObjectURL(url);
  showToast(`✓ ${tr('CSV successfully exported')} — ${snaps.length} ${tr('snapshot')}`, 'success');
}

/* ============================================================
   DELETE HANDLERS
   ============================================================ */

// function handleDeleteSnap(event, snapId) {
//   event.stopPropagation();

//   if (!snapId) {
//     showToast('ID snapshot tidak ditemukan.', 'error');
//     return;
//   }

//   if (confirm('Hapus snapshot ini?')) {
//     firebaseDeleteSnapshot(snapId)
//       .then(() => showToast('Snapshot dihapus', 'success'))
//       .catch(() => showToast('Gagal menghapus', 'error'));
//   }
// }

// function handleDeleteAll() {
//   firebaseDeleteAllHistory()
//     .then((res) => {
//       if (res !== false) showToast('Semua riwayat telah dibersihkan', 'success');
//     })
//     .catch(() => showToast('Gagal menghapus riwayat', 'error'));
// }

function showConfirm(message, callback) {
  const modal = document.getElementById('confirm-modal');
  const modalMessage = document.getElementById('modal-message');
  const btnOk = document.getElementById('modal-ok');
  const btnCancel = document.getElementById('modal-cancel');
  const btnClose = document.getElementById('modal-close');

  modalMessage.textContent = tr(message);
  modal.style.display = 'flex';

  const closeModal = () => {
    modal.style.display = 'none';
    btnOk.onclick = null;
  };

  btnOk.onclick = () => {
    closeModal();
    callback(true);
  };
  btnCancel.onclick = closeModal;
  btnClose.onclick = closeModal;
}

// Ganti fungsi delete snapshot
function handleDeleteSnap(event, snapId) {
  event.stopPropagation();

  if (!snapId) {
    showToast(tr('Snapshot ID not found.'), 'error');
    return;
  }

  showConfirm('Delete this snapshot?', (ok) => {
    if (!ok) return;

    firebaseDeleteSnapshot(snapId)
      .then(() => showToast(tr('Snapshot deleted'), 'success'))
      .catch(() => showToast(tr('Failed to delete snapshot'), 'error'));
  });
}

function handleDeleteAll() {
  if (!_firebaseHistory || _firebaseHistory.length === 0) {
    showToast(tr('No snapshots available for deletion.'), 'error');
    return;
  }

  showConfirm(
    'Delete all snapshots? This action cannot be undone.',
    (ok) => {
      if (!ok) return;

      firebaseDeleteAllHistory()
        .then((res) => {
          if (res !== false) showToast(tr('All history has been cleared'), 'success');
        })
        .catch(() => showToast(tr('Failed to delete history'), 'error'));
    }
  );
}

/* ============================================================
   EXPORT PDF — CoP BASED
   ============================================================ */

function exportPDF() {
  const snaps = _firebaseHistory;

  if (!snaps || snaps.length === 0) {
    showToast(tr('No snapshots available for export.'), 'error');
    return;
  }

  const win = window.open('', '_blank', 'width=1000,height=750');

  if (!win) {
    showToast(tr('Pop-up blocked by browser. Please allow pop-ups for this page.'), 'error');
    return;
  }

  showToast(tr('Opening PDF report...'), 'success');

  const p = _activeProfile || window._activePatient || {};
  const latest = snaps[0];
  const latestSummary = buildSnapshotSummary(latest);
  const summaries = snaps.map(buildSnapshotSummary);

  const patientName = p.name || '—';

  let patientAge = p.age || 0;
  if (p.dob && !p.age) {
    patientAge = Math.floor(
      (Date.now() - new Date(p.dob)) / (365.25 * 24 * 3600 * 1000)
    );
  }

  const patientAgeText = patientAge ? `${patientAge} ${tr('years')}` : '—';
  const patientGender = p.gender || '—';
  const patientWeight = p.weight || '—';
  const patientHeight = p.height || '—';
  const patientPhone = p.phone || '—';
  const patientEmail = p.email || '—';
  const patientAddr = p.address || '—';

  let patientDOB = '—';
  if (p.dob) {
    try {
      patientDOB = new Date(p.dob).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch (_) {
      patientDOB = p.dob;
    }
  }

  const now = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  // const copList = snaps
  //   .map(computeCopFromSnapshot)
  //   .filter((cop) => cop.valid);

  // const copDistances = copList.map((cop) => cop.distance);

  // const avgCop = copDistances.length ? avg(copDistances).toFixed(1) : '0.0';
  // const minCop = copDistances.length ? Math.min(...copDistances).toFixed(1) : '0.0';
  // const maxCop = copDistances.length ? Math.max(...copDistances).toFixed(1) : '0.0';

  const countStable = summaries.filter(
    (summary) => summary.copDashboardLabel === 'STABLE'
  ).length;

  const countAttention = summaries.length - countStable;
  const dominantStructure = getDominantStructureCondition(summaries);
  const dominantMotion = getDominantMotionCondition(summaries);

  const firstTime = snaps.length
    ? _fmtTime(snaps[snaps.length - 1].snapshot_time)
    : '—';

  const lastTime = snaps.length
    ? _fmtTime(snaps[0].snapshot_time)
    : '—';

  // const copValueColor = (value) => {
  //   const n = parseFloat(value);

  //   if (n <= 2.5) return '#1a7a4a';
  //   if (n <= 4) return '#8a6200';

  //   return '#9b1c1c';
  // };

const tableRows = snaps.map((snap, index) => {
  const cop = computeCopFromSnapshot(snap);
  const summary = buildSnapshotSummary(snap);

  return `
    <tr>
      <td class="tc muted">${index + 1}</td>
      <td class="nowrap">${escapeHtml(_fmtTime(snap.snapshot_time))}</td>
      ${/*<td class="tc">${et(getSnapshotPostureLabel(snap) || tr('Standing'))}</td>*/ ''}

      <td>
        <div class="foot-cell">
          <strong>${et('Left Foot')}</strong>
          <span>${et('Structure')}: ${et(summary.leftStructure)}</span>
          <span>${et('Movement')}: ${et(summary.leftMotion)}</span>
        </div>
      </td>

      <td>
        <div class="foot-cell">
          <strong>${et('Right Foot')}</strong>
          <span>${et('Structure')}: ${et(summary.rightStructure)}</span>
          <span>${et('Movement')}: ${et(summary.rightMotion)}</span>
        </div>
      </td>

      <td class="tc">
        <span class="badge" style="background:${copStatusBg(cop)};color:${copPdfColor(cop)}">
          ${et(summary.copDashboardLabel)}
        </span>
      </td>

      <td class="small-txt">
        ${et(snap.note || '—')}
      </td>
    </tr>
  `;
}).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Laporan — ${escapeHtml(patientName)} — Foot Plantar Monitoring</title>

<style>
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 11px;
  }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1d2e;
    background: #ffffff;
    padding: 18mm 16mm;
  }

  @page {
    size: A4 landscape;
    margin: 18mm 16mm;
  }

  @media print {
    body {
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break {
      page-break-before: always;
    }
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 3px solid #3B7BF6;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-mark {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: #3B7BF6;
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: .03em;
  }

  .brand-title {
    font-size: 19px;
    font-weight: 900;
    color: #1a1d2e;
  }

  .brand-sub {
    font-size: 9px;
    color: #8890a8;
    margin-top: 3px;
  }

  .header-meta {
    text-align: right;
    font-size: 9px;
    color: #687086;
    line-height: 1.75;
    min-width: 260px;
  }

  .header-meta strong {
    display: block;
    font-size: 12px;
    color: #1a1d2e;
    margin-bottom: 2px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0 9px;
    font-size: 8.5px;
    font-weight: 800;
    color: #687086;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e4e8f0;
  }

  .section-title:first-of-type {
    margin-top: 0;
  }

  .patient-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr 1.1fr;
    border: 1.4px solid #e4e8f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .patient-panel {
    padding: 12px 15px;
    border-right: 1px solid #e4e8f0;
  }

  .patient-panel:last-child {
    border-right: none;
  }

  .panel-label {
    font-size: 8px;
    font-weight: 800;
    color: #a0a7b8;
    text-transform: uppercase;
    letter-spacing: .07em;
    margin-bottom: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 3px 0;
    border-bottom: 1px solid #f0f3f8;
    font-size: 9.8px;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #8890a8;
  }

  .info-value {
    font-weight: 700;
    color: #1a1d2e;
    text-align: right;
    max-width: 62%;
  }

  .conclusion-box {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 10px;
    margin-bottom: 4px;
  }

  .conclusion-main {
    border: 1.4px solid #e4e8f0;
    border-radius: 10px;
    padding: 13px 15px;
    background: #f9fafb;
  }

  .conclusion-status {
    font-size: 16px;
    font-weight: 900;
    color: #1a1d2e;
    margin-bottom: 5px;
  }

  .conclusion-text {
    font-size: 10px;
    line-height: 1.55;
    color: #596176;
    font-weight: 600;
  }

  .latest-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 7px;
  }

  .latest-card {
    border: 1.4px solid #e4e8f0;
    border-radius: 9px;
    padding: 9px 10px;
    background: #ffffff;
  }

  .latest-card.accent {
    background: #eef3fe;
    border-color: rgba(59, 123, 246, 0.25);
  }

  .latest-label {
    font-size: 7.5px;
    font-weight: 800;
    color: #9aa2b5;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 4px;
  }

  .latest-value {
    font-size: 11px;
    font-weight: 900;
    color: #1a1d2e;
    line-height: 1.25;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
  }

  .summary-card {
    border: 1.4px solid #e4e8f0;
    border-radius: 9px;
    padding: 10px 8px;
    text-align: center;
    min-height: 62px;
  }

  .summary-val {
    font-family: 'Courier New', monospace;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.1;
    color: #1a1d2e;
  }

  .summary-label {
    font-size: 7.5px;
    color: #8890a8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
    line-height: 1.25;
    margin-top: 5px;
  }

  .simple-summary {
  grid-template-columns: repeat(4, 1fr);
}

  .wide-value {
    font-size: 10.5px;
    line-height: 1.25;
    font-family: 'Segoe UI', Arial, sans-serif;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    background: #f0f3f8;
    color: #596176;
    padding: 7px 7px;
    font-size: 8px;
    font-weight: 800;
    border-bottom: 2px solid #d9dee9;
    text-align: left;
    white-space: nowrap;
  }

  tbody td {
    padding: 6px 7px;
    font-size: 9.2px;
    border-bottom: 1px solid #eef1f6;
    vertical-align: middle;
  }

  tbody tr:nth-child(even) td {
    background: #fafbfc;
  }

  .tc {
    text-align: center;
  }

  .muted {
    color: #9aa2b5;
  }

  .nowrap {
    white-space: nowrap;
  }

  .strong {
    font-weight: 900;
  }

  .small-txt {
    font-size: 8.5px;
    line-height: 1.45;
  }

  .foot-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.35;
  }

  .foot-cell strong {
    font-size: 8px;
    color: #687086;
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  .foot-cell span {
    font-size: 8.8px;
    color: #1a1d2e;
    font-weight: 650;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 8px;
    font-weight: 900;
    white-space: nowrap;
  }

  .disclaimer {
    margin-top: 14px;
    padding: 10px 13px;
    background: #eef3fe;
    border-left: 3px solid #3B7BF6;
    border-radius: 7px;
    font-size: 8.8px;
    color: #42526d;
    line-height: 1.65;
  }

  .footer {
    margin-top: 13px;
    padding-top: 9px;
    border-top: 1px solid #e4e8f0;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 8px;
    color: #8890a8;
  }
</style>
</head>

<body>
  <div class="header">
    <div class="brand">
      <div class="brand-mark">FPS</div>
      <div>
        <div class="brand-title">Foot Plantar Monitoring</div>
        <div class="brand-sub">${et('Plantar Pressure Analysis and CoP Stability Report')}</div>
      </div>
    </div>

    <div class="header-meta">
      <strong>${et('Plantar Examination Report')}</strong>
      ${et('Printed')}: ${escapeHtml(now)}<br>
      ${et('Data Period')}: ${escapeHtml(firstTime)} — ${escapeHtml(lastTime)}<br>
      ${et('Total Snapshots')}: ${snaps.length}
    </div>
  </div>

  <div class="section-title">${et('Patient Information')}</div>

  <div class="patient-grid">
    <div class="patient-panel">
      <div class="panel-label">${et('Patient Identity')}</div>

      <div class="info-row">
        <span class="info-label">${et('Name')}</span>
        <span class="info-value">${escapeHtml(patientName)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">${et('Date of Birth')}</span>
        <span class="info-value">${escapeHtml(patientDOB)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">${et('Age')}</span>
        <span class="info-value">${escapeHtml(patientAgeText)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">${et('Gender')}</span>
        <span class="info-value">${escapeHtml(patientGender)}</span>
      </div>
    </div>

    <div class="patient-panel">
  <div class="panel-label">${et('Anthropometry')}</div>

  <div class="info-row">
    <span class="info-label">${et('Height')}</span>
    <span class="info-value">${escapeHtml(patientHeight)} cm</span>
  </div>

  <div class="info-row">
    <span class="info-label">${et('Weight')}</span>
    <span class="info-value">${escapeHtml(patientWeight)} kg</span>
  </div>

  <div class="info-row">
    <span class="info-label">${et('Number of Examinations')}</span>
    <span class="info-value">${snaps.length} ${et('snapshot')}</span>
  </div>

  <div class="info-row">
    <span class="info-label">${et('Last Status')}</span>
    <span class="info-value">${et(latestSummary.copDashboardLabel)}</span>
  </div>
</div>

    <div class="patient-panel">
      <div class="panel-label">${et('Contact')}</div>

      <div class="info-row">
        <span class="info-label">${et('Phone')}</span>
        <span class="info-value">${escapeHtml(patientPhone)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">${et('Email')}</span>
        <span class="info-value">${escapeHtml(patientEmail)}</span>
      </div>
    </div>
  </div>

  <div class="section-title">${et('Patient Conclusion')}</div>

  <div class="conclusion-box">
    <div class="conclusion-main">
      <div class="conclusion-status">
        ${et(latestSummary.overallTitle)}
      </div>

      <div class="conclusion-text">
        ${et(latestSummary.overallDescription)}
      </div>
    </div>

    <div class="latest-grid">
      <div class="latest-card">
        <div class="latest-label">${et('Left Structure')}</div>
        <div class="latest-value" style="color:${latestSummary.leftStructureColor}">
          ${et(latestSummary.leftStructure)}
        </div>
      </div>

      <div class="latest-card">
        <div class="latest-label">${et('Left Movement')}</div>
        <div class="latest-value" style="color:${latestSummary.leftMotionColor}">
          ${et(latestSummary.leftMotion)}
        </div>
      </div>

      <div class="latest-card">
        <div class="latest-label">${et('Right Structure')}</div>
        <div class="latest-value" style="color:${latestSummary.rightStructureColor}">
          ${et(latestSummary.rightStructure)}
        </div>
      </div>

      <div class="latest-card">
        <div class="latest-label">${et('Right Movement')}</div>
        <div class="latest-value" style="color:${latestSummary.rightMotionColor}">
          ${et(latestSummary.rightMotion)}
        </div>
      </div>

      <div class="latest-card accent">
        <div class="latest-label">${et('Latest CoP')}</div>
        <div class="latest-value" style="color:${latestSummary.copColor}">
          ${et(latestSummary.copDashboardLabel)}
        </div>
      </div>

      <div class="latest-card">
        <div class="latest-label">${et('Snapshot')}</div>
        <div class="latest-value">${snaps.length} ${et('data')}</div>
      </div>
    </div>
  </div>

  <div class="section-title">${et('History Summary')}</div>

  <div class="summary-grid simple-summary">
  <div class="summary-card">
    <div class="summary-val">${snaps.length}</div>
    <div class="summary-label">${et('Total Snapshots')}</div>
  </div>

  <div class="summary-card">
    <div class="summary-val" style="color:#1a7a4a">${countStable}</div>
    <div class="summary-label">${et('Stable Snapshots')}</div>
  </div>

  <div class="summary-card">
    <div class="summary-val" style="color:#9b1c1c">${countAttention}</div>
    <div class="summary-label">${et('Snapshots Need Attention')}</div>
  </div>

  <div class="summary-card">
    <div class="summary-val wide-value">${et(latestSummary.copDashboardLabel)}</div>
    <div class="summary-label">${et('Last Status')}</div>
  </div>
</div>

  <div class="summary-grid" style="grid-template-columns: 1fr 1fr; margin-top: 8px;">
    <div class="summary-card" style="text-align:left;">
      <div class="summary-label" style="margin-top:0;">${et('Dominant Structure')}</div>
      <div class="summary-val wide-value">${et(dominantStructure)}</div>
    </div>

    <div class="summary-card" style="text-align:left;">
      <div class="summary-label" style="margin-top:0;">${et('Dominant Movement')}</div>
      <div class="summary-val wide-value">${et(dominantMotion)}</div>
    </div>
  </div>

  <div class="section-title">${et('Snapshot Detail')}</div>

  <table>
    <thead>
<tr>
  <th class="tc" style="width:28px">No</th>
  <th>${et('Time')}</th>
  ${/*<th class="tc">${et('Posture')}</th>*/ ''}
  <th>${et('Left Foot')}</th>
  <th>${et('Right Foot')}</th>
  <th class="tc">${et('Stability')}</th>
  <th>${et('Notes')}</th>
</tr>
    </thead>

    <tbody>
      ${tableRows}
    </tbody>
  </table>

<div class="disclaimer">
  ${et("Notes: This Report summarizes the results of plantar pressure readings, foot structure patterns, foot movements, and body stability based on snapshot data. The results are for initial reference only and should be confirmed through clinical examination if abnormal patterns are found.")}
</div>

  <div class="footer">
    <span>Foot Plantar Monitoring — IoT Plantar Pressure Monitoring System</span>
    <span>${escapeHtml(patientName)} · ${escapeHtml(now)}</span>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 450);
    };
  <\/script>
</body>
</html>`);

  win.document.close();
}

/* ============================================================
   HELPERS
   ============================================================ */
// function getSnapshotPostureLabel(snap) {
//   const raw = String(
//     snap?.posture_ml ||
//     snap?.postureML ||
//     snap?.posture ||
//     ''
//   ).trim();

//   const labelMap = {
//     normal: 'Normal',
//     condong_depan: 'Forward Lean',
//     condong_belakang: 'Backward Lean',
//     condong_kiri: 'Left Lean',
//     condong_kanan: 'Right Lean',
//   };

//   if (!raw) return '—';

//   const label = labelMap[raw] || raw;
//   return typeof tr === "function" ? tr(label) : label;
// }

function _fmtTime(raw) {
  try {
    const d = new Date(raw);

    if (!isNaN(d)) {
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  } catch (_) {}

  return raw || '—';
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

function recordSnapshot() {
  openSnapModal();
}

/* ============================================================
   WINDOW EXPORTS
   ============================================================ */

window.recordSnapshot = recordSnapshot;
window.exportCSV = exportCSV;
window.exportPDF = exportPDF;
window.handleDeleteSnap = handleDeleteSnap;
window.handleDeleteAll = handleDeleteAll;
window.selectSnapshot = selectSnapshot;
