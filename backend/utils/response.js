/**
 * Uniform REST API Response Helper
 */

function successResponse(res, message = 'Operasi berhasil', data = {}, meta = {}, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta,
    errors: null
  });
}

function errorResponse(res, message = 'Terjadi kesalahan pada server', errors = null, status = 500) {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    meta: null,
    errors
  });
}

module.exports = {
  successResponse,
  errorResponse
};
