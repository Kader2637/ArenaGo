const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticate = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, upload.fields([
  { name: 'foto_user', maxCount: 1 },
  { name: 'logo_mitra', maxCount: 1 },
  { name: 'banner_mitra', maxCount: 1 }
]), AuthController.updateProfile);

module.exports = router;
