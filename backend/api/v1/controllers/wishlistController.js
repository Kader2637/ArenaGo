const WishlistRepository = require('../../../repositories/WishlistRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class WishlistController {
  async index(req, res, next) {
    try {
      const userId = req.user.id;
      const list = await WishlistRepository.findUserWishlist(userId);
      return successResponse(res, 'Wishlist berhasil diambil.', list);
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { lapangan_id } = req.body;
      const userId = req.user.id;

      if (!lapangan_id) {
        return errorResponse(res, 'Field lapangan_id wajib diisi.', null, 400);
      }

      // Check if already in wishlist
      const check = await WishlistRepository.checkInWishlist(userId, lapangan_id);
      if (check) {
        return successResponse(res, 'Lapangan sudah berada di wishlist Anda.', check);
      }

      const item = await WishlistRepository.create({
        id: uuidv7(),
        user_id: userId,
        lapangan_id
      });

      return successResponse(res, 'Berhasil menambahkan lapangan ke wishlist.', item, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params; // wishlistId or lapanganId
      const userId = req.user.id;

      // Check if ID is wishlist item ID
      let item = await WishlistRepository.findById(id);
      
      // If not, maybe it's the lapanganId
      if (!item) {
        const check = await WishlistRepository.checkInWishlist(userId, id);
        if (check) {
          item = check;
        }
      }

      if (!item) {
        return errorResponse(res, 'Item wishlist tidak ditemukan.', null, 404);
      }

      if (item.user_id !== userId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      await WishlistRepository.delete(item.id);
      return successResponse(res, 'Lapangan berhasil dihapus dari wishlist.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WishlistController();
