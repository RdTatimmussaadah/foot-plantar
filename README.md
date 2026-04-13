# Foot Plantar Sense — IoT Monitoring Website

Website monitoring tekanan plantar kaki berbasis IoT dengan 8 sensor FSR402.
Dibangun dengan **Vanilla HTML, CSS, dan JavaScript** murni — tanpa framework.

---

## 📁 Struktur Folder

```
fps-project/
│
├── index.html                  ← Entry point (redirect ke login)
│
├── pages/
│   ├── login.html              ← Halaman masuk
│   ├── register-1.html         ← Daftar: Langkah 1 — Data Akun
│   ├── register-2.html         ← Daftar: Langkah 2 — Data Diri
│   ├── register-3.html         ← Daftar: Langkah 3 — Konfirmasi & Simpan
│   ├── monitoring.html         ← Dashboard utama sensor realtime
│   ├── analisis.html           ← Analisis keseimbangan, pronasi & arch type
│   ├── riwayat.html            ← Riwayat snapshot & grafik tren
│   └── profil.html             ← Profil biodata pasien
│
├── css/
│   ├── variables.css           ← Design tokens (warna, spacing, font)
│   ├── base.css                ← Reset global + komponen reusable + modal
│   ├── auth.css                ← Login & register
│   ├── monitoring.css          ← Heatmap & sensor dashboard
│   ├── keseimbangan.css        ← Balance score, pronasi & arch type
│   ├── riwayat.css             ← History list & chart tren
│   └── profil.css              ← Profil pasien
│
├── js/
│   ├── calculations.js         ← Semua rumus kalkulasi sensor
│   ├── firebase.js             ← Firebase Auth + Realtime Database (aktif)
│   ├── components.js           ← Sidebar, Topbar, Modal, Toast (reusable)
│   ├── monitoring.js           ← Logic heatmap, sensor bar, deteksi postur
│   ├── keseimbangan.js         ← Logic balance score, pronasi, arch type
│   └── riwayat.js              ← Logic history list dari Firebase
│
└── assets/
    └── images/                 ← Ikon dan logo
```

> `simulation.js` sudah tidak dipakai — sensor berjalan via Firebase realtime.

---

## 🧮 Formula & Kalkulasi

Semua rumus ada di `js/calculations.js`.

### Konversi Data Sensor

ESP32 hanya mengirim nilai **digital ADC (0–4095)**. Konversi dilakukan di JavaScript:

| Tahap | Rumus |
|-------|-------|
| Digital → Newton | `F = (digital / 4095) × F_MAX` · `F_MAX = 100N` (FSR402, dapat dikalibrasi) |
| Newton → Persen | `pct = (F_sensor / total_F_kaki) × 100` |
| Digital → Volt | `V = (digital / 4095) × 3.3` |

Setelah konversi, data dihaluskan menggunakan **EMA Filter** (`α = 0.2`) sebelum masuk kalkulasi.

### Metrik Utama

| Metrik | Formula | Referensi |
|--------|---------|-----------|
| **Berat Badan** | `W = F_total / 9.81` | Sazonov et al. (2020) |
| **ASI** | `|F_kiri − F_kanan| / (0.5 × (F_kiri + F_kanan)) × 100%` | Robinson et al. (1987) |
| **Balance Score** | `100 − ASI` | Błażkiewicz et al. (2014) |
| **Heel Load** | `(Heel_kiri + Heel_kanan) / F_total × 100%` | Putti et al. (2007) |

### Klasifikasi Keseimbangan (Wang et al., 2023)

| Status | Balance Score | ASI | Heel Load |
|--------|--------------|-----|-----------|
| ✅ Normal | ≥ 90 | ≤ 10% | 50–65% |
| ⚠️ Sedang | 80–89 | 11–20% | 40–49% atau 66–75% |
| 🚨 Abnormal | < 80 | > 20% | < 40% atau > 75% |

### Klasifikasi Pronasi (per kaki)

| Ratio Med-Lat | Klasifikasi |
|---------------|-------------|
| > +15 | 🔴 Overpronation |
| −15 s/d +15 | ✅ Normal |
| < −15 | 🔵 Underpronation / Supinasi |

`Ratio = (Med.FF − Lat.FF) / (Med.FF + Lat.FF) × 100`

### Klasifikasi Arch Type (per kaki)

