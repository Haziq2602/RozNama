// RozNama Vendor Authentication & Cloud Sync Manager

const API_BASE_URL = 'http://localhost:5000/api';

const authState = {
  token: localStorage.getItem('roznama_jwt_token') || null,
  user: JSON.parse(localStorage.getItem('roznama_user') || 'null')
};

// Initialize Auth System
document.addEventListener('DOMContentLoaded', () => {
  renderAuthHeader();
  injectAuthModal();
  bindAuthEvents();
  
  if (authState.token) {
    verifySession();
  }
});

// Render Header Vendor Status Badge
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
        <button class="logout-btn" id="logoutBtn" title="Log Out">🚪</button>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } else {
    authPill.innerHTML = `
      <button class="action-btn auth-btn" id="openAuthModalBtn">
        🔐 Vendor Login / Register
      </button>
    `;
    const openBtn = document.getElementById('openAuthModalBtn');
    if (openBtn) openBtn.addEventListener('click', openAuthModal);
  }
}

// Inject Auth Modal HTML into DOM
function injectAuthModal() {
  if (document.getElementById('authModalOverlay')) return;

  const modalHtml = `
    <div id="authModalOverlay" class="auth-modal-overlay" style="display: none;">
      <div class="auth-modal-card">
        <button class="modal-close-btn" id="closeAuthModalBtn">&times;</button>
        
        <div class="auth-modal-header">
          <h2 class="auth-title">RozNama Vendor Account</h2>
          <p class="auth-subtitle">Sync khata ledgers safely across all your devices & cloud</p>
        </div>

        <div class="auth-tabs">
          <button id="tabLoginBtn" class="auth-tab active">Log In</button>
          <button id="tabRegisterBtn" class="auth-tab">Register New Store</button>
        </div>

        <!-- Login Form -->
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginPhone">📱 Mobile Phone Number</label>
            <input type="tel" id="loginPhone" placeholder="e.g. 9876543210" required />
          </div>
          <div class="form-group">
            <label for="loginPassword">🔑 Password / PIN</label>
            <input type="password" id="loginPassword" placeholder="Enter your password" required />
          </div>
          <div id="loginError" class="auth-error" style="display: none;"></div>
          <button type="submit" class="auth-submit-btn">Login & Sync Ledger</button>
        </form>

        <!-- Register Form -->
        <form id="registerForm" class="auth-form" style="display: none;">
          <div class="form-group">
            <label for="regName">👤 Store Owner Name</label>
            <input type="text" id="regName" placeholder="e.g. Ramesh Gupta" required />
          </div>
          <div class="form-group">
            <label for="regStoreName">🏪 Kirana / Store Name</label>
            <input type="text" id="regStoreName" placeholder="e.g. Gupta General Store" required />
          </div>
          <div class="form-group">
            <label for="regPhone">📱 Mobile Phone Number</label>
            <input type="tel" id="regPhone" placeholder="e.g. 9876543210" required />
          </div>
          <div class="form-group">
            <label for="regPassword">🔑 Create Password / PIN</label>
            <input type="password" id="regPassword" placeholder="Minimum 4 characters" required />
          </div>
          <div id="regError" class="auth-error" style="display: none;"></div>
          <button type="submit" class="auth-submit-btn">Create Vendor Account</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Bind Auth UI Events
function bindAuthEvents() {
  const overlay = document.getElementById('authModalOverlay');
  const closeBtn = document.getElementById('closeAuthModalBtn');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAuthModal();
    });
  }

  if (tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = document.getElementById('loginPhone').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const errDiv = document.getElementById('loginError');
      errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (!res.ok) {
          errDiv.textContent = data.error || 'Login failed.';
          errDiv.style.display = 'block';
          return;
        }

        // Clean previous session state
        if (typeof clearLocalStore === 'function') {
          await clearLocalStore();
        }

        saveAuthSession(data.token, data.user);
        closeAuthModal();
        showToast(`Welcome back, ${data.user.name}! Loaded ${data.user.storeName}.`, 'success');

        // Fetch this vendor's transactions exclusively
        if (typeof syncWithCloud === 'function') {
          await syncWithCloud();
        }

      } catch (err) {
        console.error('Login request failed:', err);
        errDiv.textContent = 'Server connection failed. Ensure backend server is running.';
        errDiv.style.display = 'block';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const storeName = document.getElementById('regStoreName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value.trim();
      const errDiv = document.getElementById('regError');
      errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, storeName, phone, password })
        });
        const data = await res.json();

        if (!res.ok) {
          errDiv.textContent = data.error || 'Registration failed.';
          errDiv.style.display = 'block';
          return;
        }

        // New vendor starts completely empty
        if (typeof clearLocalStore === 'function') {
          await clearLocalStore();
        }

        saveAuthSession(data.token, data.user);
        closeAuthModal();
        showToast(`Account created for ${data.user.storeName}! Ready to log sales.`, 'success');

        if (typeof renderAll === 'function') {
          renderAll();
        }

      } catch (err) {
        console.error('Register request failed:', err);
        errDiv.textContent = 'Server connection failed. Ensure backend server is running.';
        errDiv.style.display = 'block';
      }
    });
  }
}

function openAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function saveAuthSession(token, user) {
  authState.token = token;
  authState.user = user;
  localStorage.setItem('roznama_jwt_token', token);
  localStorage.setItem('roznama_user', JSON.stringify(user));
  renderAuthHeader();
}

async function handleLogout() {
  authState.token = null;
  authState.user = null;
  localStorage.removeItem('roznama_jwt_token');
  localStorage.removeItem('roznama_user');
  renderAuthHeader();

  // Clear memory and IndexedDB
  if (typeof clearLocalStore === 'function') {
    await clearLocalStore();
  }
  if (typeof renderAll === 'function') {
    renderAll();
  }

  showToast('Logged out. Ledger reset.', 'info');
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
    console.warn('Backend server offline. Continuing in local IndexedDB mode.');
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
