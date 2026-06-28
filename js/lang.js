(function () {
  "use strict";

  const STORAGE_KEY = "fps_lang";

//   const TEXT = {
//     "Loading...": "Memuat...",

//     "Foot Plantar Monitoring": "Foot Plantar Monitoring",
//     "Foot plantar pressure monitoring": "Pemantauan tekanan telapak kaki",
//     "Sign In — Foot Plantar Monitoring": "Masuk — Foot Plantar Monitoring",
//     "Register — Foot Plantar Monitoring": "Daftar — Foot Plantar Monitoring",
//     "Register — Personal Data": "Daftar — Data Diri",
//     "Register — Confirmation": "Daftar — Konfirmasi",
//     "Dashboard — Foot Plantar Monitoring": "Dasbor — Foot Plantar Monitoring",
//     "Report — Foot Plantar Monitoring": "Laporan — Foot Plantar Monitoring",

//     "Sign In to Account": "Masuk ke Akun",
//     "Use your email and password": "Gunakan email dan kata sandi kamu",
//     "Email": "Email",
//     "Password": "Kata Sandi",
//     "Confirm Password": "Konfirmasi Kata Sandi",
//     "Phone Number": "Nomor Telepon",
//     "Sign In": "Masuk",
//     "Register now": "Daftar sekarang",
//     "Don't have an account?": "Belum punya akun?",
//     "Already have an account?": "Sudah punya akun?",
//     "Register Account": "Daftar Akun",
//     "Step 1 of 3": "Langkah 1 dari 3",
//     "Step 2 of 3": "Langkah 2 dari 3",
//     "Step 3 of 3": "Langkah 3 dari 3",
//     "Account": "Akun",
//     "Personal Data": "Data Diri",
//     "Confirmation": "Konfirmasi",
//     "Continue →": "Lanjut →",
//     "Full Name": "Nama Lengkap",
//     "Date of Birth": "Tanggal Lahir",
//     "Age": "Usia",
//     "Gender": "Jenis Kelamin",
//     "Male": "Laki-laki",
//     "Female": "Perempuan",
//     "Height (cm)": "Tinggi Badan (cm)",
//     "Weight (kg)": "Berat Badan (kg)",
//     "Please review your data before saving.": "Periksa kembali data kamu sebelum disimpan.",
//     "Account Data": "Data Akun",
//     "Name": "Nama",
//     "Date of Birth / Age": "Tanggal Lahir / Usia",
//     "Height / Weight": "Tinggi / Berat Badan",
//     "Register Now": "Daftar Sekarang",

//     "Dashboard": "Dasbor",
//     "Report": "Laporan",
//     "Take Snapshot": "Ambil Snapshot",
//     "Logout": "Keluar",

//     "MONITORING": "MONITORING",
//     "HEATMAP": "HEATMAP",
//     "PLANTAR PRESSURE MAP": "PETA TEKANAN PLANTAR",
//     "4 Sensor Distribution": "Distribusi 4 Sensor",
//     "LEFT": "KIRI",
//     "RIGHT": "KANAN",
//     "Left": "Kiri",
//     "Right": "Kanan",
//     "FRONT": "DEPAN",
//     "BACK": "BELAKANG",
//     "Front": "Depan",
//     "Back": "Belakang",
//     "Low": "Rendah",
//     "High": "Tinggi",
//     "METRICS": "METRIK",
//     "L/R Symmetry": "Simetri Kiri/Kanan",
//     "minimum threshold 85%": "ambang minimum 85%",
//     "POSTURE": "POSTUR",
//     "POSTURE DETECTION": "DETEKSI POSTUR",
//     "ML Active": "ML Aktif",
//     "Detecting...": "Mendeteksi...",
//     "Waiting for foot...": "Menunggu kaki...",
//     "Stabilizing...": "Menstabilkan...",
//     "Not Detected Yet": "Belum Terdeteksi",
//     "Not Read Yet": "Belum Terbaca",
//     "Model not available": "Model tidak tersedia",
//     "The system is currently reading foot pressure patterns to detect posture tendencies.": "Sistem sedang membaca pola tekanan kaki untuk mendeteksi kecenderungan postur.",
//     "The system is reading the foot pressure pattern to detect posture tendencies.": "Sistem sedang membaca pola tekanan kaki untuk mendeteksi kecenderungan postur.",
//     "ANALISIS": "ANALISIS",
//     "POSTURE STABILITY (CoP)": "STABILITAS POSTUR (CoP)",
//     "Analyzing...": "Menganalisis...",
//     "Waiting for data...": "Menunggu data...",
//     "Stability": "Stabilitas",
//     "LEFT FOOT": "KAKI KIRI",
//     "RIGHT FOOT": "KAKI KANAN",
//     "STRUCTURE (ARCH)": "STRUKTUR (LENGKUNG KAKI)",
//     "MOVEMENT (POSITION)": "GERAKAN (POSISI)",
//     "Please stand upright on the sensor to begin the analysis...": "Silakan berdiri tegak di atas sensor untuk memulai analisis...",

//     "PROFILE": "PROFIL",
//     "Contact": "Kontak",
//     "PERSONAL DATA": "DATA DIRI",
//     "PATIENT CONCLUSION": "KESIMPULAN PASIEN",
//     "Latest Snapshot: —": "Snapshot Terbaru: —",
//     "There is no snapshot available for analysis.": "Belum ada snapshot yang tersedia untuk dianalisis.",
//     "Left Foot Structure": "Struktur Kaki Kiri",
//     "Left Foot Movement": "Gerakan Kaki Kiri",
//     "Right Foot Structure": "Struktur Kaki Kanan",
//     "Right Foot Movement": "Gerakan Kaki Kanan",
//     "CoP Stability": "Stabilitas CoP",
//     "Total Snapshots": "Total Snapshot",
//     "CoP HISTORY": "RIWAYAT CoP",
//     "Waiting for latest CoP data...": "Menunggu data CoP terbaru...",
//     "SUMMARY OF HISTORY": "RINGKASAN RIWAYAT",
//     "Stable Snapshots": "Snapshot Stabil",
//     "Snapshots Requiring Attention": "Snapshot Perlu Perhatian",
//     "Dominant Structure": "Struktur Dominan",
//     "Dominant Movement": "Gerakan Dominan",
//     "SNAPSHOT HISTORY": "RIWAYAT SNAPSHOT",
//     "PDF Report": "Laporan PDF",
//     "📄 PDF Report": "📄 Laporan PDF",
//     "Delete All History": "Hapus Semua Riwayat",
//     "🗑️ Delete All History": "🗑️ Hapus Semua Riwayat",

//     "Confirm": "Konfirmasi",
//     "Cancel": "Batal",
//     "Delete": "Hapus",
//     "Save": "Simpan",
//     "💾 Save": "💾 Simpan",
//     "Yes, Logout": "Ya, Keluar",
//     "Logout from Account?": "Keluar dari Akun?",
//     "Monitoring sessions will remain saved.": "Sesi monitoring akan tetap tersimpan.",
//     "You can log back in at any time.": "Kamu bisa masuk kembali kapan saja.",
//     "⏺ Take Snapshot": "⏺ Ambil Snapshot",
//     "Note (optional)": "Catatan (opsional)",
//     "💬  Note (optional)": "💬  Catatan (opsional)",

//     "Enter password": "Masukkan kata sandi",
//     "Example: before therapy, pain condition, etc...": "Contoh: sebelum terapi, kondisi nyeri, dan sebagainya...",

//     "Normal": "Normal",
//     "Normal Foot": "Kaki Normal",
//     "Flat Foot": "Kaki Datar",
//     "High Arch": "Lengkung Kaki Tinggi",
//     "Overpronation": "Overpronasi",
//     "Supinasi": "Supinasi",
//     "STABLE": "STABIL",
//     "MODERATE": "SEDANG",
//     "UNSTABLE": "TIDAK STABIL",
//     "NO DATA AVAILABLE": "DATA TIDAK TERSEDIA",
//     "DATA NOT AVAILABLE": "DATA TIDAK TERSEDIA",
//     "Unknown": "Tidak Diketahui",
//     "No data available": "Data tidak tersedia",

//     "Good Patient Condition": "Kondisi Pasien Baik",
//     "Indication of Foot Abnormality": "Indikasi Kelainan Kaki",
//     "Monitoring Required": "Perlu Pemantauan",
//     "Attention Needed": "Perlu Perhatian",
//     "Structure, movement, and CoP stability are generally good.": "Struktur, gerakan, dan stabilitas CoP secara umum baik.",
//     "Condition requires monitoring, especially CoP stability.": "Kondisi memerlukan pemantauan, terutama stabilitas CoP.",

//     "Delete this snapshot?": "Hapus snapshot ini?",
//     "Delete all snapshots? This action cannot be undone.": "Hapus semua snapshot? Tindakan ini tidak dapat dibatalkan.",
//     "Snapshot deleted": "Snapshot berhasil dihapus",
//     "Failed to delete snapshot": "Gagal menghapus snapshot",
//     "All history has been cleared": "Semua riwayat berhasil dibersihkan",
//     "Failed to delete history": "Gagal menghapus riwayat",
//     "No snapshots available for deletion.": "Tidak ada snapshot untuk dihapus.",
//     "No snapshots available for export.": "Tidak ada snapshot untuk diekspor.",
//     "Opening PDF report...": "Membuka laporan PDF...",
//     "Sensor data not available.": "Data sensor tidak tersedia.",
//     "Snapshot ID not found.": "ID snapshot tidak ditemukan.",

//     "Signing in...": "Sedang masuk...",
//     "Please fill in both email and password.": "Email dan kata sandi wajib diisi.",
//     "Email is not registered.": "Email belum terdaftar.",
//     "Incorrect password.": "Kata sandi salah.",
//     "Invalid email format.": "Format email tidak valid.",
//     "Email or password is incorrect.": "Email atau kata sandi salah.",
//     "Too many attempts. Please try again later.": "Terlalu banyak percobaan. Coba lagi nanti.",

//     "Forward Lean": "Condong ke Depan",
//     "Backward Lean": "Condong ke Belakang",
//     "Left Lean": "Condong ke Kiri",
//     "Right Lean": "Condong ke Kanan",
//     "Not Detected": "Belum Terdeteksi",
//     "Not Detected Yet": "Belum Terdeteksi",
//     "Not Read Yet": "Belum Terbaca",

//     "The pressure pattern indicates a relatively balanced weight distribution.": "Pola tekanan menunjukkan distribusi berat yang relatif seimbang.",
//     "The pressure pattern indicates a tendency for the body weight to shift forward.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke depan.",
//     "The pressure pattern indicates a tendency for the body weight to shift backward.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke belakang.",
//     "The pressure pattern indicates a tendency for the body weight to shift to the left side.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke sisi kiri.",
//     "The pressure pattern indicates a tendency for the body weight to shift to the right side.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke sisi kanan.",
//     "The posture data is not clear enough. The reading can be repeated to better observe the pressure pattern.": "Data postur belum cukup jelas. Pembacaan dapat diulang untuk mengamati pola tekanan dengan lebih baik.",

//     "Foot flat, but the weight distribution is stable in the center.": "Kaki datar, tetapi distribusi berat stabil di bagian tengah.",
//     "Flat foot and the weight distribution is tilted inward.": "Kaki datar dan distribusi berat cenderung miring ke bagian dalam.",
//     "Flat foot, but the weight distribution tends to shift to the outer side.": "Kaki datar, tetapi distribusi berat cenderung bergeser ke sisi luar.",
//     "High arch, but the weight distribution is stable in the center.": "Lengkung kaki tinggi, tetapi distribusi berat stabil di bagian tengah.",
//     "High arch and the weight distribution is tilted inward.": "Lengkung kaki tinggi dan distribusi berat cenderung miring ke bagian dalam.",
//     "High arch and the weight distribution tends to shift to the outer side.": "Lengkung kaki tinggi dan distribusi berat cenderung bergeser ke sisi luar.",
//     "Ideal foot, structure and weight distribution are very balanced.": "Kaki ideal, struktur dan distribusi berat sangat seimbang.",
//     "Normal shape, but the weight distribution tends to tilt inward.": "Bentuk kaki normal, tetapi distribusi berat cenderung miring ke bagian dalam.",
//     "Normal shape, but the weight distribution tends to tilt outward.": "Bentuk kaki normal, tetapi distribusi berat cenderung miring ke bagian luar.",
//     "No data available": "Data tidak tersedia",

//     "Hollow foot": "Lengkung kaki tinggi",
//     "Fallen arch": "Lengkung kaki turun",
//     "Normal foot": "Kaki normal",
//     "Normal Foot": "Kaki Normal",
//     "Flat Foot": "Kaki Datar",
//     "High Arch": "Lengkung Kaki Tinggi",
//     "Overpronation": "Overpronasi",
//     "Supination": "Supinasi",

//     "Balance: Very Good (Normal)": "Keseimbangan: Sangat Baik (Normal)",
//     "Stability is still good, but structural/movement abnormalities still need to be noted.": "Stabilitas masih baik, tetapi kelainan struktur atau gerakan tetap perlu diperhatikan.",
//     "There are indications of foot abnormalities, but the latest CoP is still stable.": "Terdapat indikasi kelainan kaki, tetapi CoP terbaru masih stabil.",
//     "Condition requires monitoring through subsequent snapshots.": "Kondisi memerlukan pemantauan melalui snapshot berikutnya.",
//     "Further examination is recommended if this pattern occurs repeatedly.": "Pemeriksaan lanjutan disarankan jika pola ini terjadi berulang.",
//     "There are indications of stability issues or foot abnormalities that need attention.": "Terdapat indikasi masalah stabilitas atau kelainan kaki yang perlu diperhatikan.",
//     "CoP data is not sufficient to conclude stability.": "Data CoP belum cukup untuk menyimpulkan stabilitas.",
//     "Body weight pressure points are far from the center of pressure. There are signs of stability issues.": "Titik tekanan berat tubuh berada jauh dari pusat tekanan. Terdapat tanda masalah stabilitas.",
//     "Body weight pressure points are slightly offset from the center. Stability is acceptable but requires monitoring.": "Titik tekanan berat tubuh sedikit bergeser dari pusat. Stabilitas masih dapat diterima, tetapi perlu dipantau.",
//     "Body weight pressure points are near the center of pressure. Body stability is generally good.": "Titik tekanan berat tubuh berada dekat dengan pusat tekanan. Stabilitas tubuh secara umum baik.",
    
//     "Patient": "Pasien",
//     "Posture": "Postur",
//     "Standing": "Berdiri",
//     "Left Movement": "Gerakan Kiri",
//     "Right Movement": "Gerakan Kanan",
//     "Saving CoP, foot structure, movement, and sensor data to history": "Menyimpan data CoP, struktur kaki, gerakan, dan sensor ke riwayat",

//     "Snapshot saved": "Snapshot berhasil disimpan",
//     "Snapshot failed to save": "Snapshot gagal disimpan",
//     "Export feature is available after Firebase integration.": "Fitur export tersedia setelah integrasi Firebase.",

//     "Hallux": "Ibu Jari",
//     "Metatarsal 1": "Metatarsal 1",
//     "Metatarsal 4": "Metatarsal 4",
//     "Heel": "Tumit",

//     "Hallux: The Big Toe: The largest toe on the foot, assisting in balance and propulsion during walking.": "Hallux / ibu jari kaki: jari terbesar pada kaki yang membantu keseimbangan dan dorongan saat berjalan.",
//     "Metatarsal 1: The First Metatarsal: The bone connecting the big toe to the midfoot, bearing significant load during standing and walking.": "Metatarsal 1: tulang yang menghubungkan ibu jari kaki dengan bagian tengah kaki, berperan menahan beban saat berdiri dan berjalan.",
//     "Metatarsal 4: The Fourth Metatarsal: The bone on the outer side of the foot, helping distribute weight and maintain balance.": "Metatarsal 4: tulang di sisi luar kaki yang membantu mendistribusikan beban dan menjaga keseimbangan.",
//     "Heel: The Heel: The back part of the foot that supports body weight and provides stability when standing.": "Tumit: bagian belakang kaki yang menopang berat badan dan memberikan stabilitas saat berdiri.",

//     "STABLE": "STABIL",
//     "MODERATE": "SEDANG",
//     "UNSTABLE": "TIDAK STABIL",
//     "Unknown": "Tidak Diketahui",

//     "Front": "Depan",
//     "Back": "Belakang",
//     "Left": "Kiri",
//     "Right": "Kanan",
//     "Moderately Stable": "Cukup Stabil",
//     "Unstable": "Tidak Stabil",
//     "Tending to": "Cenderung ke",
//     "Balance: Very Good (Normal)": "Keseimbangan: Sangat Baik (Normal)",

//     "Last Snapshot": "Snapshot Terakhir",
//     "years": "tahun",
//     "times": "kali",
//     "snapshot": "snapshot",
//     "data": "data",
//     "Loading history...": "Memuat riwayat...",
//     "No snapshot available.": "Belum ada snapshot.",
//     "Plantar Pressure and CoP Stability Analysis Report": "Laporan Analisis Tekanan Plantar dan Stabilitas CoP",
//     "Plantar Examination Report": "Laporan Pemeriksaan Plantar",
//     "Printed": "Dicetak",
//     "Data Period": "Periode data",
//     "Total Snapshots": "Total Snapshot",
//     "Patient Information": "Informasi Pasien",
//     "Patient Identity": "Identitas Pasien",
//     "Anthropometry": "Antropometri",
//     "Number of Examinations": "Jumlah Pemeriksaan",
//     "Last Status": "Status Terakhir",
//     "Patient Conclusion": "Kesimpulan Pasien",
//     "History Summary": "Ringkasan Riwayat",
//     "Snapshots Need Attention": "Snapshot Perlu Perhatian",
//     "Snapshot Detail": "Detail Snapshot",
//     "Left Structure": "Struktur Kiri",
//     "Right Structure": "Struktur Kanan",
//     "Latest CoP": "CoP Terbaru",
//     "Left Foot": "Kaki Kiri",
//     "Right Foot": "Kaki Kanan",
//     "Structure": "Struktur",
//     "Movement": "Gerakan",
//     "Notes": "Catatan",
//     "Stability": "Stabilitas",
//     "CSV successfully exported": "CSV berhasil diekspor",
//     "Pop-up blocked by browser. Please allow pop-ups for this page.": "Pop-up diblokir oleh browser. Izinkan pop-up untuk halaman ini.",
//     "Chart displays the entire CoP history": "Grafik menampilkan seluruh riwayat CoP",
//     "Status label only shows the last snapshot": "Label status hanya menampilkan snapshot terakhir",
//     "Time": "Waktu",
//     "CoP": "CoP",
//     "Data Not Available": "Data Tidak Tersedia",
//     "No snapshot available for analysis.": "Belum ada snapshot yang tersedia untuk dianalisis.",
//     "No CoP data available": "Data CoP tidak tersedia",
//     "Plantar Pressure Analysis and CoP Stability Report": "Laporan Analisis Tekanan Plantar dan Stabilitas CoP",
//     "Height": "Tinggi Badan",
//     "Weight": "Berat Badan",
//     "Phone": "Telepon",
//     "Snapshot": "Snapshot",

//     "Notes: This Report summarizes the results of plantar pressure readings, foot structure patterns, foot movements, and body stability based on snapshot data. The results are for initial reference only and should be confirmed through clinical examination if abnormal patterns are found.": "Catatan: Laporan ini merangkum hasil pembacaan tekanan plantar, pola struktur kaki, gerakan kaki, dan stabilitas tubuh berdasarkan data snapshot. Hasil ini hanya sebagai referensi awal dan perlu dikonfirmasi melalui pemeriksaan klinis apabila ditemukan pola abnormal.",

//     "generally normal": "secara umum normal",
//     "dominant": "dominan",
//     "Structure generally normal": "Struktur secara umum normal",
//     "Movement generally normal": "Gerakan secara umum normal",
//     "Stability requires attention": "Stabilitas memerlukan perhatian",
//     "Condition generally good": "Kondisi secara umum baik",

//     "Please fill in all fields.": "Semua kolom wajib diisi.",
//     "Full name must not exceed 80 characters.": "Nama lengkap tidak boleh lebih dari 80 karakter.",
//     "Passwords do not match.": "Konfirmasi kata sandi tidak sesuai.",
//     "Password must be at least 8 characters long.": "Kata sandi minimal harus 8 karakter.",
//     "Min. 8 characters": "Min. 8 karakter",
//     "Confirm password": "Konfirmasi kata sandi",

//     "Full Name as on ID Card": "Nama lengkap sesuai kartu identitas",
//     "Years": "Tahun",
//     "yrs": "th",
//     "Please fill in all fields.": "Semua kolom wajib diisi.",
//     "Incomplete data. Please return to step 1.": "Data belum lengkap. Silakan kembali ke langkah 1.",
//     "Registering...": "Mendaftarkan...",
//     "Email already registered. Please sign in.": "Email sudah terdaftar. Silakan masuk.",
//     "Password too weak.": "Kata sandi terlalu lemah.",
//     "Invalid email format.": "Format email tidak valid.",
//     "yrs": "th",
//     "Step 3 of 3": "Langkah 3 dari 3",
//     "Account Data": "Data Akun",
//     "Personal Data": "Data Diri",
//     "Date of Birth / Age": "Tanggal Lahir / Usia",
//     "Height / Weight": "Tinggi / Berat Badan",
//     "Register Now": "Daftar Sekarang"
// };

  const TEXT = {
    // GENERAL
    "Loading...": "Memuat...",
    "Foot Plantar Monitoring": "Foot Plantar Monitoring",
    "Foot plantar pressure monitoring": "Pemantauan tekanan telapak kaki",

    // PAGE TITLES
    "Sign In — Foot Plantar Monitoring": "Masuk — Foot Plantar Monitoring",
    "Register — Foot Plantar Monitoring": "Daftar — Foot Plantar Monitoring",
    "Register — Personal Data": "Daftar — Data Diri",
    "Register — Confirmation": "Daftar — Konfirmasi",
    "Dashboard — Foot Plantar Monitoring": "Dasbor — Foot Plantar Monitoring",
    "Report — Foot Plantar Monitoring": "Laporan — Foot Plantar Monitoring",

    // AUTH / LOGIN / REGISTER
    "Sign In to Account": "Masuk ke Akun",
    "Use your email and password": "Gunakan email dan kata sandi kamu",
    "Email": "Email",
    "Password": "Kata Sandi",
    "Confirm Password": "Konfirmasi Kata Sandi",
    "Phone Number": "Nomor Telepon",
    "Sign In": "Masuk",
    "Register now": "Daftar sekarang",
    "Don't have an account?": "Belum punya akun?",
    "Already have an account?": "Sudah punya akun?",
    "Register Account": "Daftar Akun",
    "Step 1 of 3": "Langkah 1 dari 3",
    "Step 2 of 3": "Langkah 2 dari 3",
    "Step 3 of 3": "Langkah 3 dari 3",
    "Account": "Akun",
    "Personal Data": "Data Diri",
    "Confirmation": "Konfirmasi",
    "Continue →": "Lanjut →",
    "Full Name": "Nama Lengkap",
    "Full Name as on ID Card": "Nama lengkap sesuai kartu identitas",
    "Date of Birth": "Tanggal Lahir",
    "Age": "Usia",
    "Gender": "Jenis Kelamin",
    "Male": "Laki-laki",
    "Female": "Perempuan",
    "Height (cm)": "Tinggi Badan (cm)",
    "Weight (kg)": "Berat Badan (kg)",
    "Years": "Tahun",
    "years": "tahun",
    "yrs": "th",
    "Please review your data before saving.": "Periksa kembali data kamu sebelum disimpan.",
    "Account Data": "Data Akun",
    "Name": "Nama",
    "Date of Birth / Age": "Tanggal Lahir / Usia",
    "Height / Weight": "Tinggi / Berat Badan",
    "Register Now": "Daftar Sekarang",
    "Registering...": "Mendaftarkan...",
    "Min. 8 characters": "Min. 8 karakter",
    "Confirm password": "Konfirmasi kata sandi",

    // AUTH ERRORS
    "Please fill in all fields.": "Semua kolom wajib diisi.",
    "Please fill in both email and password.": "Email dan kata sandi wajib diisi.",
    "Full name must not exceed 80 characters.": "Nama lengkap tidak boleh lebih dari 80 karakter.",
    "Passwords do not match.": "Konfirmasi kata sandi tidak sesuai.",
    "Password must be at least 8 characters long.": "Kata sandi minimal harus 8 karakter.",
    "Incomplete data. Please return to step 1.": "Data belum lengkap. Silakan kembali ke langkah 1.",
    "Signing in...": "Sedang masuk...",
    "Email is not registered.": "Email belum terdaftar.",
    "Email already registered. Please sign in.": "Email sudah terdaftar. Silakan masuk.",
    "Incorrect password.": "Kata sandi salah.",
    "Password too weak.": "Kata sandi terlalu lemah.",
    "Invalid email format.": "Format email tidak valid.",
    "Email or password is incorrect.": "Email atau kata sandi salah.",
    "Too many attempts. Please try again later.": "Terlalu banyak percobaan. Coba lagi nanti.",

    // TOPBAR / NAVIGATION
    "Dashboard": "Dasbor",
    "Report": "Laporan",
    "Take Snapshot": "Ambil Snapshot",
    "Logout": "Keluar",
    "Patient": "Pasien",

    // DASHBOARD STATIC TEXT
    "MONITORING": "MONITORING",
    "HEATMAP": "HEATMAP",
    "PLANTAR PRESSURE MAP": "PETA TEKANAN PLANTAR",
    "4 Sensor Distribution": "Distribusi 4 Sensor",
    "LEFT": "KIRI",
    "RIGHT": "KANAN",
    "Left": "Kiri",
    "Right": "Kanan",
    "FRONT": "DEPAN",
    "BACK": "BELAKANG",
    "Front": "Depan",
    "Back": "Belakang",
    "Low": "Rendah",
    "High": "Tinggi",
    "METRICS": "METRIK",
    "L/R Symmetry": "Simetri Kiri/Kanan",
    "minimum threshold 85%": "ambang minimum 85%",
    "POSTURE": "POSTUR",
    "POSTURE DETECTION": "DETEKSI POSTUR",
    "ML Active": "ML Aktif",
    "Detecting...": "Mendeteksi...",
    "Waiting for foot...": "Menunggu kaki...",
    "Stabilizing...": "Menstabilkan...",
    "Model not available": "Model tidak tersedia",
    "ANALISIS": "ANALISIS",
    "POSTURE STABILITY (CoP)": "STABILITAS POSTUR (CoP)",
    "Analyzing...": "Menganalisis...",
    "Waiting for data...": "Menunggu data...",
    "Stability": "Stabilitas",
    "LEFT FOOT": "KAKI KIRI",
    "RIGHT FOOT": "KAKI KANAN",
    "STRUCTURE (ARCH)": "STRUKTUR (LENGKUNG KAKI)",
    "MOVEMENT (POSITION)": "GERAKAN (POSISI)",
    "Please stand upright on the sensor to begin the analysis...": "Silakan berdiri tegak di atas sensor untuk memulai analisis...",

    // REPORT STATIC TEXT
    "PROFILE": "PROFIL",
    "Contact": "Kontak",
    "PERSONAL DATA": "DATA DIRI",
    "PATIENT CONCLUSION": "KESIMPULAN PASIEN",
    "Latest Snapshot: —": "Snapshot Terbaru: —",
    "There is no snapshot available for analysis.": "Belum ada snapshot yang tersedia untuk dianalisis.",
    "Left Foot Structure": "Struktur Kaki Kiri",
    "Left Foot Movement": "Gerakan Kaki Kiri",
    "Right Foot Structure": "Struktur Kaki Kanan",
    "Right Foot Movement": "Gerakan Kaki Kanan",
    "CoP Stability": "Stabilitas CoP",
    "Total Snapshots": "Total Snapshot",
    "CoP HISTORY": "RIWAYAT CoP",
    "Waiting for latest CoP data...": "Menunggu data CoP terbaru...",
    "SUMMARY OF HISTORY": "RINGKASAN RIWAYAT",
    "Stable Snapshots": "Snapshot Stabil",
    "Snapshots Requiring Attention": "Snapshot Perlu Perhatian",
    "Dominant Structure": "Struktur Dominan",
    "Dominant Movement": "Gerakan Dominan",
    "SNAPSHOT HISTORY": "RIWAYAT SNAPSHOT",
    "PDF Report": "Laporan PDF",
    "📄 PDF Report": "📄 Laporan PDF",
    "Delete All History": "Hapus Semua Riwayat",
    "🗑️ Delete All History": "🗑️ Hapus Semua Riwayat",

    // MODAL / BUTTONS
    "Confirm": "Konfirmasi",
    "Cancel": "Batal",
    "Delete": "Hapus",
    "Save": "Simpan",
    "💾 Save": "💾 Simpan",
    "Yes, Logout": "Ya, Keluar",
    "Logout from Account?": "Keluar dari Akun?",
    "Monitoring sessions will remain saved.": "Sesi monitoring akan tetap tersimpan.",
    "You can log back in at any time.": "Kamu bisa masuk kembali kapan saja.",
    "⏺ Take Snapshot": "⏺ Ambil Snapshot",
    "Note (optional)": "Catatan (opsional)",
    "💬  Note (optional)": "💬  Catatan (opsional)",
    "Saving CoP, foot structure, movement, and sensor data to history": "Menyimpan data CoP, struktur kaki, gerakan, dan sensor ke riwayat",
    "Example: before therapy, pain condition, etc...": "Contoh: sebelum terapi, kondisi nyeri, dan sebagainya...",
    "Enter password": "Masukkan kata sandi",

    // POSTURE / ML
    "Normal": "Normal",
    "Forward Lean": "Condong ke Depan",
    "Backward Lean": "Condong ke Belakang",
    "Left Lean": "Condong ke Kiri",
    "Right Lean": "Condong ke Kanan",
    "Not Detected": "Belum Terdeteksi",
    "Not Detected Yet": "Belum Terdeteksi",
    "Not Read Yet": "Belum Terbaca",
    "Standing": "Berdiri",
    "Posture": "Postur",

    // POSTURE NOTES
    "The system is currently reading foot pressure patterns to detect posture tendencies.": "Sistem sedang membaca pola tekanan kaki untuk mendeteksi kecenderungan postur.",
    "The system is reading the foot pressure pattern to detect posture tendencies.": "Sistem sedang membaca pola tekanan kaki untuk mendeteksi kecenderungan postur.",
    "The pressure pattern indicates a relatively balanced weight distribution.": "Pola tekanan menunjukkan distribusi berat yang relatif seimbang.",
    "The pressure pattern indicates a tendency for the body weight to shift forward.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke depan.",
    "The pressure pattern indicates a tendency for the body weight to shift backward.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke belakang.",
    "The pressure pattern indicates a tendency for the body weight to shift to the left side.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke sisi kiri.",
    "The pressure pattern indicates a tendency for the body weight to shift to the right side.": "Pola tekanan menunjukkan kecenderungan berat tubuh bergeser ke sisi kanan.",
    "The posture data is not clear enough. The reading can be repeated to better observe the pressure pattern.": "Data postur belum cukup jelas. Pembacaan dapat diulang untuk mengamati pola tekanan dengan lebih baik.",

    // FOOT DIAGNOSIS
    "Normal Foot": "Kaki Normal",
    "Flat Foot": "Kaki Datar",
    "High Arch": "Lengkung Kaki Tinggi",
    "Overpronation": "Overpronasi",
    "Supination": "Supinasi",
    "Supinasi": "Supinasi",
    "Hollow foot": "Lengkung kaki tinggi",
    "Fallen arch": "Lengkung kaki turun",
    "Normal foot": "Kaki normal",

    "Foot flat, but the weight distribution is stable in the center.": "Kaki datar, tetapi distribusi berat stabil di bagian tengah.",
    "Flat foot and the weight distribution is tilted inward.": "Kaki datar dan distribusi berat cenderung miring ke bagian dalam.",
    "Flat foot, but the weight distribution tends to shift to the outer side.": "Kaki datar, tetapi distribusi berat cenderung bergeser ke sisi luar.",
    "High arch, but the weight distribution is stable in the center.": "Lengkung kaki tinggi, tetapi distribusi berat stabil di bagian tengah.",
    "High arch and the weight distribution is tilted inward.": "Lengkung kaki tinggi dan distribusi berat cenderung miring ke bagian dalam.",
    "High arch and the weight distribution tends to shift to the outer side.": "Lengkung kaki tinggi dan distribusi berat cenderung bergeser ke sisi luar.",
    "Ideal foot, structure and weight distribution are very balanced.": "Kaki ideal, struktur dan distribusi berat sangat seimbang.",
    "Normal shape, but the weight distribution tends to tilt inward.": "Bentuk kaki normal, tetapi distribusi berat cenderung miring ke bagian dalam.",
    "Normal shape, but the weight distribution tends to tilt outward.": "Bentuk kaki normal, tetapi distribusi berat cenderung miring ke bagian luar.",

    // COP / STATUS
    "STABLE": "STABIL",
    "MODERATE": "SEDANG",
    "UNSTABLE": "TIDAK STABIL",
    "ABNORMAL": "ABNORMAL",
    "NO DATA AVAILABLE": "DATA TIDAK TERSEDIA",
    "DATA NOT AVAILABLE": "DATA TIDAK TERSEDIA",
    "Data Not Available": "Data Tidak Tersedia",
    "Unknown": "Tidak Diketahui",
    "No data available": "Data tidak tersedia",
    "No CoP data available": "Data CoP tidak tersedia",
    "Balance: Very Good (Normal)": "Keseimbangan: Sangat Baik (Normal)",
    "Moderately Stable": "Cukup Stabil",
    "Unstable": "Tidak Stabil",
    "Tending to": "Cenderung ke",

    // SENSOR LABELS
    "Hallux": "Ibu Jari",
    "Metatarsal 1": "Metatarsal 1",
    "Metatarsal 4": "Metatarsal 4",
    "Heel": "Tumit",
    "Hallux: The Big Toe: The largest toe on the foot, assisting in balance and propulsion during walking.": "Hallux / ibu jari kaki: jari terbesar pada kaki yang membantu keseimbangan dan dorongan saat berjalan.",
    "Metatarsal 1: The First Metatarsal: The bone connecting the big toe to the midfoot, bearing significant load during standing and walking.": "Metatarsal 1: tulang yang menghubungkan ibu jari kaki dengan bagian tengah kaki, berperan menahan beban saat berdiri dan berjalan.",
    "Metatarsal 4: The Fourth Metatarsal: The bone on the outer side of the foot, helping distribute weight and maintain balance.": "Metatarsal 4: tulang di sisi luar kaki yang membantu mendistribusikan beban dan menjaga keseimbangan.",
    "Heel: The Heel: The back part of the foot that supports body weight and provides stability when standing.": "Tumit: bagian belakang kaki yang menopang berat badan dan memberikan stabilitas saat berdiri.",

    // SNAPSHOT / HISTORY ACTIONS
    "Snapshot saved": "Snapshot berhasil disimpan",
    "Snapshot failed to save": "Snapshot gagal disimpan",
    "Delete this snapshot?": "Hapus snapshot ini?",
    "Delete all snapshots? This action cannot be undone.": "Hapus semua snapshot? Tindakan ini tidak dapat dibatalkan.",
    "Snapshot deleted": "Snapshot berhasil dihapus",
    "Failed to delete snapshot": "Gagal menghapus snapshot",
    "All history has been cleared": "Semua riwayat berhasil dibersihkan",
    "Failed to delete history": "Gagal menghapus riwayat",
    "No snapshots available for deletion.": "Tidak ada snapshot untuk dihapus.",
    "No snapshots available for export.": "Tidak ada snapshot untuk diekspor.",
    "Opening PDF report...": "Membuka laporan PDF...",
    "Sensor data not available.": "Data sensor tidak tersedia.",
    "Snapshot ID not found.": "ID snapshot tidak ditemukan.",
    "Export feature is available after Firebase integration.": "Fitur export tersedia setelah integrasi Firebase.",
    "CSV successfully exported": "CSV berhasil diekspor",
    "Pop-up blocked by browser. Please allow pop-ups for this page.": "Pop-up diblokir oleh browser. Izinkan pop-up untuk halaman ini.",

    // REPORT CONCLUSION
    "Good Patient Condition": "Kondisi Pasien Baik",
    "Indication of Foot Abnormality": "Indikasi Kelainan Kaki",
    "Monitoring Required": "Perlu Pemantauan",
    "Attention Needed": "Perlu Perhatian",
    "Structure, movement, and CoP stability are generally good.": "Struktur, gerakan, dan stabilitas CoP secara umum baik.",
    "Condition requires monitoring, especially CoP stability.": "Kondisi memerlukan pemantauan, terutama stabilitas CoP.",
    "Stability is still good, but structural/movement abnormalities still need to be noted.": "Stabilitas masih baik, tetapi kelainan struktur atau gerakan tetap perlu diperhatikan.",
    "There are indications of foot abnormalities, but the latest CoP is still stable.": "Terdapat indikasi kelainan kaki, tetapi CoP terbaru masih stabil.",
    "Condition requires monitoring through subsequent snapshots.": "Kondisi memerlukan pemantauan melalui snapshot berikutnya.",
    "Further examination is recommended if this pattern occurs repeatedly.": "Pemeriksaan lanjutan disarankan jika pola ini terjadi berulang.",
    "There are indications of stability issues or foot abnormalities that need attention.": "Terdapat indikasi masalah stabilitas atau kelainan kaki yang perlu diperhatikan.",
    "CoP data is not sufficient to conclude stability.": "Data CoP belum cukup untuk menyimpulkan stabilitas.",
    "Body weight pressure points are far from the center of pressure. There are signs of stability issues.": "Titik tekanan berat tubuh berada jauh dari pusat tekanan. Terdapat tanda masalah stabilitas.",
    "Body weight pressure points are slightly offset from the center. Stability is acceptable but requires monitoring.": "Titik tekanan berat tubuh sedikit bergeser dari pusat. Stabilitas masih dapat diterima, tetapi perlu dipantau.",
    "Body weight pressure points are near the center of pressure. Body stability is generally good.": "Titik tekanan berat tubuh berada dekat dengan pusat tekanan. Stabilitas tubuh secara umum baik.",

    // REPORT / PDF LABELS
    "Last Snapshot": "Snapshot Terakhir",
    "Chart displays the entire CoP history": "Grafik menampilkan seluruh riwayat CoP",
    "Status label only shows the last snapshot": "Label status hanya menampilkan snapshot terakhir",
    "Time": "Waktu",
    "CoP": "CoP",
    "Plantar Pressure and CoP Stability Analysis Report": "Laporan Analisis Tekanan Plantar dan Stabilitas CoP",
    "Plantar Pressure Analysis and CoP Stability Report": "Laporan Analisis Tekanan Plantar dan Stabilitas CoP",
    "Plantar Examination Report": "Laporan Pemeriksaan Plantar",
    "Printed": "Dicetak",
    "Data Period": "Periode data",
    "Patient Information": "Informasi Pasien",
    "Patient Identity": "Identitas Pasien",
    "Anthropometry": "Antropometri",
    "Number of Examinations": "Jumlah Pemeriksaan",
    "Last Status": "Status Terakhir",
    "Patient Conclusion": "Kesimpulan Pasien",
    "History Summary": "Ringkasan Riwayat",
    "Snapshots Need Attention": "Snapshot Perlu Perhatian",
    "Snapshot Detail": "Detail Snapshot",
    "Left Structure": "Struktur Kiri",
    "Right Structure": "Struktur Kanan",
    "Left Movement": "Gerakan Kiri",
    "Right Movement": "Gerakan Kanan",
    "Latest CoP": "CoP Terbaru",
    "Left Foot": "Kaki Kiri",
    "Right Foot": "Kaki Kanan",
    "Structure": "Struktur",
    "Movement": "Gerakan",
    "Notes": "Catatan",
    "Height": "Tinggi Badan",
    "Weight": "Berat Badan",
    "Phone": "Telepon",
    "Snapshot": "Snapshot",
    "snapshot": "snapshot",
    "data": "data",
    "times": "kali",
    "Total Snapshots": "Total Snapshot",

    "Notes: This Report summarizes the results of plantar pressure readings, foot structure patterns, foot movements, and body stability based on snapshot data. The results are for initial reference only and should be confirmed through clinical examination if abnormal patterns are found.": "Catatan: Laporan ini merangkum hasil pembacaan tekanan plantar, pola struktur kaki, gerakan kaki, dan stabilitas tubuh berdasarkan data snapshot. Hasil ini hanya sebagai referensi awal dan perlu dikonfirmasi melalui pemeriksaan klinis apabila ditemukan pola abnormal.",

    // DOMINANT SUMMARY
    "generally normal": "secara umum normal",
    "dominant": "dominan",
    "Structure generally normal": "Struktur secara umum normal",
    "Movement generally normal": "Gerakan secara umum normal",
    "Stability requires attention": "Stabilitas memerlukan perhatian",
    "Condition generally good": "Kondisi secara umum baik"
  };

  const REVERSE_TEXT = {};
  Object.keys(TEXT).forEach(function (en) {
    REVERSE_TEXT[TEXT[en]] = en;
  });

  const originalTextNode = new WeakMap();
  const originalAttr = new WeakMap();

  const IGNORE_SELECTOR =
    "script, style, noscript, textarea, code, pre, canvas, svg, #lang-switcher, [data-no-translate]";

  let isApplying = false;
  let observerTimer = null;

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || "en";
  }

  function getEnglishSource(text) {
    const clean = String(text || "").trim();
    return REVERSE_TEXT[clean] || clean;
  }

  function getTranslated(source) {
    if (getLang() === "id") {
      return TEXT[source] || source;
    }

    return source;
  }

  function shouldSkipNode(node) {
    if (!node || !node.parentElement) return true;
    return !!node.parentElement.closest(IGNORE_SELECTOR);
  }

  function translateTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(function (node) {
      const raw = node.nodeValue;
      const clean = raw.trim();

      if (!clean) return;

      const savedSource = originalTextNode.get(node);
      const savedTranslated = savedSource ? TEXT[savedSource] : null;

      if (!savedSource || (clean !== savedSource && clean !== savedTranslated)) {
        originalTextNode.set(node, getEnglishSource(clean));
      }

      const source = originalTextNode.get(node);
      const nextText = getTranslated(source);

      if (clean !== nextText) {
        node.nodeValue = raw.replace(clean, nextText);
      }
    });
  }

  function translateAttributes() {
    const attrs = ["placeholder", "title", "aria-label"];

    document.querySelectorAll("*").forEach(function (el) {
      if (el.closest(IGNORE_SELECTOR)) return;

      attrs.forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;

        let store = originalAttr.get(el);
        if (!store) {
          store = {};
          originalAttr.set(el, store);
        }

        const current = el.getAttribute(attr);
        const clean = current.trim();

        if (!clean) return;

        const savedSource = store[attr];
        const savedTranslated = savedSource ? TEXT[savedSource] : null;

        if (!savedSource || (clean !== savedSource && clean !== savedTranslated)) {
          store[attr] = getEnglishSource(clean);
        }

        const nextValue = getTranslated(store[attr]);

        if (clean !== nextValue) {
          el.setAttribute(attr, current.replace(clean, nextValue));
        }
      });
    });
  }

  function translateTitle() {
    const currentTitle = document.title.trim();

    if (!document.documentElement.dataset.originalTitle) {
      document.documentElement.dataset.originalTitle = getEnglishSource(currentTitle);
    }

    const source = document.documentElement.dataset.originalTitle;
    document.title = getTranslated(source);
  }

  function flag(lang) {
    return `<span class="fi fi-${lang === 'id' ? 'id' : 'gb'} fis"></span>`;
  }

  function label(lang) {
    return lang === "id" ? "Indonesia" : "English";
  }

  function shortLabel(lang) {
    return lang === "id" ? "Indonesia" : "English";
  }

  function switcherHTML() {
    const current = getLang();
    const other = current === "en" ? "id" : "en";

    return `
      <button class="lang-toggle" type="button" aria-label="Change language" data-no-translate>
        <span class="lang-flag">${flag(current)}</span>
        <span class="lang-label">${shortLabel(current)}</span>
        <span class="lang-arrow">▾</span>
      </button>

      <div class="lang-dropdown" data-no-translate>
        <button class="lang-choice" type="button" data-lang="${other}">
          <span class="lang-choice-flag">${flag(other)}</span>
          <span class="lang-choice-name">${label(other)}</span>
        </button>
      </div>
    `;
  }

  function mountSwitcher() {
    let box = document.getElementById("lang-switcher");

    if (!box) {
      box = document.createElement("div");
      box.id = "lang-switcher";
      box.className = "lang-switcher";
      box.setAttribute("data-no-translate", "true");
    }

    const topbarRight = document.querySelector(".topbar-right");

    if (topbarRight) {
      box.classList.remove("lang-fixed");
      box.classList.add("lang-in-topbar");

      if (!topbarRight.contains(box)) {
        topbarRight.prepend(box);
      }
    } else {
      box.classList.remove("lang-in-topbar");
      box.classList.add("lang-fixed");

      if (!document.body.contains(box)) {
        document.body.prepend(box);
      }
    }

    updateSwitcher();
  }

  function updateSwitcher() {
    const box = document.getElementById("lang-switcher");
    if (!box) return;

    const lang = getLang();

    if (box.dataset.lang !== lang || !box.innerHTML.trim()) {
      box.dataset.lang = lang;
      box.innerHTML = switcherHTML();
    }
  }

  function closeSwitcher() {
    const box = document.getElementById("lang-switcher");
    if (box) box.classList.remove("open");
  }

  function applyLanguage() {
    if (!document.body) return;

    isApplying = true;

    mountSwitcher();
    translateTitle();
    translateTextNodes();
    translateAttributes();

    document.documentElement.lang = getLang() === "id" ? "id" : "en";

    requestAnimationFrame(function () {
      isApplying = false;
    });
  }

  document.addEventListener(
    "click",
    function (e) {
      const toggle = e.target.closest(".lang-toggle");
      const choice = e.target.closest(".lang-choice");
      const switcher = e.target.closest("#lang-switcher");

      if (toggle) {
        e.preventDefault();
        e.stopPropagation();

        const box = document.getElementById("lang-switcher");
        if (box) box.classList.toggle("open");

        return;
      }

      if (choice) {
          e.preventDefault();
          e.stopPropagation();

          const selectedLang = choice.getAttribute("data-lang");
          localStorage.setItem(STORAGE_KEY, selectedLang);

          closeSwitcher();
          updateSwitcher();
          applyLanguage();

          window.dispatchEvent(
              new CustomEvent("languagechange", {
              detail: { lang: selectedLang }
              })
          );

          return;
      }

      if (!switcher) {
        closeSwitcher();
      }
    },
    true
  );

  document.addEventListener("DOMContentLoaded", function () {
    applyLanguage();

    const observer = new MutationObserver(function () {
      if (isApplying) return;

      clearTimeout(observerTimer);
      observerTimer = setTimeout(function () {
        applyLanguage();
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  function translateString(value) {
    if (value === null || value === undefined) return value;

    const raw = String(value);
    const clean = raw.trim();

    if (!clean) return value;

    const source = REVERSE_TEXT[clean] || clean;
    const translated = getLang() === "id" ? (TEXT[source] || source) : source;

    return raw.replace(clean, translated);
  }

  window.tr = function (text) {
    return translateString(text);
  };

  window.et = function (text) {
    const translated = translateString(text);

    return String(translated ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  window.simpleLang = {
    apply: applyLanguage,

    t: translateString,

    set: function (lang) {
      localStorage.setItem(STORAGE_KEY, lang);
      updateSwitcher();
      applyLanguage();

      window.dispatchEvent(
          new CustomEvent("languagechange", {
          detail: { lang: lang }
          })
      );
  },

    get: getLang,

    add: function (englishText, indonesiaText) {
      TEXT[englishText] = indonesiaText;
      REVERSE_TEXT[indonesiaText] = englishText;
      applyLanguage();
    }
  };
})();