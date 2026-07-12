const tokenUtil = require('../../../utils/token');
const { errorResponse } = require('../../../utils/response');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return errorResponse(res, 'Token otorisasi diperlukan.', null, 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return errorResponse(res, 'Format token tidak valid. Gunakan "Bearer <token>".', null, 401);
  }

  const decoded = tokenUtil.verifyAccessToken(token);
  if (!decoded) {
    return errorResponse(res, 'Token kedaluwarsa atau tidak valid.', null, 401);
  }

  req.user = decoded; // { id, email, role }
  next();
}

module.exports = authenticate;
