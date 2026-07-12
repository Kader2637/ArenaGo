const KategoriRepository = require('../../../repositories/KategoriRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class KategoriController {
  async index(req, res, next) {
    try {
      const categories = await KategoriRepository.find({ deleted_at: null }, { sort: 'nama ASC' });
      return successResponse(res, 'Daftar kategori berhasil diambil.', categories);
    } catch (error) {
      next(error);
    }
  }

  async getKategoriStats(req, res, next) {
    try {
      const stats = await KategoriRepository.getKategoriStats();
      return successResponse(res, 'Statistik kategori berhasil diambil.', stats);
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { nama, icon, deskripsi } = req.body;
      const file = req.file;

      if (!nama) {
        return errorResponse(res, 'Nama kategori wajib diisi.', null, 400);
      }

      const check = await KategoriRepository.find({ nama, deleted_at: null });
      if (check.length > 0) {
        return errorResponse(res, 'Kategori dengan nama tersebut sudah ada.', null, 400);
      }

      const newKategori = await KategoriRepository.create({
        id: uuidv7(),
        nama,
        icon: icon || 'bi bi-activity',
        gambar: file ? file.filename : 'default-category.jpg',
        deskripsi,
        status: 'aktif'
      });

      await UserRepository.logActivity(req.user.id, `Membuat kategori olahraga baru: ${nama}`);
      return successResponse(res, 'Kategori berhasil ditambahkan.', newKategori, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { nama, icon, deskripsi, status } = req.body;
      const file = req.file;

      const kategori = await KategoriRepository.findById(id);
      if (!kategori || kategori.deleted_at) {
        return errorResponse(res, 'Kategori tidak ditemukan.', null, 404);
      }

      const updates = { nama, icon, deskripsi, status };
      if (file) {
        updates.gambar = file.filename;
      }

      const updated = await KategoriRepository.update(id, updates);
      await UserRepository.logActivity(req.user.id, `Memperbarui kategori olahraga: ${nama || kategori.nama}`);
      return successResponse(res, 'Kategori berhasil diperbarui.', updated);
    } catch (error) {
      next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;

      const kategori = await KategoriRepository.findById(id);
      if (!kategori || kategori.deleted_at) {
        return errorResponse(res, 'Kategori tidak ditemukan.', null, 404);
      }

      // Soft delete
      const deleted = await KategoriRepository.update(id, { deleted_at: new Date() });
      await UserRepository.logActivity(req.user.id, `Menghapus kategori olahraga (soft-delete): ${kategori.nama}`);
      return successResponse(res, 'Kategori berhasil dihapus.', deleted);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KategoriController();
