const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const cabangRoutes = require('./cabangRoutes');
const kategoriRoutes = require('./kategoriRoutes');
const fieldRoutes = require('./fieldRoutes');
const bookingRoutes = require('./bookingRoutes');
const reviewRoutes = require('./reviewRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const voucherRoutes = require('./voucherRoutes');
const healthRoutes = require('./healthRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cabang', cabangRoutes);
router.use('/kategori', kategoriRoutes);
router.use('/lapangan', fieldRoutes);
router.use('/booking', bookingRoutes);
router.use('/review', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifikasi', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/voucher', voucherRoutes);
router.use('/', healthRoutes);

module.exports = router;
