# Arsitektur Aplikasi ArenaGo

Dokumentasi ini menjelaskan standar arsitektur backend, pola desain (design pattern), dan struktur kode yang diterapkan pada aplikasi **ArenaGo**.

---

## Pola Desain (Design Patterns)

### 1. Model-View-Controller (MVC)
Aplikasi memisahkan tanggung jawab (separation of concerns) ke dalam tiga layer utama:
- **Model / Database Layer**: Struktur database PostgreSQL yang diatur melalui DDL schema dan dipetakan ke repositori Javascript.
- **View / Frontend**: Berkas HTML statis, Vanilla CSS3 premium, dan ES6 Javascript (`fetch` API) yang berjalan murni di sisi browser.
- **Controller / REST API Controller**: Mengatur logika penanganan HTTP request, validasi input, dan parsing format JSON response.

### 2. Repository Pattern (Database Abstraction)
Untuk mempermudah pemeliharaan database dan memisahkan logika kueri SQL dari service layer, ArenaGo menggunakan **Repository Pattern**:
- `BaseRepository.js` mendefinisikan kueri CRUD generik (insert, update, delete, findById).
- Repositori khusus (contoh: `UserRepository.js`, `BookingRepository.js`) mewarisi base repositori dan menambahkan kueri SQL spesifik yang teroptimasi.

### 3. Service Layer (Business Logic encapsulation)
Seluruh aturan bisnis (seperti pengecekan bentrok slot sewa, perhitungan dynamic pricing, pembatalan pembayaran) diisolasi di dalam folder `services/` (contoh: `BookingService.js`, `AuthService.js`). Controller hanya mendelegasikan perintah kepada Service.

---

## Middleware & Keamanan

### 1. RBAC (Role-Based Access Control)
Keamanan rute diatur menggunakan token JWT ganda (Access Token + Refresh Token):
- `middlewares/auth.js` memverifikasi masa berlaku access token di dalam header Authorization.
- `middlewares/rbac.js` membandingkan hak akses (permission) yang dimiliki peran pengguna (role) dengan hak akses minimum yang disyaratkan oleh endpoint rute bersangkutan.

### 2. Penanganan Error Global (Global Error Handler)
- `middlewares/notFound.js` menangkap seluruh rute yang tidak terdaftar dan membalas dengan status 404.
- `middlewares/errorHandler.js` menangkap kegagalan logika internal (error 500) dan menormalkan format JSON error sehingga tidak membocorkan stack trace sistem di mode production.

---

## Layanan Asinkronus & Event-Driven

### 1. Event Emitter (`eventEmitter.js`)
Ketika terjadi aksi krusial (seperti booking baru dibuat atau status sewa diverifikasi), service memicu event asinkronus menggunakan Node.js `EventEmitter`. Pendengar event (`bookingListener.js`) menangkap sinyal tersebut untuk mencatat log audit sistem ke file `storage/logs/app.log`.

### 2. Penjadwal Background (Cron Scheduler)
Menggunakan pustaka `node-cron` untuk memproses tugas berkala di latar belakang:
- **`bookingExpiredJob.js`**: Mengecek seluruh pemesanan berstatus `pending` atau `waiting_payment` yang telah melewati batas toleransi 15 menit dan membatalkannya (`cancelled`) secara otomatis.
- **`cleanupJob.js`**: Membersihkan refresh token kedaluwarsa secara terjadwal di database.
