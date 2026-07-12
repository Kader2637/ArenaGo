const BookingRepository = require('../repositories/BookingRepository');

class InvoiceService {
  async createInvoice(invoiceData) {
    return await BookingRepository.createInvoice(invoiceData);
  }

  async getInvoiceByBooking(bookingId) {
    const booking = await BookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new Error('Booking tidak ditemukan.');
    }
    const payment = await BookingRepository.getPaymentByBooking(bookingId);
    return {
      booking,
      payment
    };
  }
}

module.exports = new InvoiceService();
