const BaseRepository = require('./BaseRepository');
const db = require('../config/db');
const { uuidv7 } = require('../utils/uuid');

class CabangRepository extends BaseRepository {
  constructor() {
    super('cabang');
  }

  async findCabangByMitra(mitraId) {
    const result = await db.query(
      `SELECT * FROM cabang WHERE mitra_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [mitraId]
    );
    return result.rows;
  }

  async findCabangWithMitraInfo(cabangId) {
    const result = await db.query(
      `SELECT c.*, mp.nama_perusahaan, mp.telepon as telepon_perusahaan, mp.logo, mp.banner 
       FROM cabang c
       JOIN users u ON c.mitra_id = u.id
       LEFT JOIN mitra_profile mp ON u.id = mp.user_id
       WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [cabangId]
    );
    return result.rows[0] || null;
  }

  async getJamOperasional(cabangId) {
    const result = await db.query(
      `SELECT * FROM jam_operasional WHERE cabang_id = $1 ORDER BY hari ASC`,
      [cabangId]
    );
    return result.rows;
  }

  async saveJamOperasional(cabangId, hari, jamBuka, jamTutup, status = 'aktif') {
    // Check if exists
    const check = await db.query(
      `SELECT id FROM jam_operasional WHERE cabang_id = $1 AND hari = $2`,
      [cabangId, hari]
    );
    
    if (check.rows.length > 0) {
      const result = await db.query(
        `UPDATE jam_operasional 
         SET jam_buka = $3, jam_tutup = $4, status = $5, updated_at = NOW() 
         WHERE cabang_id = $1 AND hari = $2 RETURNING *`,
        [cabangId, hari, jamBuka, jamTutup, status]
      );
      return result.rows[0];
    } else {
      const id = uuidv7();
      const result = await db.query(
        `INSERT INTO jam_operasional (id, cabang_id, hari, jam_buka, jam_tutup, status) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, cabangId, hari, jamBuka, jamTutup, status]
      );
      return result.rows[0];
    }
  }

  async getStaffByCabang(cabangId) {
    const result = await db.query(
      `SELECT sc.*, u.nama, u.email, u.no_hp, u.status
       FROM staff_cabang sc
       JOIN users u ON sc.user_id = u.id
       WHERE sc.cabang_id = $1 AND u.deleted_at IS NULL`,
      [cabangId]
    );
    return result.rows;
  }

  async addStaffCabang(userId, cabangId) {
    const id = uuidv7();
    const result = await db.query(
      `INSERT INTO staff_cabang (id, user_id, cabang_id) 
       VALUES ($1, $2, $3) RETURNING *`,
      [id, userId, cabangId]
    );
    return result.rows[0];
  }

  async removeStaffCabang(userId) {
    const result = await db.query(
      `DELETE FROM staff_cabang WHERE user_id = $1 RETURNING *`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new CabangRepository();
