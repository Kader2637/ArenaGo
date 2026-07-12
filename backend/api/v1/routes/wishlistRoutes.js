const express = require('express');
const router = express.Router();
const WishlistController = require('../controllers/wishlistController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/rbac');

router.use(authenticate);
router.use(authorize('customer.booking'));

router.get('/', WishlistController.index);
router.post('/', WishlistController.store);
router.delete('/:id', WishlistController.destroy);

module.exports = router;
