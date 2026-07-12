const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/reviewController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');
const upload = require('../middlewares/upload');

// Public route to view court reviews
router.get('/', ReviewController.index);

// Protected routes
router.use(authenticate);
router.post('/', authorize('customer.booking'), upload.single('foto_review'), ReviewController.store);
router.get('/mitra', authorize('mitra.manage'), ReviewController.getMitraReviews);

module.exports = router;