| Kondisi | Arch Type |
|---------|-----------|
| Heel > 65% & Forefoot < 35% | 🔵 High Arch |
| Forefoot > 65% & Heel < 35% | 🔴 Flat Foot |
| Seimbang | ✅ Normal |

---

## 🔄 Alur Data

```
ESP32
  → kirim left_fsr_digital + right_fsr_digital ke Firebase (sensor_data/)
    → startFirebaseListen() terima perubahan realtime
      → processRawDigital()   ← konversi digital → newton + percent
        → applyEMAFilter()    ← haluskan noise
          → computeAll()      ← hitung semua metrik
            → updateUI()      ← update heatmap, angka, grafik, postur
              → "Rekam Snapshot" → firebaseRecordSnapshot()
                → simpan ke users/{uid}/history/
```

> **Penting:** Snapshot diambil dari `currentData` di memori JS (sudah difilter & dikalkulasi), **bukan** langsung dari Firebase `sensor_data/`.

---

## 🗄️ Struktur Firebase

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
              ├── left_fsr_newton:  [...]
              ├── right_fsr_newton: [...]
              ├── left_fsr_percent:  [...]
              ├── right_fsr_percent: [...]
              ├── total_weight:     68.5
              ├── total_force:      123.4
              ├── balance_score:    92.0
              ├── asi:              8.0
              ├── heel_load:        57.3
              ├── left_percent:     48.2
              ├── right_percent:    51.8
              ├── classification:   "NORMAL"
              ├── zones:            { forefoot, midfoot, heel }
              ├── pronation:        { ratioL, ratioR, labelL, labelR }
              ├── archType:         { labelL, labelR, heelRatioL, heelRatioR, ffRatioL, ffRatioR }
              ├── posture:          "Berdiri"
              ├── note:             ""
              └── snapshot_time:   "04/03/2026 14:32"
```

---

## 🚀 Cara Menjalankan

### Firebase sudah aktif — butuh koneksi internet

1. Buka `pages/login.html` di browser (atau gunakan Live Server di VS Code)
2. Daftar akun baru atau login dengan akun yang sudah ada
3. Data sensor realtime dibaca dari `sensor_data/` di Firebase
4. Selama ESP32 belum terhubung, tidak ada data yang masuk — halaman tetap terbuka tapi angka tidak berubah

### Menghubungkan ESP32

ESP32 cukup menulis dua field ke Firebase:
```json
{
  "left_fsr_digital":  [512, 620, 450, 580],
  "right_fsr_digital": [530, 610, 480, 590],
  "timestamp": 1234567890
}
```
Semua kalkulasi (Newton, persen, balance score, dll) dikerjakan di JavaScript — tidak perlu dikirim dari ESP32.

---

## 🎨 Design System

Semua design tokens ada di `css/variables.css`:

- **Warna utama**: `--red: #E7302A` (brand), `--bg-base: #0A0A0E`
- **Font**: Nunito (display) + JetBrains Mono (kode/label/angka sensor)
- **Sidebar & Topbar**: di-render oleh `components.js` — reusable di semua halaman dashboard

---

## 📌 Sensor Mapping

| Index | Nama | Posisi |
|-------|------|--------|
| 0 | Hallux | Ujung ibu jari |
| 1 | Med. Forefoot | Depan sisi dalam |
| 2 | Lat. Forefoot | Depan sisi luar |
| 3 | Heel | Tumit |

Masing-masing untuk kaki kiri (`left_fsr_*`) dan kanan (`right_fsr_*`). Total: **8 sensor FSR402**.

---

## 🤖 Rencana Machine Learning

Deteksi postur saat ini menggunakan **rule-based** (logika sederhana). Rencana ke depan:

1. Kumpulkan data training dari ESP32 real (label postur manual saat rekam)
2. Latih model **MLP** di Python/Google Colab dengan 12 fitur sensor
3. Export ke `model.json` + `weights.bin` (TensorFlow.js format)
4. Load di browser → deteksi postur otomatis dengan confidence score

Kelas yang akan dideteksi: **Berdiri**, **Jongkok**, **1 Kaki Kiri**, **1 Kaki Kanan**

Untuk mengganti ke ML: ubah satu baris di `monitoring.js`:
```js
// Ganti ini:
return { label, confidence: null, source: 'rule-based' };
// Dengan ini:
return predictPosture(data);  // dari model TF.js
```