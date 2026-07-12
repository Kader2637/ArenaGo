const BaseRepository = require('./BaseRepository');
const db = require('../config/db');
const { uuidv7 } = require('../utils/uuid');

class FieldRepository extends BaseRepository {
  constructor() {
    super('lapangan');
  }

  async findFields(filters = {}, options = {}) {
    const { cabang_id, kategori_id, tipe, status, search, min_price, max_price, kota } = filters;

    // Sanitize and parse pagination options to prevent type errors
    const limit = parseInt(options.limit, 10) || 10;
    const page = parseInt(options.page, 10) || 1;
    const sort = options.sort || 'l.created_at DESC';
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT l.*, c.nama as nama_cabang, c.kota, c.alamat as alamat_cabang, k.nama as nama_kategori,
             (SELECT foto FROM galeri WHERE lapangan_id = l.id ORDER BY created_at ASC LIMIT 1) as foto,
             COALESCE(AVG(r.rating), 0) as rating_avg, COUNT(r.id) as review_count
      FROM lapangan l
      JOIN cabang c ON l.cabang_id = c.id
      JOIN kategori k ON l.kategori_id = k.id
      LEFT JOIN review r ON l.id = r.lapangan_id
      WHERE l.deleted_at IS NULL AND c.deleted_at IS NULL AND k.deleted_at IS NULL
    `;
    const values = [];
    let paramIndex = 1;

    if (cabang_id) {
      queryText += ` AND l.cabang_id = $${paramIndex++}`;
      values.push(cabang_id);
    }
    if (kategori_id) {
      queryText += ` AND l.kategori_id = $${paramIndex++}`;
      values.push(kategori_id);
    }
    if (tipe) {
      queryText += ` AND l.tipe = $${paramIndex++}`;
      values.push(tipe);
    }
    if (status) {
      queryText += ` AND l.status = $${paramIndex++}`;
      values.push(status);
    } else {
      queryText += ` AND l.status = 'aktif'`;
    }
    if (kota) {
      queryText += ` AND c.kota ILIKE $${paramIndex++}`;
      values.push(`%${kota}%`);
    }
    if (search) {
      queryText += ` AND (l.nama ILIKE $${paramIndex} OR c.nama ILIKE $${paramIndex} OR k.nama ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (min_price) {
      queryText += ` AND l.harga_per_jam >= $${paramIndex++}`;
      values.push(parseFloat(min_price));
    }
    if (max_price) {
      queryText += ` AND l.harga_per_jam <= $${paramIndex++}`;
      values.push(parseFloat(max_price));
    }

    queryText += `
      GROUP BY l.id, c.nama, c.kota, c.alamat, k.nama
      ORDER BY ${sort}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(limit, offset);

    const result = await db.query(queryText, values);
    return result.rows;
  }

  async findByIdWithDetails(id) {
    const queryText = `
      SELECT l.*, c.nama as nama_cabang, c.alamat as alamat_cabang, c.kota, c.maps, c.telepon as telepon_cabang,
             c.mitra_id, k.nama as nama_kategori, mp.nama_perusahaan, mp.logo as logo_mitra,
             (SELECT foto FROM galeri WHERE lapangan_id = l.id ORDER BY created_at ASC LIMIT 1) as foto,
             COALESCE(AVG(r.rating), 0) as rating_avg, COUNT(r.id) as review_count
      FROM lapangan l
      JOIN cabang c ON l.cabang_id = c.id
      JOIN kategori k ON l.kategori_id = k.id
      JOIN users u ON c.mitra_id = u.id
      LEFT JOIN mitra_profile mp ON u.id = mp.user_id
      LEFT JOIN review r ON l.id = r.lapangan_id
      WHERE l.id = $1 AND l.deleted_at IS NULL
      GROUP BY l.id, c.nama, c.alamat, c.kota, c.maps, c.telepon, c.mitra_id, k.nama, mp.nama_perusahaan, mp.logo
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async getFacilities(lapanganId) {
    const result = await db.query(
      `SELECT f.* 
       FROM fasilitas f
       JOIN lapangan_fasilitas lf ON f.id = lf.fasilitas_id
       WHERE lf.lapangan_id = $1`,
      [lapanganId]
    );
    return result.rows;
  }

  async saveFacilities(lapanganId, facilityIds) {
    // Begin Transaction
    await db.query('BEGIN');
    try {
      await db.query(`DELETE FROM lapangan_fasilitas WHERE lapangan_id = $1`, [lapanganId]);
      for (const fId of facilityIds) {
        await db.query(
          `INSERT INTO lapangan_fasilitas (lapangan_id, fasilitas_id) VALUES ($1, $2)`,
          [lapanganId, fId]
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async getDynamicPrices(lapanganId) {
    const result = await db.query(
      `SELECT * FROM harga_lapangan WHERE lapangan_id = $1 ORDER BY hari, jam_mulai`,
      [lapanganId]
    );
    return result.rows;
  }

  async saveDynamicPrice(lapanganId, hari, jamMulai, jamSelesai, harga) {
    const id = uuidv7();
    const result = await db.query(
      `INSERT INTO harga_lapangan (id, lapangan_id, hari, jam_mulai, jam_selesai, harga) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, lapanganId, hari, jamMulai, jamSelesai, harga]
    );
    return result.rows[0];
  }

  async deleteDynamicPrice(priceId) {
    const result = await db.query(
      `DELETE FROM harga_lapangan WHERE id = $1 RETURNING *`,
      [priceId]
    );
    return result.rows[0] || null;
  }

  async getGallery(lapanganId) {
    const result = await db.query(
      `SELECT * FROM galeri WHERE lapangan_id = $1 ORDER BY created_at ASC`,
      [lapanganId]
    );
    return result.rows;
  }

  async addGalleryPhoto(lapanganId, foto) {
    const id = uuidv7();
    const result = await db.query(
      `INSERT INTO galeri (id, lapangan_id, foto) VALUES ($1, $2, $3) RETURNING *`,
      [id, lapanganId, foto]
    );
    return result.rows[0];
  }

  async deleteGalleryPhoto(photoId) {
    const result = await db.query(
      `DELETE FROM galeri WHERE id = $1 RETURNING *`,
      [photoId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new FieldRepository();
