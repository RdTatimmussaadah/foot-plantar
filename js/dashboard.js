/**
 * dashboard.js — Combined monitoring + balance analysis page logic.
 */
'use strict';

const SENSOR_NAMES = ['Hallux', 'Metarsal 1', 'Metarsal 3', 'Heel'];
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 50;  // r=50
const MAX_FORCE = 100;

let currentPosture = 'Berdiri';
let currentData = null;
let _firebaseHistory = [];

let _postureMLSeq = 0;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');

  // LANGSUNG gambar sidebar pakai data default (biar gak kosong)
  renderSidebar(sidebarEl, 'monitor');

  // 1. UI Statis (Langsung Muncul)
  renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Monitoring</span>');

  // 2. Cek Auth & Jalankan Logic (Tunggu Firebase)
  requireAuth((user) => {
    // Kode di dalam sini hanya jalan jika USER SUDAH LOGIN

    // Ambil data profil (ini akan memicu renderSidebar otomatis)
    loadPatientToSidebar();

    if (typeof firebaseLoadHistory === 'function') {
      firebaseLoadHistory((list) => {
        _firebaseHistory = list;
        renderHistoryBars();
      });
    }

    startFirebaseListen(function(data) {
      currentData = data;
      updateDashboardUI(currentData);
    });
  });
});

function updateDashboardUI(data) {
  updateMonitoringUI(data);
  updateBalanceUI(data);
  updatePostureMLSimple(data);
}

// ============================================================
// FOOT OUTLINE dari image-map.net coords (kaki kanan)
// Ukuran gambar asli: 950 x 600 (sesuaikan jika berbeda)
// ============================================================
const FOOT_COORDS_RAW = [375,343,378,354,381,364,384,374,386,383,388,392,390,400,391,414,391,424,391,433,391,442,392,449,392,460,392,470,392,484,393,497,395,508,396,520,399,533,402,541,405,549,407,553,411,561,416,569,423,576,430,581,436,584,443,588,450,590,458,592,466,592,475,592,482,591,491,589,499,585,508,580,516,572,523,564,529,555,535,543,539,534,541,524,543,515,544,502,544,487,543,469,542,447,542,435,543,420,545,406,548,392,551,380,554,369,558,355,561,345,564,332,566,317,569,296,570,280,571,266,571,249,568,228,565,209,563,193,562,177,562,166,565,156,568,141,569,127,567,115,564,109,557,104,549,103,541,105,537,110,534,118,534,125,534,133,534,141,533,147,532,153,525,150,526,140,528,131,531,123,534,113,538,104,541,96,541,87,538,79,529,74,521,73,513,76,508,82,505,91,503,100,502,108,502,117,499,128,497,133,492,131,496,121,498,113,500,98,502,86,504,80,507,76,511,67,510,59,507,52,500,46,490,43,482,44,476,48,471,56,469,66,469,74,469,84,469,93,467,101,466,109,466,117,465,122,460,122,460,112,461,99,462,87,464,77,468,63,470,52,469,44,464,38,457,34,453,34,446,35,440,37,434,42,430,50,429,59,429,67,430,77,429,88,429,98,428,109,427,119,427,126,419,130,413,132,412,129,411,126,418,117,423,107,427,93,427,79,426,65,422,52,417,43,410,37,401,34,392,34,381,36,374,40,365,48,361,57,357,67,356,80,355,91,357,103,360,113,361,122,360,142,357,163,354,176,351,188,350,201,351,217,353,229,357,248,361,263,365,280,367,295,370,313,372,328];

// Ukuran gambar asli dari image-map.net
const ORIG_W = 950;
const ORIG_H = 600;

// Canvas kaki
const CANVAS_W = 180;
const CANVAS_H = 430;

// Bounding box coords untuk normalisasi ke canvas
function getBoundingBox(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < coords.length; i += 2) {
    minX = Math.min(minX, coords[i]);
    maxX = Math.max(maxX, coords[i]);
    minY = Math.min(minY, coords[i + 1]);
    maxY = Math.max(maxY, coords[i + 1]);
  }

  return { minX, minY, maxX, maxY };
}

// Konversi coords ke Path2D yang fit ke canvas
function buildFootPath(coords, canvasW, canvasH, flipX) {
  const bb = getBoundingBox(coords);
  const bbW = bb.maxX - bb.minX;
  const bbH = bb.maxY - bb.minY;

  // Padding supaya tidak mepet
  const pad = 4;
  const scaleX = (canvasW - pad * 2) / bbW;
  const scaleY = (canvasH - pad * 2) / bbH;

  const path = new Path2D();

  for (let i = 0; i < coords.length; i += 2) {
    let px = (coords[i] - bb.minX) * scaleX + pad;
    let py = (coords[i + 1] - bb.minY) * scaleY + pad;

    if (flipX) px = canvasW - px; // mirror untuk kaki kiri

    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }

  path.closePath();
  return path;
}

// Sensor positions (normalized 0..1 dalam bounding box kaki)
// kaki kanan: ibu jari di kiri, kelingking di kanan
// kaki kiri:  di-flip, ibu jari di kanan
const SENSOR_POS = [
  { key: 0, nx: 0.15, ny: 0.22, label: 'Hallux'  }, // ibu jari
  { key: 1, nx: 0.35, ny: 0.40, label: 'Metarsal 1'  }, // medial forefoot (sisi ibu jari)
  { key: 2, nx: 0.75, ny: 0.43, label: 'Metarsal 3'  }, // lateral forefoot (sisi kelingking)
  { key: 3, nx: 0.50, ny: 0.87, label: 'Heel'    }, // tumit
];

// ============================================================
// HEAT COLOR
// ============================================================
function heatColor(ratio) {
  const r = Math.max(0, Math.min(1, ratio));

  let red = 0, green = 0, blue = 0;

  if (r < 0.2) {
    // biru → cyan
    const t = r / 0.2;
    red = 0;
    green = Math.round(255 * t);
    blue = 255;

  } else if (r < 0.4) {
    // cyan → hijau
    const t = (r - 0.2) / 0.2;
    red = 0;
    green = 255;
    blue = Math.round(255 * (1 - t));

  } else if (r < 0.6) {
    // hijau → kuning
    const t = (r - 0.4) / 0.2;
    red = Math.round(255 * t);
    green = 255;
    blue = 0;

  } else if (r < 0.8) {
    // kuning → oranye
    const t = (r - 0.6) / 0.2;
    red = 255;
    green = Math.round(255 - (t * 120)); // turun ke ~135
    blue = 0;

  } else {
    // oranye → merah
    const t = (r - 0.8) / 0.2;
    red = 255;
    green = Math.round(135 * (1 - t));
    blue = 0;
  }

  return [red, green, blue];
}

