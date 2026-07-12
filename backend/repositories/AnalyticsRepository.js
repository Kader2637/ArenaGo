const db = require('../config/db');

class AnalyticsRepository {
  async getAdminStats() {
    const totalMitraRes = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'mitra' AND deleted_at IS NULL`);
    const totalCabangRes = await db.query(`SELECT COUNT(*) as count FROM cabang WHERE deleted_at IS NULL`);
    const totalLapanganRes = await db.query(`SELECT COUNT(*) as count FROM lapangan WHERE deleted_at IS NULL`);
    const totalCustomerRes = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'customer' AND deleted_at IS NULL`);

    const bookingStatsRes = await db.query(`
      SELECT 
        COUNT(*) as total_booking,
        SUM(CASE WHEN tanggal = CURRENT_DATE THEN 1 ELSE 0 END) as booking_hari_ini,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_pendapatan
      FROM booking
    `);

    // Top Category
    const topCategoryRes = await db.query(`
      SELECT k.nama, COUNT(b.id) as booking_count
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN kategori k ON l.kategori_id = k.id
      GROUP BY k.id, k.nama
      ORDER BY booking_count DESC
      LIMIT 1
    `);

    // Top Mitra
    const topMitraRes = await db.query(`
      SELECT mp.nama_perusahaan, COALESCE(SUM(b.total), 0) as revenue
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      JOIN users u ON c.mitra_id = u.id
      LEFT JOIN mitra_profile mp ON u.id = mp.user_id
      WHERE b.status = 'completed'
      GROUP BY u.id, mp.nama_perusahaan
      ORDER BY revenue DESC
      LIMIT 1
    `);

    // Monthly Bookings & Revenue
    const monthlyStatsRes = await db.query(`
      SELECT 
        TO_CHAR(tanggal, 'YYYY-MM') as bulan,
        COUNT(*) as total_booking,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as pendapatan
      FROM booking
      WHERE tanggal >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY bulan
      ORDER BY bulan ASC
    `);

