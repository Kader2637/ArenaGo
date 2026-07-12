const AnalyticsRepository = require('../../../repositories/AnalyticsRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');

class DashboardController {
  async getStats(req, res, next) {
    try {
      const role = req.user.role;
      const userId = req.user.id;

      if (role === 'admin_sistem') {
        const stats = await AnalyticsRepository.getAdminStats();
        return successResponse(res, 'Statistik admin berhasil diambil.', stats);
      } 
      
      if (role === 'mitra') {
        const stats = await AnalyticsRepository.getMitraStats(userId);
        return successResponse(res, 'Statistik mitra berhasil diambil.', stats);
      } 
      
      if (role === 'staff_cabang') {
        const staffInfo = await UserRepository.getStaffCabangInfo(userId);
        if (!staffInfo) {
          return errorResponse(res, 'Staff tidak terikat dengan cabang manapun.', null, 404);
        }
        const stats = await AnalyticsRepository.getStaffCabangStats(staffInfo.cabang_id);
        return successResponse(res, 'Statistik staff cabang berhasil diambil.', {
          ...stats,
          nama_cabang: staffInfo.nama_cabang,
          cabang_id: staffInfo.cabang_id
        });
      }

      return errorResponse(res, 'Role tidak didukung untuk statistik dashboard.', null, 400);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
