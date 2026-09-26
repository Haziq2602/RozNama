/**
 * RozNama - Main UI & View Controller
 * Handles SPA multi-tab view switching, dashboard stat counters,
 * customer directory rendering, transaction tables, and store standee QR.
 */

// Helper to get today's YYYY-MM-DD
function getTodayYMD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Render Extracted Entity Card with Category & Item Confirmation
function renderExtractionCard() {
  const container = document.getElementById('extractionContainer');
  if (!container || !state.currentExtraction) return;

  const ext = state.currentExtraction;
  const isOfflineML = ext.extractionMode === 'offline_ml';
  const categoryOptions = (typeof PREDEFINED_ML_CATEGORIES !== 'undefined')
    ? PREDEFINED_ML_CATEGORIES
    : [
      'Groceries & Ration',
      'Dairy & Milk Products',
      'Cooking Oils & Ghee',
      'Spices & Masala',
      'Snacks & Beverages',
      'Toiletries & Cleaning',
      'Personal Care & Cosmetics',
      'General Kirana / Khata'
    ];

  container.style.display = 'block';

  container.innerHTML = `
    <div class="extraction-card">
      <div class="extraction-header">
        <div class="extraction-title">
          <span>Recorded Entry Details</span>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
          <span class="badge ${isOfflineML ? 'badge-offline-ml' : 'badge-online-ai'}">
            ${isOfflineML ? '⚡ Offline ML' : '☁️ Cloud AI'}
          </span>
          <span class="badge ${ext.udhaarAmount > 0 ? 'badge-udhaar' : 'badge-paid'}">
            ${ext.udhaarAmount > 0 ? 'Part Payment & Udhaar' : 'Full Cash Payment'}
          </span>
        </div>
      </div>

      <div class="raw-transcript-box">
        "${escapeHtml(ext.transcript)}"
      </div>

      <div class="entity-grid">
        <div class="entity-field">
          <div class="entity-label">Customer Name</div>
          <input type="text" id="editCustName" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700;" value="${escapeHtml(ext.customerName)}" onchange="updateExtField('customerName', this.value)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Cash Received Today (₹)</div>
          <input type="number" id="editPaidAmount" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700; color:#34D399;" value="${ext.paidAmount}" onchange="updateExtField('paidAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Udhaar Balance (₹)</div>
          <input type="number" id="editUdhaarAmount" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700; color:#FBBF24;" value="${ext.udhaarAmount}" onchange="updateExtField('udhaarAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Purchased Items</div>
          <input type="text" id="editItems" class="transcript-input" style="padding:0.5rem 0.75rem;" value="${escapeHtml(ext.items || '')}" onchange="updateExtField('items', this.value)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Category (Offline ML / AI)</div>
          <select id="editCategory" class="transcript-input" style="padding:0.5rem 0.75rem; background:var(--bg-main); color:var(--text-main); font-weight:600;" onchange="updateExtField('category', this.value)">
            ${categoryOptions.map(cat => `<option value="${cat}" ${(ext.category || 'General Kirana / Khata') === cat ? 'selected' : ''}>${cat}</option>`).join('')}
          </select>
        </div>

        <div class="entity-field">
          <div class="entity-label">Payment Due Date</div>
          ${ext.udhaarAmount > 0 ? `
            <input type="date" id="editDueDate" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:600; color:var(--accent-gold);" value="${ext.dueDate || ''}" min="${getTodayYMD()}" onchange="updateExtField('dueDate', this.value)">
            <div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.35rem;">
              ${escapeHtml(ext.dueDateLabel || 'Tomorrow (Default)')}
            </div>
          ` : `
            <div class="entity-val" style="font-size:0.95rem; margin-top:0.4rem; color:#34D399; font-weight:600;">
              Paid in Full (No Due Date)
            </div>
          `}
        </div>
      </div>

      <div class="extraction-actions">
        <button class="btn-tts" onclick="speakConfirmation()">
          Listen Confirmation
        </button>
        <button class="btn-discard" onclick="discardExtraction()">
          Discard
        </button>
        <button class="btn-confirm" onclick="confirmTransaction()">
          Save to Khata
        </button>
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =============================================================
// Multi-View State & Navigation Island Controller
// =============================================================
let currentAppView = 'home';
let customerDirectorySearchQuery = '';
let customerDirectorySortMode = 'highest_udhaar';
let customerDirectoryFilter = 'all';
let txHistorySearchQuery = '';

function switchAppView(viewName) {
  currentAppView = viewName;

  const viewMap = {
    home: 'viewHome',
    customers: 'viewCustomers',
    history: 'viewHistory',
    settings: 'viewSettings'
  };

  const tabBtnMap = {
    home: 'tabBtnHome',
    customers: 'tabBtnCustomers',
    history: 'tabBtnHistory',
    settings: 'tabBtnSettings'
  };

  Object.entries(viewMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('active', key === viewName);
    }
  });

  Object.entries(tabBtnMap).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active', key === viewName);
    }
  });

  // Smooth scroll window to top upon switching tabs
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update specific view components
  if (viewName === 'home') {
    renderStats();
    renderHomeRecentTx();
  } else if (viewName === 'customers') {
    renderCustomerDirectory();
  } else if (viewName === 'history') {
    renderTransactionTable();
  } else if (viewName === 'settings') {
    loadStoreSettingsView();
  }
}

// Render Dashboard Counters, Tables & All Views
function renderAll() {
  renderStats();
  renderHomeRecentTx();
  renderCustomerDirectory();
  renderTransactionTable();
  renderUpiHeaderBadge();
  loadStoreSettingsView();
}

function renderStats() {
  const totalCashToday = state.transactions.reduce((acc, t) => {
    const cash = t.jamaCash !== undefined ? Number(t.jamaCash) : Number(t.paidAmount || 0);
    return acc + (isNaN(cash) ? 0 : cash);
  }, 0);

  const totalUdhaarPending = state.customers.reduce((acc, c) => {
    const u = Number(c.totalUdhaar || 0);
    return acc + (isNaN(u) ? 0 : u);
  }, 0);

  const activeCustomers = state.customers.length;
  const overdueReminders = state.customers.filter(c => Number(c.totalUdhaar || 0) > 0).length;

  const elCash = document.getElementById('statCashToday');
  const elUdhaar = document.getElementById('statUdhaarPending');
  const elActive = document.getElementById('statActiveCust');
  const elOverdue = document.getElementById('statOverdueCount');

  if (elCash) elCash.innerText = `₹${totalCashToday.toLocaleString('en-IN')}`;
  if (elUdhaar) elUdhaar.innerText = `₹${totalUdhaarPending.toLocaleString('en-IN')}`;
  if (elActive) elActive.innerText = activeCustomers;
  if (elOverdue) elOverdue.innerText = overdueReminders;
}

// View 1: Today's Recent Transactions (Quick preview)
function renderHomeRecentTx() {
  const tableBody = document.getElementById('homeRecentTxBody');
  if (!tableBody) return;

  if (!state.transactions || state.transactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">
          No transactions recorded today. Tap microphone above to speak your first khata note!
        </td>
      </tr>
    `;
    return;
  }

  const recent = state.transactions.slice(0, 4);
  tableBody.innerHTML = recent.map(tx => {
    const paid = tx.jamaCash !== undefined ? Number(tx.jamaCash) : Number(tx.paidAmount || 0);
    const udhaar = Number(tx.udhaarAmount || 0);
    const itemsStr = Array.isArray(tx.items) ? tx.items.join(', ') : (tx.items || 'General Items');
    const dueStr = tx.dueDateLabel || tx.dueDate || (udhaar > 0 ? 'Pending' : 'Settled');

    let timeStr = 'Today';
    if (typeof tx.timestamp === 'number') {
      timeStr = new Date(tx.timestamp).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (tx.timestamp) {
      timeStr = String(tx.timestamp);
    }

    return `
      <tr>
        <td>
          <div style="font-weight:600; font-size:0.92rem;">${escapeHtml(tx.customerName || 'Walk-in Customer')}</div>
          <div style="font-size:0.75rem; color:var(--text-dim);">${timeStr}</div>
        </td>
        <td>
          <span class="badge ${udhaar > 0 ? 'badge-udhaar' : 'badge-paid'}">
            ${escapeHtml(itemsStr)}
          </span>
          ${tx.category ? `<div style="font-size:0.72rem; color:var(--text-dim); margin-top:3px;">📁 ${escapeHtml(tx.category)}</div>` : ''}
        </td>
        <td style="font-weight:700; color:#34D399;">₹${paid}</td>
        <td style="font-weight:700; color:${udhaar > 0 ? '#FBBF24' : 'var(--text-muted)'};">₹${udhaar}</td>
        <td>
          ${udhaar > 0 
            ? `<span style="font-size:0.82rem; color:var(--accent-gold); font-weight:600;">${escapeHtml(dueStr)}</span>`
            : `<span style="font-size:0.82rem; color:#34D399;">Full Cash</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

// View 3: Complete Itemized Transaction Ledger with Search
function onTxSearchInput(val) {
  txHistorySearchQuery = (val || '').toLowerCase().trim();
  renderTransactionTable();
}

function renderTransactionTable() {
  const tableBody = document.getElementById('txTableBody');
  if (!tableBody) return;

  if (!state.transactions || state.transactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">
          No transactions recorded yet. Tap microphone or speak to add your first khata note!
        </td>
      </tr>
    `;
    return;
  }

  let list = state.transactions;
  if (txHistorySearchQuery) {
    list = list.filter(tx => {
      const name = (tx.customerName || '').toLowerCase();
      const items = (Array.isArray(tx.items) ? tx.items.join(' ') : (tx.items || '')).toLowerCase();
      const paid = String(tx.paidAmount || tx.jamaCash || '');
      const udhaar = String(tx.udhaarAmount || '');
      return name.includes(txHistorySearchQuery) || 
             items.includes(txHistorySearchQuery) || 
             paid.includes(txHistorySearchQuery) || 
             udhaar.includes(txHistorySearchQuery);
    });
  }

  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">
          🔍 No transactions found matching "${escapeHtml(txHistorySearchQuery)}".
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = list.map(tx => {
    const paid = tx.jamaCash !== undefined ? Number(tx.jamaCash) : Number(tx.paidAmount || 0);
    const udhaar = Number(tx.udhaarAmount || 0);
    const itemsStr = Array.isArray(tx.items) ? tx.items.join(', ') : (tx.items || 'General Items');
    const dueStr = tx.dueDateLabel || tx.dueDate || (udhaar > 0 ? 'Pending' : 'Settled');

    let timeStr = 'Today';
    if (typeof tx.timestamp === 'number') {
      timeStr = new Date(tx.timestamp).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (tx.timestamp) {
      timeStr = String(tx.timestamp);
    }

    return `
      <tr>
        <td>
          <div style="font-weight:600; font-size:0.95rem;">${escapeHtml(tx.customerName || 'Walk-in Customer')}</div>
          <div style="font-size:0.75rem; color:var(--text-dim);">${timeStr}</div>
        </td>
        <td>
          <span class="badge ${udhaar > 0 ? 'badge-udhaar' : 'badge-paid'}">
            ${escapeHtml(itemsStr)}
          </span>
          ${tx.category ? `<div style="font-size:0.72rem; color:var(--text-dim); margin-top:3px;">📁 ${escapeHtml(tx.category)}</div>` : ''}
        </td>
        <td style="font-weight:700; color:#34D399;">₹${paid}</td>
        <td style="font-weight:700; color:${udhaar > 0 ? '#FBBF24' : 'var(--text-muted)'};">₹${udhaar}</td>
        <td>
          ${udhaar > 0 
            ? `<span style="font-size:0.82rem; color:var(--accent-gold); font-weight:600;">${escapeHtml(dueStr)}</span>`
            : `<span style="font-size:0.82rem; color:#34D399;">Full Cash</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

// View 2: Customer Khata Directory Handlers & Renderer
function onCustomerSearchInput(val) {
  customerDirectorySearchQuery = (val || '').toLowerCase().trim();
  renderCustomerDirectory();
}

function onCustomerSortChange(val) {
  customerDirectorySortMode = val;
  renderCustomerDirectory();
}

function setCustomerStatusFilter(filter) {
  customerDirectoryFilter = filter;
  
  const chips = [
    { id: 'chipFilterAll', key: 'all' },
    { id: 'chipFilterPending', key: 'pending' },
    { id: 'chipFilterDue', key: 'due' },
    { id: 'chipFilterSettled', key: 'settled' }
  ];
  chips.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) el.classList.toggle('active', c.key === filter);
  });

  renderCustomerDirectory();
}

function renderCustomerDirectory() {
  const container = document.getElementById('fullCustomerDirectory') || document.getElementById('customerListContainer');
  if (!container) return;

  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const todayYMD = getTodayYMD();
  const allCusts = state.customers || [];

  // Update Total Credit Banner
  const totalCredit = allCusts.reduce((sum, c) => sum + (Number(c.totalUdhaar) || 0), 0);
  const dirTotalCreditEl = document.getElementById('dirTotalCredit');
  if (dirTotalCreditEl) {
    dirTotalCreditEl.innerText = `₹${totalCredit.toLocaleString('en-IN')}`;
  }

  // Update Filter Chip Counts
  const countAll = allCusts.length;
  const countPending = allCusts.filter(c => Number(c.totalUdhaar || 0) > 0).length;
  const countDue = allCusts.filter(c => {
    const u = Number(c.totalUdhaar || 0);
    if (u <= 0) return false;
    if (!c.dueDate) return true;
    return c.dueDate <= todayYMD;
  }).length;
  const countSettled = allCusts.filter(c => Number(c.totalUdhaar || 0) === 0).length;

  const elCountAll = document.getElementById('countFilterAll');
  const elCountPending = document.getElementById('countFilterPending');
  const elCountDue = document.getElementById('countFilterDue');
  const elCountSettled = document.getElementById('countFilterSettled');

  if (elCountAll) elCountAll.innerText = countAll;
  if (elCountPending) elCountPending.innerText = countPending;
  if (elCountDue) elCountDue.innerText = countDue;
  if (elCountSettled) elCountSettled.innerText = countSettled;

  // Filter Accounts
  let filtered = allCusts.filter(c => {
    const udhaar = Number(c.totalUdhaar || 0);
    if (customerDirectoryFilter === 'pending') {
      return udhaar > 0;
    } else if (customerDirectoryFilter === 'due') {
      return udhaar > 0 && (!c.dueDate || c.dueDate <= todayYMD);
    } else if (customerDirectoryFilter === 'settled') {
      return udhaar === 0;
    }
    return true;
  });

  // Search by Name or Phone
  if (customerDirectorySearchQuery) {
    filtered = filtered.filter(c => {
      const custKey = c.name.toLowerCase().trim();
      const phone = (savedPhones[custKey] || c.phone || '').toLowerCase();
      const name = c.name.toLowerCase();
      return name.includes(customerDirectorySearchQuery) || phone.includes(customerDirectorySearchQuery);
    });
  }

  // Sort Accounts
  filtered.sort((a, b) => {
    const uA = Number(a.totalUdhaar || 0);
    const uB = Number(b.totalUdhaar || 0);

    if (customerDirectorySortMode === 'highest_udhaar') {
      return uB - uA;
    } else if (customerDirectorySortMode === 'lowest_udhaar') {
      return uA - uB;
    } else if (customerDirectorySortMode === 'nearest_due') {
      const dateA = a.dueDate || '9999-99-99';
      const dateB = b.dueDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    } else if (customerDirectorySortMode === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (customerDirectorySortMode === 'recently_active') {
      const timeA = a.lastTransaction || '';
      const timeB = b.lastTransaction || '';
      return timeB.localeCompare(timeA);
    }
    return 0;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:3rem 1rem; color:var(--text-dim); background:rgba(31, 41, 55, 0.3); border:1px dashed var(--border-color); border-radius:12px;">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
        <div style="font-size:1rem; font-weight:600; color:#FFF;">No matching customer accounts found</div>
        <div style="font-size:0.82rem; margin-top:4px;">Try modifying your search or status filter.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(cust => {
    const custKey = cust.name.toLowerCase().trim();
    const phone = savedPhones[custKey] || cust.phone || '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const udhaar = Number(cust.totalUdhaar || 0);
    const isDue = udhaar > 0 && (!cust.dueDate || cust.dueDate <= todayYMD);
    const initial = (cust.name || 'C').charAt(0).toUpperCase();

    const callLink = cleanPhone 
      ? `tel:${cleanPhone}` 
      : `javascript:remindViaCall('${escapeHtml(cust.name)}')`;

    let dueBadgeHtml = '';
    if (udhaar > 0) {
      if (isDue) {
        dueBadgeHtml = `<span class="due-badge urgent">⚠️ ${cust.dueDateLabel || (cust.dueDate ? 'Due ' + cust.dueDate : 'Due Today')}</span>`;
      } else {
        dueBadgeHtml = `<span class="due-badge normal">📅 ${cust.dueDateLabel || cust.dueDate || 'Pending'}</span>`;
      }
    } else {
      dueBadgeHtml = `<span class="due-badge settled">✓ Settled</span>`;
    }

    return `
      <div class="cust-card">
        <div class="cust-card-top">
          <div class="cust-avatar ${udhaar > 0 ? 'has-udhaar' : 'settled'}">
            ${escapeHtml(initial)}
          </div>
          <div class="cust-meta">
            <div class="name">${escapeHtml(cust.name)}</div>
            <div class="phone-wrap">
              ${phone 
                ? `<span class="phone-text" onclick="openPhoneModal('${escapeHtml(cust.name)}')" title="Click to edit phone">📞 ${escapeHtml(phone)}</span>
                   <button type="button" class="btn-phone-edit" onclick="openPhoneModal('${escapeHtml(cust.name)}')">Edit</button>`
                : `<button type="button" class="btn-add-phone" onclick="openPhoneModal('${escapeHtml(cust.name)}')">+ Add Phone</button>`
              }
            </div>
          </div>
        </div>

        <div class="cust-card-stats">
          <div class="stat-item">
            <span class="stat-label">${udhaar > 0 ? 'Pending Udhaar' : 'Account Balance'}</span>
            <span class="${udhaar > 0 ? 'stat-val-udhaar' : 'stat-val-settled'}">₹${udhaar.toLocaleString('en-IN')}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; font-weight:600; margin-bottom:2px;">Status</div>
            ${dueBadgeHtml}
          </div>
        </div>

        <div class="cust-card-actions">
          ${udhaar > 0 ? `
            <button type="button" class="btn-clear-due" onclick="openClearDueModal('${escapeHtml(cust.name)}')" title="Mark payment received">
              Clear Due
            </button>
            <button type="button" class="btn-whatsapp" onclick="openSmartReminderModal('${escapeHtml(cust.name)}')" title="Smart WhatsApp reminder with 1-tap UPI payment">
              💬 WhatsApp
            </button>
            <a href="${callLink}" class="btn-call" title="Call customer directly">
              📞 Call
            </a>
          ` : `
            <div style="flex:2; font-size:0.8rem; color:#34D399; font-weight:600; display:flex; align-items:center; gap:0.35rem;">
              <span>✓</span> Fully Settled Khata
            </div>
            <a href="${callLink}" class="btn-call" style="flex:1;" title="Call customer">
              📞 Call
            </a>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Backwards compatibility alias for customer list renderer
function renderCustomerList() {
  renderCustomerDirectory();
}

// View 4: Store Profile & Settings Handlers
function loadStoreSettingsView() {
  const storeInput = document.getElementById('settingsStoreNameInput');
  const ownerInput = document.getElementById('settingsOwnerNameInput');
  const phoneInput = document.getElementById('settingsOwnerPhone');
  const upiInput = document.getElementById('settingsUpiInput');
  const cloudBadge = document.getElementById('settingsCloudBadge');

  const storeUser = JSON.parse(localStorage.getItem('roznama_user') || '{}');
  const savedStore = localStorage.getItem('roznama_store_name') || storeUser.storeName || 'Kirana Store';
  const savedOwner = localStorage.getItem('roznama_owner_name') || storeUser.name || 'Store Owner';
  const savedPhone = storeUser.phone || (localStorage.getItem('roznama_guest_mode') === 'true' ? 'Guest Store (Offline Device)' : '+91 98765 43210');
  const savedUpi = localStorage.getItem('roznama_vendor_upi') || '';

  if (storeInput && !storeInput.value) storeInput.value = savedStore;
  if (ownerInput && !ownerInput.value) ownerInput.value = savedOwner;
  if (phoneInput) phoneInput.value = savedPhone;
  if (upiInput && !upiInput.value) upiInput.value = savedUpi;

  if (cloudBadge) {
    if (localStorage.getItem('roznama_jwt_token')) {
      cloudBadge.innerText = 'Active (Supabase Cloud)';
      cloudBadge.style.background = '#059669';
    } else {
      cloudBadge.innerText = 'Offline Local Storage';
      cloudBadge.style.background = '#D97706';
    }
  }

  drawStoreStandeeQr();
}

function saveStoreProfileSettings(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const storeInput = document.getElementById('settingsStoreNameInput');
  const ownerInput = document.getElementById('settingsOwnerNameInput');
  if (!storeInput || !ownerInput) return;

  const newStore = storeInput.value.trim();
  const newOwner = ownerInput.value.trim();

  if (!newStore || !newOwner) {
    showToast('Please enter both store name and owner name', 'error');
    return;
  }

  let storeUser = JSON.parse(localStorage.getItem('roznama_user') || '{}');
  storeUser.storeName = newStore;
  storeUser.name = newOwner;
  localStorage.setItem('roznama_user', JSON.stringify(storeUser));
  localStorage.setItem('roznama_store_name', newStore);
  localStorage.setItem('roznama_owner_name', newOwner);

  if (typeof authState !== 'undefined' && authState.user) {
    authState.user.storeName = newStore;
    authState.user.name = newOwner;
  }

  if (typeof renderAuthHeader === 'function') {
    renderAuthHeader();
  }

  drawStoreStandeeQr();
  showToast('Store profile updated successfully!', 'success');
}

function saveStoreUpiSettings() {
  const input = document.getElementById('settingsUpiInput');
  if (!input) return;
  const cleaned = input.value.trim();

  if (!cleaned || !cleaned.includes('@') || cleaned.indexOf('@') === 0 || cleaned.endsWith('@')) {
    showToast('Please enter a valid UPI ID (e.g. 9876543210@upi)', 'error');
    return;
  }

  localStorage.setItem('roznama_vendor_upi', cleaned);
  showToast(`Store UPI ID updated to ${cleaned}!`, 'success');
  renderUpiHeaderBadge();
  drawStoreStandeeQr();
}

function appendSettingsUpiSuffix(suffix) {
  const input = document.getElementById('settingsUpiInput');
  if (!input) return;
  const val = input.value.trim();
  if (val.includes('@')) {
    input.value = val.split('@')[0] + suffix;
  } else if (val) {
    input.value = val + suffix;
  } else {
    input.value = suffix;
  }
  input.focus();
}

function drawStoreStandeeQr() {
  const canvas = document.getElementById('settingsStoreQrCanvas');
  if (!canvas) return;

  const vendorUpi = localStorage.getItem('roznama_vendor_upi') || 'kirana@upi';
  const storeUser = JSON.parse(localStorage.getItem('roznama_user') || '{}');
  const storeName = storeUser.storeName || storeUser.name || 'Kirana Store';
  const cleanStore = storeName.replace(/[^a-zA-Z0-9 ]/g, '').trim();

  // Pure NPCI URI for general counter customer payments
  const upiPayload = `upi://pay?pa=${vendorUpi}&pn=${encodeURIComponent(cleanStore)}&cu=INR&tn=Counter%20Payment`;

  if (window.QRCode && typeof QRCode.toCanvas === 'function') {
    QRCode.toCanvas(canvas, upiPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, (error) => {
      if (error) console.error('Store Standee QR error:', error);
    });
  }
}

// Header UPI Badge Render
function renderUpiHeaderBadge() {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;

  let badge = document.getElementById('headerUpiBadge');
  if (!badge) {
    badge = document.createElement('button');
    badge.id = 'headerUpiBadge';
    badge.className = 'action-btn';
    badge.style.fontSize = '0.8rem';
    badge.style.padding = '0.45rem 0.85rem';
    badge.onclick = () => openVendorUpiModal();
    actions.appendChild(badge);
  }

  const savedUpi = localStorage.getItem('roznama_vendor_upi');
  if (savedUpi) {
    badge.innerHTML = `💳 <span style="color:#10B981; font-weight:600;">${escapeHtml(savedUpi)}</span>`;
    badge.title = `Store UPI ID: ${savedUpi} (Click to edit)`;
  } else {
    badge.innerHTML = `💳 <span style="color:#F59E0B;">+ Setup UPI ID</span>`;
    badge.title = `Click to set your Store UPI ID for 1-tap WhatsApp collections`;
  }
}
