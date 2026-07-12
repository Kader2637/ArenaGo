// ArenaGo Global App Helpers
// Gunakan URL Vercel jika sedang di production, jika tidak, gunakan localhost
const isProduction = window.location.hostname.includes('vercel.app');
const BASE_URL = isProduction ? `https://${window.location.hostname}` : 'http://localhost:3000';

console.log(`API Base URL set to: ${BASE_URL}`); // Tambahkan ini untuk debugging

const App = {
  // Format numbers to Rupiah currency
  formatRupiah(value) {
    if (value === undefined || value === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  },

  // Format timestamp into date-time readability
  formatDate(dateStr, includeTime = false) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleDateString('id-ID', options);
  },

  // Parse URL query parameter keys
  getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  // SweetAlert dynamic wrapper toast
  showAlert(title, text, icon = 'success') {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonText: 'OK',
      customClass: {
        confirmButton: 'btn btn-primary px-4 rounded'
      },
      buttonsStyling: false
    });
  },

  showToast(title, icon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    Toast.fire({
      icon: icon,
      title: title
    });
  },

  showConfirm(title, text, confirmText = 'Ya, lanjutkan!', cancelText = 'Batal') {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      customClass: {
        confirmButton: 'btn btn-primary px-4 me-3 rounded',
        cancelButton: 'btn btn-outline-secondary px-4 rounded'
      },
      buttonsStyling: false
    });
  },

  // Loading spinner overlays
  showLoader() {
    let loader = document.getElementById('arena-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'arena-loader';
      loader.className = 'loader-container';
      loader.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 fw-semibold text-secondary">Memuat data ArenaGo...</p>
        </div>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  },

  hideLoader() {
    const loader = document.getElementById('arena-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  },

  // Dynamic layout injector
  async loadComponents() {
    // 1. Load Navbar
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
      try {
        const response = await fetch('/components/navbar.html');
        if (response.ok) {
          navbarPlaceholder.innerHTML = await response.text();
          this.initNavbarState();
          this.initNavbarScroll();
        }
      } catch (err) {
        console.error('Gagal memuat navbar:', err);
      }
    }

    // 2. Load Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
      try {
        const response = await fetch('/components/footer.html');
        if (response.ok) {
          footerPlaceholder.innerHTML = await response.text();
        }
      } catch (err) {
        console.error('Gagal memuat footer:', err);
      }
    }

    // 3. Load Sidebar (Admin/Mitra/Staff layouts)
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
      try {
        const response = await fetch('/components/sidebar.html');
        if (response.ok) {
          sidebarPlaceholder.innerHTML = await response.text();
          this.initSidebarState();
        }
      } catch (err) {
        console.error('Gagal memuat sidebar:', err);
      }
    }
  },

  initNavbarState() {
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const profileDropdown = document.getElementById('nav-profile-dropdown');
    const userProfileName = document.getElementById('nav-user-name');
    const userRoleBadge = document.getElementById('nav-user-role');
    const userAvatar = document.getElementById('nav-user-avatar');

    // Highlight active navbar link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-custom .nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        if (currentPath === href || (currentPath === '/' && href === '/index.html') || (currentPath === '/index.html' && href === '/')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });

    // Links based on role
    const dashboardLink = document.getElementById('nav-dashboard-link');
    const activeBookingLink = document.getElementById('nav-bookings-link');
    const favLink = document.getElementById('nav-fav-link');

    if (Auth.isAuthenticated()) {
      const user = Auth.getUser();

      if (loginBtn) loginBtn.classList.add('d-none');
      if (registerBtn) registerBtn.classList.add('d-none');
      if (profileDropdown) profileDropdown.classList.remove('d-none');

      if (userProfileName) userProfileName.textContent = user.nama;
      if (userRoleBadge) {
        userRoleBadge.textContent = user.role.replace('_', ' ');
      }

      if (userAvatar && user.foto) {
        userAvatar.src = `${BASE_URL}/uploads/users/${user.foto}`;
      }

      // Show specific navbar routes
      if (dashboardLink) {
        dashboardLink.classList.remove('d-none');
        if (user.role === 'admin_sistem') {
          dashboardLink.href = '/admin/dashboard.html';
        } else if (user.role === 'mitra') {
          dashboardLink.href = '/mitra/dashboard.html';
        } else if (user.role === 'staff_cabang') {
          dashboardLink.href = '/staff/dashboard.html';
        } else {
          dashboardLink.href = '/customer/riwayat.html'; // Default customer history
        }
      }

      if (activeBookingLink && user.role === 'customer') activeBookingLink.classList.remove('d-none');
      if (favLink && user.role === 'customer') favLink.classList.remove('d-none');

      // Bind logout action
      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showConfirm('Keluar', 'Apakah Anda yakin ingin keluar dari sistem?').then((result) => {
            if (result.isConfirmed) {
              Auth.logout();
            }
          });
        });
      }

      // Load Unread Notifications Count badge
      this.loadUnreadNotifications();
    } else {
      if (loginBtn) loginBtn.classList.remove('d-none');
      if (registerBtn) registerBtn.classList.remove('d-none');
      if (profileDropdown) profileDropdown.classList.add('d-none');
      if (dashboardLink) dashboardLink.classList.add('d-none');
      if (activeBookingLink) activeBookingLink.classList.add('d-none');
      if (favLink) favLink.classList.add('d-none');
    }
  },

  async loadUnreadNotifications() {
    try {
      const response = await Auth.fetchWithAuth(`${BASE_URL}/api/v1/notifikasi`);
      if (response.ok) {
        const res = await response.json();
        const badge = document.getElementById('notif-badge');
        if (badge) {
          const unreadCount = res.meta.unreadCount || 0;
          if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('d-none');
          } else {
            badge.classList.add('d-none');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  },

  initSidebarState() {
    const user = Auth.getUser();
    if (!user) return;

    // Set user name
    const nameEl = document.getElementById('sidebar-user-name');
    if (nameEl) nameEl.textContent = user.nama;

    // Show role badge
    const roleEl = document.getElementById('sidebar-user-role');
    if (roleEl) {
      const roleMap = { admin_sistem: 'Admin Sistem', mitra: 'Mitra', staff_cabang: 'Staff Cabang', customer: 'Customer' };
      roleEl.textContent = roleMap[user.role] || user.role;
    }

    // Show appropriate menu sections based on role
    const adminMenu = document.getElementById('sidebar-admin-menu');
    const mitraMenu = document.getElementById('sidebar-mitra-menu');
    const staffMenu = document.getElementById('sidebar-staff-menu');

    if (adminMenu && user.role === 'admin_sistem') adminMenu.classList.remove('d-none');
    if (mitraMenu && user.role === 'mitra') mitraMenu.classList.remove('d-none');
    if (staffMenu && user.role === 'staff_cabang') staffMenu.classList.remove('d-none');

    // Set Active State on sidebar navigation
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // Logout handler
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showConfirm('Keluar', 'Apakah Anda yakin ingin keluar?').then(r => {
          if (r.isConfirmed) Auth.logout();
        });
      });
    }

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarEl = document.querySelector('.admin-sidebar-fixed');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggleBtn && sidebarEl) {
      toggleBtn.addEventListener('click', () => {
        sidebarEl.classList.toggle('sidebar-open');
        if (overlay) overlay.classList.toggle('d-none');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebarEl.classList.remove('sidebar-open');
        overlay.classList.add('d-none');
      });
    }
  },

  initNavbarScroll() {
    const navbar = document.querySelector('.navbar-custom');
    const hasHero = document.querySelector('.hero-section');

    if (!navbar) return;

    const setWhiteNavbar = () => {
      navbar.style.background = '#ffffff';
      navbar.style.backdropFilter = 'none';
      navbar.style.webkitBackdropFilter = 'none';
      navbar.style.borderBottom = '1px solid rgba(226, 232, 240, 0.8)';
      navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.05)';
      navbar.style.padding = '14px 0';

      navbar.classList.remove('navbar-dark-theme');

      const navLinks = navbar.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.style.setProperty('color', '#0f172a', 'important');
      });

      const loginBtn = navbar.querySelector('#nav-login-btn');
      if (loginBtn) {
        loginBtn.style.setProperty('color', '#2563eb', 'important');
        loginBtn.style.setProperty('border-color', '#2563eb', 'important');
      }
      const dropdownUser = navbar.querySelector('#dropdownUser');
      if (dropdownUser) {
        dropdownUser.style.setProperty('color', '#0f172a', 'important');
        const nameNode = dropdownUser.querySelector('#nav-user-name');
        if (nameNode) nameNode.style.setProperty('color', '#0f172a', 'important');
      }
    };

    const setTransparentNavbar = () => {
      navbar.style.background = 'rgba(255, 255, 255, 0.15)';
      navbar.style.backdropFilter = 'blur(25px)';
      navbar.style.webkitBackdropFilter = 'blur(25px)';
      navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
      navbar.style.boxShadow = 'none';
      navbar.style.padding = '20px 0';

      navbar.classList.add('navbar-dark-theme');

      const navLinks = navbar.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.style.setProperty('color', 'rgba(255, 255, 255, 0.9)', 'important');
      });

      const loginBtn = navbar.querySelector('#nav-login-btn');
      if (loginBtn) {
        loginBtn.style.setProperty('color', '#ffffff', 'important');
        loginBtn.style.setProperty('border-color', 'rgba(255, 255, 255, 0.4)', 'important');
      }
      const dropdownUser = navbar.querySelector('#dropdownUser');
      if (dropdownUser) {
        dropdownUser.style.setProperty('color', '#ffffff', 'important');
        const nameNode = dropdownUser.querySelector('#nav-user-name');
        if (nameNode) nameNode.style.setProperty('color', '#ffffff', 'important');
      }
    };

    if (!hasHero) {
      setWhiteNavbar();
      return; // Keep it permanently white on standard pages
    }

    const handleScroll = () => {
      if (window.scrollY > 30) {
        setWhiteNavbar();
      } else {
        setTransparentNavbar();
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run immediately
  }
};

// Auto-load on page initialized
document.addEventListener('DOMContentLoaded', () => {
  App.loadComponents();
});

window.App = App;
