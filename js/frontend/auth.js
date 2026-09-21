// Dynamic API base URL: relative path in web server / Vercel, localhost fallback on file://
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api';

const authState = {
  token: localStorage.getItem('roznama_jwt_token') || null,
  user: JSON.parse(localStorage.getItem('roznama_user') || 'null'),
  isGuest: localStorage.getItem('roznama_guest_mode') === 'true'
};

// Check if vendor has an active session or guest mode
function hasActiveSession() {
  return !!((authState.token && authState.user) || authState.isGuest);
}

// Synchronize visibility between Auth Landing View and Main Dashboard
function updateAuthVisibility() {
  const hasSession = hasActiveSession();
  document.documentElement.classList.toggle('has-auth-session', hasSession);

  const landingView = document.getElementById('authLandingView');
  const mainDashboard = document.getElementById('mainDashboard');

  if (landingView) {
    landingView.style.display = hasSession ? 'none' : 'flex';
  }
  if (mainDashboard) {
    mainDashboard.style.display = hasSession ? 'block' : 'none';
  }
}

// Initialize Auth System on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateAuthVisibility();
  renderAuthHeader();
  bindLandingAuthEvents();
  
  if (authState.token) {
    verifySession();
  }
});

// Render Header Vendor Status Badge in Dashboard
function renderAuthHeader() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;

  let authPill = document.getElementById('authHeaderPill');
  if (!authPill) {
    authPill = document.createElement('div');
    authPill.id = 'authHeaderPill';
    authPill.className = 'auth-header-pill';
    headerActions.prepend(authPill);
  }

  if (authState.user && authState.token) {
    authPill.innerHTML = `
      <div class="vendor-profile-badge" title="Logged in as ${escapeHtml(authState.user.name)}">
        <span class="online-indicator"></span>
        <span class="vendor-name">🏪 ${escapeHtml(authState.user.storeName || authState.user.name)}</span>
        <button class="logout-btn" id="logoutBtn" title="Log Out of Store">🚪</button>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } else if (authState.isGuest) {
    authPill.innerHTML = `
      <div class="vendor-profile-badge" title="Running in Guest / Offline Mode">
        <span class="vendor-name" style="color: #94a3b8;">👤 Guest Store</span>
        <button class="action-btn" id="guestUpgradeBtn" style="padding: 4px 10px; font-size: 0.78rem;">Register</button>
        <button class="logout-btn" id="logoutBtn" title="Exit Guest Mode">🚪</button>
      </div>
    `;
    const guestUpgradeBtn = document.getElementById('guestUpgradeBtn');
    if (guestUpgradeBtn) guestUpgradeBtn.addEventListener('click', handleLogout);
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } else {
    authPill.innerHTML = `
      <button class="action-btn auth-btn" id="openAuthModalBtn">
        🔐 Register / Login
      </button>
    `;
    const openBtn = document.getElementById('openAuthModalBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        handleLogout();
      });
    }
  }
}

// Bind Events for Landing Page Registration & Login
function bindLandingAuthEvents() {
  const tabRegBtn = document.getElementById('landingTabRegisterBtn');
  const tabLoginBtn = document.getElementById('landingTabLoginBtn');
  const regForm = document.getElementById('landingRegisterForm');
  const loginForm = document.getElementById('landingLoginForm');
  const guestBtn = document.getElementById('landingGuestBtn');

  // Tab switching
  if (tabRegBtn && tabLoginBtn && regForm && loginForm) {
    tabRegBtn.addEventListener('click', () => {
      tabRegBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      regForm.style.display = 'block';
      loginForm.style.display = 'none';
      const regErr = document.getElementById('landingRegError');
      if (regErr) regErr.style.display = 'none';
    });

    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegBtn.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      const loginErr = document.getElementById('landingLoginError');
      if (loginErr) loginErr.style.display = 'none';
    });
  }

  // Registration Form Handler
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('landingRegName').value.trim();
      const storeName = document.getElementById('landingRegStoreName').value.trim();
      const phone = document.getElementById('landingRegPhone').value.trim();
      const password = document.getElementById('landingRegPassword').value.trim();
      const errDiv = document.getElementById('landingRegError');
      if (errDiv) errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, storeName, phone, password })
        });
        const data = await res.json();

        if (!res.ok) {
          if (errDiv) {
            errDiv.textContent = data.error || 'Registration failed.';
            errDiv.style.display = 'block';
          }
          return;
        }

        // Fresh vendor setup
        if (typeof clearLocalStore === 'function') {
          await clearLocalStore();
        }

        saveAuthSession(data.token, data.user);
        showToast(`Store registered! Welcome to RozNama, ${data.user.name}.`, 'success');

        if (typeof renderAll === 'function') {
          renderAll();
        }

      } catch (err) {
        console.error('Registration failed:', err);
        if (errDiv) {
          errDiv.textContent = 'Server connection failed. Ensure backend server is running.';
          errDiv.style.display = 'block';
        }
      }
    });
  }

  // Login Form Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = document.getElementById('landingLoginPhone').value.trim();
      const password = document.getElementById('landingLoginPassword').value.trim();
      const errDiv = document.getElementById('landingLoginError');
      if (errDiv) errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (!res.ok) {
          if (errDiv) {
            errDiv.textContent = data.error || 'Login failed.';
            errDiv.style.display = 'block';
          }
          return;
        }

        if (typeof clearLocalStore === 'function') {
          await clearLocalStore();
        }

        saveAuthSession(data.token, data.user);
        showToast(`Welcome back, ${data.user.name}! Loaded ${data.user.storeName}.`, 'success');

        if (typeof syncWithCloud === 'function') {
          await syncWithCloud();
        }
        if (typeof renderAll === 'function') {
          renderAll();
        }

      } catch (err) {
        console.error('Login failed:', err);
        if (errDiv) {
          errDiv.textContent = 'Server connection failed. Ensure backend server is running.';
          errDiv.style.display = 'block';
        }
      }
    });
  }

  // Guest Access Handler
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      authState.token = null;
      authState.user = null;
      authState.isGuest = true;
      localStorage.setItem('roznama_guest_mode', 'true');
      localStorage.removeItem('roznama_jwt_token');
      localStorage.removeItem('roznama_user');

      updateAuthVisibility();
      renderAuthHeader();
      if (typeof renderAll === 'function') {
        renderAll();
      }
      showToast('Exploring RozNama in Guest mode.', 'info');
    });
  }
}

function saveAuthSession(token, user) {
  authState.token = token;
  authState.user = user;
  authState.isGuest = false;
  localStorage.setItem('roznama_jwt_token', token);
  localStorage.setItem('roznama_user', JSON.stringify(user));
  localStorage.removeItem('roznama_guest_mode');

  updateAuthVisibility();
  renderAuthHeader();
}

async function handleLogout() {
  authState.token = null;
  authState.user = null;
  authState.isGuest = false;
  localStorage.removeItem('roznama_jwt_token');
  localStorage.removeItem('roznama_user');
  localStorage.removeItem('roznama_guest_mode');

  updateAuthVisibility();
  renderAuthHeader();

  // Clear memory and local cache
  if (typeof clearLocalStore === 'function') {
    await clearLocalStore();
  }
  if (typeof renderAll === 'function') {
    renderAll();
  }

  showToast('Logged out. Please log in or register.', 'info');
}

async function verifySession() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authState.token}` }
    });
    if (!res.ok) {
      handleLogout();
    } else {
      const data = await res.json();
      authState.user = data.user;
      localStorage.setItem('roznama_user', JSON.stringify(data.user));
      renderAuthHeader();
    }
  } catch (err) {
    console.warn('Backend server offline. Continuing in local mode.');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
