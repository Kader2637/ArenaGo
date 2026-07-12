const NotificationRepository = require('../repositories/NotificationRepository');
const logger = require('../utils/logger');
const { uuidv7 } = require('../utils/uuid');

class NotificationService {
  async createNotification(userId, judul, pesan) {
    try {
      const id = uuidv7();
      const notification = await NotificationRepository.create({
        id,
        user_id: userId,
        judul,
        pesan,
        is_read: false
      });

      // Simulation of Email/WhatsApp channels
      logger.info(`[NOTIFIKASI] User ID: ${userId} | Judul: "${judul}" | Pesan: "${pesan}"`);
      
      return notification;
    } catch (error) {
      logger.error(`Gagal membuat notifikasi untuk User ID: ${userId}: ${error.message}`);
      throw error;
    }
  }

  async getUserNotifications(userId) {
    return await NotificationRepository.findUserNotifications(userId);
  }

  async markAsRead(notificationId, userId) {
    const updated = await NotificationRepository.markAsRead(notificationId, userId);
    if (!updated) {
      throw new Error('Notifikasi tidak ditemukan atau akses ditolak.');
    }
    return updated;
  }

  async markAllAsRead(userId) {
    return await NotificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId) {
    return await NotificationRepository.countUnread(userId);
  }
}

module.exports = new NotificationService();
