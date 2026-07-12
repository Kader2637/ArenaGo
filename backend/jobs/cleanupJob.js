const UserRepository = require('../repositories/UserRepository');
const logger = require('../utils/logger');

async function cleanupData() {
  try {
    logger.info('Memulai pembersihan data berkala...');
    
    // Purge expired refresh tokens
    const result = await UserRepository.cleanExpiredRefreshTokens();
    
    logger.info('Pembersihan data berkala selesai.');
  } catch (error) {
    logger.error(`Error pada cron job Cleanup: ${error.message}`);
  }
}

module.exports = cleanupData;
