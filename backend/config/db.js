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

// PAKSA PENGGUNAAN SSL: Ini akan memastikan koneksi ke Neon/Vercel selalu aman.
poolConfig.ssl = {
  rejectUnauthorized: false
};

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
