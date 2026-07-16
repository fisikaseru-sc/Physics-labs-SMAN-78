# 🔬 Laboratorium Virtual Interaktif - SMAN 78

Selamat datang di **Laboratorium Virtual Interaktif Fisika SMA**, sebuah proyek sumber terbuka yang didesain untuk merevolusi cara siswa SMA mempelajari konsep fisika yang abstrak menjadi visualisasi interaktif yang menyenangkan.

Repositori ini menaungi aplikasi web HTML5/JS murni (Vanilla) yang sangat ringan, responsif, dan dapat dijalankan langsung di *browser* modern mana pun tanpa memerlukan instalasi perangkat lunak atau database (*backend*).

## ✨ Fitur Utama

- **Arsitektur Modular:** Kode disusun dengan pemisahan yang jelas (HTML, CSS, JS) dengan sistem folder (scenes) berdasarkan topik pembelajaran.
- **Sistem Role Tanpa Database:** Menggunakan teknologi *LocalStorage* browser untuk menyimpan status "Terkunci/Terbuka" (Siswa vs Guru). Akses Guru dilindungi oleh PIN rahasia.
- **Simulasi Fisika Waktu Nyata:** Menggunakan *Canvas API* untuk merender dan menghitung fisika secara langsung (60 FPS) seperti gerak lurus berubah beraturan, sistem katrol, hingga luncuran roket.
- **Desain Modern & Responsif:** Antarmuka bergaya *Glassmorphism* dan mode gelap yang *eye-catching*.

## 📚 Topik Pembelajaran (Fase 1: Dinamika Gerak)

Modul saat ini difokuskan pada materi **Dinamika Gerak**, yang mencakup 7 pertemuan:
1. **Hukum I Newton:** Konsep resultan gaya, inersia, dan simulasi mendorong benda diam.
2. **Hukum II & III Newton:** Simulasi troli belanja ringan/berat, roket luar angkasa (Aksi-Reaksi), dan mobil rem mendadak.
3. **Jenis-jenis Gaya Spesifik** *(Dalam Pengembangan)*
4. **Analisis Bidang Miring** *(Dalam Pengembangan)*
5. **Aplikasi Katrol & Tegangan Tali** *(Dalam Pengembangan)*
6. **Kesetimbangan Partikel 2D** *(Dalam Pengembangan)*
7. **Projek Akhir** *(Dalam Pengembangan)*

*Modul Usaha & Energi, Fluida, serta Gelombang & Optik direncanakan pada rilis mendatang.*

## 🚀 Instalasi & Cara Penggunaan

Proyek ini sepenuhnya statis (*Frontend-only*). Anda bisa langsung membukanya tanpa perlu proses kompilasi.

1. **Clone Repositori:**
   ```bash
   git clone https://github.com/fisikaseru-sc/Physics-labs-SMAN-78.git
   ```
2. **Jalankan Server Lokal:**
   Sangat disarankan menggunakan server lokal untuk menghindari isu CORS saat memuat aset.
   ```bash
   # Jika menggunakan Python 3
   cd Physics-labs-SMAN-78
   python3 -m http.server 8000
   ```
3. **Akses Aplikasi:**
   Buka peramban web (*browser*) Anda dan navigasi ke `http://localhost:8000/`.
   

## 📝 Lisensi
Hak Cipta © 2026 PKM Fisika SMAN 78. Proyek ini dilisensikan di bawah Lisensi MIT.