const SENSOR_DESC = [
  "Hallux: Bagian ibu jari kaki, membantu menyeimbangkan tubuh dan mendorong langkah saat berjalan.",
  "Metarsal 1: Bagian tengah depan kaki sisi ibu jari, menahan tekanan saat berdiri dan berjalan.",
  "Metarsal 3: Bagian depan kaki sisi kelingking, menyeimbangkan tekanan luar kaki saat berjalan.",
  "Heel: Tumit kaki, menopang berat badan dan memberikan stabilitas saat berdiri."
];

// ============================================================
// DRAW FOOT HEATMAP
// ============================================================
// function drawFootHeatmap(canvasId, values, maxVal, isLeft) {
//   const cv = document.getElementById(canvasId);
//   if (!cv) return;
//   const W = CANVAS_W, H = CANVAS_H;
//   cv.width = W; cv.height = H;
//   const ctx = cv.getContext('2d');
//   ctx.clearRect(0, 0, W, H);

//   const footPath = buildFootPath(FOOT_COORDS_RAW, W, H, isLeft);

//   // Sensor titik dalam canvas (disesuaikan flip)
//   const bb = getBoundingBox(FOOT_COORDS_RAW);
//   const bbW = bb.maxX - bb.minX;
//   const bbH = bb.maxY - bb.minY;
//   const pad = 4;
//   const scaleX = (W - pad * 2) / bbW;
//   const scaleY = (H - pad * 2) / bbH;

//   const pts = SENSOR_POS.map(s => {
//     let px = s.nx * (W - pad * 2) + pad;
//     let py = s.ny * (H - pad * 2) + pad;
//     if (isLeft) px = W - px;
//     return {
//       cx: px, cy: py,
//       sx: W * 0.28, sy: H * 0.18,
//       ratio: Math.min(1, (values[s.key] || 0) / maxVal)
//     };
//   });

//   // IDW heatmap
//   const imgData = ctx.createImageData(W, H);
//   const d = imgData.data;
//   for (let py = 0; py < H; py++) {
//     for (let px = 0; px < W; px++) {
//       let wSum = 0, rSum = 0;
//       for (let k = 0; k < pts.length; k++) {
//         const p = pts[k];
//         const ex = (px - p.cx) / p.sx;
//         const ey = (py - p.cy) / p.sy;
//         const w  = 1 / (ex*ex + ey*ey + 0.001);
//         wSum += w; rSum += w * p.ratio;
//       }
//       const [cr, cg, cb] = heatColor(rSum / wSum);
//       const i = (py * W + px) * 4;
//       d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=215;
//     }
//   }

//   const off = document.createElement('canvas');
//   off.width = W; off.height = H;
//   off.getContext('2d').putImageData(imgData, 0, 0);

//   // Background + clip ke shape kaki
//   ctx.fillStyle = '#ffffff';    // Ganti jadi putih (atau 'transparent' jika ingin tembus pandang)
// ctx.fillRect(0, 0, W, H);
//   ctx.save();
//   ctx.clip(footPath);
//   ctx.drawImage(off, 0, 0);
//   ctx.restore();

//   // Outline kaki
//   ctx.save();
//   ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Ganti menjadi hitam transparan atau abu-abu
//   ctx.lineWidth = 1.5;
//   ctx.stroke(footPath);

//   // Sensor dots + label + nilai
//   // Sensor dots — tanpa label teks, pakai hover balloon di HTML
//   SENSOR_POS.forEach((s, idx) => {
//     const p = pts[idx];
//     const val = values[s.key] || 0;
//     const ratio = Math.min(1, val / maxVal);
//     const [cr, cg, cb] = heatColor(ratio);

//     // Halo
//     ctx.beginPath();
//     ctx.arc(p.cx, p.cy, 14, 0, Math.PI * 2);
//     ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
//     ctx.fill();

//     // Dot
//     ctx.beginPath();
//     ctx.arc(p.cx, p.cy, 7, 0, Math.PI * 2);
//     ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
//     ctx.fill();
//     ctx.strokeStyle = 'rgba(255,255,255,0.9)';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Nilai ADC di atas dot
//     ctx.shadowColor = 'rgba(0,0,0,0.95)';
//     ctx.shadowBlur  = 5;
//     ctx.fillStyle   = '#ffffff';
//     ctx.font        = 'bold 11px JetBrains Mono, monospace';
//     ctx.textAlign   = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(Math.round(val), p.cx, p.cy - 18);
//     ctx.shadowBlur  = 0;
//   });

//   ctx.restore();
// }

// function attachSensorTooltips(canvasId, sensorPos, values, maxVal, isLeft) {
//   const cv = document.getElementById(canvasId);
//   if (!cv) return;

//   // Hapus overlay lama
//   const oldOverlay = document.getElementById(canvasId + '-overlay');
//   if (oldOverlay) oldOverlay.remove();

//   const W = cv.offsetWidth || CANVAS_W;
//   const H = cv.offsetHeight || CANVAS_H;
//   const pad = 4;

//   const overlay = document.createElement('div');
//   overlay.id = canvasId + '-overlay';
//   overlay.style.cssText = `
//     position:absolute;inset:0;pointer-events:none;
//   `;

//   cv.parentElement.style.position = 'relative';
//   cv.parentElement.appendChild(overlay);

//   SENSOR_POS.forEach((s, idx) => {
//     let px = s.nx * (W - pad * 2) + pad;
//     let py = s.ny * (H - pad * 2) + pad;

//     if (isLeft) px = W - px;

//     const val = values[s.key] || 0;
//     const ratio = Math.min(1, val / maxVal);
//     const [cr, cg, cb] = heatColor(ratio);
//     const color = `rgb(${cr},${cg},${cb})`;

//     const dot = document.createElement('div');
//     dot.style.cssText = `
//       position:absolute;
//       width:26px;height:26px;
//       left:${px - 13}px;top:${py - 13}px;
//       border-radius:50%;
//       cursor:pointer;
//       pointer-events:all;
//       z-index:10;
//     `;

//     const tip = document.createElement('div');
//     tip.style.cssText = `
//       position:absolute;
//       bottom:calc(100% + 8px);
//       left:50%;transform:translateX(-50%);
//       background:#1a1a2e;
//       color:#fff;
//       font-family:'Nunito',sans-serif;
//       font-size:13px;
//       font-weight:700;
//       padding:7px 13px;
//       border-radius:9px;
//       white-space:nowrap;
//       border:1.5px solid ${color};
//       display:none;
//       pointer-events:none;
//       z-index:50;
//       box-shadow:0 4px 16px rgba(0,0,0,0.4);
//     `;

