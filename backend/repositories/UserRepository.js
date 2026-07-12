const BaseRepository = require('./BaseRepository');
const db = require('../config/db');
const { uuidv7 } = require('../utils/uuid');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserPermissions(userId) {
    const result = await db.query(
      `SELECT DISTINCT p.nama 
       FROM users u
       JOIN roles r ON u.role = r.nama
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows.map(row => row.nama);
  }

  async saveRefreshToken(userId, token, expiresAt) {
    const id = uuidv7();
    const result = await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, userId, token, expiresAt]
    );
    return result.rows[0];
  }

  async findRefreshToken(token) {
    const result = await db.query(
      `SELECT * FROM refresh_tokens WHERE token = $1`,
      [token]
    );
    return result.rows[0] || null;
  }

  async deleteRefreshToken(token) {
    const result = await db.query(
      `DELETE FROM refresh_tokens WHERE token = $1 RETURNING *`,
      [token]
    );
    return result.rows[0] || null;
  }

  async cleanExpiredRefreshTokens() {
    return await db.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  }

  async logLogin(userId, ip, browser, device) {
    const id = uuidv7();
    return await db.query(
      `INSERT INTO login_logs (id, user_id, ip, browser, device) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, ip, browser, device]
    );
  }

  async getLoginLogs(userId, limit = 10) {
    const result = await db.query(
      `SELECT ip, browser, device, login_at 
       FROM login_logs 
       WHERE user_id = $1 
       ORDER BY login_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async logActivity(userId, activity) {
    const id = uuidv7();
    return await db.query(
      `INSERT INTO activity_logs (id, user_id, aktivitas) 
       VALUES ($1, $2, $3)`,
      [id, userId, activity]
    );
  }

  async getMitraProfile(userId) {
    const result = await db.query(
      `SELECT * FROM mitra_profile WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async createMitraProfile(profileData) {
    const keys = Object.keys(profileData);
    const values = Object.values(profileData);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const result = await db.query(
      `INSERT INTO mitra_profile (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async updateMitraProfile(userId, profileData) {
    const keys = Object.keys(profileData);
    const values = Object.values(profileData);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const result = await db.query(
      `UPDATE mitra_profile SET ${setClause} WHERE user_id = $1 RETURNING *`,
      [userId, ...values]
    );
    return result.rows[0] || null;
  }

  async getStaffCabangInfo(userId) {
    const result = await db.query(
      `SELECT sc.*, c.nama as nama_cabang, c.mitra_id
       FROM staff_cabang sc
       JOIN cabang c ON sc.cabang_id = c.id
       WHERE sc.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
