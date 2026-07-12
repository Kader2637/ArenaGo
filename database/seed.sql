-- Seed Permissions
INSERT INTO permissions (id, nama, deskripsi) VALUES
('0190a7e0-0000-7000-8000-050000000001', 'system.all', 'Full system access'),
('0190a7e0-0000-7000-8000-050000000002', 'mitra.manage', 'Manage partner branches, fields, staff, dynamic pricing, and vouchers'),
('0190a7e0-0000-7000-8000-050000000003', 'branch.view', 'View specific branch bookings and dashboard'),
('0190a7e0-0000-7000-8000-050000000004', 'booking.checkin', 'Perform customer QR code scanning and check-in'),
('0190a7e0-0000-7000-8000-050000000005', 'customer.booking', 'Create and manage personal bookings, reviews, and wishlist');

-- Seed Roles
INSERT INTO roles (id, nama, deskripsi) VALUES
('0190a7e0-0000-7000-8000-100000000001', 'admin_sistem', 'Super Administrator for platform-wide operations'),
('0190a7e0-0000-7000-8000-100000000002', 'mitra', 'Sports center owners and managers'),
('0190a7e0-0000-7000-8000-100000000003', 'staff_cabang', 'Branch operator staff members'),
('0190a7e0-0000-7000-8000-100000000004', 'customer', 'Sports players booking fields');

-- Seed Role Permissions Mapping
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Admin Sistem
('0190a7e0-0000-7000-8000-100000000001', '0190a7e0-0000-7000-8000-050000000001'),
-- Mitra
('0190a7e0-0000-7000-8000-100000000002', '0190a7e0-0000-7000-8000-050000000002'),
('0190a7e0-0000-7000-8000-100000000002', '0190a7e0-0000-7000-8000-050000000003'),
-- Staff Cabang
('0190a7e0-0000-7000-8000-100000000003', '0190a7e0-0000-7000-8000-050000000003'),
('0190a7e0-0000-7000-8000-100000000003', '0190a7e0-0000-7000-8000-050000000004'),
-- Customer
('0190a7e0-0000-7000-8000-100000000004', '0190a7e0-0000-7000-8000-050000000005');

-- Seed Users (Bcrypt hash of 'password123': $2a$10$9plD0d1FxmcBjid6s1RcmuiChHcrdWMfJKMO.7W7XMvnIheZHzLha)
INSERT INTO users (id, nama, email, password, no_hp, role, status) VALUES
('0190a7e0-0000-7000-8000-000000000001', 'Admin Sistem ArenaGo', 'admin@arenago.com', '$2a$10$9plD0d1FxmcBjid6s1RcmuiChHcrdWMfJKMO.7W7XMvnIheZHzLha', '081234567890', 'admin_sistem', 'aktif'),
('0190a7e0-0000-7000-8000-000000000002', 'Mitra Budi Arena', 'mitra@arenago.com', '$2a$10$9plD0d1FxmcBjid6s1RcmuiChHcrdWMfJKMO.7W7XMvnIheZHzLha', '081234567891', 'mitra', 'aktif'),
('0190a7e0-0000-7000-8000-000000000003', 'Staff Rudi', 'staff@arenago.com', '$2a$10$9plD0d1FxmcBjid6s1RcmuiChHcrdWMfJKMO.7W7XMvnIheZHzLha', '081234567892', 'staff_cabang', 'aktif'),
('0190a7e0-0000-7000-8000-000000000004', 'Customer Roni', 'customer@arenago.com', '$2a$10$9plD0d1FxmcBjid6s1RcmuiChHcrdWMfJKMO.7W7XMvnIheZHzLha', '081234567893', 'customer', 'aktif');

-- Seed Mitra Profile
INSERT INTO mitra_profile (id, user_id, nama_perusahaan, deskripsi, logo, banner, alamat, telepon, commission_rate, whatsapp, instagram, status_verifikasi) VALUES
('0190a7e0-0000-7000-8000-060000000001', '0190a7e0-0000-7000-8000-000000000002', 'Budi Sports Center Group', 'Penyedia lapangan olahraga terlengkap dan premium di Jawa Timur.', 'default-logo.png', 'default-banner.png', 'Jl. Ijen No. 12, Malang', '0341-555666', 10.00, '081234567891', 'budisports', 'verified');

