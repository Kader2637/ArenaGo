const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const bcrypt = require('bcryptjs');

class UserController {
  async index(req, res, next) {
    try {
      const { search, role, status } = req.query;
      const filters = { deleted_at: null };
      
      if (role) filters.role = role;
      if (status) filters.status = status;

      const users = await UserRepository.find(filters, { sort: 'nama ASC' });
      
      if (search) {
        const filtered = users.filter(u => 
          u.nama.toLowerCase().includes(search.toLowerCase()) || 
          u.email.toLowerCase().includes(search.toLowerCase())
        );
        return successResponse(res, 'Daftar pengguna berhasil diambil.', filtered);
      }

      return successResponse(res, 'Daftar pengguna berhasil diambil.', users);
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // status: aktif / nonaktif

      if (!status || !['aktif', 'nonaktif'].includes(status)) {
        return errorResponse(res, 'Status harus bernilai "aktif" atau "nonaktif".', null, 400);
      }

      const user = await UserRepository.findById(id);
      if (!user || user.deleted_at) {
        return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
      }

      if (user.role === 'admin_sistem') {
        return errorResponse(res, 'Status Admin Sistem tidak dapat diubah.', null, 403);
      }

      const updated = await UserRepository.update(id, { status });
      await UserRepository.logActivity(req.user.id, `Mengubah status user ${user.email} menjadi ${status}`);

      return successResponse(res, `Akun pengguna berhasil di-${status === 'aktif' ? 'aktifkan' : 'nonaktifkan'}.`, updated);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password_baru } = req.body;

      if (!password_baru || password_baru.length < 6) {
        return errorResponse(res, 'Password baru wajib diisi dan minimal 6 karakter.', null, 400);
      }

      const user = await UserRepository.findById(id);
      if (!user || user.deleted_at) {
        return errorResponse(res, 'Pengguna tidak ditemukan.', null, 404);
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password_baru, salt);

      await UserRepository.update(id, { password: hashedPassword });
      await UserRepository.logActivity(req.user.id, `Mereset password user: ${user.email}`);

      return successResponse(res, `Password untuk pengguna ${user.nama} berhasil direset.`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
