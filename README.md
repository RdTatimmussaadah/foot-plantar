# Foot Plantar Monitoring (FPS)

Sistem pemantauan tekanan telapak kaki berbasis IoT dan Machine Learning secara real-time melalui antarmuka web. Data dari sensor FSR402 yang dibaca ESP32 dikirim ke Firebase Realtime Database, lalu diolah dan divisualisasikan di dashboard web termasuk deteksi postur menggunakan model TensorFlow.js.

---

## Fitur Utama

- **Peta Tekanan Real-time** — heatmap dua telapak kaki (kiri & kanan) yang diperbarui langsung setiap kali sensor mengirim data baru
- **Deteksi Postur ML** — prediksi postur tubuh (Normal, Forward Lean, Backward Lean, Left Lean, Right Lean) menggunakan model TensorFlow.js yang berjalan di browser, dilengkapi dua lapis pengaman sebelum menampilkan prediksi
- **Analisis Stabilitas CoP** — titik Center of Pressure divisualisasikan pada radar interaktif dengan status STABLE / MODERATE / UNSTABLE
- **Analisis Struktur Kaki** — klasifikasi arch type (Normal / Flat Foot / High Arch) dan pola pronasi (Normal / Overpronation / Supination) untuk kaki kiri dan kanan secara terpisah
- **Distribusi Beban** — persentase berat badan kiri–kanan dan depan–belakang ditampilkan secara real-time
- **Snapshot** — simpan kondisi bacaan saat ini ke riwayat permanen di Firebase, tersedia di halaman dashboard maupun report
- **Laporan** — halaman riwayat lengkap dengan grafik CoP trajectory, tren deviasi, dan ringkasan kondisi pasien; ekspor ke PDF dan CSV
- **Dwibahasa** — UI sepenuhnya mendukung Bahasa Indonesia dan English, pilihan bahasa disimpan di `localStorage`
- **Autentikasi** — login dan registrasi akun via Firebase Authentication, data riwayat terisolasi per akun

---

## Struktur Proyek

```
fps-project/
├── index.html                  # Entry point — redirect ke dashboard/login
├── pages/
│   ├── login.html              # Halaman masuk akun
│   ├── register-1.html         # Registrasi langkah 1 — data akun
│   ├── register-2.html         # Registrasi langkah 2 — data pribadi
│   ├── register-3.html         # Registrasi langkah 3 — konfirmasi & simpan
│   ├── dashboard.html          # Halaman pemantauan utama (real-time)
│   └── report.html             # Halaman laporan & riwayat snapshot
├── js/
│   ├── calculations.js         # Semua rumus: Newton, ASI, CoP, Pronasi, Arch Type
│   ├── firebase.js             # Koneksi Firebase: auth, listener, snapshot, CRUD
│   ├── components.js           # Komponen bersama: topbar, modal logout, modal snapshot
│   ├── dashboard.js            # Logika dashboard: heatmap, CoP radar, diagnosis
│   ├── posture_ml.js           # Load TF.js model, prediksi postur, safeguard
│   ├── laporan.js              # Logika halaman laporan, export CSV/PDF
│   └── lang.js                 # Sistem dwibahasa (EN/ID)
├── css/
│   ├── variables.css           # CSS custom properties (warna, spacing, font)
│   ├── base.css                # Global styles: tombol, modal, toast
│   ├── auth.css                # Styles halaman login & register
│   ├── dashboard.css           # Styles halaman dashboard
│   ├── laporan.css             # Styles halaman report
│   └── lang.css                # Styles tombol ganti bahasa
├── models/
│   └── tfjs_model/             # Model TF.js aktif (dipakai di dashboard)
│       ├── model.json
│       └── group1-shard1of1.bin
└── assets/
    └── images/                 # Logo dan ikon UI
```

---