//     tip.innerHTML = `
//       <span style="color:${color};margin-right:6px;">●</span>
//       ${s.label} &nbsp;·&nbsp;
//       <span style="font-family:'JetBrains Mono',monospace;">${Math.round(val)} N</span>
//     `;

//     dot.appendChild(tip);
//     dot.addEventListener('mouseenter', () => tip.style.display = 'block');
//     dot.addEventListener('mouseleave', () => tip.style.display = 'none');
//     overlay.appendChild(dot);
//   });
// }

// Heatmap tetap sama
function drawFootHeatmap(canvasId, values, maxVal, isLeft) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const W = CANVAS_W, H = CANVAS_H;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const footPath = buildFootPath(FOOT_COORDS_RAW, W, H, isLeft);

  const bb = getBoundingBox(FOOT_COORDS_RAW);
  const bbW = bb.maxX - bb.minX;
  const bbH = bb.maxY - bb.minY;
  const pad = 4;

  const pts = SENSOR_POS.map(s => {
    let px = s.nx * (W - pad * 2) + pad;
    let py = s.ny * (H - pad * 2) + pad;
    if (isLeft) px = W - px;
    return {
      cx: px, cy: py,
      sx: W * 0.28, sy: H * 0.18,
      ratio: Math.min(1, (values[s.key] || 0) / maxVal),
      val: values[s.key] || 0,
      label: s.label
    };
  });

  // IDW heatmap
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let wSum = 0, rSum = 0;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k];
        const ex = (px - p.cx) / p.sx;
        const ey = (py - p.cy) / p.sy;
        const w  = 1 / (ex*ex + ey*ey + 0.001);
        wSum += w; rSum += w * p.ratio;
      }
      const [cr, cg, cb] = heatColor(rSum / wSum);
      const i = (py * W + px) * 4;
      d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=215;
    }
  }

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  off.getContext('2d').putImageData(imgData, 0, 0);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.clip(footPath);
  ctx.drawImage(off, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke(footPath);

  // Sensor dots + label + nilai
  pts.forEach(p => {
    const [cr, cg, cb] = heatColor(p.ratio);

    // Halo
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Nilai sensor
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    // ctx.fillText(Math.round(p.val), p.cx, p.cy - 18);

    // Label singkat sensor (ramah baca)
    ctx.fillText(p.label, p.cx, p.cy + 16);
    ctx.shadowBlur  = 0;
  });
  ctx.restore();
}

