const FieldRepository = require('../../../repositories/FieldRepository');
const CabangRepository = require('../../../repositories/CabangRepository');
const UserRepository = require('../../../repositories/UserRepository');
const BookingService = require('../../../services/BookingService');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class FieldController {
  async index(req, res, next) {
    try {
      const { cabang_id, kategori_id, tipe, status, search, min_price, max_price, kota } = req.query;
      const filters = { cabang_id, kategori_id, tipe, status, search, min_price, max_price, kota };
      
      // If user is Mitra, limit to their own branches by default
      if (req.user && req.user.role === 'mitra') {
        const branches = await CabangRepository.findCabangByMitra(req.user.id);
        const branchIds = branches.map(b => b.id);
        
        if (cabang_id) {
          if (!branchIds.includes(cabang_id)) {
            return successResponse(res, 'Daftar lapangan berhasil diambil.', []);
          }
        } else {
          // If no specific cabang is filtered, we can filter for all owned branches
          const results = [];
          for (const bId of branchIds) {
            const fields = await FieldRepository.findFields({ cabang_id: bId, status: 'aktif' }, req.query);
            results.push(...fields);
          }
          return successResponse(res, 'Daftar lapangan berhasil diambil.', results);
        }
      }

      const fields = await FieldRepository.findFields(filters, req.query);
      return successResponse(res, 'Daftar lapangan berhasil diambil.', fields);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const field = await FieldRepository.findByIdWithDetails(id);
      
      if (!field) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      const facilities = await FieldRepository.getFacilities(id);
      const gallery = await FieldRepository.getGallery(id);
      const dynamicPrices = await FieldRepository.getDynamicPrices(id);

      return successResponse(res, 'Detail lapangan berhasil diambil.', {
        field,
        fasilitas: facilities,
        galeri: gallery,
        harga_dinamis: dynamicPrices
      });
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { cabang_id, kategori_id, nama, harga_per_jam, deskripsi, kapasitas, ukuran, jenis_lantai, tipe } = req.body;
      const file = req.file;
      const mitraId = req.user.id;

      if (!cabang_id || !kategori_id || !nama || !harga_per_jam) {
        return errorResponse(res, 'Field cabang_id, kategori_id, nama, dan harga_per_jam wajib diisi.', null, 400);
      }

      // Check branch ownership
      const cabang = await CabangRepository.findById(cabang_id);
      if (!cabang || cabang.deleted_at) {
        return errorResponse(res, 'Cabang tidak ditemukan.', null, 404);
      }
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak. Cabang ini bukan milik Anda.', null, 403);
      }

      const fieldId = uuidv7();
      const newField = await FieldRepository.create({
        id: fieldId,
        cabang_id,
        kategori_id,
        nama,
        harga_per_jam: parseFloat(harga_per_jam),
        deskripsi,
        kapasitas,
        ukuran,
        jenis_lantai,
        tipe: tipe || 'indoor',
        status: 'aktif'
      });

      // Save initial photo if uploaded
      if (file) {
        await FieldRepository.addGalleryPhoto(fieldId, file.filename);
      }

      await UserRepository.logActivity(mitraId, `Membuat lapangan baru: ${nama} di cabang ${cabang.nama}`);
      return successResponse(res, 'Lapangan berhasil ditambahkan.', newField, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { nama, harga_per_jam, deskripsi, kapasitas, ukuran, jenis_lantai, tipe, status } = req.body;
      const file = req.file;
      const mitraId = req.user.id;

      const field = await FieldRepository.findById(id);
      if (!field || field.deleted_at) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      // Verify branch ownership
      const cabang = await CabangRepository.findById(field.cabang_id);
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak. Lapangan ini bukan milik Anda.', null, 403);
      }

      const updates = {
        nama,
        harga_per_jam: harga_per_jam ? parseFloat(harga_per_jam) : undefined,
        deskripsi,
        kapasitas,
        ukuran,
        jenis_lantai,
        tipe,
        status
      };

      // Filter out undefined fields
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      const updated = await FieldRepository.update(id, updates);

      if (file) {
        await FieldRepository.addGalleryPhoto(id, file.filename);
      }

      await UserRepository.logActivity(mitraId, `Memperbarui lapangan: ${nama || field.nama}`);
      return successResponse(res, 'Lapangan berhasil diperbarui.', updated);
    } catch (error) {
      next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const mitraId = req.user.id;

      const field = await FieldRepository.findById(id);
      if (!field || field.deleted_at) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      const cabang = await CabangRepository.findById(field.cabang_id);
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      // Soft delete
      const deleted = await FieldRepository.update(id, { deleted_at: new Date() });
      await UserRepository.logActivity(mitraId, `Menghapus lapangan (soft-delete): ${field.nama}`);
      return successResponse(res, 'Lapangan berhasil dihapus.', deleted);
    } catch (error) {
      next(error);
    }
  }

  async getAvailableSlots(req, res, next) {
    try {
      const { id } = req.params; // lapanganId
      const { tanggal } = req.query; // YYYY-MM-DD

      if (!tanggal) {
        return errorResponse(res, 'Parameter tanggal (YYYY-MM-DD) diperlukan.', null, 400);
      }

      const slots = await BookingService.getAvailableSlots(id, tanggal);
      return successResponse(res, 'Daftar slot jadwal berhasil diambil.', slots);
    } catch (error) {
      next(error);
    }
  }

  async calculatePrice(req, res, next) {
    try {
      const { id } = req.params; // lapanganId
      const { tanggal, jam_mulai, jam_selesai } = req.query;

      if (!tanggal || !jam_mulai || !jam_selesai) {
        return errorResponse(res, 'Parameter tanggal, jam_mulai, dan jam_selesai diperlukan.', null, 400);
      }

      const price = await BookingService.calculateBookingPrice(id, tanggal, jam_mulai, jam_selesai);
      return successResponse(res, 'Perhitungan harga selesai.', price);
    } catch (error) {
      next(error);
    }
  }

  async saveFacilities(req, res, next) {
    try {
      const { id } = req.params; // lapanganId
      const { fasilitas_ids } = req.body; // Array of UUID
      const mitraId = req.user.id;

      const field = await FieldRepository.findById(id);
      if (!field || field.deleted_at) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      const cabang = await CabangRepository.findById(field.cabang_id);
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      if (!Array.isArray(fasilitas_ids)) {
        return errorResponse(res, 'Format fasilitas_ids harus berupa array.', null, 400);
      }

      await FieldRepository.saveFacilities(id, fasilitas_ids);
      await UserRepository.logActivity(mitraId, `Memperbarui fasilitas lapangan: ${field.nama}`);
      
      return successResponse(res, 'Fasilitas lapangan berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  async saveDynamicPrice(req, res, next) {
    try {
      const { id } = req.params; // lapanganId
      const { hari, jam_mulai, jam_selesai, harga } = req.body;
      const mitraId = req.user.id;

      const field = await FieldRepository.findById(id);
      if (!field || field.deleted_at) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      const cabang = await CabangRepository.findById(field.cabang_id);
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      if (hari === undefined || !jam_mulai || !jam_selesai || !harga) {
        return errorResponse(res, 'Field hari, jam_mulai, jam_selesai, dan harga wajib diisi.', null, 400);
      }

      const newOverride = await FieldRepository.saveDynamicPrice(id, hari, jam_mulai, jam_selesai, parseFloat(harga));
      await UserRepository.logActivity(mitraId, `Menambahkan dynamic pricing untuk lapangan: ${field.nama}`);

      return successResponse(res, 'Dynamic pricing berhasil ditambahkan.', newOverride, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async deleteDynamicPrice(req, res, next) {
    try {
      const { priceId } = req.params;
      const mitraId = req.user.id;

      const deleted = await FieldRepository.deleteDynamicPrice(priceId);
      if (!deleted) {
        return errorResponse(res, 'Jadwal harga tidak ditemukan.', null, 404);
      }

      await UserRepository.logActivity(mitraId, 'Menghapus dynamic pricing lapangan');
      return successResponse(res, 'Dynamic pricing berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }

  async addGallery(req, res, next) {
    try {
      const { id } = req.params; // lapanganId
      const file = req.file;
      const mitraId = req.user.id;

      if (!file) {
        return errorResponse(res, 'File foto wajib diunggah.', null, 400);
      }

      const field = await FieldRepository.findById(id);
      if (!field || field.deleted_at) {
        return errorResponse(res, 'Lapangan tidak ditemukan.', null, 404);
      }

      const cabang = await CabangRepository.findById(field.cabang_id);
      if (cabang.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      const photo = await FieldRepository.addGalleryPhoto(id, file.filename);
      return successResponse(res, 'Foto galeri berhasil ditambahkan.', photo, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async calculatePrice(req, res, next) {
    try {
      const { id } = req.params;
      const { tanggal, jam_mulai, jam_selesai } = req.query;

      if (!tanggal || !jam_mulai || !jam_selesai) {
        return errorResponse(res, 'Parameter tanggal, jam_mulai, dan jam_selesai wajib diisi.', null, 400);
      }

      const calculation = await BookingService.calculateBookingPrice(id, tanggal, jam_mulai, jam_selesai);
      return successResponse(res, 'Kalkulasi harga berhasil dilakukan.', calculation);
    } catch (error) {
      return errorResponse(res, error.message, null, 400);
    }
  }

  async deleteGallery(req, res, next) {
    try {
      const { photoId } = req.params;
      const mitraId = req.user.id;

      const photo = await FieldRepository.deleteGalleryPhoto(photoId);
      if (!photo) {
        return errorResponse(res, 'Foto tidak ditemukan.', null, 404);
      }

      await UserRepository.logActivity(mitraId, 'Menghapus foto dari galeri lapangan');
      return successResponse(res, 'Foto galeri berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FieldController();
