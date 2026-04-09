/**
 * monitoring.js — Main sensor dashboard with canvas heatmap
 */
'use strict';

const SENSOR_NAMES = ['Hallux', 'Med. FF', 'Lat. FF', 'Heel'];
let currentPosture = 'Berdiri';
let currentData    = null;
const MAX_FORCE = 100;

// Sensor positions (normalized 0..1) for 110x200 canvas
const SENSORS_L = [
  { key: 0, nx: 0.50, ny: 0.13, rx: 0.32, ry: 0.14, label: 'Hallux' },
  { key: 1, nx: 0.67, ny: 0.43, rx: 0.28, ry: 0.13, label: 'Med.FF' },
  { key: 2, nx: 0.35, ny: 0.38, rx: 0.30, ry: 0.13, label: 'Lat.FF' },
  { key: 3, nx: 0.50, ny: 0.82, rx: 0.36, ry: 0.15, label: 'Heel'   },
];
const SENSORS_R = [
  { key: 0, nx: 0.50, ny: 0.13, rx: 0.32, ry: 0.14, label: 'Hallux' },
  { key: 1, nx: 0.33, ny: 0.43, rx: 0.28, ry: 0.13, label: 'Med.FF' },
  { key: 2, nx: 0.65, ny: 0.38, rx: 0.30, ry: 0.13, label: 'Lat.FF' },
  { key: 3, nx: 0.50, ny: 0.82, rx: 0.36, ry: 0.15, label: 'Heel'   },
];

// Toes
const TOES_L = [
    { cx:79, cy:14, rx:9,   ry:11  }, // Hallux
    { cx:64, cy:11, rx:7.5, ry:9.5 },
    { cx:50, cy:10, rx:6.5, ry:8.5 },
    { cx:37, cy:12, rx:5.5, ry:7.5 },
    { cx:24, cy:18, rx:4.5, ry:6.5 }, // Pinky
  ];
  // Kaki KANAN: mirror exact — cx = 110 - cx_kiri, cy/rx/ry sama
  const TOES_R = [
    { cx:31, cy:14, rx:9,   ry:11  }, // Hallux (110-79)
    { cx:46, cy:11, rx:7.5, ry:9.5 }, // (110-64)
    { cx:60, cy:10, rx:6.5, ry:8.5 }, // (110-50)
    { cx:73, cy:12, rx:5.5, ry:7.5 }, // (110-37)
    { cx:86, cy:18, rx:4.5, ry:6.5 }, // Pinky (110-24)
  ];

// ============================================================
// HEAT COLOR (matching fps-website-v5 exactly)
// ============================================================
// function heatColor(ratio) {
//   const r = Math.max(0, Math.min(1, ratio));
//   if (r <= 0.2) {
//     const t = r / 0.2;
//     return [Math.round(t*34), Math.round(180+t*32), Math.round(t*100+40)];
//   } else if (r <= 0.4) {
//     const t = (r-0.2)/0.2;
//     return [Math.round(34*(1-t)+34*t), Math.round(212*(1-t)+102*t), Math.round(140*(1-t)+255*t)];
//   } else if (r <= 0.6) {
//     const t = (r-0.4)/0.2;
//     return [Math.round(34*(1-t)+240*t), Math.round(102*(1-t)+230*t), Math.round(255*(1-t)+30*t)];
//   } else if (r <= 0.8) {
//     const t = (r-0.6)/0.2;
//     return [Math.round(240*(1-t)+245*t), Math.round(230*(1-t)+120*t), Math.round(30*(1-t)+20*t)];
//   } else {
//     const t = (r-0.8)/0.2;
//     return [Math.round(245*(1-t)+231*t), Math.round(120*(1-t)+48*t), Math.round(20*(1-t)+42*t)];
//   }
// }

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

// ============================================================
// DRAW FOOT HEATMAP CANVAS
// ============================================================
// function drawFootHeatmap(canvasId, sensors, values, maxVal, isLeft) {
//   const cv = document.getElementById(canvasId);
//   if (!cv) return;
//   const W = 110, H = 200;
//   cv.width = W; cv.height = H;
//   const ctx = cv.getContext('2d');
//   ctx.clearRect(0, 0, W, H);

