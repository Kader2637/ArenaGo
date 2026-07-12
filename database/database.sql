-- Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Custom Enum Types
CREATE TYPE user_role AS ENUM ('admin_sistem', 'mitra', 'staff_cabang', 'customer');
CREATE TYPE user_status AS ENUM ('aktif', 'nonaktif');
CREATE TYPE lapangan_status AS ENUM ('aktif', 'maintenance', 'tidak_aktif');
CREATE TYPE booking_status AS ENUM ('pending', 'waiting_payment', 'waiting_verification', 'approved', 'checked_in', 'playing', 'completed', 'cancelled', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE discount_type AS ENUM ('persen', 'nominal');
CREATE TYPE payment_method AS ENUM ('QRIS', 'Transfer Bank', 'Cash');

-- 1. Permissions Table
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    nama VARCHAR(100) UNIQUE NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    nama user_role UNIQUE NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Role Permissions (RBAC pivot)
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    no_hp VARCHAR(20),
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'aktif',
    foto VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 5. Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Login Logs Table
CREATE TABLE login_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip VARCHAR(45),
    browser VARCHAR(255),
    device VARCHAR(255),
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Mitra Profile Table
CREATE TABLE mitra_profile (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nama_perusahaan VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    logo VARCHAR(255),
    banner VARCHAR(255),
    alamat TEXT,
    telepon VARCHAR(20),
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- e.g. 10.00%
    instagram VARCHAR(255),
    whatsapp VARCHAR(20),
    facebook VARCHAR(255),
    website VARCHAR(255),
    status_verifikasi VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Cabang Table
CREATE TABLE cabang (
    id UUID PRIMARY KEY,
    mitra_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    alamat TEXT NOT NULL,
    kota VARCHAR(100) NOT NULL,
    maps TEXT,
    telepon VARCHAR(20),
    status user_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 9. Staff Cabang Table
CREATE TABLE staff_cabang (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cabang_id UUID REFERENCES cabang(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Kategori Table
CREATE TABLE kategori (
    id UUID PRIMARY KEY,
    nama VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100),
    gambar VARCHAR(255),
    deskripsi TEXT,
    status user_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 11. Lapangan Table
CREATE TABLE lapangan (
    id UUID PRIMARY KEY,
    cabang_id UUID REFERENCES cabang(id) ON DELETE CASCADE,
    kategori_id UUID REFERENCES kategori(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    harga_per_jam DECIMAL(12,2) NOT NULL,
    deskripsi TEXT,
    kapasitas VARCHAR(100),
    ukuran VARCHAR(100),
    jenis_lantai VARCHAR(100),
    tipe VARCHAR(50) DEFAULT 'indoor', -- indoor, outdoor
    status lapangan_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 12. Harga Lapangan (Dynamic Pricing Override)
CREATE TABLE harga_lapangan (
    id UUID PRIMARY KEY,
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    hari INT NOT NULL, -- 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    harga DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Fasilitas Table
CREATE TABLE fasilitas (
    id UUID PRIMARY KEY,
    nama VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Lapangan Fasilitas Table (Pivot)
CREATE TABLE lapangan_fasilitas (
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    fasilitas_id UUID REFERENCES fasilitas(id) ON DELETE CASCADE,
    PRIMARY KEY (lapangan_id, fasilitas_id)
);

-- 15. Jam Operasional Table
CREATE TABLE jam_operasional (
    id UUID PRIMARY KEY,
    cabang_id UUID REFERENCES cabang(id) ON DELETE CASCADE,
    hari INT NOT NULL, -- 0 to 6
    jam_buka TIME NOT NULL,
    jam_tutup TIME NOT NULL,
    status user_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Voucher Table
CREATE TABLE voucher (
    id UUID PRIMARY KEY,
    mitra_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kode VARCHAR(50) UNIQUE NOT NULL,
    diskon DECIMAL(12,2) NOT NULL,
    tipe_diskon discount_type NOT NULL DEFAULT 'nominal',
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    minimal_transaksi DECIMAL(12,2) DEFAULT 0.00,
    status user_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 17. Booking Table
CREATE TABLE booking (
    id UUID PRIMARY KEY,
    kode_booking VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    durasi DECIMAL(5,2) NOT NULL, -- in hours, e.g. 1.5
    harga_per_jam DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    diskon DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    catatan TEXT,
    voucher_id UUID REFERENCES voucher(id) ON DELETE SET NULL,
    expired_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Booking Status Logs
CREATE TABLE booking_status_logs (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    status booking_status NOT NULL,
    oleh_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    catatan TEXT,
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Pembayaran Table
CREATE TABLE pembayaran (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    metode_pembayaran payment_method NOT NULL,
    bukti_pembayaran VARCHAR(255),
    nomor_referensi VARCHAR(100),
    bank VARCHAR(100),
    nama_pengirim VARCHAR(255),
    nominal DECIMAL(12,2) NOT NULL,
    catatan TEXT,
    status_pembayaran payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Invoice Table
CREATE TABLE invoice (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    nomor_invoice VARCHAR(100) UNIQUE NOT NULL,
    tanggal DATE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'paid', 'unpaid', 'refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Komisi Table
CREATE TABLE komisi (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    persentase DECIMAL(5,2) NOT NULL,
    nominal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Review Table
CREATE TABLE review (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    komentar TEXT,
    foto VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Galeri Table
CREATE TABLE galeri (
    id UUID PRIMARY KEY,
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    foto VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Wishlist Table
CREATE TABLE wishlist (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lapangan_id UUID REFERENCES lapangan(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, lapangan_id)
);

-- 25. Mitra Favorite Table
CREATE TABLE mitra_favorite (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mitra_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, mitra_id)
);

-- 26. Notifikasi Table
CREATE TABLE notifikasi (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    dibaca_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    aktivitas TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for Optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_booking_lapangan_tanggal ON booking(lapangan_id, tanggal);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_lapangan_kategori ON lapangan(kategori_id);
CREATE INDEX idx_lapangan_cabang ON lapangan(cabang_id);
CREATE INDEX idx_cabang_mitra ON cabang(mitra_id);
CREATE INDEX idx_harga_lapangan_lapangan ON harga_lapangan(lapangan_id);
CREATE INDEX idx_voucher_kode ON voucher(kode);
CREATE INDEX idx_review_lapangan ON review(lapangan_id);
CREATE INDEX idx_wishlist_user ON wishlist(user_id);
CREATE INDEX idx_notifikasi_user_unread ON notifikasi(user_id) WHERE is_read = FALSE;
