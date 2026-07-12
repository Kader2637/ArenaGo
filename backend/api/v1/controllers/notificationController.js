const NotificationService = require('../../../services/NotificationService');
const { successResponse, errorResponse } = require('../../../utils/response');

class NotificationController {
  async index(req, res, next) {
    try {
      const userId = req.user.id;
      const list = await NotificationService.getUserNotifications(userId);
      const unreadCount = await NotificationService.getUnreadCount(userId);
      
      return successResponse(res, 'Daftar notifikasi berhasil diambil.', list, { unreadCount });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params; // notificationId
      const userId = req.user.id;
      
      const updated = await NotificationService.markAsRead(id, userId);
      return successResponse(res, 'Notifikasi ditandai telah dibaca.', updated);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      return successResponse(res, 'Semua notifikasi ditandai telah dibaca.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
