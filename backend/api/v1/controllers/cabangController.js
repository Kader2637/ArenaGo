const CabangRepository = require('../../../repositories/CabangRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class CabangController {
  async index(req, res, next) {
    try {
      const { kota } = req.query;
      const filters = { deleted_at: null };
      
      // If user is Mitra, filter by owned branches
      if (req.user && req.user.role === 'mitra') {
        filters.mitra_id = req.user.id;
      }
      
      if (kota) {
        // Can filter by city using database queries or repository find
        const branches = await CabangRepository.find(filters, { sort: 'nama ASC' });
        const filtered = branches.filter(b => b.kota.toLowerCase().includes(kota.toLowerCase()));
        return successResponse(res, 'Daftar cabang berhasil diambil.', filtered);
      }

      const branches = await CabangRepository.find(filters, { sort: 'nama ASC' });
      return successResponse(res, 'Daftar cabang berhasil diambil.', branches);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const cabang = await CabangRepository.findCabangWithMitraInfo(id);
      
      if (!cabang) {
        return errorResponse(res, 'Cabang tidak ditemukan atau sudah dihapus.', null, 404);
      }

      const operationalHours = await CabangRepository.getJamOperasional(id);

      return successResponse(res, 'Detail cabang berhasil diambil.', {
        cabang,
        jam_operasional: operationalHours
      });
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { nama, alamat, kota, maps, telepon } = req.body;
      const mitraId = req.user.id;

      if (!nama || !alamat || !kota) {
        return errorResponse(res, 'Field nama, alamat, dan kota wajib diisi.', null, 400);
      }

      const newCabang = await CabangRepository.create({
        id: uuidv7(),
        mitra_id: mitraId,
        nama,
        alamat,
        kota,
        maps,
        telepon,
        status: 'aktif'
      });

      // Initialize default 07:00 - 22:00 operating hours for days 0-6
      for (let i = 0; i <= 6; i++) {
        await CabangRepository.saveJamOperasional(newCabang.id, i, '07:00:00', '22:00:00', 'aktif');
      }

      await UserRepository.logActivity(mitraId, `Membuat cabang baru: ${nama}`);
      return successResponse(res, 'Cabang baru berhasil dibuat.', newCabang, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { nama, alamat, kota, maps, telepon, status } = req.body;
      const mitraId = req.user.id;

      const cabang = await CabangRepository.findById(id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }

      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak. Cabang ini bukan milik Anda.', null, 403);
      }

      const updated = await CabangRepository.update(id, {
        nama,
        alamat,
        kota,
        maps,
        telepon,
        status
      });

      await UserRepository.logActivity(mitraId, `Memperbarui cabang: ${nama || cabang.nama}`);
      return successResponse(res, 'Informasi cabang berhasil diperbarui.', updated);
    } catch (error) {
      next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const mitraId = req.user.id;

      const cabang = await CabangRepository.findById(id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }

      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak. Cabang ini bukan milik Anda.', null, 403);
      }

      // Soft delete
      const deleted = await CabangRepository.update(id, { deleted_at: new Date() });

      await UserRepository.logActivity(mitraId, `Menghapus cabang (soft-delete): ${cabang.nama}`);
      return successResponse(res, 'Cabang berhasil dihapus.', deleted);
    } catch (error) {
      next(error);
    }
  }

  async getJamOperasional(req, res, next) {
    try {
      const { id } = req.params; // cabangId
      const hours = await CabangRepository.getJamOperasional(id);
      return successResponse(res, 'Jam operasional cabang berhasil diambil.', hours);
    } catch (error) {
      next(error);
    }
  }

  async saveJamOperasional(req, res, next) {
    try {
      const { id } = req.params; // cabangId
      const { jam_operasional } = req.body; // Array of { hari, jam_buka, jam_tutup, status }
      const mitraId = req.user.id;

      const cabang = await CabangRepository.findById(id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }

      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      if (!Array.isArray(jam_operasional)) {
        return errorResponse(res, 'Format data jam_operasional harus berupa array.', null, 400);
      }

      const results = [];
      for (const item of jam_operasional) {
        const { hari, jam_buka, jam_tutup, status } = item;
        const resItem = await CabangRepository.saveJamOperasional(id, hari, jam_buka, jam_tutup, status);
        results.push(resItem);
      }

      await UserRepository.logActivity(mitraId, `Memperbarui jam operasional cabang: ${cabang.nama}`);
      return successResponse(res, 'Jam operasional cabang berhasil disimpan.', results);
    } catch (error) {
      next(error);
    }
  }

  async listStaff(req, res, next) {
    try {
      const { id } = req.params; // cabangId
      const staff = await CabangRepository.getStaffByCabang(id);
      return successResponse(res, 'Daftar staff cabang berhasil diambil.', staff);
    } catch (error) {
      next(error);
    }
  }

  async addStaff(req, res, next) {
    try {
      const { id } = req.params; // cabangId
      const { email_staff } = req.body;
      const mitraId = req.user.id;

      const cabang = await CabangRepository.findById(id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }

      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      // Check if user exists & is indeed role 'staff_cabang'
      const staffUser = await UserRepository.findByEmail(email_staff);
      if (!staffUser) {
        return errorResponse(res, 'Akun staff dengan email tersebut tidak ditemukan. Silakan register akun dengan role staff_cabang terlebih dahulu.', null, 404);
      }

      if (staffUser.role !== 'staff_cabang') {
        return errorResponse(res, 'User tersebut bukan role staff_cabang.', null, 400);
      }

      // Check if staff already assigned elsewhere
      const existingAssignment = await UserRepository.getStaffCabangInfo(staffUser.id);
      if (existingAssignment) {
        // Remove old assignment first
        await CabangRepository.removeStaffCabang(staffUser.id);
      }

      const assigned = await CabangRepository.addStaffCabang(staffUser.id, id);
      await UserRepository.logActivity(mitraId, `Menambahkan staff ${staffUser.nama} ke cabang ${cabang.nama}`);
      
      return successResponse(res, 'Staff berhasil ditambahkan ke cabang.', assigned);
    } catch (error) {
      next(error);
    }
  }

  async removeStaff(req, res, next) {
    try {
      const { id } = req.params; // cabangId
      const { staff_user_id } = req.body;
      const mitraId = req.user.id;

      const cabang = await CabangRepository.findById(id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }

      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      const removed = await CabangRepository.removeStaffCabang(staff_user_id);
      await UserRepository.logActivity(mitraId, `Mengeluarkan staff dari cabang ${cabang.nama}`);
      
      return successResponse(res, 'Staff berhasil dikeluarkan dari cabang.', removed);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CabangController();
