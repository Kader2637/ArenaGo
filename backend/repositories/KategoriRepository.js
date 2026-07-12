const BaseRepository = require('./BaseRepository');
const db = require('../config/db');

class KategoriRepository extends BaseRepository {
  constructor() {
    super('kategori');
  }

  async findActive() {
    const result = await db.query(
      `SELECT * FROM kategori WHERE status = 'aktif' AND deleted_at IS NULL ORDER BY nama ASC`
    );
    return result.rows;
  }

  async getKategoriStats() {
    const result = await db.query(
      `SELECT k.*, COALESCE(COUNT(l.id), 0) as jumlah_lapangan
       FROM kategori k
       LEFT JOIN lapangan l ON k.id = l.kategori_id AND l.deleted_at IS NULL AND l.status = 'aktif'
       WHERE k.deleted_at IS NULL AND k.status = 'aktif'
       GROUP BY k.id
       ORDER BY k.nama ASC`
    );
    return result.rows;
  }
}

module.exports = new KategoriRepository();
