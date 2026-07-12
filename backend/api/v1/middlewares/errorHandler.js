const { errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}\nStack: ${err.stack}`);
  
  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';
  
  return errorResponse(
    res, 
    message, 
    process.env.APP_ENV === 'development' ? err.stack : null, 
    status
  );
}

module.exports = errorHandler;