## Stack Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Vanilla ES2020, no build tool) |
| Database & Auth | Firebase Realtime Database, Firebase Authentication v10 |
| Machine Learning | TensorFlow.js 4.22.0 (inference di browser) |
| Hardware | ESP32, Sensor FSR402 (8 sensor: 4 kaki kiri, 4 kaki kanan) |
| Deploy | Vercel (static hosting) |
| Model Training | Python, TensorFlow/Keras di Google Colab (terpisah dari repo ini) |

---

## Hardware

**ESP32** — mikrokontroler utama yang membaca sensor dan mengirim data ke Firebase via WiFi.

**Sensor FSR402** — dipasang di 8 titik pada kedua telapak kaki:

| Indeks | Posisi | Koordinat (cm) |
|---|---|---|
| L0 | Hallux kiri | x = −4.0, y = +8.0 |
| L1 | Med. Forefoot kiri | x = −6.0, y = +2.0 |
| L2 | Lat. Forefoot kiri | x = −9.0, y = +1.5 |
| L3 | Heel kiri | x = −7.0, y = −8.0 |
| R0 | Hallux kanan | x = +4.0, y = +8.0 |
| R1 | Med. Forefoot kanan | x = +6.0, y = +2.0 |
| R2 | Lat. Forefoot kanan | x = +9.0, y = +1.5 |
| R3 | Heel kanan | x = +7.0, y = −8.0 |

**Data yang dikirim ESP32 ke Firebase** (node `sensor_data`):

```json
{
  "left_fsr_digital":  [512, 620, 450, 580],
  "right_fsr_digital": [530, 610, 480, 590],
  "left_fsr_newton":   [12.4, 15.1, 10.9, 14.1],
  "right_fsr_newton":  [12.9, 14.8, 11.6, 14.3],
  "left_balance_percent":  [30, 37, 26, 34],
  "right_balance_percent": [30, 35, 27, 34],
  "timestamp": 1719500000000
}
```

> Field `left_fsr_newton`, `right_fsr_newton`, `left_balance_percent`, `right_balance_percent` bersifat opsional — jika tidak dikirim ESP32, website akan menghitungnya sendiri dari nilai digital sebagai fallback.

---

## Alur Data

```
FSR402 (×8)
    │ sinyal listrik (analog)
    ▼
ESP32 — ADC 12-bit → nilai digital 0–4095
    │ WiFi / HTTP atau RTDB SDK
    ▼
Firebase Realtime Database (node: sensor_data)
    │ .on('value') — real-time listener
    ▼
firebase.js → processRawDigital()
    │ prioritas: pakai Newton dari Firebase jika ada,
    │ jika tidak: hitung dari digital (fallback)
    ▼
calculations.js → computeAll()
    │ ASI, Balance Score, Pronasi, Arch Type, leftPercent, rightPercent
    ▼
dashboard.js
    ├── updateMonitoringUI()  → heatmap + kartu L/R Symmetry
    ├── updateCoP()           → radar CoP + status stabilitas + distribusi beban
    ├── updateBalanceUI()     → bar kiri/kanan
    └── updatePostureMLSimple() → posture_ml.js → prediksi postur
```

---

## Perhitungan dan Ambang Batas

### Konversi Digital → Newton (fallback)

```
noise_floor   = 50                           // ADC_MAX = 4095, VCC = 3.3V
nilai_bersih  = max(0, digital − noise_floor)
F (Newton)    = (nilai_bersih / 4095) × 100
```

### Asymmetry Index (ASI) & Skor Simetri

```
ASI          = |F_kiri − F_kanan| / (0.5 × (F_kiri + F_kanan)) × 100%
Skor Simetri = 100 − ASI
```

Warna kartu L/R Symmetry di dashboard:
- Hijau — skor ≥ 90
- Kuning — skor 80–89
- Merah — skor < 80

### Distribusi Beban Kiri–Kanan (fallback jika ESP32 tidak mengirim)

```
persen_kiri   = (F_kiri  / F_total) × 100
persen_kanan  = (F_kanan / F_total) × 100
```

