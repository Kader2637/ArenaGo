const VoucherRepository = require('../../../repositories/VoucherRepository');
const UserRepository = require('../../../repositories/UserRepository');
const { successResponse, errorResponse } = require('../../../utils/response');
const { uuidv7 } = require('../../../utils/uuid');

class VoucherController {
  async index(req, res, next) {
    try {
      const role = req.user.role;
      const userId = req.user.id;
      
      let vouchers;
      if (role === 'mitra') {
        vouchers = await VoucherRepository.getVouchersByMitra(userId);
      } else {
        // Customer or Admin gets all active
        vouchers = await VoucherRepository.find({ status: 'aktif', deleted_at: null }, { sort: 'tanggal_selesai ASC' });
      }

      return successResponse(res, 'Daftar voucher berhasil diambil.', vouchers);
    } catch (error) {
      next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { kode, diskon, tipe_diskon, tanggal_mulai, tanggal_selesai, minimal_transaksi } = req.body;
      const mitraId = req.user.id;

      if (!kode || !diskon || !tanggal_mulai || !tanggal_selesai) {
        return errorResponse(res, 'Field kode, diskon, tanggal_mulai, dan tanggal_selesai wajib diisi.', null, 400);
      }

      // Check duplicate
      const check = await VoucherRepository.find({ kode: kode.trim().toUpperCase(), deleted_at: null });
      if (check.length > 0) {
        return errorResponse(res, 'Kode voucher tersebut sudah digunakan.', null, 400);
      }

      const voucher = await VoucherRepository.create({
        id: uuidv7(),
        mitra_id: mitraId,
        kode: kode.trim().toUpperCase(),
        diskon: parseFloat(diskon),
        tipe_diskon: tipe_diskon || 'nominal',
        tanggal_mulai,
        tanggal_selesai,
        minimal_transaksi: parseFloat(minimal_transaksi || '0'),
        status: 'aktif'
      });

      await UserRepository.logActivity(mitraId, `Membuat voucher baru: ${kode.trim().toUpperCase()}`);
      return successResponse(res, 'Voucher berhasil dibuat.', voucher, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { diskon, tipe_diskon, tanggal_mulai, tanggal_selesai, minimal_transaksi, status } = req.body;
      const mitraId = req.user.id;

      const voucher = await VoucherRepository.findById(id);
      if (!voucher || voucher.deleted_at) {
        return errorResponse(res, 'Voucher tidak ditemukan.', null, 404);
      }

      if (voucher.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      const updated = await VoucherRepository.update(id, {
        diskon: diskon ? parseFloat(diskon) : undefined,
        tipe_diskon,
        tanggal_mulai,
        tanggal_selesai,
        minimal_transaksi: minimal_transaksi ? parseFloat(minimal_transaksi) : undefined,
        status
      });

      await UserRepository.logActivity(mitraId, `Memperbarui voucher: ${voucher.kode}`);
      return successResponse(res, 'Voucher berhasil diperbarui.', updated);
    } catch (error) {
      next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const mitraId = req.user.id;

      const voucher = await VoucherRepository.findById(id);
      if (!voucher || voucher.deleted_at) {
        return errorResponse(res, 'Voucher tidak ditemukan.', null, 404);
      }

      if (voucher.mitra_id !== mitraId) {
        return errorResponse(res, 'Akses ditolak.', null, 403);
      }

      // Soft delete
      const deleted = await VoucherRepository.update(id, { deleted_at: new Date() });
      await UserRepository.logActivity(mitraId, `Menghapus voucher (soft-delete): ${voucher.kode}`);

      return successResponse(res, 'Voucher berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }

  async checkVoucher(req, res, next) {
    try {
      const { kode, subtotal } = req.query;
      if (!kode || !subtotal) {
        return errorResponse(res, 'Parameter kode dan subtotal diperlukan.', null, 400);
      }

      const voucher = await VoucherRepository.findByKode(kode.trim().toUpperCase(), new Date());
      if (!voucher) {
        return errorResponse(res, 'Kode voucher tidak valid atau sudah kedaluwarsa.', null, 404);
      }

      if (parseFloat(subtotal) < parseFloat(voucher.minimal_transaksi)) {
        return errorResponse(res, `Minimal transaksi untuk voucher ini adalah Rp${parseFloat(voucher.minimal_transaksi).toLocaleString('id-ID')}`, null, 400);
      }

      return successResponse(res, 'Voucher dapat digunakan.', voucher);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VoucherController();
