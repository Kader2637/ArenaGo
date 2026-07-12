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

// Aktifkan SSL HANYA untuk lingkungan produksi (seperti Vercel)
// Ini akan membaca variabel APP_ENV yang Anda set di Vercel
if (process.env.APP_ENV === 'production') {
  console.log('SSL mode for database connection is ENABLED for production.'); // Log untuk debugging di Vercel
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

// Buat instance Pool dengan konfigurasi yang sudah disesuaikan
const pool = new Pool(poolConfig);

// Export object yang bisa digunakan di semua repository
module.exports = {
  query: (text, params) => pool.query(text, params),
};
