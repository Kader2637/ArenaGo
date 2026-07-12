require('dotenv').config();

module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'arenago_jwt_secret_key_access_token_super_secret_key_2026',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'arenago_jwt_secret_key_refresh_token_super_secret_key_2026',
  accessExpiration: process.env.ACCESS_TOKEN_EXPIRES || '15m',
  refreshExpiration: process.env.REFRESH_TOKEN_EXPIRES || '7d'
};
