const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response');

router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    return successResponse(res, 'Layanan sehat.', {
      status: 'ok',
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    return errorResponse(res, 'Layanan bermasalah.', {
      status: 'error',
      database: 'disconnected',
      error: error.message
    }, 500);
  }
});

router.get('/version', (req, res) => {
  return successResponse(res, 'Informasi versi sistem.', {
    version: '1.0.0',
    environment: process.env.APP_ENV || 'development'
  });
});

module.exports = router;
