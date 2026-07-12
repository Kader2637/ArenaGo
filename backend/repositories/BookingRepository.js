const BaseRepository = require('./BaseRepository');
const db = require('../config/db');
const { uuidv7 } = require('../utils/uuid');

class BookingRepository extends BaseRepository {
  constructor() {
    super('booking');
  }

  async findBookings(filters = {}, options = {}) {
    const { user_id, cabang_id, lapangan_id, status, tanggal, kode_booking, mitra_id } = filters;
    const { limit = 10, page = 1, sort = 'b.created_at DESC' } = options;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT b.*, l.nama as nama_lapangan, c.nama as nama_cabang, c.kota, k.nama as nama_kategori,
             u.nama as nama_user, u.email as email_user, u.no_hp as no_hp_user,
             p.status_pembayaran, p.metode_pembayaran
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      JOIN kategori k ON l.kategori_id = k.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN pembayaran p ON b.id = p.booking_id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (user_id) {
      queryText += ` AND b.user_id = $${paramIndex++}`;
      values.push(user_id);
    }
    if (cabang_id) {
      queryText += ` AND l.cabang_id = $${paramIndex++}`;
      values.push(cabang_id);
    }
    if (lapangan_id) {
      queryText += ` AND b.lapangan_id = $${paramIndex++}`;
      values.push(lapangan_id);
    }
    if (status) {
      queryText += ` AND b.status = $${paramIndex++}`;
      values.push(status);
    }
    if (tanggal) {
      queryText += ` AND b.tanggal = $${paramIndex++}`;
      values.push(tanggal);
    }
    if (kode_booking) {
      queryText += ` AND b.kode_booking ILIKE $${paramIndex++}`;
      values.push(`%${kode_booking}%`);
    }
    if (mitra_id) {
      queryText += ` AND c.mitra_id = $${paramIndex++}`;
      values.push(mitra_id);
    }

    queryText += `
      ORDER BY ${sort}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(limit, offset);

    const result = await db.query(queryText, values);
    return result.rows;
  }

  async findByIdWithDetails(id) {
    const queryText = `
      SELECT b.*, l.nama as nama_lapangan, l.kapasitas, l.ukuran, l.jenis_lantai, l.tipe as tipe_lapangan,
             c.nama as nama_cabang, c.alamat as alamat_cabang, c.kota, c.telepon as telepon_cabang, c.maps, c.mitra_id,
             k.nama as nama_kategori, u.nama as nama_user, u.email as email_user, u.no_hp as no_hp_user,
             p.metode_pembayaran, p.bukti_pembayaran, p.nomor_referensi, p.bank, p.nama_pengirim, p.nominal as nominal_bayar,
             p.status_pembayaran, p.catatan as catatan_bayar, inv.nomor_invoice, inv.tanggal as tanggal_invoice
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      JOIN kategori k ON l.kategori_id = k.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN pembayaran p ON b.id = p.booking_id
      LEFT JOIN invoice inv ON b.id = inv.booking_id
      WHERE b.id = $1
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async hasOverlappingBooking(lapanganId, tanggal, jamMulai, jamSelesai, excludeBookingId = null) {
    let queryText = `
      SELECT id FROM booking 
      WHERE lapangan_id = $1 
        AND tanggal = $2 
        AND status NOT IN ('cancelled', 'rejected')
        AND (
          (jam_mulai <= $3 AND jam_selesai > $3) OR
          (jam_mulai < $4 AND jam_selesai >= $4) OR
          (jam_mulai >= $3 AND jam_selesai <= $4)
        )
    `;
    const values = [lapanganId, tanggal, jamMulai, jamSelesai];
    
    if (excludeBookingId) {
      queryText += ` AND id != $5`;
      values.push(excludeBookingId);
    }
    
    const result = await db.query(queryText, values);
    return result.rows.length > 0;
  }

  async createBookingWithTransaction(bookingData, statusLogNotes = 'Booking dibuat') {
    await db.query('BEGIN');
    try {
      // 1. Insert Booking
      const keys = Object.keys(bookingData);
      const values = Object.values(bookingData);
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const insertBookingText = `INSERT INTO booking (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const bookingResult = await db.query(insertBookingText, values);
      const booking = bookingResult.rows[0];

      // 2. Insert Status Log
      const logId = uuidv7();
      const insertLogText = `
        INSERT INTO booking_status_logs (id, booking_id, status, oleh_user_id, catatan) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(insertLogText, [logId, booking.id, booking.status, booking.user_id, statusLogNotes]);

      await db.query('COMMIT');
      return booking;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async updateStatusWithLog(bookingId, newStatus, byUserId, notes = '') {
    await db.query('BEGIN');
    try {
      // 1. Update status
      const updateResult = await db.query(
        `UPDATE booking SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [bookingId, newStatus]
      );
      const booking = updateResult.rows[0];

      if (!booking) {
        throw new Error('Booking tidak ditemukan');
      }

      // 2. Insert Status Log
      const logId = uuidv7();
      await db.query(
        `INSERT INTO booking_status_logs (id, booking_id, status, oleh_user_id, catatan) 
         VALUES ($1, $2, $3, $4, $5)`,
        [logId, bookingId, newStatus, byUserId, notes]
      );

      await db.query('COMMIT');
      return booking;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async getStatusLogs(bookingId) {
    const result = await db.query(
      `SELECT bsl.*, u.nama as nama_user, u.role as role_user 
       FROM booking_status_logs bsl
       LEFT JOIN users u ON bsl.oleh_user_id = u.id
       WHERE bsl.booking_id = $1 
       ORDER BY bsl.tanggal ASC`,
      [bookingId]
    );
    return result.rows;
  }

  async findExpiredBookings(checkTime = new Date()) {
    const result = await db.query(
      `SELECT * FROM booking 
       WHERE status = 'pending' AND expired_at < $1`,
      [checkTime]
    );
    return result.rows;
  }

  async savePayment(paymentData) {
    const keys = Object.keys(paymentData);
    const values = Object.values(paymentData);
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    
    // Check if payment already exists
    const check = await db.query(
      `SELECT id FROM pembayaran WHERE booking_id = $1`,
      [paymentData.booking_id]
    );

    if (check.rows.length > 0) {
      const setClause = keys.filter(k => k !== 'booking_id').map((k, idx) => `${k} = $${idx + 2}`).join(', ');
      const updateValues = values.filter((_, idx) => keys[idx] !== 'booking_id');
      const result = await db.query(
        `UPDATE pembayaran SET ${setClause}, updated_at = NOW() WHERE booking_id = $1 RETURNING *`,
        [paymentData.booking_id, ...updateValues]
      );
      return result.rows[0];
    } else {
      const result = await db.query(
        `INSERT INTO pembayaran (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    }
  }

  async getPaymentByBooking(bookingId) {
    const result = await db.query(
      `SELECT * FROM pembayaran WHERE booking_id = $1`,
      [bookingId]
    );
    return result.rows[0] || null;
  }

  async verifyPaymentWithTransaction(bookingId, statusPembayaran, byUserId, notes = '') {
    await db.query('BEGIN');
    try {
      // 1. Update Payment Status
      const payResult = await db.query(
        `UPDATE pembayaran SET status_pembayaran = $2, updated_at = NOW() WHERE booking_id = $1 RETURNING *`,
        [bookingId, statusPembayaran]
      );
      const payment = payResult.rows[0];

      // 2. Set Booking Status based on payment verification
      const newBookingStatus = statusPembayaran === 'verified' ? 'approved' : 'rejected';
      const updateBookingText = `UPDATE booking SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const bookingResult = await db.query(updateBookingText, [bookingId, newBookingStatus]);
      const booking = bookingResult.rows[0];

      // 3. Write Status Log
      const logId = uuidv7();
      await db.query(
        `INSERT INTO booking_status_logs (id, booking_id, status, oleh_user_id, catatan) 
         VALUES ($1, $2, $3, $4, $5)`,
        [logId, bookingId, newBookingStatus, byUserId, notes || `Pembayaran ${statusPembayaran}`]
      );

      await db.query('COMMIT');
      return { booking, payment };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async createInvoice(invoiceData) {
    const keys = Object.keys(invoiceData);
    const values = Object.values(invoiceData);
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const result = await db.query(
      `INSERT INTO invoice (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async addCommission(komisiData) {
    const keys = Object.keys(komisiData);
    const values = Object.values(komisiData);
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const result = await db.query(
      `INSERT INTO komisi (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = new BookingRepository();
