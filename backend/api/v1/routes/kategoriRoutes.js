const express = require('express');
const router = express.Router();
const KategoriController = require('../controllers/kategoriController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');
const upload = require('../middlewares/upload');

// Public routes
router.get('/', KategoriController.index);
router.get('/stats', KategoriController.getKategoriStats);

// Admin-only management
router.use(authenticate);
router.use(authorize('system.all'));

router.post('/', upload.single('gambar'), KategoriController.store);
router.put('/:id', upload.single('gambar'), KategoriController.update);
router.delete('/:id', KategoriController.destroy);

module.exports = router;
