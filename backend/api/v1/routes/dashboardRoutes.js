const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authenticate = require('../middlewares/auth');

router.get('/', authenticate, DashboardController.getStats);

module.exports = router;
