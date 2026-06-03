# Foot Plantar Monitoring (FPS)

Sistem monitoring tekanan telapak kaki berbasis IoT dan AI.  
Dibangun dengan **HTML, CSS, JavaScript murni** — tanpa framework.

---

## Struktur Folder

```
fps-project/
│
├── index.html                    ← Entry point (redirect ke login)
│
├── pages/
│   ├── login.html                ← Halaman masuk akun
│   ├── register-1.html           ← Daftar: Langkah 1 — Data Akun
│   ├── register-2.html           ← Daftar: Langkah 2 — Data Diri
│   ├── register-3.html           ← Daftar: Langkah 3 — Konfirmasi & Simpan
│   ├── dashboard.html            ← Halaman utama: heatmap + postur ML + CoP + analisis kaki
│   └── laporan.html              ← Halaman cetak laporan PDF riwayat snapshot
│
├── css/
│   ├── variables.css             ← Design tokens (warna, spacing, radius, font)
│   ├── base.css                  ← Reset global + komponen reusable (sidebar, modal, toast)
│   ├── auth.css                  ← Login & register
│   └── dashboard.css             ← Tampilan dashboard utama (heatmap, postur, CoP, analisis)
│
├── js/
│   ├── calculations.js           ← SEMUA rumus: Newton, ASI, CoP, pronasi, arch, klasifikasi
│   ├── firebase.js               ← Firebase Auth + Realtime Database + snapshot
│   ├── components.js             ← Sidebar, Topbar, Modal, Toast (reusable semua halaman)
│   ├── dashboard.js              ← Logic heatmap, analisis kaki, CoP UI, postur rule-based
│   ├── posture_ml.js             ← Load model TF.js + prediksi postur AI
│   └── laporan.js                ← Generate laporan PDF dari riwayat snapshot
│
├── models/
│   └── tfjs_model/
│       ├── model.json            ← Arsitektur model AI (TensorFlow.js)
│       └── group1-shard1of1.bin  ← Bobot model yang sudah dilatih
│
└── assets/
    └── images/                   ← Ikon postur dan logo
```

---

## Alur Data

```
ESP32 (sensor fisik)
  └─ kirim left_fsr_digital + right_fsr_digital
       ↓ ke Firebase sensor_data/

Website (browser)
  └─ startFirebaseListen()       → dengar perubahan realtime
       ↓ processRawDigital()     → digital → Newton + persen
       ↓ computeAll()            → ASI, CoP, pronasi, arch, klasifikasi
       ↓ updateDashboardUI()     → heatmap, radar CoP, analisis kaki
       ↓ predictPostureML()      → model AI → label postur
       ↓
     [Rekam Snapshot]
       ↓ firebaseRecordSnapshot() → simpan ke users/{uid}/history/
```

> **Penting:** ESP32 hanya kirim 8 angka ADC mentah. Semua kalkulasi dikerjakan di JavaScript di browser.

---

## Formula & Kalkulasi

Semua rumus ada di `js/calculations.js`.

### Konversi Sensor

| Tahap | Rumus |
|-------|-------|
| Digital → Newton | `F = (digital / 4095) × 100` · F_MAX = 100N (FSR402, dapat dikalibrasi) |
| Newton → Persen | `pct = (F_sensor / total_F_kaki) × 100` |
| Digital → Volt | `V = (digital / 4095) × 3.3` |

Data dihaluskan dengan **EMA Filter** (`α = 0.2`) sebelum masuk kalkulasi.

### Metrik Utama

| Metrik | Rumus | Referensi |
|--------|-------|-----------|
| Berat Badan | `W = F_total / 9.81` | Sazonov et al. (2020) |
| ASI | `|F_kiri − F_kanan| / (0.5 × (F_kiri + F_kanan)) × 100%` | Robinson et al. (1987) |
| Balance Score | `100 − ASI` | Błażkiewicz et al. (2014) |
| Heel Load | `(Heel_kiri + Heel_kanan) / F_total × 100%` | Putti et al. (2007) |
| CoP X/Y | `Σ(F_i × pos_i) / F_total` | Weighted average posisi sensor |

### Klasifikasi Keseimbangan (Wang et al., 2023)

| Status | Balance Score | ASI | Heel Load |
|--------|--------------|-----|-----------|
| ✅ Normal | ≥ 90 | ≤ 10% | 50–65% |
| ⚠️ Sedang | 80–89 | 11–20% | 40–49% atau 66–75% |
| 🚨 Abnormal | < 80 | > 20% | < 40% atau > 75% |

### Stabilitas CoP