    return {
      total_mitra: parseInt(totalMitraRes.rows[0]?.count || '0'),
      total_cabang: parseInt(totalCabangRes.rows[0]?.count || '0'),
      total_lapangan: parseInt(totalLapanganRes.rows[0]?.count || '0'),
      total_customer: parseInt(totalCustomerRes.rows[0]?.count || '0'),
      total_booking: parseInt(bookingStatsRes.rows[0]?.total_booking || '0'),
      booking_hari_ini: parseInt(bookingStatsRes.rows[0]?.booking_hari_ini || '0'),
      total_pendapatan: parseFloat(bookingStatsRes.rows[0]?.total_pendapatan || '0'),
      top_category: topCategoryRes.rows[0] || null,
      top_mitra: topMitraRes.rows[0] || null,
      monthly_stats: monthlyStatsRes.rows
    };
  }

  async getMitraStats(mitraId) {
    const bookingStatsRes = await db.query(`
      SELECT 
        COUNT(b.id) as total_booking,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total ELSE 0 END), 0) as total_revenue,
        SUM(CASE WHEN b.tanggal = CURRENT_DATE THEN 1 ELSE 0 END) as booking_hari_ini,
        SUM(CASE WHEN b.tanggal >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 ELSE 0 END) as booking_minggu_ini,
        SUM(CASE WHEN b.tanggal >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END) as booking_bulan_ini,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'cancelled' OR b.status = 'rejected' THEN 1 ELSE 0 END) as failed_bookings
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1
    `, [mitraId]);

    const stats = bookingStatsRes.rows[0] || {};

    // Occupancy Rate (Booked slots vs total possible slots for last 30 days)
    // Assume 14 operating hours daily per branch
    const branchCountRes = await db.query(`SELECT COUNT(*) as count FROM cabang WHERE mitra_id = $1 AND deleted_at IS NULL`, [mitraId]);
    const branchCount = parseInt(branchCountRes.rows[0].count || '0');
    const totalPossibleHours = branchCount * 14 * 30; // 14 hrs * 30 days

    const bookedHoursRes = await db.query(`
      SELECT COALESCE(SUM(b.durasi), 0) as booked_hours
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1 
        AND b.status IN ('approved', 'checked_in', 'playing', 'completed')
        AND b.tanggal >= CURRENT_DATE - INTERVAL '30 days'
    `, [mitraId]);
    const bookedHours = parseFloat(bookedHoursRes.rows[0]?.booked_hours || '0');
    const occupancyRate = totalPossibleHours > 0 ? (bookedHours / totalPossibleHours) * 100 : 0;

    // Peak booking hours
    const peakHoursRes = await db.query(`
      SELECT b.jam_mulai, COUNT(*) as count
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1
      GROUP BY b.jam_mulai
      ORDER BY count DESC
      LIMIT 3
    `, [mitraId]);

    // Best Category
    const bestCategoryRes = await db.query(`
      SELECT k.nama, COUNT(b.id) as booking_count
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN kategori k ON l.kategori_id = k.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1
      GROUP BY k.id, k.nama
      ORDER BY booking_count DESC
      LIMIT 1
    `, [mitraId]);

    // Repeat Customers Count (Customers who booked more than once)
    const repeatCustomerRes = await db.query(`
      SELECT COUNT(*) as count FROM (
        SELECT b.user_id
        FROM booking b
        JOIN lapangan l ON b.lapangan_id = l.id
        JOIN cabang c ON l.cabang_id = c.id
        WHERE c.mitra_id = $1 AND b.status = 'completed'
        GROUP BY b.user_id
        HAVING COUNT(b.id) > 1
      ) sub
    `, [mitraId]);

    // New Customers this month
    const newCustomersRes = await db.query(`
      SELECT COUNT(DISTINCT b.user_id) as count
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1 
        AND b.tanggal >= DATE_TRUNC('month', CURRENT_DATE)
    `, [mitraId]);

    // Recent reviews
    const recentReviewsRes = await db.query(`
      SELECT r.*, u.nama as nama_user, l.nama as nama_lapangan
      FROM review r
      JOIN users u ON r.user_id = u.id
      JOIN lapangan l ON r.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [mitraId]);

    // Monthly performance logs
    const monthlySalesRes = await db.query(`
      SELECT 
        TO_CHAR(b.tanggal, 'YYYY-MM') as bulan,
        COUNT(b.id) as total_booking,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total ELSE 0 END), 0) as pendapatan
      FROM booking b
      JOIN lapangan l ON b.lapangan_id = l.id
      JOIN cabang c ON l.cabang_id = c.id
      WHERE c.mitra_id = $1 AND b.tanggal >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY bulan
      ORDER BY bulan ASC
    `, [mitraId]);

    const totalBookingsInt = parseInt(stats.total_booking || '0');
    const completedBookingsInt = parseInt(stats.completed_bookings || '0');
    const conversionRate = totalBookingsInt > 0 ? (completedBookingsInt / totalBookingsInt) * 100 : 0;

    return {
      total_booking: totalBookingsInt,
      total_revenue: parseFloat(stats.total_revenue || '0'),
      booking_hari_ini: parseInt(stats.booking_hari_ini || '0'),
      booking_minggu_ini: parseInt(stats.booking_minggu_ini || '0'),
      booking_bulan_ini: parseInt(stats.booking_bulan_ini || '0'),
      occupancy_rate: occupancyRate,
      peak_hours: peakHoursRes.rows,
      best_category: bestCategoryRes.rows[0] ? bestCategoryRes.rows[0].nama : null,
      repeat_customers: parseInt(repeatCustomerRes.rows[0].count || '0'),
      new_customers_this_month: parseInt(newCustomersRes.rows[0].count || '0'),
      conversion_rate: conversionRate,
      recent_reviews: recentReviewsRes.rows,
      monthly_sales: monthlySalesRes.rows
    };
  }

  async getStaffCabangStats(cabangId) {
    const todayBookingsRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM booking b
      WHERE b.lapangan_id IN (SELECT id FROM lapangan WHERE cabang_id = $1)
        AND b.tanggal = CURRENT_DATE
    `, [cabangId]);

    const pendingCheckinsRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM booking b
      WHERE b.lapangan_id IN (SELECT id FROM lapangan WHERE cabang_id = $1)
        AND b.tanggal = CURRENT_DATE
        AND b.status = 'approved'
    `, [cabangId]);

    const activePlayingRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM booking b
      WHERE b.lapangan_id IN (SELECT id FROM lapangan WHERE cabang_id = $1)
        AND b.tanggal = CURRENT_DATE
        AND b.status = 'playing'
    `, [cabangId]);

    return {
      today_bookings: parseInt(todayBookingsRes.rows[0]?.count || '0'),
      pending_checkins: parseInt(pendingCheckinsRes.rows[0]?.count || '0'),
      active_playing: parseInt(activePlayingRes.rows[0]?.count || '0')
    };
  }
}

module.exports = new AnalyticsRepository();
