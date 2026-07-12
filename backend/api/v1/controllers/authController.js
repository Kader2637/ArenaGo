const AuthService = require('../../../services/AuthService');
const { successResponse, errorResponse } = require('../../../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const { nama, email, password, confirm_password, no_hp, role } = req.body;

      if (!nama || !email || !password || !confirm_password) {
        return errorResponse(res, 'Field nama, email, password, dan konfirmasi password wajib diisi.', null, 400);
      }

      if (password !== confirm_password) {
        return errorResponse(res, 'Password dan konfirmasi password tidak cocok.', null, 400);
      }

      if (password.length < 6) {
        return errorResponse(res, 'Password minimal harus 6 karakter.', null, 400);
      }

      // We restrict registering superadmin directly
      if (role === 'admin_sistem') {
        return errorResponse(res, 'Registrasi sebagai Admin Sistem tidak diperbolehkan.', null, 403);
      }

      const user = await AuthService.register({ nama, email, password, no_hp, role });
      return successResponse(res, 'Registrasi akun berhasil. Silakan masuk.', user, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email dan password wajib diisi.', null, 400);
      }

      const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const browser = req.headers['user-agent'] || 'Unknown';
      const device = req.headers['sec-ch-ua-platform'] || 'Web';

      const result = await AuthService.login(email, password, { ip, browser, device });
      
      // Set refresh token as HTTP-only cookie for secure persistence
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return successResponse(res, 'Login berhasil.', {
        user: result.user,
        permissions: result.permissions,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        mitraProfile: result.mitraProfile,
        staffCabang: result.staffCabang
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token diperlukan.', null, 400);
      }

      const result = await AuthService.refresh(refreshToken);
      return successResponse(res, 'Token akses berhasil diperbarui.', result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      await AuthService.logout(refreshToken);
      
      res.clearCookie('refreshToken');
      return successResponse(res, 'Logout berhasil.');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await AuthService.getProfile(userId);
      return successResponse(res, 'Profil berhasil diambil.', profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await AuthService.updateProfile(userId, req.body, req.files || {});
      return successResponse(res, 'Profil berhasil diperbarui.', user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