-- Seed Cabang
INSERT INTO cabang (id, mitra_id, nama, alamat, kota, maps, telepon, status) VALUES
('0190a7e0-0000-7000-8000-200000000001', '0190a7e0-0000-7000-8000-000000000002', 'Budi Sports Ijen', 'Jl. Ijen No. 12, Klojen', 'Malang', 'https://goo.gl/maps/example1', '081234567801', 'aktif'),
('0190a7e0-0000-7000-8000-200000000002', '0190a7e0-0000-7000-8000-000000000002', 'Budi Sports Batu', 'Jl. Diponegoro No. 45, Sisir', 'Batu', 'https://goo.gl/maps/example2', '081234567802', 'aktif');

-- Bind Staff User to Cabang
INSERT INTO staff_cabang (id, user_id, cabang_id) VALUES
('0190a7e0-0000-7000-8000-070000000001', '0190a7e0-0000-7000-8000-000000000003', '0190a7e0-0000-7000-8000-200000000001');

-- Seed Categories
INSERT INTO kategori (id, nama, icon, gambar, deskripsi, status) VALUES
('0190a7e0-0000-7000-8000-300000000001', 'Sepak Bola', 'bi bi-dribbble', 'soccer.jpg', 'Lapangan sepak bola rumput alami premium', 'aktif'),
('0190a7e0-0000-7000-8000-300000000002', 'Futsal', 'bi bi-circle', 'futsal.jpg', 'Lapangan futsal vinyl dan rumput sintetis', 'aktif'),
('0190a7e0-0000-7000-8000-300000000003', 'Badminton', 'bi bi-lightning-charge', 'badminton.jpg', 'Lapangan bulu tangkis standar BWF', 'aktif'),
('0190a7e0-0000-7000-8000-300000000004', 'Basket', 'bi bi-activity', 'basketball.jpg', 'Lapangan basket indoor dan outdoor', 'aktif'),
('0190a7e0-0000-7000-8000-300000000005', 'Tennis', 'bi bi-circle-fill', 'tennis.jpg', 'Lapangan tenis clay dan hard court', 'aktif'),
('0190a7e0-0000-7000-8000-300000000006', 'Voli', 'bi bi-record-circle', 'volleyball.jpg', 'Lapangan voli pasir dan indoor', 'aktif'),
('0190a7e0-0000-7000-8000-300000000007', 'Baseball', 'bi bi-globe', 'baseball.jpg', 'Fasilitas baseball batting cage', 'aktif');

-- Seed Facilities
INSERT INTO fasilitas (id, nama, icon) VALUES
('0190a7e0-0000-7000-8000-080000000001', 'Shower', 'bi-droplet-fill'),
('0190a7e0-0000-7000-8000-080000000002', 'Parkir', 'bi-p-circle-fill'),
('0190a7e0-0000-7000-8000-080000000003', 'Wifi', 'bi-wifi'),
('0190a7e0-0000-7000-8000-080000000004', 'Musholla', 'bi-house-heart'),
('0190a7e0-0000-7000-8000-080000000005', 'Toilet', 'bi-gender-ambiguous'),
('0190a7e0-0000-7000-8000-080000000006', 'Kantin', 'bi-cup-hot-fill'),
('0190a7e0-0000-7000-8000-080000000007', 'Ruang Ganti', 'bi-person-workspace'),
('0190a7e0-0000-7000-8000-080000000008', 'Tribun', 'bi-people-fill'),
('0190a7e0-0000-7000-8000-080000000009', 'Lampu Malam', 'bi-lightbulb-fill');

-- Seed Lapangan
INSERT INTO lapangan (id, cabang_id, kategori_id, nama, harga_per_jam, deskripsi, kapasitas, ukuran, jenis_lantai, tipe, status) VALUES
('0190a7e0-0000-7000-8000-400000000001', '0190a7e0-0000-7000-8000-200000000001', '0190a7e0-0000-7000-8000-300000000002', 'Grand Futsal Vinyl A', 150000.00, 'Lapangan futsal vinyl tebal 8mm berstandar nasional.', '10 Pemain', '25m x 15m', 'Vinyl', 'indoor', 'aktif'),
('0190a7e0-0000-7000-8000-400000000002', '0190a7e0-0000-7000-8000-200000000001', '0190a7e0-0000-7000-8000-300000000003', 'Badminton Court 1', 60000.00, 'Lapangan badminton karpet standar BWF.', '4 Pemain', '13.4m x 6.1m', 'Karpet BWF', 'indoor', 'aktif'),
('0190a7e0-0000-7000-8000-400000000003', '0190a7e0-0000-7000-8000-200000000002', '0190a7e0-0000-7000-8000-300000000002', 'Batu Synthetic Grass A', 180000.00, 'Lapangan futsal rumput sintetis lembut anti cedera.', '10 Pemain', '26m x 16m', 'Rumput Sintetis', 'outdoor', 'aktif');