| Status | Jarak Sway | Keterangan |
|--------|-----------|------------|
| STABIL | < 2.5 cm | Keseimbangan sangat baik |
| SEDANG | 2.5–4.5 cm | Cukup stabil, ada condong |
| ABNORMAL | > 4.5 cm | Tidak stabil |

### Pronasi (per kaki)

```
Ratio = (Med.FF − Lat.FF) / (Med.FF + Lat.FF) × 100
```

| Ratio | Klasifikasi |
|-------|-------------|
| > +15 | Overpronation |
| −15 s/d +15 | Normal |
| < −15 | Supination |

### Arch Type (per kaki)

| Kondisi | Arch Type |
|---------|-----------|
| Heel > 65% & Forefoot < 35% | High Arch |
| Forefoot > 65% & Heel < 35% | Flat Foot |
| Seimbang | Normal |

---

## Model AI (Postur)

Model MLP dilatih dengan TensorFlow/Keras, dikonversi ke TF.js, berjalan langsung di browser.

### Input: 8 Fitur Digital

| Index | Fitur | Posisi |
|-------|-------|--------|
| 0 | HL | Hallux kiri |
| 1 | M1L | Med. Forefoot kiri |
| 2 | M3L | Lat. Forefoot kiri |
| 3 | HeelL | Heel kiri |
| 4 | HR | Hallux kanan |
| 5 | M1R | Med. Forefoot kanan |
| 6 | M3R | Lat. Forefoot kanan |
| 7 | HeelR | Heel kanan |

### Output: 5 Kelas Postur

| Label Internal | Tampilan |
|---------------|---------|
| `normal` | Normal |
| `condong_depan` | Condong Depan |
| `condong_belakang` | Condong Belakang |
| `condong_kiri` | Condong Kiri |
| `condong_kanan` | Condong Kanan |

Normalisasi fitur menggunakan Min-Max scaling dengan nilai min/max dari dataset training.

---

## Struktur Firebase

```
sensor_data/                        ← ESP32 tulis ke sini (hanya digital)
  ├── left_fsr_digital:   [512, 620, 450, 580]
  ├── right_fsr_digital:  [530, 610, 480, 590]
  └── timestamp:          1646776543210

users/
  └── {uid}/
      ├── profile/
      │   └── { name, email, phone, dob, gender, height, weight, blood_type, address }
      └── history/
          └── {auto_id}/
              ├── left_fsr_newton:        [...]
              ├── right_fsr_newton:       [...]
              ├── left_fsr_percent:       [...]
              ├── right_fsr_percent:      [...]
              ├── balance_score:          92.0
              ├── asi:                    8.0
              ├── heel_load:              57.3
              ├── left_percent:           48.2
              ├── right_percent:          51.8
              ├── classification:         "NORMAL"
              ├── pronation:              { ratioL, ratioR, labelL, labelR }
              ├── archType:               { labelL, labelR, heelRatioL, heelRatioR, ffRatioL, ffRatioR }
              ├── cop:                    { x, y, swayDistance, status }
              ├── posture:                "Berdiri"
              ├── posture_ml:             "normal"
              ├── posture_ml_confidence:  0.9621
              └── snapshot_time:          "25/05/2026 14:32"
```

---

## Sensor Mapping

| Index | Nama | Posisi |
|-------|------|--------|
| 0 | Hallux | Ujung ibu jari |
| 1 | Med. Forefoot | Depan sisi dalam |
| 2 | Lat. Forefoot | Depan sisi luar |
| 3 | Heel | Tumit |

Masing-masing untuk kaki kiri (`L`) dan kanan (`R`). Total: **8 sensor FSR402**.

---

## Cara Menjalankan

### Kebutuhan
- Browser modern (Chrome / Edge / Firefox)
- Koneksi internet (Firebase + Google Fonts)
- VS Code + Live Server (rekomendasi)

### Langkah

1. Buka folder proyek di VS Code
2. Klik kanan `index.html` → **Open with Live Server**
3. Daftar akun atau login
4. Nyalakan ESP32 — data otomatis masuk

### Format Data ESP32

```json
{
  "left_fsr_digital":  [512, 620, 450, 580],
  "right_fsr_digital": [530, 610, 480, 590],
  "timestamp": 1234567890
}
```

---

## Design System

Semua design tokens di `css/variables.css`:

| Token | Nilai | Keterangan |
|-------|-------|------------|
| `--red` | `#E7302A` | Warna brand utama |
| `--bg-base` | `#0A0A0E` | Background gelap |
| `--font-mono` | JetBrains Mono | Font angka/label sensor |
| `--font-main` | Nunito | Font teks umum |

Sidebar dan topbar di-render oleh `components.js` — reusable di semua halaman dashboard.