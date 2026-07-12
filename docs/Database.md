# Dokumentasi Database ArenaGo

Dokumentasi ini menjelaskan rancangan skema basis data PostgreSQL yang digunakan dalam platform marketplace penyewaan lapangan olahraga **ArenaGo**.

## Tipe Enum Kustom (Custom Enum Types)
Untuk memastikan integritas data, skema ini menggunakan beberapa tipe data enum:
- `user_role`: `'admin_sistem'`, `'mitra'`, `'staff_cabang'`, `'customer'`
- `user_status`: `'aktif'`, `'nonaktif'`
- `lapangan_status`: `'aktif'`, `'maintenance'`, `'tidak_aktif'`
- `booking_status`: `'pending'`, `'waiting_payment'`, `'waiting_verification'`, `'approved'`, `'checked_in'`, `'playing'`, `'completed'`, `'cancelled'`, `'rejected'`
- `payment_status`: `'pending'`, `'verified'`, `'rejected'`
- `discount_type`: `'persen'`, `'nominal'`
- `payment_method`: `'QRIS'`, `'Transfer Bank'`, `'Cash'`

---

## Tabel Skema

### 1. `permissions`
Menyimpan hak akses spesifik di dalam sistem.
- `id` (UUID, PK)
- `nama` (VARCHAR, Unique) - Nama hak akses (contoh: `mitra.manage`)
- `deskripsi` (TEXT)

### 2. `roles`
Menyimpan tingkat hak pengguna (peran).
- `id` (UUID, PK)
- `nama` (user_role, Unique)
- `deskripsi` (TEXT)

### 3. `role_permissions`
Tabel pivot mapping RBAC (Role-Based Access Control).
- `role_id` (UUID, FK -> `roles.id`)
- `permission_id` (UUID, FK -> `permissions.id`)

### 4. `users`
Data utama seluruh pengguna platform (Admin, Mitra, Staff, Customer).
- `id` (UUID, PK)
- `nama` (VARCHAR)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR) - Bcrypt hash
- `no_hp` (VARCHAR)
- `role` (user_role)
- `status` (user_status)
- `foto` (VARCHAR) - Filename avatar

### 5. `mitra_profile`
Profil data bisnis pemilik lapangan (mitra).
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `users.id`)
- `nama_perusahaan` (VARCHAR)
- `deskripsi` (TEXT)
- `alamat` (TEXT)
- `telepon` (VARCHAR)
- `commission_rate` (DECIMAL) - Potongan platform (default 10%)
- `status_verifikasi` (VARCHAR)

### 6. `cabang`
Lokasi sports center atau cabang mitra.
- `id` (UUID, PK)
- `mitra_id` (UUID, FK -> `users.id`)
- `nama` (VARCHAR)
- `alamat` (TEXT)
- `kota` (VARCHAR)
- `telepon` (VARCHAR)
- `status` (user_status)

### 7. `staff_cabang`
Tabel penugasan akun staff cabang operator ke suatu lokasi cabang.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `users.id`)
- `cabang_id` (UUID, FK -> `cabang.id`)

### 8. `kategori`
Kategori cabang olahraga global (Futsal, Badminton, Basket, dll).
- `id` (UUID, PK)
- `nama` (VARCHAR, Unique)
- `icon` (VARCHAR) - Bootstrap icon class
- `gambar` (VARCHAR)

### 9. `lapangan`
Unit lapangan olahraga di dalam cabang.
- `id` (UUID, PK)
- `cabang_id` (UUID, FK -> `cabang.id`)
- `kategori_id` (UUID, FK -> `kategori.id`)
- `nama` (VARCHAR)
- `harga_per_jam` (DECIMAL)
- `kapasitas` (VARCHAR)
- `ukuran` (VARCHAR)
- `jenis_lantai` (VARCHAR)
- `tipe` (VARCHAR) - `'indoor'` / `'outdoor'`
- `status` (lapangan_status)

### 10. `harga_lapangan` (Dynamic Pricing Overrides)
Skema harga kustom berbasis jam/hari.
- `id` (UUID, PK)
- `lapangan_id` (UUID, FK -> `lapangan.id`)
- `hari` (INT) - 0 (Minggu) - 6 (Sabtu)
- `jam_mulai` (TIME)
- `jam_selesai` (TIME)
- `harga` (DECIMAL)

### 11. `booking`
Transaksi penyewaan lapangan oleh customer.
- `id` (UUID, PK)
- `kode_booking` (VARCHAR, Unique)
- `user_id` (UUID, FK -> `users.id`)
- `lapangan_id` (UUID, FK -> `lapangan.id`)
- `tanggal` (DATE)
- `jam_mulai` (TIME)
- `jam_selesai` (TIME)
- `durasi` (DECIMAL) - Jam sewa
- `harga_per_jam` (DECIMAL)
- `subtotal` (DECIMAL)
- `diskon` (DECIMAL)
- `total` (DECIMAL)
- `status` (booking_status)
- `voucher_id` (UUID, FK -> `voucher.id`, ON DELETE SET NULL)
- `expired_at` (TIMESTAMP) - Batas 15 menit pembayaran

### 12. `pembayaran`
Bukti bayar bank transfer / QRIS yang diunggah customer.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> `booking.id`)
- `metode_pembayaran` (payment_method)
- `bukti_pembayaran` (VARCHAR) - Filename struk transfer
- `bank` (VARCHAR)
- `nama_pengirim` (VARCHAR)
- `nominal` (DECIMAL)
- `status_pembayaran` (payment_status)

---

## Indeks Optimalisasi (Database Indexes)
Untuk mempercepat pembacaan data, indeks kustom diterapkan pada kolom-kolom berikut:
- `idx_users_email` pada `users(email)`
- `idx_booking_lapangan_tanggal` pada `booking(lapangan_id, tanggal)` (Pengecekan slot bentrok beruntun)
- `idx_booking_status` pada `booking(status)`
- `idx_lapangan_kategori` pada `lapangan(kategori_id)`
- `idx_lapangan_cabang` pada `lapangan(cabang_id)`
- `idx_notifikasi_user_unread` pada `notifikasi(user_id) WHERE is_read = FALSE` (Mempercepat query badge menu)
