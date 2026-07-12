const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');

// Admin-only operations
router.use(authenticate);
router.use(authorize('system.all'));

router.get('/', UserController.index);
router.patch('/:id/status', UserController.toggleStatus);
router.post('/:id/reset-password', UserController.resetPassword);

module.exports = router;