-- Link Lapangan & Fasilitas
INSERT INTO lapangan_fasilitas (lapangan_id, fasilitas_id) VALUES
('0190a7e0-0000-7000-8000-400000000001', '0190a7e0-0000-7000-8000-080000000002'), -- Parkir
('0190a7e0-0000-7000-8000-400000000001', '0190a7e0-0000-7000-8000-080000000003'), -- Wifi
('0190a7e0-0000-7000-8000-400000000001', '0190a7e0-0000-7000-8000-080000000005'), -- Toilet
('0190a7e0-0000-7000-8000-400000000001', '0190a7e0-0000-7000-8000-080000000009'), -- Lampu Malam
('0190a7e0-0000-7000-8000-400000000002', '0190a7e0-0000-7000-8000-080000000002'), -- Parkir
('0190a7e0-0000-7000-8000-400000000002', '0190a7e0-0000-7000-8000-080000000005'); -- Toilet

-- Seed Jam Operasional
INSERT INTO jam_operasional (id, cabang_id, hari, jam_buka, jam_tutup, status) VALUES
-- Budi Sports Ijen (Malang): Senin s/d Minggu, Buka 07.00 - 22.00
('0190a7e0-0000-7000-8000-090000000000', '0190a7e0-0000-7000-8000-200000000001', 0, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000001', '0190a7e0-0000-7000-8000-200000000001', 1, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000002', '0190a7e0-0000-7000-8000-200000000001', 2, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000003', '0190a7e0-0000-7000-8000-200000000001', 3, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000004', '0190a7e0-0000-7000-8000-200000000001', 4, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000005', '0190a7e0-0000-7000-8000-200000000001', 5, '07:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000006', '0190a7e0-0000-7000-8000-200000000001', 6, '07:00:00', '22:00:00', 'aktif'),
-- Budi Sports Batu: Senin s/d Minggu, Buka 08.00 - 22.00
('0190a7e0-0000-7000-8000-090000000007', '0190a7e0-0000-7000-8000-200000000002', 0, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000008', '0190a7e0-0000-7000-8000-200000000002', 1, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000009', '0190a7e0-0000-7000-8000-200000000002', 2, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000010', '0190a7e0-0000-7000-8000-200000000002', 3, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000011', '0190a7e0-0000-7000-8000-200000000002', 4, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000012', '0190a7e0-0000-7000-8000-200000000002', 5, '08:00:00', '22:00:00', 'aktif'),
('0190a7e0-0000-7000-8000-090000000013', '0190a7e0-0000-7000-8000-200000000002', 6, '08:00:00', '22:00:00', 'aktif');

-- Seed Dynamic Pricing Overrides (e.g. higher price after 18:00 on Saturdays/Sundays for Grand Futsal Vinyl A)
INSERT INTO harga_lapangan (id, lapangan_id, hari, jam_mulai, jam_selesai, harga) VALUES
('0190a7e0-0000-7000-8000-095000000001', '0190a7e0-0000-7000-8000-400000000001', 6, '18:00:00', '22:00:00', 180000.00), -- Sat Night
('0190a7e0-0000-7000-8000-095000000002', '0190a7e0-0000-7000-8000-400000000001', 0, '18:00:00', '22:00:00', 180000.00); -- Sun Night

-- Seed Voucher
INSERT INTO voucher (id, mitra_id, kode, diskon, tipe_diskon, tanggal_mulai, tanggal_selesai, minimal_transaksi, status) VALUES
('0190a7e0-0000-7000-8000-099000000001', '0190a7e0-0000-7000-8000-000000000002', 'MERDEKA20', 20.00, 'persen', '2026-07-01', '2026-08-31', 100000.00, 'aktif'),
('0190a7e0-0000-7000-8000-099000000002', '0190a7e0-0000-7000-8000-000000000002', 'ARENAGO50K', 50000.00, 'nominal', '2026-07-01', '2026-12-31', 200000.00, 'aktif');

-- Seed Galleries
INSERT INTO galeri (id, lapangan_id, foto) VALUES
('0190a7e0-0000-7000-8000-099900000001', '0190a7e0-0000-7000-8000-400000000001', 'futsal_field.jpg'),
('0190a7e0-0000-7000-8000-099900000002', '0190a7e0-0000-7000-8000-400000000002', 'badminton_field.jpg'),
('0190a7e0-0000-7000-8000-099900000003', '0190a7e0-0000-7000-8000-400000000003', 'futsal_batu.jpg');
