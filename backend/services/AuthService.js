const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const tokenUtil = require('../utils/token');
const { uuidv7 } = require('../utils/uuid');

class AuthService {
  async register(userData) {
    const { nama, email, password, no_hp, role } = userData;

    // Check if email already registered
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email sudah terdaftar. Gunakan email lain.');
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = uuidv7();
    const user = await UserRepository.create({
      id: userId,
      nama,
      email,
      password: hashedPassword,
      no_hp,
      role: role || 'customer',
      status: 'aktif'
    });

    // If role is Mitra, auto-create a blank mitra profile
    if (user.role === 'mitra') {
      await UserRepository.createMitraProfile({
        id: uuidv7(),
        user_id: user.id,
        nama_perusahaan: nama + ' Sports Center',
        status_verifikasi: 'pending'
      });
    }

    // Log Activity
    await UserRepository.logActivity(user.id, 'Registrasi akun berhasil');

    delete user.password;
    return user;
  }

  async login(email, password, loginMetadata = {}) {
    const { ip, browser, device } = loginMetadata;

    // Find User
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('Email atau password salah.');
    }

    if (user.status !== 'aktif') {
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi admin sistem.');
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Email atau password salah.');
    }

    // Get Permissions
    const permissions = await UserRepository.getUserPermissions(user.id);

    // Generate Token Payloads
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = tokenUtil.generateAccessToken(payload);
    const refreshToken = tokenUtil.generateRefreshToken(payload);

    // Save Refresh Token to Database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    await UserRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Log Audit Login & Activity
    await UserRepository.logLogin(user.id, ip, browser, device);
    await UserRepository.logActivity(user.id, 'Berhasil masuk ke sistem (Login)');

    // Fetch Mitra profile details if Mitra
    let mitraProfile = null;
    if (user.role === 'mitra') {
      mitraProfile = await UserRepository.getMitraProfile(user.id);
    }
    
    // Fetch Staff branch details if Staff Cabang
    let staffCabang = null;
    if (user.role === 'staff_cabang') {
      staffCabang = await UserRepository.getStaffCabangInfo(user.id);
    }

    delete user.password;

    return {
      user,
      permissions,
      accessToken,
      refreshToken,
      mitraProfile,
      staffCabang
    };
  }

  async refresh(token) {
    // 1. Verify Refresh Token
    const payload = tokenUtil.verifyRefreshToken(token);
    if (!payload) {
      throw new Error('Token penyegar tidak valid atau kedaluwarsa.');
    }

    // 2. Check Database record
    const record = await UserRepository.findRefreshToken(token);
    if (!record || new Date(record.expires_at) < new Date()) {
      if (record) await UserRepository.deleteRefreshToken(token);
      throw new Error('Token penyegar tidak valid atau kedaluwarsa di basis data.');
    }

    // 3. Generate New Access Token
    const newPayload = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };

    const accessToken = tokenUtil.generateAccessToken(newPayload);
    return { accessToken };
  }

  async logout(token) {
    if (!token) return false;
    const deleted = await UserRepository.deleteRefreshToken(token);
    return deleted !== null;
  }

  async getProfile(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');
    
    delete user.password;

    let extra = {};
    if (user.role === 'mitra') {
      extra.mitraProfile = await UserRepository.getMitraProfile(userId);
    } else if (user.role === 'staff_cabang') {
      extra.staffCabang = await UserRepository.getStaffCabangInfo(userId);
    }

    return { ...user, ...extra };
  }

  async updateProfile(userId, profileData, files = {}) {
    const { nama, no_hp, password, logo_mitra, banner_mitra, ...mitraFields } = profileData;

    // Fetch user
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');

    const updates = { nama, no_hp };

    // Update password if provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    // Update profile photo if provided
    if (files.foto_user && files.foto_user[0]) {
      updates.foto = files.foto_user[0].filename;
    }

    const updatedUser = await UserRepository.update(userId, updates);
    delete updatedUser.password;

    // Update Mitra Profile if role is Mitra
    if (user.role === 'mitra') {
      const mitraProfileUpdates = { ...mitraFields };
      if (files.logo_mitra && files.logo_mitra[0]) {
        mitraProfileUpdates.logo = files.logo_mitra[0].filename;
      }
      if (files.banner_mitra && files.banner_mitra[0]) {
        mitraProfileUpdates.banner = files.banner_mitra[0].filename;
      }
      
      await UserRepository.updateMitraProfile(userId, mitraProfileUpdates);
    }

    await UserRepository.logActivity(userId, 'Memperbarui informasi profil akun');
    return updatedUser;
  }
}

module.exports = new AuthService();
