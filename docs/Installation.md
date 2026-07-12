# Panduan Instalasi & Menjalankan Aplikasi ArenaGo

Panduan ini membantu Anda melakukan instalasi sistem basis data, dependensi pustaka Node.js, hingga menjalankan server REST API ArenaGo secara lokal.

## Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
1. **Node.js** (Rekomendasi versi LTS 18 atau 20)
2. **NPM** (Bawaan Node.js)
3. **PostgreSQL Database** (Versi 13 ke atas)

---

## Langkah 1: Klon & Konfigurasi Berkas Lingkungan (.env)
Buat berkas bernama `.env` pada direktori root proyek `arenago/` (atau salin dari `.env.example`). Isi detail kredensial server PostgreSQL lokal Anda:

```env
APP_NAME=ArenaGo
APP_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=arenago
DB_USERNAME=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD

JWT_ACCESS_SECRET=arenago_jwt_secret_key_access_token_super_secret_key_2026
JWT_REFRESH_SECRET=arenago_jwt_secret_key_refresh_token_super_secret_key_2026
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

UPLOAD_PATH=backend/uploads
```

---

## Langkah 2: Instalasi Dependensi Node.js
Jalankan perintah npm install di command prompt/terminal pada direktori root untuk memasang seluruh dependensi backend & frontend:

```bash
npm install
```

---

## Langkah 3: Eksekusi Migrasi & Pengisian Data Awal (Seeding)
Gunakan utilitas Node seeder yang telah disediakan untuk membuat database `arenago`, menyusun struktur tabel, foreign keys, indeks, dan populasi records simulasi default:

```bash
node database/migrate.js
```

---

## Langkah 4: Jalankan Aplikasi
Anda dapat memilih mode eksekusi server:

### A. Mode Development (Rekomendasi untuk Coding)
Menjalankan backend menggunakan `nodemon` yang mendeteksi perubahan berkas secara otomatis:

```bash
npm run dev
```

### B. Mode Production
Menjalankan backend secara statis standar:

```bash
npm start
```

Server backend REST API akan mendengarkan di alamat `http://localhost:3000/`.

---

## Akun Demo Hasil Seeder (Seed User Accounts)
Untuk mempermudah pengujian alur multi-role RBAC, gunakan akun bawaan di bawah ini (seluruh akun menggunakan password: `password123`):

1. **Admin Sistem (Super User)**
   - Email: `admin@arenago.com`
   - Fitur: Kelola kategori olahraga global, bekukan/aktifkan akun pengguna, pantau komisi.

2. **Mitra Owner (Budi Sports Center Group)**
   - Email: `mitra@arenago.com`
   - Fitur: CRUD cabang, lapangan, dynamic pricing, kelola voucher diskon, persetujuan pembayaran sewa.

3. **Staff Cabang Operator (Budi Sports Ijen)**
   - Email: `staff@arenago.com`
   - Fitur: Operator check-in tiket customer di lokasi, scan QR code tiket via kamera, kelola jadwal.

4. **Customer (Roni)**
   - Email: `customer@arenago.com`
   - Fitur: Cari lapangan olahraga, pilih slot waktu 30-menit, checkout booking, upload bukti bayar, cetak invoice, tulis review rating.
