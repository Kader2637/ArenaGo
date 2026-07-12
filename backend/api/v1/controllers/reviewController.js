const ReviewRepository = require('../../../repositories/ReviewRepository');
const BookingRepository = require('../../../repositories/BookingRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class ReviewController {
  async store(req, res, next) {
    try {
      const { booking_id, rating, komentar } = req.body;
      const file = req.file;
      const userId = req.user.id;

      if (!booking_id || !rating) {
        return errorResponse(res, 'Field booking_id dan rating wajib diisi.', null, 400);
      }

      // Verify booking exists, belongs to user, and is marked completed
      const booking = await BookingRepository.findById(booking_id);
      if (!booking) {
        return errorResponse(res, 'Booking tidak ditemukan.', null, 404);
      }

      if (booking.user_id !== userId) {
        return errorResponse(res, 'Akses ditolak. Anda tidak berhak menilai booking ini.', null, 403);
      }

      if (booking.status !== 'completed') {
        return errorResponse(res, 'Ulasan hanya dapat diberikan setelah pemesanan berstatus selesai (completed).', null, 400);
      }

      // Check if user already reviewed this booking
      const check = await ReviewRepository.find({ booking_id });
      if (check.length > 0) {
        return errorResponse(res, 'Anda sudah memberikan ulasan untuk pemesanan ini.', null, 400);
      }

      const review = await ReviewRepository.create({
        id: uuidv7(),
        booking_id,
        user_id: userId,
        lapangan_id: booking.lapangan_id,
        rating: parseInt(rating),
        komentar,
        foto: file ? file.filename : null
      });

      await UserRepository.logActivity(userId, 'Memberikan rating dan ulasan ulasan lapangan');

      return successResponse(res, 'Terima kasih atas ulasan Anda!', review, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async index(req, res, next) {
    try {
      const { lapangan_id } = req.query;
      if (!lapangan_id) {
        return errorResponse(res, 'Parameter lapangan_id diperlukan.', null, 400);
      }

      const reviews = await ReviewRepository.getReviewsByLapangan(lapangan_id);
      return successResponse(res, 'Ulasan lapangan berhasil diambil.', reviews);
    } catch (error) {
      next(error);
    }
  }

  async getMitraReviews(req, res, next) {
    try {
      const mitraId = req.user.id;
      const reviews = await ReviewRepository.getReviewsByMitra(mitraId);
      return successResponse(res, 'Ulasan masuk berhasil diambil.', reviews);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
