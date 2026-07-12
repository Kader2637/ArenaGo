const express = require('express');
const path = require('path');
const corsMiddleware = require('./config/cors');
const apiRoutes = require('./api/v1/routes/apiRoutes');
const SchedulerService = require('./services/SchedulerService');
const logger = require('./utils/logger');
const errorHandler = require('./api/v1/middlewares/errorHandler');
const notFound = require('./api/v1/middlewares/notFound');

// Load env variables
require('dotenv').config();

// Initialize Event Listeners
require('./listeners/bookingListener');

// Start cron scheduler
SchedulerService.start();

const app = express();
const PORT = process.env.APP_PORT || 3000;

// Apply middlewares
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Native cookie parser middleware
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts[0] && parts[1]) {
        req.cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });
  }
  next();
});

// Serve uploaded images static path. In Vercel, this points to the temporary directory.
const uploadDir = process.env.VERCEL === '1' ? '/tmp/backend/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Serve frontend assets and pages
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve API Routes
app.use('/api/v1', apiRoutes);

// Interactive Swagger/API Docs Endpoint
app.get('/api/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/API.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <head>
            <title>ArenaGo API Reference</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body class="bg-light py-5">
            <div class="container bg-white p-5 shadow rounded">
              <h1 class="text-primary mb-4">ArenaGo API Reference</h1>
              <p class="text-muted mb-5">REST API Dokumentasi untuk proyek ArenaGo Multi-Tenant Sports Marketplace.</p>
              
              <div class="alert alert-info">Dokumentasi API lengkap dapat diakses secara dinamis setelah berkas dokumentasi docs/API.html diunggah.</div>
              
              <h3 class="mt-4">Endpoints Utama</h3>
              <ul class="list-group mt-3">
                <li class="list-group-item"><strong>GET /api/v1/health</strong> - Cek status kesehatan sistem</li>
                <li class="list-group-item"><strong>GET /api/v1/version</strong> - Cek versi rilis sistem</li>
                <li class="list-group-item"><strong>POST /api/v1/auth/register</strong> - Pendaftaran pengguna baru</li>
                <li class="list-group-item"><strong>POST /api/v1/auth/login</strong> - Autentikasi token JWT</li>
                <li class="list-group-item"><strong>GET /api/v1/lapangan</strong> - Daftar lapangan & pencarian</li>
                <li class="list-group-item"><strong>POST /api/v1/booking</strong> - Booking jadwal lapangan</li>
              </ul>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// Serve Single Page/Client router fallbacks if requested, otherwise 404
app.use('/api/*', notFound);

// Fallback to customer home for frontend requests that don't match specific files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/customer/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server ArenaGo berhasil dijalankan pada port ${PORT} [Mode: ${process.env.APP_ENV || 'development'}]`);
});
