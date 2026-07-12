const BaseRepository = require('./BaseRepository');
const db = require('../config/db');

class VoucherRepository extends BaseRepository {
  constructor() {
    super('voucher');
  }

  async findByKode(kode, checkDate = new Date(), status = 'aktif') {
    const result = await db.query(
      `SELECT * FROM voucher 
       WHERE kode = $1 
         AND status = $2 
         AND tanggal_mulai <= $3 
         AND tanggal_selesai >= $3 
         AND deleted_at IS NULL`,
      [kode, status, checkDate]
    );
    return result.rows[0] || null;
  }

  async getVouchersByMitra(mitraId) {
    const result = await db.query(
      `SELECT * FROM voucher 
       WHERE mitra_id = $1 AND deleted_at IS NULL 
       ORDER BY created_at DESC`,
      [mitraId]
    );
    return result.rows;
  }
}

module.exports = new VoucherRepository();
