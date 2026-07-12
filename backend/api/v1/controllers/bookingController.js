const BookingRepository = require('../../../repositories/BookingRepository');
const BookingService = require('../../../services/BookingService');
const PaymentService = require('../../../services/PaymentService');
const FieldRepository = require('../../../repositories/FieldRepository');
const CabangRepository = require('../../../repositories/CabangRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../../config/jwt');
const eventEmitter = require('../../../events/eventEmitter');

class BookingController {
  async index(req, res, next) {
    try {
      const filters = {};
      const role = req.user.role;
      const userId = req.user.id;

      if (role === 'customer') {
        filters.user_id = userId;
      } else if (role === 'mitra') {
        filters.mitra_id = userId;
      } else if (role === 'staff_cabang') {
        const staffInfo = await UserRepository.getStaffCabangInfo(userId);
        if (!staffInfo) {
          return successResponse(res, 'Daftar booking kosong.', []);
        }
        filters.cabang_id = staffInfo.cabang_id;
      }

      // Allow filter overlays from query params
      const { status, tanggal, kode_booking } = req.query;
      if (status) filters.status = status;
      if (tanggal) filters.tanggal = tanggal;
      if (kode_booking) filters.kode_booking = kode_booking;

      const bookings = await BookingRepository.findBookings(filters, req.query);
      return successResponse(res, 'Daftar booking berhasil diambil.', bookings);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const detail = await BookingService.getBookingDetail(id, req.user.id, req.user.role);
      return successResponse(res, 'Detail booking berhasil diambil.', detail);
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { lapangan_id, tanggal, jam_mulai, jam_selesai, catatan, kode_voucher } = req.body;
      const userId = req.user.id;

      if (!lapangan_id || !tanggal || !jam_mulai || !jam_selesai) {
        return errorResponse(res, 'Field lapangan_id, tanggal, jam_mulai, dan jam_selesai wajib diisi.', null, 400);
      }

      const booking = await BookingService.createBooking(
        userId,
        lapangan_id,
        tanggal,
        jam_mulai,
        jam_selesai,
        catatan,
        kode_voucher
      );

      return successResponse(res, 'Booking berhasil dibuat. Silakan lakukan pembayaran.', booking, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async submitPayment(req, res, next) {
    try {
      const { id } = req.params; // bookingId
      const file = req.file;
      const userId = req.user.id;

      const result = await PaymentService.submitPayment(id, userId, req.body, file);
      return successResponse(res, 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi.', result);
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const { id } = req.params; // bookingId
      const { status_pembayaran, catatan } = req.body; // status_pembayaran: verified / rejected
      const verifierUserId = req.user.id;

      if (!status_pembayaran || !['verified', 'rejected'].includes(status_pembayaran)) {
        return errorResponse(res, 'Status verifikasi harus "verified" atau "rejected".', null, 400);
      }

      const isApproved = status_pembayaran === 'verified';
      const result = await PaymentService.verifyPayment(id, verifierUserId, isApproved, catatan);

      return successResponse(res, `Pembayaran berhasil di-${status_pembayaran === 'verified' ? 'setujui' : 'tolak'}.`, result);
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { id } = req.params; // bookingId
      const { status, catatan } = req.body; // status: playing, completed, cancelled
      const userId = req.user.id;
      const role = req.user.role;

      const booking = await BookingRepository.findById(id);
      if (!booking) {
        return errorResponse(res, 'Booking tidak ditemukan.', null, 404);
      }

      // Check access permission
      if (role === 'customer' && booking.user_id !== userId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }
      
      if (role === 'mitra') {
        const field = await FieldRepository.findById(booking.lapangan_id);
        const cabang = await CabangRepository.findById(field.cabang_id);
        if (cabang.mitra_id !== userId) {
          return errorResponse(res, 'Akses ditolak.', null, 403);
        }
      }

      if (role === 'staff_cabang') {
        const staffInfo = await UserRepository.getStaffCabangInfo(userId);
        const field = await FieldRepository.findById(booking.lapangan_id);
        if (!staffInfo || staffInfo.cabang_id !== field.cabang_id) {
          return errorResponse(res, 'Akses ditolak. Cabang ini tidak ditugaskan kepada Anda.', null, 403);
        }
      }

      // Validate transitions
      const allowedRolesForCancel = ['admin_sistem', 'mitra', 'staff_cabang', 'customer'];
      if (status === 'cancelled' && !allowedRolesForCancel.includes(role)) {
        return errorResponse(res, 'Anda tidak diizinkan membatalkan booking ini.', null, 403);
      }

      if (['playing', 'completed'].includes(status) && role === 'customer') {
        return errorResponse(res, 'Customer tidak diperbolehkan mengubah status ini.', null, 403);
      }

      const updated = await BookingRepository.updateStatusWithLog(
        id,
        status,
        userId,
        catatan || `Status diubah menjadi ${status} oleh ${role}`
      );

      return successResponse(res, `Status booking berhasil diubah menjadi ${status}.`, updated);
    } catch (error) {
      next(error);
    }
  }

  async generateSignedQR(req, res, next) {
    try {
      const { id } = req.params; // bookingId
      const booking = await BookingRepository.findById(id);
      
      if (!booking) {
        return errorResponse(res, 'Booking tidak ditemukan.', null, 404);
      }

      if (booking.user_id !== req.user.id && req.user.role !== 'admin_sistem') {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      // Create a signed JWT token containing booking metadata, valid for 24 hours
      const payload = {
        id: booking.id,
        kode: booking.kode_booking,
        type: 'booking'
      };

      const signedPayload = jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: '24h' });
      return successResponse(res, 'QR payload berhasil dibuat.', { qrToken: signedPayload });
    } catch (error) {
      next(error);
    }
  }

  async checkin(req, res, next) {
    try {
      const { token } = req.body;
      const staffUserId = req.user.id;

      if (!token) {
        return errorResponse(res, 'Token QR atau kode booking diperlukan.', null, 400);
      }

      let bookingId;

      if (token.startsWith('GO-')) {
        // Look up by Booking Code directly
        const check = await BookingRepository.find({ kode_booking: token });
        if (check.length === 0) {
          return errorResponse(res, 'Kode booking tidak ditemukan.', null, 404);
        }
        bookingId = check[0].id;
      } else {
        // Verify JWT token signature
        try {
          const decoded = jwt.verify(token, jwtConfig.accessSecret);
          if (decoded.type !== 'booking') {
            return errorResponse(res, 'Format QR Code tidak valid.', null, 400);
          }
          bookingId = decoded.id;
        } catch (err) {
          return errorResponse(res, 'QR Code kedaluwarsa atau tidak valid.', null, 400);
        }
      }

      const booking = await BookingRepository.findById(bookingId);
      if (!booking) {
        return errorResponse(res, 'Booking tidak ditemukan.', null, 404);
      }

      // Check operational staff branch permissions
      const staffInfo = await UserRepository.getStaffCabangInfo(staffUserId);
      const field = await FieldRepository.findById(booking.lapangan_id);
      
      if (!staffInfo || staffInfo.cabang_id !== field.cabang_id) {
        return errorResponse(res, 'Akses ditolak. Anda tidak terdaftar sebagai staff di cabang lapangan ini.', null, 403);
      }

      if (booking.status !== 'approved') {
        return errorResponse(res, `Check-in ditolak. Status booking saat ini: ${booking.status} (Harus status "approved").`, null, 400);
      }

      // Update booking status to checked_in
      const updated = await BookingRepository.updateStatusWithLog(
        bookingId,
        'checked_in',
        staffUserId,
        'Customer berhasil melakukan Check-in di cabang.'
      );

      eventEmitter.emit('BookingCheckedIn', updated);

      return successResponse(res, 'Check-in berhasil! Selamat berolahraga.', updated);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
