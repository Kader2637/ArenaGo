const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');
const upload = require('../middlewares/upload');

router.use(authenticate);

router.get('/', BookingController.index);
router.get('/:id', BookingController.show);
router.post('/', authorize('customer.booking'), BookingController.store);
router.post('/:id/payment', authorize('customer.booking'), upload.single('bukti_pembayaran'), BookingController.submitPayment);

// Verification and check-ins (Mitra, Staff, or Admin)
router.post('/:id/verify-payment', BookingController.verifyPayment);
router.post('/:id/status', BookingController.changeStatus);
router.put('/:id/status', BookingController.changeStatus);
router.get('/:id/qr', authorize('customer.booking'), BookingController.generateSignedQR);
router.post('/checkin', authorize('booking.checkin'), BookingController.checkin);

module.exports = router;
