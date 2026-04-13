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
├── pages/                      ← Satu file per halaman
│   ├── login.html              ← Halaman masuk
│   ├── register-1.html         ← Daftar: Langkah 1 — Data Akun
│   ├── register-2.html         ← Daftar: Langkah 2 — Data Diri
│   ├── register-3.html         ← Daftar: Langkah 3 — Konfirmasi
│   ├── monitoring.html         ← Dashboard utama sensor realtime
│   ├── analisis.html           ← Analisis keseimbangan & klasifikasi
│   ├── riwayat.html            ← Riwayat snapshot & grafik tren
│   └── profil.html             ← Profil biodata pasien
│
├── css/                        ← Satu file CSS per konteks
│   ├── variables.css           ← Design tokens (warna, spacing, font)
│   ├── base.css                ← Reset global + komponen reusable
│   ├── auth.css                ← Login & register
│   ├── monitoring.css          ← Heatmap & sensor dashboard
│   ├── keseimbangan.css        ← Balance score & klasifikasi
│   ├── riwayat.css             ← History list & charts
│   └── profil.css              ← Profil pasien
│
├── js/                         ← Satu file JS per tanggung jawab
│   ├── calculations.js         ← Semua rumus kalkulasi (ASI, Balance, dll)
│   ├── simulation.js           ← Simulasi data ESP32 (pakai dulu sebelum Firebase)
│   ├── firebase.js             ← Integrasi Firebase (di-comment, aktifkan nanti)
│   ├── components.js           ← Komponen reusable: Sidebar, Topbar, Toast
│   ├── monitoring.js           ← Logic halaman monitoring
│   ├── keseimbangan.js         ← Logic halaman keseimbangan
│   ├── riwayat.js              ← Logic halaman riwayat
│   └── (profil — inline di HTML, karena sederhana)
│
└── assets/
    └── images/                 ← Gambar & ikon (saat ini kosong, menggunakan SVG inline)
```

---

## 🧮 Formula & Kalkulasi

Semua rumus ada di `js/calculations.js`. Referensi ilmiah:

| Metrik | Formula | Referensi |
|--------|---------|-----------|
| **Berat Badan** | W = F_total / 9.81 | Sazonov et al. (2020) |
| **ASI** | |(F_kiri - F_kanan)| / (0.5 × (F_kiri + F_kanan)) × 100% | Robinson et al. (1987) |
| **Balance Score** | 100 - ASI | Błażkiewicz et al. (2014) |
| **Heel Load** | (F_heel_kiri + F_heel_kanan) / F_total × 100% | Putti et al. (2007) |

### Klasifikasi (Wang et al., 2023)

| Status | Balance Score | ASI | Heel Load |
|--------|-------------|-----|-----------|
| ✅ Normal | ≥ 90 | ≤ 10% | 50–65% |
| ⚠️ Sedang | 80–89 | 11–20% | 40–49% atau 66–75% |
| 🚨 Abnormal | < 80 | > 20% | < 40% atau > 75% |

---

## 🔄 Alur Data

```
ESP32 (hardware)
  → Firebase Realtime Database (prototype/current/)
    → simulation.js [SEKARANG] / firebase.js [NANTI]
      → calculations.js (computeAll)
        → UI diperbarui setiap 1.5 detik
          → Klik "Rekam Snapshot" → simpan ke users/{uid}/history/
```

### Struktur Firebase

```
prototype/
  └── current/
      ├── left_fsr_digital:   [512, 620, 450, 580]
      ├── left_fsr_newton:    [120, 150, 90, 110]
      ├── left_fsr_percent:   [23, 31, 18, 22]
      ├── right_fsr_digital:  [530, 610, 480, 590]
      ├── right_fsr_newton:   [130, 140, 100, 120]
      ├── right_fsr_percent:  [25, 27, 19, 23]
      └── timestamp:          1646776543210

users/
  └── {uid}/
      ├── profile: { name, dob, gender, height, weight, blood_type, ... }
      └── history/
          └── {auto_id}/
              ├── balance_score, asi, heel_load, classification
              ├── left_fsr_newton, right_fsr_newton
              ├── posture, snapshot_time
              └── ...
```

---

## 🚀 Cara Menjalankan

### Fase 1 — Simulasi (sekarang)
1. Buka `index.html` di browser (atau pakai Live Server di VS Code)
2. Data sensor disimulasikan otomatis oleh `simulation.js`
3. Tidak perlu koneksi internet (kecuali Google Fonts)

### Fase 2 — Firebase (nanti)
1. Buat project Firebase di [console.firebase.google.com](https://console.firebase.google.com)
2. Aktifkan **Realtime Database** dan **Authentication (Email/Password)**
3. Buka `js/firebase.js` → isi `firebaseConfig` → uncomment semua kode
4. Hapus import `simulation.js` dari HTML
5. Ganti `onDataUpdate()` dengan `startFirebaseListen()` di tiap halaman

---

## 🎨 Design System

Semua design tokens ada di `css/variables.css`:

- **Warna utama**: `--red: #E7302A` (brand), `--bg-base: #0A0A0E`
- **Font**: Nunito (display) + JetBrains Mono (kode/label)
- **Komponen sidebar/topbar**: di-render oleh `components.js` → reusable di semua halaman

---

## 📌 Sensor Mapping

| Index | Nama | Posisi |
|-------|------|--------|
| 0 | Hallux | Ibu jari |
| 1 | Med. Forefoot | Depan tengah |
| 2 | Lat. Forefoot | Depan sisi luar |
| 3 | Heel | Tumit |

Masing-masing untuk kaki kiri (`left_fsr_*`) dan kanan (`right_fsr_*`).
Total: **8 sensor FSR402**.
