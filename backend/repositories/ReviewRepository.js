const BaseRepository = require('./BaseRepository');
const db = require('../config/db');

class ReviewRepository extends BaseRepository {
  constructor() {
    super('review');
  }

  async getReviewsByLapangan(lapanganId) {
    const result = await db.query(
      `SELECT r.*, u.nama as nama_user, u.foto as foto_user 
       FROM review r
       JOIN users u ON r.user_id = u.id
       WHERE r.lapangan_id = $1 
       ORDER BY r.created_at DESC`,
      [lapanganId]
    );
    return result.rows;
  }

  async getReviewsByMitra(mitraId) {
    const result = await db.query(
      `SELECT r.*, u.nama as nama_user, l.nama as nama_lapangan, c.nama as nama_cabang
       FROM review r
       JOIN users u ON r.user_id = u.id
       JOIN lapangan l ON r.lapangan_id = l.id
       JOIN cabang c ON l.cabang_id = c.id
       WHERE c.mitra_id = $1
       ORDER BY r.created_at DESC`,
      [mitraId]
    );
    return result.rows;
  }
}

module.exports = new ReviewRepository();