### Distribusi Beban Depan–Belakang (dari posisi CoP Y)

```
rentang       = 8 − (−10) = 18
persen_depan  = clamp(((CoP_y − (−10)) / 18) × 100, 0, 100)
persen_belakang = 100 − persen_depan
```

### Pronasi — Med-Lat Ratio

```
ratio = (MFF − LFF) / (MFF + LFF) × 100

  ratio > +15  → Overpronation
  ratio < −15  → Supination
  else         → Normal
```

`MFF` = sensor indeks 1 (Medial Forefoot), `LFF` = sensor indeks 2 (Lateral Forefoot), per kaki.

### Arch Type

```
heel_ratio = (heel / total_kaki) × 100
ff_ratio   = ((hallux + medFF + latFF) / total_kaki) × 100

  heel_ratio > 65 AND ff_ratio < 35  → High Arch
  ff_ratio   > 65 AND heel_ratio < 35 → Flat Foot
  else                                 → Normal
```

### Center of Pressure (CoP)

```
CoP_x = Σ(F_i × x_i) / F_total
CoP_y = Σ(F_i × y_i) / F_total

sway_distance = √(CoP_x² + CoP_y²)
```

**Status stabilitas:**

| Status | Sway Distance |
|---|---|
| STABLE | ≤ 1.0 cm |
| MODERATE | 1.0 – 2.5 cm |
| UNSTABLE | > 2.5 cm |

**Ambang batas arah kecondongan:**

| Status | Sumbu X (kiri/kanan) | Sumbu Y (depan/belakang) |
|---|---|---|
| MODERATE | \|CoP_x\| > 0.6 cm | \|CoP_y\| > 0.8 cm |
| UNSTABLE | \|CoP_x\| > 1.0 cm | \|CoP_y\| > 1.2 cm |

**Persentase stabilitas:**

```
persen_stabilitas = max(0, round((1 − sway_distance / 15) × 100))
```

---

## Model Machine Learning

**Arsitektur:**
```
Input(8) → Dense(64, relu) → Dropout(0.3) → Dense(32, relu) → Dropout(0.3) → Dense(5, softmax)
```

**Input:** 8 nilai `left_fsr_digital` + `right_fsr_digital` (bukan Newton), dinormalisasi dengan Min-Max Scaling menggunakan nilai per-sensor dari data training.

**Output — 5 kelas postur:**

| Label Internal | Ditampilkan (EN) |
|---|---|
| `normal` | Normal |
| `condong_depan` | Forward Lean |
| `condong_belakang` | Backward Lean |
| `condong_kiri` | Left Lean |
| `condong_kanan` | Right Lean |

**Safeguard sebelum prediksi ditampilkan:**

1. **Cek total tekanan & jumlah sensor aktif** — jika `totalRaw < 50000` atau sensor yang aktif (nilai > threshold) kurang dari 4, tampilkan `"Not Detected Yet"`, tidak memaksakan prediksi
2. **Cek confidence** — jika confidence model di bawah ambang batas, tampilkan `"Stabilizing..."` sampai data lebih stabil

**File model aktif:** `models/tfjs_model/model.json`

> Folder `models-data-orang-newton/` dan `models-data-sendiri-newton/` adalah model lama yang sudah tidak dipakai dan bisa dihapus.

---

## Setup Firebase