//   // Build foot bezier path
//   const footPath = new Path2D();
//   const sc = (x, y) => [x * W / 108, y * H / 188];
//   if (isLeft) {
//     footPath.moveTo(...sc(38,168));
//     footPath.bezierCurveTo(...sc(20,163),...sc(15,148),...sc(15,133));
//     footPath.lineTo(...sc(15,78));
//     footPath.bezierCurveTo(...sc(15,58),...sc(20,38),...sc(30,23));
//     footPath.bezierCurveTo(...sc(37,12),...sc(48,6),...sc(55,6));
//     footPath.bezierCurveTo(...sc(62,6),...sc(72,12),...sc(75,23));
//     footPath.bezierCurveTo(...sc(80,33),...sc(80,48),...sc(78,63));
//     footPath.bezierCurveTo(...sc(76,78),...sc(72,86),...sc(70,98));
//     footPath.bezierCurveTo(...sc(68,113),...sc(72,126),...sc(78,138));
//     footPath.bezierCurveTo(...sc(84,150),...sc(86,160),...sc(80,168));
//     footPath.bezierCurveTo(...sc(72,175),...sc(55,173),...sc(38,168));
//   } else {
//     footPath.moveTo(...sc(70,168));
//     footPath.bezierCurveTo(...sc(88,163),...sc(93,148),...sc(93,133));
//     footPath.lineTo(...sc(93,78));
//     footPath.bezierCurveTo(...sc(93,58),...sc(88,38),...sc(78,23));
//     footPath.bezierCurveTo(...sc(71,12),...sc(60,6),...sc(53,6));
//     footPath.bezierCurveTo(...sc(46,6),...sc(36,12),...sc(33,23));
//     footPath.bezierCurveTo(...sc(28,33),...sc(28,48),...sc(30,63));
//     footPath.bezierCurveTo(...sc(32,78),...sc(36,86),...sc(38,98));
//     footPath.bezierCurveTo(...sc(40,113),...sc(36,126),...sc(30,138));
//     footPath.bezierCurveTo(...sc(24,150),...sc(22,160),...sc(28,168));
//     footPath.bezierCurveTo(...sc(36,175),...sc(55,173),...sc(70,168));
//   }
//   footPath.closePath();

//   // IDW pixel heatmap
//   const pts = sensors.map(s => ({
//     cx: s.nx * W, cy: s.ny * H,
//     sx: s.rx * W * 1.6, sy: s.ry * H * 1.6,
//     ratio: Math.min(1, (values[s.key] || 0) / maxVal)
//   }));

//   const imgData = ctx.createImageData(W, H);
//   const d = imgData.data;
//   for (let py = 0; py < H; py++) {
//     for (let px = 0; px < W; px++) {
//       let wSum = 0, rSum = 0;
//       for (let k = 0; k < pts.length; k++) {
//         const p = pts[k];
//         const ex = (px - p.cx) / p.sx, ey = (py - p.cy) / p.sy;
//         const w = 1 / (ex*ex + ey*ey + 0.001);
//         wSum += w; rSum += w * p.ratio;
//       }
//       const [cr, cg, cb] = heatColor(rSum / wSum);
//       const i = (py * W + px) * 4;
//       d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=230;
//     }
//   }

//   const off = document.createElement('canvas'); off.width=W; off.height=H;
//   off.getContext('2d').putImageData(imgData, 0, 0);

//   ctx.fillStyle = '#0d0d14'; ctx.fillRect(0,0,W,H);
//   ctx.save(); ctx.clip(footPath);
//   ctx.drawImage(off, 0, 0);
//   ctx.restore();

//   // Foot outline
//   ctx.save();
//   ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
//   ctx.stroke(footPath);

