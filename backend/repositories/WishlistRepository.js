const BaseRepository = require('./BaseRepository');
const db = require('../config/db');

class WishlistRepository extends BaseRepository {
  constructor() {
    super('wishlist');
  }

  async findUserWishlist(userId) {
    const result = await db.query(
      `SELECT w.*, l.nama, l.harga_per_jam, l.tipe, c.nama as nama_cabang, c.kota, k.nama as nama_kategori
       FROM wishlist w
       JOIN lapangan l ON w.lapangan_id = l.id
       JOIN cabang c ON l.cabang_id = c.id
       JOIN kategori k ON l.kategori_id = k.id
       WHERE w.user_id = $1 AND l.deleted_at IS NULL AND c.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async checkInWishlist(userId, lapanganId) {
    const result = await db.query(
      `SELECT * FROM wishlist WHERE user_id = $1 AND lapangan_id = $2`,
      [userId, lapanganId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new WishlistRepository();
