const UserRepository = require('../../../repositories/UserRepository');
const { errorResponse } = require('../../../utils/response');

function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'Sesi tidak valid.', null, 401);
      }

      // Super Admin bypasses all checks
      if (req.user.role === 'admin_sistem') {
        return next();
      }

      // Query permissions from database dynamically to allow live edits
      const userPermissions = await UserRepository.getUserPermissions(req.user.id);
      
      if (userPermissions.includes(requiredPermission) || userPermissions.includes('system.all')) {
        return next();
      }

      return errorResponse(res, 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.', null, 403);
    } catch (error) {
      return errorResponse(res, 'Kesalahan pemeriksaan otorisasi RBAC.', error.message, 500);
    }
  };
}

module.exports = authorize;
