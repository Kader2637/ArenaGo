// ArenaGo Frontend Auth Handler
const isProdAuth = window.location.hostname.includes('vercel.app');
const BASE_API_URL = isProdAuth ? `https://${window.location.hostname}/api/v1` : 'https://arenago.biz.id/api/v1';

console.log(`Auth API URL set to: ${BASE_API_URL}`);

const Auth = {
  getToken() {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getPermissions() {
    const permStr = localStorage.getItem('permissions');
    return permStr ? JSON.parse(permStr) : [];
  },

  getMitraProfile() {
    const profileStr = localStorage.getItem('mitraProfile');
    return profileStr ? JSON.parse(profileStr) : null;
  },

  getStaffCabang() {
    const staffStr = localStorage.getItem('staffCabang');
    return staffStr ? JSON.parse(staffStr) : null;
  },

  isAuthenticated() {
    return this.getToken() !== null;
  },

  setSession(data) {
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    if (data.permissions) localStorage.setItem('permissions', JSON.stringify(data.permissions));
    if (data.mitraProfile) localStorage.setItem('mitraProfile', JSON.stringify(data.mitraProfile));
    if (data.staffCabang) localStorage.setItem('staffCabang', JSON.stringify(data.staffCabang));
  },

  clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('mitraProfile');
    localStorage.removeItem('staffCabang');
  },

  async login(email, password) {
    try {
      const response = await fetch(`${BASE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Login gagal');
      }

      this.setSession(resData.data);
      return resData.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(nama, email, password, confirm_password, no_hp, role) {
    try {
      const response = await fetch(`${BASE_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password, confirm_password, no_hp, role })
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Registrasi gagal');
      }
      return resData.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  async refreshAccessToken() {
    try {
      const rToken = this.getRefreshToken();
      if (!rToken) throw new Error('No refresh token available');

      const response = await fetch(`${BASE_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken })
      });
      const resData = await response.json();

      if (resData.success && resData.data.accessToken) {
        localStorage.setItem('accessToken', resData.data.accessToken);
        return resData.data.accessToken;
      } else {
        this.clearSession();
        throw new Error('Refresh token invalid');
      }
    } catch (error) {
      this.clearSession();
      window.location.href = '/login.html';
    }
  },

  async logout() {
    try {
      const rToken = this.getRefreshToken();
      await fetch(`${BASE_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken })
      });
    } catch (err) {
      console.warn('Logout request failed, clearing local storage anyway.');
    } finally {
      this.clearSession();
      window.location.href = '/login.html';
    }
  },

  // Perform Fetch with automatic JWT authorization header attaching & token refreshing
  async fetchWithAuth(url, options = {}) {
    let token = this.getToken();

    // Setup request headers
    options.headers = options.headers || {};
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Automatically set Content-Type to application/json for stringified bodies
    if (options.body && typeof options.body === 'string' && !options.headers['Content-Type'] && !options.headers['content-type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    try {
      let response = await fetch(url, options);

      // Access token expired, attempt refresh
      if (response.status === 401 && this.getRefreshToken()) {
        const newToken = await this.refreshAccessToken();
        options.headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, options); // retry request
      }

      return response;
    } catch (error) {
      console.error('fetchWithAuth error:', error);
      throw error;
    }
  },

  // Front-end Route Guard
  guard(allowedRoles = []) {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }

    const user = this.getUser();
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      window.location.href = '/403.html';
      return false;
    }
    return true;
  }
};

window.Auth = Auth;