//   // Toes
//   const toes = isLeft ? [
//     {cx:42,cy:10,rx:7,ry:5},{cx:55,cy:6,rx:7,ry:5},{cx:67,cy:9,rx:6,ry:4.5},
//     {cx:75,cy:15,rx:5,ry:4},{cx:80,cy:23,rx:4.5,ry:3.5}
//   ] : [
//     {cx:66,cy:10,rx:7,ry:5},{cx:53,cy:6,rx:7,ry:5},{cx:41,cy:9,rx:6,ry:4.5},
//     {cx:33,cy:15,rx:5,ry:4},{cx:28,cy:23,rx:4.5,ry:3.5}
//   ];
//   const halluxRatio = Math.min(1, (values[0]||0) / maxVal);
//   toes.forEach((t, i) => {
//     const tr = i === 0 ? halluxRatio * 0.85 : halluxRatio * 0.25;
//     ctx.beginPath();
//     ctx.ellipse(t.cx*W/108, t.cy*H/188, t.rx*W/108, t.ry*H/188, 0, 0, Math.PI*2);
//     const [cr,cg,cb] = heatColor(tr);
//     ctx.fillStyle = i===0 ? `rgba(${cr},${cg},${cb},0.9)` : 'rgba(18,18,28,0.92)';
//     ctx.fill();
//     ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.stroke();
//   });

//   // Sensor dots + value labels
//   sensors.forEach(s => {
//     const val = values[s.key] || 0;
//     const ratio = Math.min(1, val / maxVal);
//     const cx = s.nx * W, cy = s.ny * H;
//     const [cr,cg,cb] = heatColor(ratio);
//     // glow ring
//     ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2);
//     ctx.fillStyle = `rgba(${cr},${cg},${cb},0.22)`; ctx.fill();
//     // dot
//     ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI*2);
//     ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.fill();
//     ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1.2; ctx.stroke();
//     // value text
//     ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=4;
//     ctx.fillStyle='rgba(255,255,255,0.95)';
//     ctx.font='bold 7.5px JetBrains Mono,monospace';
//     ctx.textAlign='center'; ctx.textBaseline='middle';
//     ctx.fillText(Math.round(val), cx, cy-11);
//     ctx.fillStyle='rgba(200,200,220,0.72)';
//     ctx.font='6.5px JetBrains Mono,monospace';
//     ctx.fillText(s.label, cx, cy+15);
//     ctx.shadowBlur=0;
//   });
//   ctx.restore();
// }

