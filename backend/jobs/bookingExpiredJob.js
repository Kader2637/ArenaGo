const BookingRepository = require('../repositories/BookingRepository');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

async function checkExpiredBookings() {
  try {
    const now = new Date();
    const expiredBookings = await BookingRepository.findExpiredBookings(now);
    
    if (expiredBookings.length === 0) {
      return;
    }

    logger.info(`Menemukan ${expiredBookings.length} booking kedaluwarsa. Memulai pembatalan otomatis...`);

    for (const booking of expiredBookings) {
      await BookingRepository.updateStatusWithLog(
        booking.id,
        'cancelled',
        null, // System action
        'Booking dibatalkan otomatis oleh sistem (Batas waktu pembayaran 15 menit habis)'
      );

      // Notify customer
      await NotificationService.createNotification(
        booking.user_id,
        'Booking Kedaluwarsa ❌',
        `Pemesanan lapangan Anda dengan kode ${booking.kode_booking} telah dibatalkan otomatis karena pembayaran tidak diterima dalam 15 menit.`
      );

      logger.info(`Booking ${booking.kode_booking} berhasil dibatalkan otomatis (Expired)`);
    }
  } catch (error) {
    logger.error(`Error pada cron job Booking Expired: ${error.message}`);
  }
}

module.exports = checkExpiredBookings;
