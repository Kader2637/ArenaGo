require('dotenv').config();

module.exports = {
  name: process.env.APP_NAME || 'ArenaGo',
  env: process.env.APP_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3000'),
  uploadPath: process.env.UPLOAD_PATH || 'backend/uploads'
};
