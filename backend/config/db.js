const { Pool } = require('pg');
require('dotenv').config();

// Objek konfigurasi dasar dari environment variables
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

// Aktifkan SSL secara kondisional.
// Gunakan variabel bawaan Vercel 'VERCEL_ENV' yang nilainya 'production' saat di-deploy.
// Di lokal, variabel ini tidak ada (undefined), sehingga SSL akan dinonaktifkan.
if (process.env.VERCEL_ENV === 'production') {
  console.log('Database connection is using SSL mode for production.');
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Buat instance Pool dengan konfigurasi yang sudah disesuaikan
const pool = new Pool(poolConfig);

// Tambahkan event listener untuk error pada pool koneksi
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export object yang bisa digunakan di semua repository
module.exports = {
  query: (text, params) => pool.query(text, params),
};
