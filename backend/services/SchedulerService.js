const cron = require('node-cron');
const bookingExpiredJob = require('../jobs/bookingExpiredJob');
const cleanupJob = require('../jobs/cleanupJob');
const logger = require('../utils/logger');

class SchedulerService {
  start() {
    logger.info('Scheduler Service diinisialisasi...');

    // Jalankan setiap menit untuk cek booking expired
    cron.schedule('*/1 * * * *', async () => {
      await bookingExpiredJob();
    });

    // Jalankan setiap hari pukul 00:00 untuk membersihkan data
    cron.schedule('0 0 * * *', async () => {
      await cleanupJob();
    });
  }
}

module.exports = new SchedulerService();
