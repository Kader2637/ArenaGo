const { errorResponse } = require('../../../utils/response');

function notFound(req, res, next) {
  return errorResponse(res, `Endpoint ${req.originalUrl} dengan method ${req.method} tidak ditemukan.`, null, 404);
}

module.exports = notFound;
