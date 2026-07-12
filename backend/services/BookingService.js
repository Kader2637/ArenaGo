const BookingRepository = require('../repositories/BookingRepository');
const FieldRepository = require('../repositories/FieldRepository');
const CabangRepository = require('../repositories/CabangRepository');
const VoucherRepository = require('../repositories/VoucherRepository');
const UserRepository = require('../repositories/UserRepository');
const eventEmitter = require('../events/eventEmitter');
const { uuidv7 } = require('../utils/uuid');

class BookingService {
  // Convert "HH:MM:SS" or "HH:MM" to absolute minutes in a day
  timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  // Convert minutes to "HH:MM"
  minutesToTime(minutes) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  async getAvailableSlots(lapanganId, tanggalStr) {
    const field = await FieldRepository.findByIdWithDetails(lapanganId);
    if (!field) {
      throw new Error('Lapangan tidak ditemukan');
    }

    const date = new Date(tanggalStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...

    // 1. Get operational hours for this branch & day
    const operationalHoursList = await CabangRepository.getJamOperasional(field.cabang_id);
    const todayOps = operationalHoursList.find(ops => ops.hari === dayOfWeek);

    if (!todayOps || todayOps.status !== 'aktif') {
      return []; // Branch is closed on this day
    }

    const startMinutes = this.timeToMinutes(todayOps.jam_buka);
    const endMinutes = this.timeToMinutes(todayOps.jam_tutup);

    // 2. Fetch existing bookings for this field and date (exclude cancelled/rejected)
    const bookings = await BookingRepository.find(
      { lapangan_id: lapanganId, tanggal: tanggalStr },
      { select: 'id, jam_mulai, jam_selesai, status' }
    );
    const activeBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');

    // 3. Fetch dynamic pricing rates for this field & day
    const dynamicPrices = await FieldRepository.getDynamicPrices(lapanganId);
    const todayDynamicPrices = dynamicPrices.filter(dp => dp.hari === dayOfWeek);

    const slots = [];
    // Loop through 30-minute intervals
    for (let current = startMinutes; current < endMinutes; current += 30) {
      const slotStartStr = this.minutesToTime(current);
      const slotEndStr = this.minutesToTime(current + 30);
      
      // Determine base rate per 30 minutes
      let slotPrice = parseFloat(field.harga_per_jam) / 2; // default 30 min price

      // Check dynamic pricing override
      const matchingOverride = todayDynamicPrices.find(dp => {
        const dpStart = this.timeToMinutes(dp.jam_mulai);
        const dpEnd = this.timeToMinutes(dp.jam_selesai);
        return current >= dpStart && (current + 30) <= dpEnd;
      });

      if (matchingOverride) {
        slotPrice = parseFloat(matchingOverride.harga) / 2;
      }

      // Check booking status
      let slotStatus = 'Tersedia'; // Green
      const activeOverlap = activeBookings.find(b => {
        const bStart = this.timeToMinutes(b.jam_mulai);
        const bEnd = this.timeToMinutes(b.jam_selesai);
        return current >= bStart && (current + 30) <= bEnd;
      });

      if (activeOverlap) {
        if (['pending', 'waiting_payment', 'waiting_verification'].includes(activeOverlap.status)) {
          slotStatus = 'Menunggu Pembayaran'; // Yellow
        } else {
          slotStatus = 'Sudah Dibooking'; // Red
        }
      }

      slots.push({
        jam_mulai: slotStartStr,
        jam_selesai: slotEndStr,
        harga: slotPrice,
        status: slotStatus
      });
    }

    return slots;
  }

  async calculateBookingPrice(lapanganId, tanggalStr, jamMulaiStr, jamSelesaiStr) {
    const slots = await this.getAvailableSlots(lapanganId, tanggalStr);
    if (slots.length === 0) {
      throw new Error('Lapangan tutup pada tanggal ini');
    }

    const requestStart = this.timeToMinutes(jamMulaiStr);
    const requestEnd = this.timeToMinutes(jamSelesaiStr);

    if (requestStart >= requestEnd) {
      throw new Error('Jam mulai harus kurang dari jam selesai');
    }

    // Filter slots matching the requested time block
    const selectedSlots = slots.filter(slot => {
      const slotStart = this.timeToMinutes(slot.jam_mulai);
      const slotEnd = this.timeToMinutes(slot.jam_selesai);
      return slotStart >= requestStart && slotEnd <= requestEnd;
    });

    // Check if slots span the entire requested block
    const expectedSlotsCount = (requestEnd - requestStart) / 30;
    if (selectedSlots.length !== expectedSlotsCount) {
      throw new Error('Waktu booking yang diminta berada di luar jam operasional');
    }

    let subtotal = 0;
    const details = [];

    for (const slot of selectedSlots) {
      subtotal += slot.harga;
      details.push({
        jam: `${slot.jam_mulai} - ${slot.jam_selesai}`,
        harga: slot.harga
      });
    }

    const durasi = (requestEnd - requestStart) / 60; // in hours

    return {
      durasi,
      subtotal,
      details
    };
  }

  async createBooking(userId, lapanganId, tanggalStr, jamMulaiStr, jamSelesaiStr, catatan = '', voucherKode = '') {
    // 1. Verify Date (Cannot be past date)
    const bookingDate = new Date(tanggalStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new Error('Tanggal booking tidak boleh hari kemarin.');
    }

    // 2. Check field info & state
    const field = await FieldRepository.findByIdWithDetails(lapanganId);
    if (!field) throw new Error('Lapangan tidak ditemukan.');
    if (field.status !== 'aktif') {
      throw new Error('Lapangan sedang dalam pemeliharaan (maintenance) atau dinonaktifkan.');
    }

    // 3. Check overlaps
    const overlap = await BookingRepository.hasOverlappingBooking(lapanganId, tanggalStr, jamMulaiStr, jamSelesaiStr);
    if (overlap) {
      throw new Error('Lapangan sudah dibooking pada jam tersebut.');
    }

    // 4. Calculate base price from slots
    const priceCalculation = await this.calculateBookingPrice(lapanganId, tanggalStr, jamMulaiStr, jamSelesaiStr);

    let diskon = 0;
    let voucherId = null;

    // 5. Apply Voucher code if present
    if (voucherKode && voucherKode.trim() !== '') {
      const voucher = await VoucherRepository.findByKode(voucherKode.trim().toUpperCase(), new Date());
      if (!voucher) {
        throw new Error('Kode voucher tidak valid atau sudah kedaluwarsa.');
      }
      
      // Verify Mitra ID matching (Vouchers belong to specific mitra centers)
      if (voucher.mitra_id !== field.mitra_id) {
        throw new Error('Voucher ini tidak berlaku untuk lapangan olahraga ini.');
      }

      if (priceCalculation.subtotal < parseFloat(voucher.minimal_transaksi)) {
        throw new Error(`Minimal transaksi untuk menggunakan voucher ini adalah Rp${parseFloat(voucher.minimal_transaksi).toLocaleString('id-ID')}`);
      }

      if (voucher.tipe_diskon === 'persen') {
        diskon = (parseFloat(voucher.diskon) / 100) * priceCalculation.subtotal;
      } else {
        diskon = parseFloat(voucher.diskon);
      }

      // Cap discount to subtotal
      if (diskon > priceCalculation.subtotal) {
        diskon = priceCalculation.subtotal;
      }
      voucherId = voucher.id;
    }

    const total = priceCalculation.subtotal - diskon;

    // 6. Generate dynamic Booking Code
    const datePrefix = tanggalStr.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const kodeBooking = `GO-${datePrefix}-${randomSuffix}`;

    // 7. Expired window (15 minutes from now)
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 15);

    const bookingId = uuidv7();
    const newBooking = await BookingRepository.createBookingWithTransaction({
      id: bookingId,
      kode_booking: kodeBooking,
      user_id: userId,
      lapangan_id: lapanganId,
      tanggal: tanggalStr,
      jam_mulai: jamMulaiStr,
      jam_selesai: jamSelesaiStr,
      durasi: priceCalculation.durasi,
      harga_per_jam: field.harga_per_jam,
      subtotal: priceCalculation.subtotal,
      diskon,
      total,
      status: 'pending',
      catatan,
      voucher_id: voucherId,
      expired_at: expiredAt
    });

    // 8. Generate Marketplace commission records
    const commissionRate = field.commission_rate ? parseFloat(field.commission_rate) : 10.00;
    const commissionNominal = (commissionRate / 100) * total;
    
    await BookingRepository.addCommission({
      id: uuidv7(),
      booking_id: bookingId,
      persentase: commissionRate,
      nominal: commissionNominal
    });

    // 9. Emit Event
    eventEmitter.emit('BookingCreated', newBooking);

    return newBooking;
  }

  async getMyBookingHistory(userId, filters = {}, options = {}) {
    return await BookingRepository.findBookings({ user_id: userId, ...filters }, options);
  }

  async getBookingDetail(bookingId, userId, role) {
    const booking = await BookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new Error('Booking tidak ditemukan.');
    }

    // Role verification (Check permissions)
    if (role === 'customer' && booking.user_id !== userId) {
      throw new Error('Akses ditolak.');
    }
    if (role === 'mitra' && booking.mitra_id !== userId) {
      throw new Error('Akses ditolak.');
    }
    if (role === 'staff_cabang') {
      const staffInfo = await UserRepository.getStaffCabangInfo(userId);
      if (!staffInfo || booking.cabang_id !== staffInfo.cabang_id) {
        throw new Error('Akses ditolak. Anda tidak ditugaskan di cabang ini.');
      }
    }

    const statusLogs = await BookingRepository.getStatusLogs(bookingId);

    return {
      booking,
      statusLogs
    };
  }
}

module.exports = new BookingService();
