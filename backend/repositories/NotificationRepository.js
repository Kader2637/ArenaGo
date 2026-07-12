const BaseRepository = require('./BaseRepository');
const db = require('../config/db');

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifikasi');
  }

  async findUserNotifications(userId, limit = 20) {
    const result = await db.query(
      `SELECT * FROM notifikasi 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async markAsRead(notificationId, userId) {
    const result = await db.query(
      `UPDATE notifikasi 
       SET is_read = TRUE, dibaca_at = NOW() 
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0] || null;
  }

  async markAllAsRead(userId) {
    const result = await db.query(
      `UPDATE notifikasi 
       SET is_read = TRUE, dibaca_at = NOW() 
       WHERE user_id = $1 AND is_read = FALSE RETURNING *`,
      [userId]
    );
    return result.rows;
  }

  async countUnread(userId) {
    const result = await db.query(
      `SELECT COUNT(*) as unread_count FROM notifikasi WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].unread_count || '0');
  }
}

module.exports = new NotificationRepository();
