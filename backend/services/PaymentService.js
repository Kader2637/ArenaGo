const BookingRepository = require('../repositories/BookingRepository');
const InvoiceService = require('./InvoiceService');
const eventEmitter = require('../events/eventEmitter');
const { uuidv7 } = require('../utils/uuid');

class PaymentService {
  async submitPayment(bookingId, userId, payload, file) {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking tidak ditemukan.');
    }

    if (booking.user_id !== userId) {
      throw new Error('Akses ditolak.');
    }

    if (!['pending', 'waiting_payment'].includes(booking.status)) {
      throw new Error('Booking tidak sedang menunggu pembayaran.');
    }

    if (!file) {
      throw new Error('Bukti pembayaran wajib diunggah.');
    }

    const { metode_pembayaran, nomor_referensi, bank, nama_pengirim, nominal, catatan } = payload;

    const payment = await BookingRepository.savePayment({
      id: uuidv7(),
      booking_id: bookingId,
      metode_pembayaran: metode_pembayaran || 'Transfer Bank',
      bukti_pembayaran: file.filename,
      nomor_referensi,
      bank,
      nama_pengirim,
      nominal: parseFloat(nominal || booking.total),
      catatan,
      status_pembayaran: 'pending'
    });

    // Update booking status to waiting_verification
    const updatedBooking = await BookingRepository.updateStatusWithLog(
      bookingId, 
      'waiting_verification', 
      userId, 
      'Bukti pembayaran diunggah oleh customer'
    );

    eventEmitter.emit('PaymentSubmitted', { booking: updatedBooking, payment });

    return { booking: updatedBooking, payment };
  }

  async verifyPayment(bookingId, verifierUserId, isApproved, catatanReason = '') {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking tidak ditemukan.');
    }

    if (booking.status !== 'waiting_verification') {
      throw new Error('Booking tidak sedang menunggu verifikasi pembayaran.');
    }

    let result;
    if (isApproved) {
      // Approve: verify payment & transition booking to approved
      result = await BookingRepository.verifyPaymentWithTransaction(
        bookingId,
        'verified',
        verifierUserId,
        catatanReason || 'Pembayaran disetujui dan diverifikasi.'
      );

      // Auto-generate invoice
      const invoiceNumber = `INV-${Date.now()}`;
      await InvoiceService.createInvoice({
        id: uuidv7(),
        booking_id: bookingId,
        nomor_invoice: invoiceNumber,
        tanggal: new Date(),
        status: 'paid'
      });

      eventEmitter.emit('PaymentVerified', result);
    } else {
      // Reject: reject payment & transition booking to rejected
      result = await BookingRepository.verifyPaymentWithTransaction(
        bookingId,
        'rejected',
        verifierUserId,
        catatanReason || 'Pembayaran ditolak karena bukti tidak valid.'
      );

      eventEmitter.emit('PaymentRejected', result);
    }

    return result;
  }
}

module.exports = new PaymentService();
