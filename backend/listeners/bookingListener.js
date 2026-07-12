const eventEmitter = require('../events/eventEmitter');
const NotificationService = require('../services/NotificationService');
const BookingRepository = require('../repositories/BookingRepository');
const logger = require('../utils/logger');

// 1. BookingCreated - Alert customer to pay
eventEmitter.on('BookingCreated', async (booking) => {
  try {
    await NotificationService.createNotification(
      booking.user_id,
      'Booking Berhasil Dibuat 📝',
      `Booking lapangan dengan kode ${booking.kode_booking} berhasil dibuat. Silakan lakukan pembayaran sebelum batas waktu kedaluwarsa.`
    );
  } catch (error) {
    logger.error(`Listener BookingCreated error: ${error.message}`);
  }
});

// 2. PaymentSubmitted - Inform customer & partner of verification requirement
eventEmitter.on('PaymentSubmitted', async ({ booking, payment }) => {
  try {
    // Notify customer
    await NotificationService.createNotification(
      booking.user_id,
      'Pembayaran Diproses ⏳',
      `Bukti pembayaran untuk kode booking ${booking.kode_booking} telah diunggah dan sedang diverifikasi.`
    );

    // Notify Mitra (the partner who owns the court)
    const detail = await BookingRepository.findByIdWithDetails(booking.id);
    if (detail && detail.mitra_id) {
      await NotificationService.createNotification(
        detail.mitra_id,
        'Pembayaran Baru 💰',
        `Customer telah mengirim bukti pembayaran untuk kode booking ${booking.kode_booking}. Silakan verifikasi.`
      );
    }
  } catch (error) {
    logger.error(`Listener PaymentSubmitted error: ${error.message}`);
  }
});

// 3. PaymentVerified - Inform customer they can now play, send invoice
eventEmitter.on('PaymentVerified', async ({ booking, payment }) => {
  try {
    await NotificationService.createNotification(
      booking.user_id,
      'Pembayaran Diverifikasi ✅',
      `Pembayaran Anda untuk kode booking ${booking.kode_booking} telah disetujui. Jadwal bermain Anda telah dikunci!`
    );
  } catch (error) {
    logger.error(`Listener PaymentVerified error: ${error.message}`);
  }
});

// 4. PaymentRejected - Inform customer payment check failed
eventEmitter.on('PaymentRejected', async ({ booking, payment }) => {
  try {
    await NotificationService.createNotification(
      booking.user_id,
      'Pembayaran Ditolak ❌',
      `Pembayaran untuk kode booking ${booking.kode_booking} ditolak. Silakan unggah bukti transfer yang sesuai.`
    );
  } catch (error) {
    logger.error(`Listener PaymentRejected error: ${error.message}`);
  }
});

// 5. BookingCheckedIn - Check-in validation alerts
eventEmitter.on('BookingCheckedIn', async (booking) => {
  try {
    await NotificationService.createNotification(
      booking.user_id,
      'Check-in Berhasil 🏟️',
      `Anda telah berhasil check-in untuk booking ${booking.kode_booking}. Selamat bermain!`
    );
  } catch (error) {
    logger.error(`Listener BookingCheckedIn error: ${error.message}`);
  }
});

// 6. UserRegistered - Warm welcome
eventEmitter.on('UserRegistered', async (user) => {
  try {
    await NotificationService.createNotification(
      user.id,
      'Selamat Datang di ArenaGo! ⚽',
      `Halo ${user.nama}, selamat bergabung di ArenaGo. Sewa lapangan olahraga favorit Anda sekarang juga!`
    );
  } catch (error) {
    logger.error(`Listener UserRegistered error: ${error.message}`);
  }
});

logger.info('Event listeners untuk Booking dan Pembayaran berhasil didaftarkan.');