// Tooltip hover tetap struktur lama, tapi sekarang deskripsi awam
function attachSensorTooltips(canvasId, sensorPos, values, maxVal, isLeft) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;

  const oldOverlay = document.getElementById(canvasId + '-overlay');
  if (oldOverlay) oldOverlay.remove();

  const W = cv.offsetWidth || CANVAS_W;
  const H = cv.offsetHeight || CANVAS_H;
  const pad = 4;

  const overlay = document.createElement('div');
  overlay.id = canvasId + '-overlay';
  overlay.style.cssText = `position:absolute;inset:0;pointer-events:none;`;
  cv.parentElement.style.position = 'relative';
  cv.parentElement.appendChild(overlay);

  SENSOR_POS.forEach((s) => {
    let px = s.nx * (W - pad * 2) + pad;
    let py = s.ny * (H - pad * 2) + pad;
    if (isLeft) px = W - px;

    const val = values[s.key] || 0;
    const ratio = Math.min(1, val / maxVal);
    const [cr, cg, cb] = heatColor(ratio);
    const color = `rgb(${cr},${cg},${cb})`;

    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;
      width:32px;height:32px;
      left:${px}px;top:${py}px;
      transform:translate(-50%, -50%);
      border-radius:50%;
      cursor:pointer;
      pointer-events:all;
      z-index:50;
    `;

    const tip = document.createElement('div');
    tip.style.cssText = `
  position:absolute;
  bottom:calc(100% + 6px);
  left:50%; transform:translateX(-50%);
  background:#1a1a2e;color:#fff;
  font-family:'Nunito',sans-serif; font-size:10px; font-weight:600;
  padding:4px 6px; border-radius:5px;
  white-space:normal; width:200px;
  border:1.5px solid ${color};
  display:none; pointer-events:none; z-index:50;
  box-shadow:0 2px 12px rgba(0,0,0,0.4);
`;
    tip.innerText = SENSOR_DESC[s.key];

    dot.appendChild(tip);
    dot.addEventListener('mouseenter', () => tip.style.display = 'block');
    dot.addEventListener('mouseleave', () => tip.style.display = 'none');
    overlay.appendChild(dot);
  });
}

// ============================================================
// HEATMAP v2 — Pakai data percent dari Firebase (0–100)
// Flowchart: clamp → 5 zona warna smooth
// Untuk beralih ke versi ini: ganti redrawHeatmaps() pakai redrawHeatmapsV2()
// Untuk kembali ke versi lama: pakai redrawHeatmaps() seperti semula
// ============================================================

/**
 * Konversi persen (0–100) ke warna RGB smooth 5 zona.
 * Zona sesuai flowchart:
 *   0–20  : biru    → cyan
 *   20–40 : cyan    → hijau
 *   40–60 : hijau   → kuning
 *   60–80 : kuning  → oranye
 *   80–100: oranye  → merah
 */
// function heatColorPercent(pct) {
//   // Clamp 0–100 (sesuai flowchart: P[i]<0 → 0, P[i]>100 → 100)
//   const p = Math.max(0, Math.min(100, pct));

//   let r = 0, g = 0, b = 0;

//   if (p <= 20) {
//     // Biru → Cyan
//     const t = p / 20;
//     r = 0;
//     g = Math.round(255 * t);
//     b = 255;

//   } else if (p <= 40) {
//     // Cyan → Hijau
//     const t = (p - 20) / 20;
//     r = 0;
//     g = 255;
//     b = Math.round(255 * (1 - t));

//   } else if (p <= 60) {
//     // Hijau → Kuning
//     const t = (p - 40) / 20;
//     r = Math.round(255 * t);
//     g = 255;
//     b = 0;

//   } else if (p <= 80) {
//     // Kuning → Oranye
//     const t = (p - 60) / 20;
//     r = 255;
//     g = Math.round(255 - (t * 120));  // 255 → 135
//     b = 0;

//   } else {
//     // Oranye → Merah
//     const t = (p - 80) / 20;
//     r = 255;
//     g = Math.round(135 * (1 - t));   // 135 → 0
//     b = 0;
//   }

//   return [r, g, b];
// }

/**
 * Konversi persen (0–100) langsung dari Firebase ke dalam 6 ZONA warna.
 * Didesain lebih sensitif agar tumpuan kaki dewasa rileks bisa mencapai warna merah.
 */
function heatColorPercent(pct) {
  const p = Math.max(0, Math.min(100, pct));

  let r = 0, g = 0, b = 0;

  if (p <= 10) {
    // ZONA 1 (0–10%): Biru → Cyan
    const t = p / 10;
    r = 0;
    g = Math.round(255 * t);
    b = 255;

  } else if (p <= 20) {
    // ZONA 2 (10–20%): Cyan → Hijau
    const t = (p - 10) / (20 - 10);
    r = 0;
    g = 255;
    b = Math.round(255 * (1 - t));

  } else if (p <= 40) {
    // ZONA 3 (20–40%): Hijau → Kuning
    const t = (p - 20) / (40 - 20);
    r = Math.round(255 * t);
    g = 255;
    b = 0;

  } else if (p <= 60) {
    // ZONA 4 (40–60%): Kuning → Oranye
    const t = (p - 40) / (60 - 40);
    r = 255;
    g = Math.round(255 - (t * 120)); // 255 → 135
    b = 0;

  } else if (p <= 80) {
    // ZONA 5 (60–80%): Oranye → Merah (Target utama kaki dewasa saat berdiri)
    const t = (p - 60) / (80 - 60);
    r = 255;
    g = Math.round(135 * (1 - t));   // 135 → 0
    b = 0;

  } else {
    // ZONA 6 (80–100%): Merah Cerah → Merah Maroon Sangat Pekat
    const t = (p - 80) / (100 - 80);
    
    // Nilai Red (R) akan turun perlahan dari 255 menuju 110 saat mencapai 100%
    r = Math.round(255 - (t * 145)); 
    g = 0;
    b = 0;
  }

  return [r, g, b];
}

/**
 * Gambar heatmap v2 — input: array persen (0–100) per sensor,
 * langsung dari left_fsr_percent / right_fsr_percent Firebase.
 * Tidak perlu maxVal karena sudah dalam skala 0–100.
 */
function drawFootHeatmapV2(canvasId, percentArr, isLeft) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const W = CANVAS_W, H = CANVAS_H;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const footPath = buildFootPath(FOOT_COORDS_RAW, W, H, isLeft);
  const pad = 4;

  // Bangun titik sensor dengan nilai persen (0–100)
  const pts = SENSOR_POS.map(s => {
    let px = s.nx * (W - pad * 2) + pad;
    let py = s.ny * (H - pad * 2) + pad;
    if (isLeft) px = W - px;
    const pct = Math.max(0, Math.min(100, percentArr[s.key] || 0));
    return {
      cx: px, cy: py,
      sx: W * 0.28, sy: H * 0.18,
      pct,
      label: s.label,
    };
  });

  // IDW heatmap — interpolasi antar sensor pakai bobot jarak
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let wSum = 0, pSum = 0;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k];
        const ex = (px - p.cx) / p.sx;
        const ey = (py - p.cy) / p.sy;
        const w  = 1 / (ex * ex + ey * ey + 0.001);
        wSum += w;
        pSum += w * p.pct;
      }
      const [cr, cg, cb] = heatColorPercent(pSum / wSum);
      const idx = (py * W + px) * 4;
      d[idx] = cr; d[idx + 1] = cg; d[idx + 2] = cb; d[idx + 3] = 215;
    }
  }

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  off.getContext('2d').putImageData(imgData, 0, 0);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.clip(footPath);
  ctx.drawImage(off, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke(footPath);

  // Sensor dots + label
  pts.forEach(p => {
    const [cr, cg, cb] = heatColorPercent(p.pct);

    // Halo
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label sensor
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, p.cx, p.cy + 16);
    ctx.shadowBlur  = 0;
  });
  ctx.restore();
}

/**
 * Versi v2 dari redrawHeatmaps — pakai data percent dari Firebase.
 * Untuk AKTIFKAN: ganti pemanggilan redrawHeatmaps() di updateMonitoringUI()
 *                 menjadi redrawHeatmapsV2()
 * Untuk KEMBALI ke versi lama: ganti balik ke redrawHeatmaps()
 */
function redrawHeatmapsV2() {
  if (!currentData) return;

  const lP = currentData.left_fsr_percent  || [0, 0, 0, 0];
  const rP = currentData.right_fsr_percent || [0, 0, 0, 0];

  drawFootHeatmapV2('heatmap-L', lP, true);
  drawFootHeatmapV2('heatmap-R', rP, false);

  // Tooltip tetap pakai versi lama (masih bisa hover)
  const maxVal = Math.max(...currentData.left_fsr_newton, ...currentData.right_fsr_newton, 1);
  attachSensorTooltips('heatmap-L', SENSOR_POS, currentData.left_fsr_newton, maxVal, true);
  attachSensorTooltips('heatmap-R', SENSOR_POS, currentData.right_fsr_newton, maxVal, false);
}

function redrawHeatmaps() {
  if (!currentData) return;

  const maxVal = Math.max(
    ...currentData.left_fsr_newton,
    ...currentData.right_fsr_newton,
    1
  );

  drawFootHeatmap('heatmap-L', currentData.left_fsr_newton, maxVal, true);
  drawFootHeatmap('heatmap-R', currentData.right_fsr_newton, maxVal, false);

  attachSensorTooltips('heatmap-L', SENSOR_POS, currentData.left_fsr_newton, maxVal, true);
  attachSensorTooltips('heatmap-R', SENSOR_POS, currentData.right_fsr_newton, maxVal, false);
}

// ============================================================
// MONITORING UI UPDATE
// ============================================================
function updateMonitoringUI(data) {
  if (!data) return;

  const totalForceLabel = document.getElementById('total-force-label');
  if (totalForceLabel) totalForceLabel.textContent = `Total: ${data.totalForce} N`;

  // Balance = simetri percentage
  const sym = Math.round(100 - data.asi);

  const balanceEl = document.getElementById('m-balance');
  const balanceSubEl = document.getElementById('m-balance-sub');

  if (balanceEl) balanceEl.textContent = `${data.balanceScore}`;
  if (balanceSubEl) balanceSubEl.textContent = `ASI: ${data.asi.toFixed(1)}%`;

  // Color balance
  if (balanceEl) {
    balanceEl.style.color = sym >= 90
      ? 'var(--green)'
      : sym >= 80
        ? 'var(--yellow)'
        : 'var(--red)';
  }

  renderSensorRows('left-sensor-rows', data.left_fsr_newton, data.left_fsr_digital);
  renderSensorRows('right-sensor-rows', data.right_fsr_newton, data.right_fsr_digital);

  // redrawHeatmaps();
  redrawHeatmapsV2();

  const postureResult = detectPosture(data);
  updatePostureUI(postureResult);
}

// ============================================================
// SENSOR BAR ROWS
// ============================================================
function renderSensorRows(containerId, newtonArr, digitalArr) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxVal = 4095; // Karena kita mau pakai digital value untuk bar, jadi max 4095 (12-bit ADC)

  container.innerHTML = digitalArr.map((d, i) => {
    const pct = Math.round((d / maxVal) * 100);
    const voltage = ((d / 4095) * 3.3).toFixed(2);
    const [cr, cg, cb] = heatColor(pct / 100);
    const barColor = `rgb(${cr},${cg},${cb})`;

    return `
      <div class="sensor-row">
        <div class="sr-name">${SENSOR_NAMES[i]}</div>
        <div class="sr-kpa">${d} <span class="sr-unit">ADC</span></div>
        <div class="sr-bar-track">
          <div class="sr-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="sr-volt">${voltage}V</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// POSTURE SELECTOR
// ============================================================
function selectPosture(label, btn) {
  currentPosture = label;
  localStorage.setItem('fps_currentPosture', label);

  const badge = document.getElementById('posture-badge');
  if (badge) badge.textContent = label;

  document.querySelectorAll('.posture-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ============================================================
// DETEKSI POSTUR — Rule-based dummy
// Nanti diganti dengan model TF.js
// ============================================================
const POSTURE_CONFIG = {
  'Berdiri': { icon: '../assets/images/standup-icon.png', color: 'var(--green)' },
  'Jongkok': { icon: '../assets/images/jongkok-icon.png', color: 'var(--yellow)' },
  '1 Kaki': { icon: '../assets/images/onefoot-icon.png', color: '#2266FF' },
};

/**
 * Deteksi postur dari data sensor — rule-based sementara.
 * Nanti diganti: predictPosture(computedData) dari TF.js
 *
 * Logika sederhana:
 *   - Total force sangat kecil → tidak terdeteksi
 *   - Forefoot dominan (>60%) → Jongkok
 *   - Satu kaki dominan (>80% dari total) → 1 Kaki
 *   - Sisanya → Berdiri
 */
function detectPosture(data) {
  const lN = data.left_fsr_newton || [0, 0, 0, 0];
  const rN = data.right_fsr_newton || [0, 0, 0, 0];

  const totalForce = data.totalForce || 0;

  // Tidak ada tekanan — tidak bisa deteksi
  if (totalForce < 50) {
    return { label: 'Tidak Terdeteksi', confidence: null, source: 'rule-based' };
  }

  const lTotal = lN.reduce((a, b) => a + b, 0);
  const rTotal = rN.reduce((a, b) => a + b, 0);

  // Forefoot = hallux + medFF + latFF (index 0,1,2)
  const forefootL = lN[0] + lN[1] + lN[2];
  const forefootR = rN[0] + rN[1] + rN[2];
  const forefootPct = (forefootL + forefootR) / totalForce;

  // Dominasi satu kaki
  const lRatio = lTotal / totalForce;
  const rRatio = rTotal / totalForce;

  let label;

  if (lRatio > 0.80 || rRatio > 0.80) {
    label = '1 Kaki';
  } else if (forefootPct > 0.60) {
    label = 'Jongkok';
  } else {
    label = 'Berdiri';
  }

  return { label, confidence: null, source: 'rule-based' };

  // ── Nanti ganti dengan ini saat TF.js siap: ──
  // return predictPosture(data);  // dari posture_ml.js
}

/**
 * Update UI postur card berdasarkan hasil deteksi
 */
// function updatePostureUI(result) {
//   currentPosture = result.label;
//   localStorage.setItem('fps_currentPosture', result.label);

//   // Badge di header card
//   const badge = document.getElementById('posture-badge');
//   if (badge) {
//     badge.textContent = result.label;

//     const cfg = POSTURE_CONFIG[result.label];

//     badge.style.color = cfg ? cfg.color : 'var(--text-secondary)';
//     badge.style.background = cfg ? cfg.color + '15' : '';
//     badge.style.border = cfg ? `1px solid ${cfg.color}40` : '';
//   }

//   // Gambar ikon postur aktif
//   const iconEl = document.getElementById('posture-icon');
//   if (iconEl) {
//     const cfg = POSTURE_CONFIG[result.label];

//     iconEl.src = cfg ? cfg.icon : '';
//     iconEl.style.display = cfg ? 'block' : 'none';
//   }

//   // Label nama postur besar
//   const labelEl = document.getElementById('posture-label');
//   if (labelEl) {
//     const cfg = POSTURE_CONFIG[result.label];

//     labelEl.textContent = result.label;
//     labelEl.style.color = cfg ? cfg.color : 'var(--text-primary)';
//   }

//   // Source tag — "Rule-based" atau "ML" nanti
//   const sourceEl = document.getElementById('posture-source');
//   if (sourceEl) {
//     sourceEl.textContent = result.source === 'ml'
//       ? `🤖 Model ML · ${(result.confidence * 100).toFixed(0)}%`
//       : '⚙️ Rule-based · menunggu model ML';

//     sourceEl.style.color = result.source === 'ml'
//       ? 'var(--green)'
//       : 'var(--text-dim)';
//   }

//   // Highlight panel yang sesuai
//   document.querySelectorAll('.posture-panel').forEach(el => {
//     el.classList.toggle('active', el.dataset.posture === result.label);
//   });
// }

// ============================================================
// HASIL ML SEDERHANA
// Tidak mengganti Deteksi Postur utama.
// ============================================================

function updatePostureUI(result) {
  currentPosture = result.label;
  localStorage.setItem('fps_currentPosture', result.label);
}

// async function updatePostureMLSimple(data) {
//   const seq = ++_postureMLSeq;
//   const box = document.getElementById('posture-ml-simple');
//   const resultEl = document.getElementById('ml-posture-result');

//   if (!box || !resultEl) return;

//   if (typeof predictPostureML !== 'function') {
//     box.classList.remove('is-normal', 'is-warning');
//     box.classList.add('is-loading');
//     resultEl.textContent = 'Model belum siap';
//     return;
//   }

//   box.classList.remove('is-normal', 'is-warning');
//   box.classList.add('is-loading');
//   resultEl.textContent = 'Mendeteksi...';

//   try {
//     const result = await predictPostureML(data);

//     if (seq !== _postureMLSeq) return;

//     const label = result && result.label ? result.label : 'Belum terdeteksi';

//     resultEl.textContent = label;

//     localStorage.setItem('fps_currentPostureML', result.rawLabel || '');
//     localStorage.setItem('fps_currentPostureMLConfidence', (result.confidence || 0).toFixed(4));

//     box.classList.remove('is-loading', 'is-normal', 'is-warning');

//     if (label.toLowerCase() === 'normal') {
//       box.classList.add('is-normal');
//     } else if (label.toLowerCase().includes('condong')) {
//       box.classList.add('is-warning');
//     }
//   } catch (err) {
//     console.warn('ML condong gagal:', err);

//     if (seq !== _postureMLSeq) return;

//     box.classList.remove('is-normal', 'is-warning');
//     box.classList.add('is-loading');
//     resultEl.textContent = 'Belum terbaca';
//   }
// }

// ============================================================
// BALANCE ANALYSIS
// ============================================================

async function updatePostureMLSimple(data) {
  const seq = ++_postureMLSeq;
  const box = document.getElementById('posture-result-box');
  const resultEl = document.getElementById('ml-posture-result');

  if (!box || !resultEl) return;

  if (typeof predictPostureML !== 'function') {
    _setPostureBoxState(box, resultEl, 'Model belum siap', 'loading');
    return;
  }

  _setPostureBoxState(box, resultEl, 'Mendeteksi...', 'loading');

  try {
    const result = await predictPostureML(data);
    if (seq !== _postureMLSeq) return;

    const label = result && result.label ? result.label : 'Belum terdeteksi';

    localStorage.setItem('fps_currentPostureML', result.rawLabel || '');
    localStorage.setItem('fps_currentPostureMLConfidence', (result.confidence || 0).toFixed(4));

    let state = 'default';
    if (label.toLowerCase() === 'normal') state = 'normal';
    else if (label.toLowerCase().includes('condong')) state = 'warning';

    _setPostureBoxState(box, resultEl, label, state);

  } catch (err) {
    console.warn('ML postur gagal:', err);
    if (seq !== _postureMLSeq) return;
    _setPostureBoxState(box, resultEl, 'Belum terbaca', 'loading');
  }
}

// function _setPostureBoxState(box, resultEl, label, state) {
//   box.classList.remove('is-normal', 'is-warning', 'is-loading');
//   if (state === 'normal')  box.classList.add('is-normal');
//   if (state === 'warning') box.classList.add('is-warning');
//   if (state === 'loading') box.classList.add('is-loading');
//   resultEl.textContent = label;
// }

function getPostureNote(label, state) {
  const text = String(label || '').toLowerCase();

  if (state === 'loading') {
    return 'Sistem sedang membaca pola tekanan kaki untuk mendeteksi kecenderungan postur.';
  }

  if (text.includes('normal')) {
    return 'Pola tekanan menunjukkan distribusi tumpuan yang relatif seimbang.';
  }

  if (text.includes('depan')) {
    return 'Pola tekanan menunjukkan kecenderungan tumpuan tubuh ke arah depan.';
  }

  if (text.includes('belakang')) {
    return 'Pola tekanan menunjukkan kecenderungan tumpuan tubuh ke arah belakang.';
  }

  if (text.includes('kiri')) {
    return 'Pola tekanan menunjukkan kecenderungan tumpuan tubuh ke sisi kiri.';
  }

  if (text.includes('kanan')) {
    return 'Pola tekanan menunjukkan kecenderungan tumpuan tubuh ke sisi kanan.';
  }

  return 'Data postur belum cukup jelas. Pembacaan dapat diulang untuk melihat pola tekanan dengan lebih baik.';
}

function _setPostureBoxState(box, resultEl, label, state) {
  box.classList.remove('is-normal', 'is-warning', 'is-loading');

  if (state === 'normal') {
    box.classList.add('is-normal');
  } else if (state === 'warning') {
    box.classList.add('is-warning');
  } else if (state === 'loading') {
    box.classList.add('is-loading');
  }

  const POSTURE_EMOJI = {
    'Normal': '🟢',
    'Condong Depan': '⬆️',
    'Condong Belakang': '⬇️',
    'Condong Kiri': '⬅️',
    'Condong Kanan': '➡️',
    'Mendeteksi...': '⏳',
    'Model belum siap': '⚠️',
    'Belum terdeteksi': '❓',
    'Belum terbaca': '❓'
  };

  const emoji = POSTURE_EMOJI[label] || '';
  resultEl.textContent = `${emoji} ${label}`.trim();

  const noteEl = document.getElementById('posture-note');
  if (noteEl) {
    noteEl.textContent = getPostureNote(label, state);
  }
}

const interpretations = {
  "Flat Foot": {
    "Normal": "Lengkungan kaki rata, namun tumpuan stabil di tengah.",
    "Overpronation": "Lengkungan kaki rata dan tumpuan miring ke dalam.",
    "Supinasi": "Kaki rata, namun tumpuan beban cenderung ke sisi luar."
  },
  "High Arch": {
    "Normal": "Lengkungan tinggi, namun tumpuan stabil di tengah.",
    "Overpronation": "Lengkungan tinggi, namun tumpuan miring ke dalam.",
    "Supinasi": "Lengkungan tinggi dan tumpuan jatuh ke sisi luar."
  },
  "Normal": {
    "Normal": "Kaki ideal, struktur dan tumpuan sangat seimbang.",
    "Overpronation": "Bentuk normal, namun tumpuan cenderung miring ke dalam.",
    "Supinasi": "Bentuk normal, namun tumpuan cenderung miring ke luar."
  }
};

// ============================================================
// BALANCE UI UPDATE
// ============================================================
function updateBalanceUI(data) {
  if (!data) return;

  const score = data.balanceScore || 0;
  const cls = data.classification || { label: 'Unknown', cssClass: 'warning' };

  // 1. Update Gauge Skor
  const scoreEl = document.getElementById('b-score');
  if (scoreEl) scoreEl.textContent = score.toFixed(0);

  const arc = document.getElementById('gauge-arc');
  if (arc) {
    const offset = GAUGE_CIRCUMFERENCE * (1 - score / 100);

    arc.style.strokeDashoffset = offset;
    arc.style.stroke = score >= 90
      ? 'var(--green)'
      : score >= 80
        ? 'var(--yellow)'
        : 'var(--red)';
  }

  // 2. Status Badge
  const badge = document.getElementById('b-status-badge');
  if (badge) {
    badge.textContent = cls.label;
    badge.className = `badge badge-${cls.cssClass === 'normal' ? 'normal' : cls.cssClass === 'warning' ? 'warning' : 'abnormal'}`;
  }

  // 3. L/R Bars (dari leftPercent/rightPercent)
  const leftPctEl  = document.getElementById('b-left-pct');
  const rightPctEl = document.getElementById('b-right-pct');
  const barLEl     = document.getElementById('lr-bar-l');
  const barREl     = document.getElementById('lr-bar-r');

  if (leftPctEl)  leftPctEl.textContent  = `${data.leftPercent}%`;
  if (rightPctEl) rightPctEl.textContent = `${data.rightPercent}%`;
  if (barLEl)     barLEl.style.width     = `${data.leftPercent}%`;
  if (barREl)     barREl.style.width     = `${data.rightPercent}%`;

  // 4. CoP Distance
  const copDist   = data.cop_distance != null ? data.cop_distance
                  : (data.cop && data.cop.distance != null ? data.cop.distance : null);
  const distValEl = document.getElementById('cop-distance-val');
  const distStsEl = document.getElementById('cop-distance-status');
  if (copDist != null && distValEl) {
    const stable      = copDist < 2.5;
    const medium      = copDist <= 4.5;
    const statusText  = stable ? 'STABIL' : medium ? 'SEDANG' : 'TIDAK STABIL';
    const statusColor = stable ? 'var(--green)' : medium ? 'var(--yellow)' : 'var(--red)';
    distValEl.textContent = `${Number(copDist).toFixed(2)} cm`;
    distValEl.style.color = statusColor;
    if (distStsEl) {
      distStsEl.textContent = statusText;
      distStsEl.style.color = statusColor;
    }
  }

  // 5. Depan/Belakang dari cop_y
  const copY      = data.cop_y != null ? data.cop_y
                  : (data.cop && data.cop.y != null ? data.cop.y : null);
  const COP_Y_MAX = 8;
  const COP_Y_MIN = -10;
  if (copY != null) {
    const range    = COP_Y_MAX - COP_Y_MIN;
    const frontPct = Math.min(100, Math.max(0, Math.round(((copY - COP_Y_MIN) / range) * 100)));
    const backPct  = 100 - frontPct;

    const frontEl  = document.getElementById('b-front-pct');
    const backEl   = document.getElementById('b-back-pct');
    const barFront = document.getElementById('fb-bar-front');
    const barBack  = document.getElementById('fb-bar-back');

    if (frontEl)  frontEl.textContent  = `${frontPct}%`;
    if (backEl)   backEl.textContent   = `${backPct}%`;
    if (barFront) barFront.style.width = `${frontPct}%`;
    if (barBack)  barBack.style.width  = `${backPct}%`;
  }

  // 4. Jalankan Diagnosis Kombinasi (Sesuai Bab 2.6 & 2.7)
  if (data.archType && data.pronation) {
    processDiagnosis('l', data.archType.labelL, data.pronation.labelL);
    processDiagnosis('r', data.archType.labelR, data.pronation.labelR);
  }

  updateCoP(data);
}

function processDiagnosis(side, arch, pron) {
  // Konversi label internal ke key mapping
  const archKey = arch.includes("Flat") ? "Flat Foot" : arch.includes("High") ? "High Arch" : "Normal";
  const pronKey = pron.includes("Normal") ? "Normal" : pron.includes("Over") ? "Overpronation" : "Supinasi";

  const labelEl = document.getElementById(`final-label-${side}`);
  const archVal = document.getElementById(`arch-val-${side}`);
  const pronVal = document.getElementById(`pron-val-${side}`);
  const expEl = document.getElementById(`exp-${side}`);
  const svgEl = document.getElementById(`svg-${side}`);

  if (!labelEl || !archVal || !pronVal || !expEl || !svgEl) return;

  // Set Teks
  archVal.textContent = arch;
  pronVal.textContent = pron;
  labelEl.textContent = (archKey === "Normal" && pronKey === "Normal")
    ? "Kaki Normal"
    : (archKey !== "Normal" ? arch : pron);

  // Set Penjelasan Bahasa Awam
  expEl.textContent = interpretations[archKey][pronKey];

  // Set SVG (Hanya warna & kemiringan sederhana, tanpa emoji)
  svgEl.innerHTML = getCleanFootSVG(side, archKey, pronKey);
}


function getCleanFootSVG(side, archKey, pronKey) {
    // Tentukan warna berdasarkan kondisi arch
    const color = archKey === "Normal" ? "#22D48F" : archKey === "Flat Foot" ? "#E7302A" : "#2266FF";
    
    // Tentukan rotasi/kemiringan berdasarkan pronasi
    let tilt = 0;
    if (pronKey === "Overpronation") tilt = (side === 'l' ? 15 : -15);
    else if (pronKey === "Supinasi") tilt = (side === 'l' ? -15 : 15);

    return `
    <svg width="60" height="60" viewBox="0 0 80 100">
        <g transform="rotate(${tilt}, 40, 80)">
            <path d="M30 20 Q40 10 50 20 L55 80 Q40 90 25 80 Z" 
                  fill="${color}" fill-opacity="0.1" 
                  stroke="${color}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M35 80 L45 80" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
        </g>
    </svg>`;
}

// ============================================================
// HISTORY MINI CHART
// ============================================================
function renderHistoryBars() {
  const snaps = _firebaseHistory; // 🔥 dari Firebase
  const container = document.getElementById('history-bars');

  if (!container) return;

  if (!snaps || snaps.length === 0) {
    container.innerHTML = `<span style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono)">Belum ada snapshot.</span>`;
    return;
  }

  // ambil 7 terbaru
  const recent = snaps.slice(-7); // lebih aman dari Firebase (urutan lama → baru)

  const maxScore = 100;

  container.innerHTML = recent.map(snap => {
    const score = Number(snap.balance_score) || 0;

    const pct = Math.round((score / maxScore) * 100);
    const color = score >= 90
      ? 'var(--green)'
      : score >= 80
        ? 'var(--yellow)'
        : 'var(--red)';

    return `
      <div class="h-bar-wrap" title="${snap.snapshot_time}: ${score}">
        <div class="h-bar" style="height:${pct}%; background:${color};"></div>
        <span class="h-bar-val">${score.toFixed(0)}</span>
      </div>
    `;
  }).join('');
}

// Koordinat sensor (cm) - Sesuai titik nx/ny di monitoring.js kamu
// const SENSOR_COORDS = {
//   L0: { x: -6.5, y: 7.5  }, // Hallux
//   L1: { x: -8.5, y: 0.5  }, // Med.FF
//   L2: { x: -12.5, y: 0.0  }, // Lat.FF
//   L3: { x: -10.0, y: -9.5 }, // Heel
//   R0: { x: 6.5,  y: 7.5  }, // Hallux
//   R1: { x: 8.5,  y: 0.5  }, // Med.FF
//   R2: { x: 12.5, y: 0.0  }, // Lat.FF
//   R3: { x: 10.0, y: -9.5 }  // Heel
// };

const SENSOR_COORDS = {
  // Kaki KIRI — sensor ada di sisi KIRI tubuh → x negatif
  // Tapi dari sudut pandang orang berdiri:
  //   Hallux kiri ada di sisi dalam (lebih ke tengah) → x lebih mendekati 0
  //   Lat.FF kiri ada di sisi luar → x lebih negatif
  L0: { x:  -4.0, y:  8.0 },  // Hallux kiri
  L1: { x:  -6.0, y:  2.0 },  // Med.FF kiri
  L2: { x:  -9.0, y:  1.5 },  // Lat.FF kiri
  L3: { x:  -7.0, y: -8.0 },  // Heel kiri

  // Kaki KANAN — sensor ada di sisi KANAN tubuh → x positif
  R0: { x:   4.0, y:  8.0 },  // Hallux kanan
  R1: { x:   6.0, y:  2.0 },  // Med.FF kanan
  R2: { x:   9.0, y:  1.5 },  // Lat.FF kanan
  R3: { x:   7.0, y: -8.0 },  // Heel kanan
};

function updateCoP(data) {
    const fL = data.left_fsr_newton || [0,0,0,0];
    const fR = data.right_fsr_newton || [0,0,0,0];
    const totalForce = data.totalForce || 1;

    // 1. Hitung Koordinat CoP (Rata-rata tertimbang)
    let sumX = 0, sumY = 0;
    for(let i=0; i<4; i++) {
        sumX += (fL[i] * SENSOR_COORDS[`L${i}`].x) + (fR[i] * SENSOR_COORDS[`R${i}`].x);
        sumY += (fL[i] * SENSOR_COORDS[`L${i}`].y) + (fR[i] * SENSOR_COORDS[`R${i}`].y);
    }

    const copX = sumX / totalForce;
    const copY = sumY / totalForce;

    // 2. Referensi Elemen UI
    const dot = document.getElementById('cop-dot');
    const coordLabel = document.getElementById('cop-coordinate');
    const feedback = document.getElementById('cop-feedback-text');
    const badge = document.getElementById('b-status-badge');

    // 3. Hitung Jarak Goyangan (Sway Distance)
    const swayDistance = Math.sqrt(copX * copX + copY * copY);

    const MAX_SWAY   = 15;
const stabilitas = Math.max(0, Math.round((1 - swayDistance / MAX_SWAY) * 100));
const stabColor  = stabilitas >= 85 ? 'var(--green)' : stabilitas >= 70 ? 'var(--yellow)' : 'var(--red)';

const stabValEl = document.getElementById('stability-val');
const stabBarEl = document.getElementById('stability-bar');
if (stabValEl) { stabValEl.textContent = `${stabilitas}%`; stabValEl.style.color = stabColor; }
if (stabBarEl) { stabBarEl.style.width = `${stabilitas}%`; stabBarEl.style.background = stabColor; }

    // ── Update CoP Distance & Distribusi Depan/Belakang ──────────
const distValEl = document.getElementById('cop-distance-val');
const distStsEl = document.getElementById('cop-distance-status');
if (distValEl) {
  const stable      = swayDistance < 2.5;
  const medium      = swayDistance <= 4.5;
  const statusText  = stable ? 'STABIL' : medium ? 'SEDANG' : 'TIDAK STABIL';
  const statusColor = stable ? 'var(--green)' : medium ? 'var(--yellow)' : 'var(--red)';
  distValEl.textContent = `${swayDistance.toFixed(2)} cm`;
  distValEl.style.color = statusColor;
  if (distStsEl) { distStsEl.textContent = statusText; distStsEl.style.color = statusColor; }
}

const COP_Y_MAX = 8;
const COP_Y_MIN = -10;
const range     = COP_Y_MAX - COP_Y_MIN;
const frontPct  = Math.min(100, Math.max(0, Math.round(((copY - COP_Y_MIN) / range) * 100)));
const backPct   = 100 - frontPct;
const frontEl   = document.getElementById('b-front-pct');
const backEl    = document.getElementById('b-back-pct');
const barFront  = document.getElementById('fb-bar-front');
const barBack   = document.getElementById('fb-bar-back');
if (frontEl)  frontEl.textContent  = `${frontPct}%`;
if (backEl)   backEl.textContent   = `${backPct}%`;
if (barFront) barFront.style.width = `${frontPct}%`;
if (barBack)  barBack.style.width  = `${backPct}%`;

    // 4. Update Status & Feedback (Logika Tunggal)
    if (swayDistance < 2.5) {
        badge.textContent = "STABIL";
        badge.className = "badge badge-normal";
        feedback.textContent = "Keseimbangan: Sangat Baik";
        feedback.style.color = "var(--green)";
    } 
    else if (swayDistance <= 4.5) {
        badge.textContent = "SEDANG";
        badge.className = "badge badge-warning";
        
        let dirX = copX > 1.5 ? "Kanan" : (copX < -1.5 ? "Kiri" : "");
        let dirY = copY > 2 ? "Depan" : (copY < -2 ? "Belakang" : "");
        feedback.textContent = `Cukup Stabil (Condong ke ${dirY} ${dirX})`;
        feedback.style.color = "var(--yellow)";
    } 
    else {
        badge.textContent = "ABNORMAL";
        badge.className = "badge badge-abnormal";
        
        let dirX = copX > 2 ? "Kanan" : (copX < -2 ? "Kiri" : "");
        let dirY = copY > 3 ? "Depan" : (copY < -3 ? "Belakang" : "");
        feedback.textContent = `Tidak Stabil (Miring ke ${dirY} ${dirX})`;
        feedback.style.color = "var(--red)";
    }

    // 5. Update Posisi Titik Visual
    if (dot) {
        // Skala visual: 100px mewakili radius +/- 15cm
//         const radarEl  = document.querySelector('.cop-radar');
// const radarSize = radarEl ? radarEl.offsetWidth : 200;
// const center   = radarSize / 2;
// const scale    = center / 15;
// const posX     = center + (copX * scale);
// const posY     = center - (copY * scale);
//         dot.style.left = `${posX}px`;
//         dot.style.top = `${posY}px`;
const MAX_RANGE = 15; // cm, radius maksimum visualisasi
const pctX = 50 + (copX / MAX_RANGE * 50);
const pctY = 50 - (copY / MAX_RANGE * 50);
dot.style.left = `${Math.max(0, Math.min(100, pctX))}%`;
dot.style.top  = `${Math.max(0, Math.min(100, pctY))}%`;
    }

    // 6. Update Label Koordinat Teknis (Kecil)
    if (coordLabel) {
        coordLabel.textContent = `X: ${copX.toFixed(1)}, Y: ${copY.toFixed(1)}`;
    }
}