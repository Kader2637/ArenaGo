const { Pool } = require('pg');
require('dotenv').config();

// Objek konfigurasi dasar dari environment variables
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Revert to original, let pg handle parsing
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

// Automatically enable SSL for Vercel deployments or if the host is a Neon DB.
// This allows the app to work seamlessly in production and local development against Neon.
const isProduction = process.env.VERCEL_ENV === 'production';
const isNeonHost = process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech');

if (isProduction || isNeonHost) {
  console.log('SSL for database connection is enabled.');
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Tambahkan event listener untuk error pada pool koneksi
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export object yang bisa digunakan di semua repository
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // Expose connect method for transactions or direct client usage
};
