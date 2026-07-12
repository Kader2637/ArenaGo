const express = require('express');
const router = express.Router();
const VoucherController = require('../controllers/voucherController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');

router.use(authenticate);

router.get('/', VoucherController.index);
router.post('/', authorize('mitra.manage'), VoucherController.store);
router.put('/:id', authorize('mitra.manage'), VoucherController.update);
router.delete('/:id', authorize('mitra.manage'), VoucherController.destroy);

// Check voucher code details
router.get('/check', authorize('customer.booking'), VoucherController.checkVoucher);

module.exports = router;
