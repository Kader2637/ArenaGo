const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authenticate = require('../middlewares/auth');

router.use(authenticate);

router.get('/', NotificationController.index);
router.patch('/:id/read', NotificationController.markAsRead);
router.post('/read-all', NotificationController.markAllAsRead);

module.exports = router;