1. Buat project baru di [Firebase Console](https://console.firebase.google.com)
2. Aktifkan **Realtime Database** (region Asia Southeast 1 direkomendasikan)
3. Aktifkan **Authentication** → Email/Password
4. Salin konfigurasi project dan ganti nilai di `js/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey:            "GANTI_DENGAN_API_KEY_KAMU",
  authDomain:        "PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "PROJECT_ID",
  storageBucket:     "PROJECT_ID.firebasestorage.app",
  messagingSenderId: "MESSAGING_SENDER_ID",
  appId:             "APP_ID",
};
```

5. Set **Realtime Database Rules** (minimal untuk development):

```json
{
  "rules": {
    "sensor_data": {
      ".read": "auth != null",
      ".write": true
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

**Struktur data di Firebase:**

```
/sensor_data                        ← ditulis ESP32, dibaca dashboard real-time
  left_fsr_digital: [...]
  right_fsr_digital: [...]
  left_fsr_newton: [...]            ← opsional, dikirim ESP32 jika sudah dihitung
  right_fsr_newton: [...]
  left_balance_percent: [...]       ← opsional
  right_balance_percent: [...]
  timestamp: 1719500000000

/users/{uid}/profile                ← data profil pengguna
  name, email, phone, dob, gender, height, weight

/users/{uid}/history/{snapId}       ← riwayat snapshot
  snapshot_time, posture_ml, left_fsr_newton, right_fsr_newton,
  total_force, asi, cop_x, cop_y, cop_status,
  arch_label_l, arch_label_r, pronation_label_l, pronation_label_r,
  note
```

---

## Cara Menjalankan Secara Lokal

Proyek ini adalah static website murni (tidak ada Node.js server, tidak ada bundler). Cukup jalankan dengan web server sederhana supaya Firebase dan TF.js bisa dimuat dengan benar.

**Menggunakan VS Code Live Server:**
1. Install ekstensi [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Klik kanan `index.html` → "Open with Live Server"

**Menggunakan Python:**
```bash
cd fps-project
python -m http.server 5500
# buka http://localhost:5500
```

**Menggunakan Node.js (`serve`):**
```bash
npx serve fps-project
```

> Jangan buka file HTML langsung dari filesystem (`file://`) karena Firebase SDK dan modul ES tidak akan berfungsi dengan benar.

---

## Deploy ke Vercel

Proyek ini sudah dikonfigurasi untuk Vercel (lihat `.vercel/project.json`).

**Cara deploy:**
```bash
# Install Vercel CLI jika belum ada
npm i -g vercel

# Deploy dari root folder project
cd fps-project
vercel
```

Atau hubungkan repository ke Vercel dashboard untuk deploy otomatis setiap push ke main branch.

> Pastikan `js/firebase.js` sudah berisi konfigurasi Firebase yang benar sebelum deploy.

---

## Halaman-Halaman Website

| Halaman | File | Fungsi |
|---|---|---|
| Entry point | `index.html` | Cek status login → redirect ke dashboard atau login (timeout 5 detik) |
| Login | `pages/login.html` | Masuk akun dengan email & kata sandi |
| Register (1/3) | `pages/register-1.html` | Isi email, kata sandi, nomor telepon |
| Register (2/3) | `pages/register-2.html` | Isi nama, tanggal lahir, jenis kelamin, tinggi, berat |
| Register (3/3) | `pages/register-3.html` | Review data & simpan akun ke Firebase |
| Dashboard | `pages/dashboard.html` | Pemantauan real-time: heatmap, postur ML, CoP radar, struktur kaki |
| Report | `pages/report.html` | Riwayat snapshot, grafik CoP, ringkasan kondisi, ekspor PDF/CSV |

---

## Catatan Pengembangan

- **Tidak ada framework atau bundler** — semua JavaScript ditulis vanilla dan dimuat langsung via `<script>` tag di HTML. Tidak perlu `npm install` untuk menjalankan website.
- **Semua kalkulasi di client-side** — ESP32 cukup mengirim nilai digital mentah (atau nilai Newton jika sudah dihitung di sisi alat). Semua rumus dijalankan di browser.
- **Firebase listener dibersihkan saat navigasi** — fungsi cleanup dari `startFirebaseListen()` dipanggil saat event `beforeunload` untuk mencegah memory leak.
- **Model TF.js di-load lazy** — model baru dimuat saat halaman dashboard pertama kali diakses, bukan saat halaman lain dibuka.
- **Profil pengguna** menggunakan `.once()` bukan `.on()` karena data profil tidak berubah selama sesi berlangsung.