function drawFootHeatmap(canvasId, sensors, toes, values, maxVal, isLeft) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const W = 110, H = 200;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // 1. Koordinat Path Kaki (Anatomi Asimetris)
  const footPath = new Path2D();
  const sc = (x, y) => [x * W / 100, y * H / 200];

  if (isLeft) {
    // Kaki KIRI: Sisi dalam (Jempol & Arch) ada di KANAN canvas
    footPath.moveTo(...sc(45, 190)); // Tumit bawah (Ramping)
    footPath.bezierCurveTo(...sc(25, 185), ...sc(20, 150), ...sc(25, 130)); // Tumit ke sisi luar
    footPath.lineTo(...sc(18, 70)); // Sisi luar
    footPath.bezierCurveTo(...sc(15, 25), ...sc(40, 12), ...sc(60, 12)); // Forefoot lebar
    footPath.bezierCurveTo(...sc(85, 12), ...sc(88, 45), ...sc(82, 70)); // Jempol (Sisi dalam)
    footPath.bezierCurveTo(...sc(78, 100), ...sc(62, 130), ...sc(65, 160)); // LEKUKAN ARCH (Dalam)
    footPath.bezierCurveTo(...sc(70, 188), ...sc(60, 190), ...sc(45, 190)); // Kembali ke tumit
  } else {
    // Kaki KANAN: Sisi dalam (Jempol & Arch) ada di KIRI canvas
    footPath.moveTo(...sc(55, 190)); 
    footPath.bezierCurveTo(...sc(75, 185), ...sc(80, 150), ...sc(75, 130)); 
    footPath.lineTo(...sc(82, 70)); 
    footPath.bezierCurveTo(...sc(85, 25), ...sc(60, 12), ...sc(40, 12)); 
    footPath.bezierCurveTo(...sc(15, 12), ...sc(12, 45), ...sc(18, 70)); 
    footPath.bezierCurveTo(...sc(22, 100), ...sc(38, 130), ...sc(35, 160)); 
    footPath.bezierCurveTo(...sc(30, 188), ...sc(40, 190), ...sc(55, 190)); 
  }
  footPath.closePath();

  // 2. IDW Pixel Heatmap (Logika Warna)
  const pts = sensors.map(s => ({
    cx: s.nx * W, cy: s.ny * H,
    sx: s.rx * W * 1.6, sy: s.ry * H * 1.6,
    ratio: Math.min(1, (values[s.key] || 0) / maxVal)
  }));

  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let wSum = 0, rSum = 0;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k];
        const ex = (px - p.cx) / p.sx, ey = (py - p.cy) / p.sy;
        const w = 1 / (ex*ex + ey*ey + 0.001);
        wSum += w; rSum += w * p.ratio;
      }
      const [cr, cg, cb] = heatColor(rSum / wSum);
      const i = (py * W + px) * 4;
      d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=210; // Opacity sedikit transparan
    }
  }

  const off = document.createElement('canvas'); off.width=W; off.height=H;
  off.getContext('2d').putImageData(imgData, 0, 0);

  ctx.fillStyle = '#0d0d14'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.clip(footPath);
  ctx.drawImage(off, 0, 0);
  ctx.restore();

  // 3. Garis Luar (Outline)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.2;
  ctx.stroke(footPath);

  // 4. Jari-jari (Toes) - Mengikuti Anatomi
  // const toes = isLeft ? [
  //   {cx:76, cy:26, rx:9, ry:11}, // Jempol (Besar)
  //   {cx:60, cy:22, rx:6, ry:8},
  //   {cx:47, cy:24, rx:5, ry:7},
  //   {cx:36, cy:30, rx:4.5, ry:6},
  //   {cx:27, cy:38, rx:4, ry:5.5}  // Kelingking (Kecil)
  // ] : [
  //   {cx:24, cy:26, rx:9, ry:11}, // Jempol (Besar)
  //   {cx:40, cy:22, rx:6, ry:8},
  //   {cx:53, cy:24, rx:5, ry:7},
  //   {cx:64, cy:30, rx:4.5, ry:6},
  //   {cx:73, cy:38, rx:4, ry:5.5}
  // ];

  const weights = [0.90, 0.88, 0.86, 0.84, 0.82];
  toes.forEach((t, i) => {
    const tr = Math.min(1, (values[0]||0) / maxVal) * weights[i];
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, 0, Math.PI*2);
    const [cr,cg,cb] = heatColor(tr);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.85)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 0.9; ctx.stroke();
  });
  

  // const halluxVal = values[0] || 0;
  // toes.forEach((t, i) => {
  //   const tr = i === 0 ? Math.min(1, halluxVal / maxVal) * 0.8 : 0.1; 
  //   ctx.beginPath();
  //   ctx.ellipse(t.cx*W/100, t.cy*H/200, t.rx*W/100, t.ry*H/200, 0, 0, Math.PI*2);
  //   const [cr,cg,cb] = heatColor(tr);
  //   ctx.fillStyle = i===0 ? `rgba(${cr},${cg},${cb},0.8)` : 'rgba(25,25,35,0.6)';
  //   ctx.fill();
  //   ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.stroke();
  // });

  // 5. Sensor Dots & Labels
  sensors.forEach(s => {
    const val = values[s.key] || 0;
    const ratio = Math.min(1, val / maxVal);
    const cx = s.nx * W, cy = s.ny * H;
    const [cr,cg,cb] = heatColor(ratio);
    
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.15)`; ctx.fill();
    
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.fill();
    ctx.strokeStyle='white'; ctx.lineWidth=1; ctx.stroke();
    ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=4;
    ctx.fillStyle='rgba(255,255,255,0.95)';
    ctx.font='bold 7.5px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(Math.round(val), cx, cy-11);
    ctx.fillStyle='rgba(200,200,220,0.72)';
    ctx.font='6.5px JetBrains Mono,monospace';
    ctx.fillText(s.label, cx, cy+15);
    ctx.shadowBlur=0;
  });
  ctx.restore();
}

function redrawHeatmaps() {
  if (!currentData) return;
  const maxVal =  Math.max(...currentData.left_fsr_newton, ...currentData.right_fsr_newton, MAX_FORCE);
  drawFootHeatmap('heatmap-L', SENSORS_L, TOES_L, currentData.left_fsr_newton,  maxVal, true);
  drawFootHeatmap('heatmap-R', SENSORS_R, TOES_R, currentData.right_fsr_newton, maxVal, false);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');

  // LANGSUNG gambar sidebar pakai data default (biar gak kosong)
  renderSidebar(sidebarEl, 'monitor');
  // 1. UI Statis (Langsung Muncul)
  renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');

  // 2. Cek Auth & Jalankan Logic (Tunggu Firebase)
  requireAuth((user) => {
    // Kode di dalam sini hanya jalan jika USER SUDAH LOGIN
    
    // Ambil data profil (ini akan memicu renderSidebar otomatis)
    loadPatientToSidebar(); 

    // Jalankan sistem sensor
    // generateMockHistory();
    // onDataUpdate((data) => {
    //   const filteredData = applyEMAFilter(data);
    //   currentData = computeAll(filteredData);
    //   updateUI(currentData);
    // });
    // startSimulation();

    startFirebaseListen(function(data) {
      const filteredData = applyEMAFilter(data);
      currentData = computeAll(filteredData);
      updateUI(currentData); // atau updateBalanceUI(data)
    });
  });
  // requireAuth();
  // renderTopbar(document.getElementById('topbar'), 'Foot Plantar <span>Sense</span>');
  // loadPatientToSidebar();
  // renderSidebar(document.getElementById('sidebar'), 'monitor');
  // generateMockHistory();

  // onDataUpdate((data) => {
  //   const filteredData = applyEMAFilter(data);
  //   currentData = computeAll(filteredData);
  //   updateUI(currentData);
  // });
  // startSimulation();
});

// ============================================================
// UI UPDATE
// ============================================================
function updateUI(data) {
  document.getElementById('total-force-label').textContent = `Total: ${data.totalForce} N`;
  document.getElementById('m-weight').textContent    = data.weight;
  document.getElementById('m-weight-sub').textContent = `dari ${data.totalForce} N`;

  // Balance = simetri percentage
  const sym = Math.round(100 - data.asi);
  document.getElementById('m-balance').textContent    = sym;
  document.getElementById('m-balance-sub').textContent = `ASI: ${data.asi.toFixed(1)}%`;

  // Color balance
  const balEl = document.getElementById('m-balance');
  balEl.style.color = sym >= 90 ? 'var(--green)' : sym >= 80 ? 'var(--yellow)' : 'var(--red)';

  renderSensorRows('left-sensor-rows',  data.left_fsr_newton, data.left_fsr_digital);
  renderSensorRows('right-sensor-rows', data.right_fsr_newton, data.right_fsr_digital);
  redrawHeatmaps();

  const postureResult = detectPosture(data);
  updatePostureUI(postureResult);
}

// ============================================================
// SENSOR BAR ROWS
// ============================================================
// function renderSensorRows(containerId, newtonArr, digitalArr) {
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   const maxForce = Math.max(...newtonArr, 1);
  

//   container.innerHTML = newtonArr.map((n, i) => {
//     const pct     = Math.round((n / maxForce) * 100);
//     const kpa     = Math.round(n * 0.82);
//     const voltage = ((digitalArr[i] / 4095) * 3.3).toFixed(2);
//     const [cr,cg,cb] = heatColor(pct / 100);
//     const barColor = `rgb(${cr},${cg},${cb})`;

    
//     return `
//       <div class="sensor-row">
//         <div class="sr-name">${SENSOR_NAMES[i]}</div>
//         <div class="sr-kpa">${kpa} <span class="sr-unit">kPa</span></div>
//         <div class="sr-bar-track"><div class="sr-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
//         <div class="sr-volt">${voltage}V</div>
//       </div>
//     `;
//   }).join('');
// }

function renderSensorRows(containerId, newtonArr, digitalArr) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // const maxVal = Math.max(...digitalArr, 1);
  // const maxVal = MAX_FORCE * 1.2 * (4095 / 50); // Skala digital berdasarkan max force + margin
  const maxVal = 4095; // Karena kita mau pakai digital value untuk bar, jadi max 4095 (12-bit ADC)
  container.innerHTML = digitalArr.map((d, i) => {
    const pct = Math.round((d / maxVal) * 100);
    const voltage = ((d / 4095) * 3.3).toFixed(2);
    const [cr,cg,cb] = heatColor(pct / 100);
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
// function selectPosture(label, btn) {
//   currentPosture = label;
//   document.getElementById('posture-badge').textContent = label;
//   document.querySelectorAll('.posture-btn').forEach(b => b.classList.remove('active'));
//   btn.classList.add('active');
// }

// ============================================================
// DETEKSI POSTUR — Rule-based dummy
// Nanti diganti dengan model TF.js
// ============================================================

// Ikon per postur (sesuai gambar yang ada)
const POSTURE_CONFIG = {
  'Berdiri':   { icon: '../assets/images/standup-icon.png', color: 'var(--green)'  },
  'Jongkok':   { icon: '../assets/images/jongkok-icon.png', color: 'var(--yellow)' },
  '1 Kaki':    { icon: '../assets/images/onefoot-icon.png', color: '#2266FF'       },
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
  const lN = data.left_fsr_newton  || [0,0,0,0];
  const rN = data.right_fsr_newton || [0,0,0,0];

  const totalForce = data.totalForce || 0;

  // Tidak ada tekanan — tidak bisa deteksi
  if (totalForce < 50) {
    return { label: 'Tidak Terdeteksi', confidence: null, source: 'rule-based' };
  }

  const lTotal     = lN.reduce((a,b) => a+b, 0);
  const rTotal     = rN.reduce((a,b) => a+b, 0);

  // Forefoot = hallux + medFF + latFF (index 0,1,2)
  const forefootL  = lN[0] + lN[1] + lN[2];
  const forefootR  = rN[0] + rN[1] + rN[2];
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
function updatePostureUI(result) {
  currentPosture = result.label;

  // Badge di header card
  const badge = document.getElementById('posture-badge');
  if (badge) {
    badge.textContent  = result.label;
    const cfg = POSTURE_CONFIG[result.label];
    badge.style.color      = cfg ? cfg.color : 'var(--text-secondary)';
    badge.style.background = cfg ? cfg.color + '15' : '';
    badge.style.border     = cfg ? `1px solid ${cfg.color}40` : '';
  }

  // Gambar ikon postur aktif
  const iconEl = document.getElementById('posture-icon');
  if (iconEl) {
    const cfg = POSTURE_CONFIG[result.label];
    iconEl.src     = cfg ? cfg.icon : '';
    iconEl.style.display = cfg ? 'block' : 'none';
  }

  // Label nama postur besar
  const labelEl = document.getElementById('posture-label');
  if (labelEl) {
    labelEl.textContent = result.label;
    const cfg = POSTURE_CONFIG[result.label];
    labelEl.style.color = cfg ? cfg.color : 'var(--text-primary)';
  }

  // Source tag — "Rule-based" atau "ML" nanti
  const sourceEl = document.getElementById('posture-source');
  if (sourceEl) {
    sourceEl.textContent = result.source === 'ml'
      ? `🤖 Model ML · ${(result.confidence * 100).toFixed(0)}%`
      : '⚙️ Rule-based · menunggu model ML';
    sourceEl.style.color = result.source === 'ml'
      ? 'var(--green)' : 'var(--text-dim)';
  }

  // Highlight panel yang sesuai
  document.querySelectorAll('.posture-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.posture === result.label);
  });
}
