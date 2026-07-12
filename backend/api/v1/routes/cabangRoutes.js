const express = require('express');
const router = express.Router();
const CabangController = require('../controllers/cabangController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');

// Public route
router.get('/:id', CabangController.show);

// Protected routes
router.use(authenticate);

router.get('/', CabangController.index);
router.post('/', authorize('mitra.manage'), CabangController.store);
router.put('/:id', authorize('mitra.manage'), CabangController.update);
router.delete('/:id', authorize('mitra.manage'), CabangController.destroy);

// Jam Operasional
router.get('/:id/jam-operasional', CabangController.getJamOperasional);
router.post('/:id/jam-operasional', authorize('mitra.manage'), CabangController.saveJamOperasional);

// Staff Cabang
router.get('/:id/staff', authorize('mitra.manage'), CabangController.listStaff);
router.post('/:id/staff', authorize('mitra.manage'), CabangController.addStaff);
router.post('/:id/staff/remove', authorize('mitra.manage'), CabangController.removeStaff);

module.exports = router;
