const express = require('express');
const router = express.Router();
const FieldController = require('../controllers/fieldController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');
const upload = require('../middlewares/upload');

// Public endpoints
router.get('/', FieldController.index);
router.get('/:id', FieldController.show);
router.get('/:id/slots', FieldController.getAvailableSlots);
router.get('/:id/calculate', FieldController.calculatePrice);

// Protected endpoints
router.use(authenticate);

router.post('/', authorize('mitra.manage'), upload.single('foto'), FieldController.store);
router.put('/:id', authorize('mitra.manage'), upload.single('foto'), FieldController.update);
router.delete('/:id', authorize('mitra.manage'), FieldController.destroy);

// Facilities
router.post('/:id/facilities', authorize('mitra.manage'), FieldController.saveFacilities);

// Dynamic Pricing overrides
router.post('/:id/dynamic-pricing', authorize('mitra.manage'), FieldController.saveDynamicPrice);
router.delete('/dynamic-pricing/:priceId', authorize('mitra.manage'), FieldController.deleteDynamicPrice);

// Gallery upload and deletion
router.post('/:id/gallery', authorize('mitra.manage'), upload.single('foto_lapangan'), FieldController.addGallery);
router.delete('/gallery/:photoId', authorize('mitra.manage'), FieldController.deleteGallery);

module.exports = router;
