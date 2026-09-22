// Helper to get today's YYYY-MM-DD
function getTodayYMD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Render Extracted Entity Card
function renderExtractionCard() {
  const container = document.getElementById('extractionContainer');
  if (!container || !state.currentExtraction) return;

  const ext = state.currentExtraction;
  container.style.display = 'block';

  container.innerHTML = `
    <div class="extraction-card">
      <div class="extraction-header">
        <div class="extraction-title">
          <span>Recorded Entry Details</span>
        </div>
        <span class="badge ${ext.udhaarAmount > 0 ? 'badge-udhaar' : 'badge-paid'}">
          ${ext.udhaarAmount > 0 ? 'Part Payment & Udhaar' : 'Full Cash Payment'}
        </span>
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
          <input type="text" id="editItems" class="transcript-input" style="padding:0.5rem 0.75rem;" value="${escapeHtml(ext.items)}" onchange="updateExtField('items', this.value)">
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

// -------------------------------------------------------------
// Custom Popup Dialog Box: Clear Customer Udhaar
// -------------------------------------------------------------
function openClearDueModal(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const cust = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  if (!cust || cust.totalUdhaar <= 0) return;

  // Remove existing modal if any
  const existing = document.getElementById('clearDueModalOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="clearDueModalOverlay" class="popup-dialog-overlay">
      <div class="popup-dialog-card">
        <div class="popup-dialog-header">
          <div class="popup-dialog-title">Clear Customer Udhaar</div>
          <button class="popup-dialog-close" onclick="closeClearDueModal()">&times;</button>
        </div>

        <div class="popup-cust-banner">
          <div>
            <div class="popup-cust-name">${escapeHtml(cust.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">Customer Account</div>
          </div>
          <div style="text-align:right;">
            <div class="popup-cust-balance">₹${cust.totalUdhaar}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">Total Udhaar Due</div>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; margin-bottom:0.4rem;">
            Amount Customer is Clearing (₹)
          </label>
          <input type="number" id="clearDueAmountInput" class="transcript-input" value="${cust.totalUdhaar}" min="1" max="${cust.totalUdhaar}" style="font-weight:700; color:#34D399; font-size:1.15rem;" />
        </div>

        <div style="margin-bottom: 0.5rem; display:flex; gap:0.5rem;">
          <button type="button" class="btn-add-phone" onclick="document.getElementById('clearDueAmountInput').value = ${cust.totalUdhaar}">
            Full Balance (₹${cust.totalUdhaar})
          </button>
          ${cust.totalUdhaar > 100 ? `
            <button type="button" class="btn-add-phone" onclick="document.getElementById('clearDueAmountInput').value = ${Math.round(cust.totalUdhaar / 2)}">
              Half (₹${Math.round(cust.totalUdhaar / 2)})
            </button>
          ` : ''}
        </div>

        <div class="popup-actions">
          <button type="button" class="btn-discard" onclick="closeClearDueModal()">Cancel</button>
          <button type="button" class="btn-confirm" onclick="submitClearDue('${escapeHtml(cust.name)}')">Confirm Payment</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setTimeout(() => {
    const input = document.getElementById('clearDueAmountInput');
    if (input) { input.focus(); input.select(); }
  }, 50);
}

function closeClearDueModal() {
  const modal = document.getElementById('clearDueModalOverlay');
  if (modal) modal.remove();
}

function submitClearDue(customerName) {
  const inputEl = document.getElementById('clearDueAmountInput');
  if (!inputEl) return;

  const custKey = customerName.toLowerCase().trim();
  const cust = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  if (!cust || cust.totalUdhaar <= 0) return;

  const amountReceived = parseInt(inputEl.value.trim(), 10);
  if (isNaN(amountReceived) || amountReceived <= 0) {
    showToast('Please enter a valid payment amount', 'error');
    return;
  }

  const currentUdhaar = cust.totalUdhaar;
  const settledAmount = Math.min(amountReceived, currentUdhaar);
  cust.totalUdhaar -= settledAmount;
  cust.totalJama = (cust.totalJama || 0) + settledAmount;
  cust.lastTransaction = new Date().toISOString().split('T')[0];
  if (cust.totalUdhaar === 0) {
    cust.status = 'settled';
    cust.dueDate = '';
    cust.dueDateLabel = 'Settled';
  }

  // Record a settlement transaction in ledger
  const settlementTx = {
    id: `tx-${Date.now()}`,
    customerId: cust.id,
    customerName: cust.name,
    type: 'settlement',
    isSettlement: true,
    settledAmount: settledAmount,
    paidAmount: settledAmount,
    jamaCash: settledAmount,
    udhaarAmount: 0,
    items: 'Udhaar Settlement / Cash Received',
    dueDate: '',
    dueDateLabel: 'Settled',
    transcript: `Received ₹${settledAmount} cash from ${customerName} to clear udhaar`,
    rawTranscript: `Received ₹${settledAmount} cash from ${customerName} to clear udhaar`,
    timestamp: Date.now()
  };

  state.transactions.unshift(settlementTx);

  if (typeof recalculateCustomers === 'function') {
    recalculateCustomers();
  }
  saveState();

  if (typeof saveTransactionOffline === 'function') {
    saveTransactionOffline(settlementTx);
  }
  if (typeof syncWithCloud === 'function') {
    syncWithCloud();
  }

  closeClearDueModal();
  renderAll();

  const updatedCust = state.customers.find(c => c.name.toLowerCase().trim() === custKey) || cust;
  if (updatedCust.totalUdhaar === 0) {
    showToast(`Full balance of ₹${settledAmount} cleared for ${customerName}!`, 'success');
  } else {
    showToast(`Received ₹${settledAmount} from ${customerName}. Remaining: ₹${updatedCust.totalUdhaar}`, 'info');
  }
}

// -------------------------------------------------------------
// Custom Popup Dialog Box: Customer Phone Number
// -------------------------------------------------------------
let activePhoneCallback = null;

function openPhoneModal(customerName, onSavedCallback = null) {
  activePhoneCallback = onSavedCallback;

  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const currentPhone = savedPhones[custKey] || '';

  const existing = document.getElementById('phoneModalOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="phoneModalOverlay" class="popup-dialog-overlay">
      <div class="popup-dialog-card">
        <div class="popup-dialog-header">
          <div class="popup-dialog-title">Customer Phone Number</div>
          <button class="popup-dialog-close" onclick="closePhoneModal()">&times;</button>
        </div>

        <div class="popup-cust-banner">
          <div>
            <div class="popup-cust-name">${escapeHtml(customerName)}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">Customer Account</div>
          </div>
          <div>
            <span style="font-size:0.8rem; color:#10B981; font-weight:600;">💬 WhatsApp / Call</span>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; margin-bottom:0.4rem;">
            Mobile Phone Number
          </label>
          <input type="tel" id="phoneModalInput" class="transcript-input" placeholder="e.g. 9876543210" value="${escapeHtml(currentPhone)}" maxlength="15" style="font-weight:600; font-size:1.05rem;" />
          <div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.35rem;">
            Used for 1-tap WhatsApp payment reminders and direct phone calls.
          </div>
        </div>

        <div class="popup-actions">
          <button type="button" class="btn-discard" onclick="closePhoneModal()">Cancel</button>
          <button type="button" class="btn-confirm" onclick="submitPhoneModal('${escapeHtml(customerName)}')">Save Number</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setTimeout(() => {
    const input = document.getElementById('phoneModalInput');
    if (input) { input.focus(); }
  }, 50);
}

function closePhoneModal() {
  const modal = document.getElementById('phoneModalOverlay');
  if (modal) modal.remove();
  activePhoneCallback = null;
}

function submitPhoneModal(customerName) {
  const inputEl = document.getElementById('phoneModalInput');
  if (!inputEl) return;

  const cleaned = inputEl.value.trim().replace(/[^0-9+]/g, '');
  if (!cleaned) {
    showToast('Please enter a valid phone number', 'error');
    return;
  }

  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  savedPhones[custKey] = cleaned;
  localStorage.setItem('roznama_cust_phones', JSON.stringify(savedPhones));

  const target = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  if (target) target.phone = cleaned;

  const cb = activePhoneCallback;
  closePhoneModal();
  renderCustomerList();
  showToast(`Phone number saved for ${customerName}!`, 'success');

  if (typeof cb === 'function') {
    cb(cleaned);
  }
}

// -------------------------------------------------------------
// Custom Popup Dialog Box: Smart WhatsApp Reminder (Offline Canvas UPI & QR)
// -------------------------------------------------------------
let activeReminderCustomer = null;
let activeReminderTemplateIndex = 0;
let activeUpiModalCallback = null;

// Dedicated First-Time Vendor Store UPI Setup Modal
function openVendorUpiModal(onSavedCallback = null) {
  activeUpiModalCallback = onSavedCallback;
  const currentUpi = localStorage.getItem('roznama_vendor_upi') || '';

  const existing = document.getElementById('vendorUpiModalOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="vendorUpiModalOverlay" class="popup-dialog-overlay">
      <div class="popup-dialog-card">
        <div class="popup-dialog-header">
          <div class="popup-dialog-title" style="display:flex; align-items:center; gap:0.5rem;">
            <span>💳</span> Set Store UPI ID
          </div>
          <button class="popup-dialog-close" onclick="closeVendorUpiModal()">&times;</button>
        </div>

        <div style="background:#0E1522; border:1px solid var(--border-color); padding:0.85rem 1rem; border-radius:var(--radius-md); margin-bottom:1.25rem;">
          <div style="font-weight:700; font-size:0.95rem; color:#FFF; margin-bottom:0.25rem;">Direct Customer Payments</div>
          <div style="font-size:0.8rem; color:var(--text-dim); line-height:1.4;">
            Enter your Store UPI ID once so RozNama can generate <strong>1-tap WhatsApp payment links</strong> and <strong>dynamic offline QR codes</strong> with the exact customer debt.
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; margin-bottom:0.4rem;">
            Store UPI ID (VPA)
          </label>
          <input type="text" id="vendorUpiModalInput" class="transcript-input" placeholder="e.g. 9876543210@upi or store@okhdfcbank" value="${escapeHtml(currentUpi)}" style="font-weight:600; font-size:1.05rem;" />
          
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin-top:0.6rem;">
            <span style="font-size:0.72rem; color:var(--text-dim); align-self:center;">Quick Handles:</span>
            <button type="button" class="template-chip" style="padding:3px 8px; font-size:0.72rem;" onclick="appendUpiSuffix('@upi')">@upi</button>
            <button type="button" class="template-chip" style="padding:3px 8px; font-size:0.72rem;" onclick="appendUpiSuffix('@okhdfcbank')">@okhdfcbank</button>
            <button type="button" class="template-chip" style="padding:3px 8px; font-size:0.72rem;" onclick="appendUpiSuffix('@okaxis')">@okaxis</button>
            <button type="button" class="template-chip" style="padding:3px 8px; font-size:0.72rem;" onclick="appendUpiSuffix('@paytm')">@paytm</button>
            <button type="button" class="template-chip" style="padding:3px 8px; font-size:0.72rem;" onclick="appendUpiSuffix('@ybl')">@ybl</button>
          </div>
          <div style="font-size:0.75rem; color:#10B981; margin-top:0.6rem;">
            🔒 Stored 100% locally on your device. Payments go directly to your bank account with zero cuts.
          </div>
        </div>

        <div class="popup-actions">
          <button type="button" class="btn-discard" onclick="closeVendorUpiModal()">Cancel</button>
          <button type="button" class="btn-confirm" onclick="submitVendorUpiModal()">Save UPI ID</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setTimeout(() => {
    const input = document.getElementById('vendorUpiModalInput');
    if (input) { input.focus(); }
  }, 50);
}

function appendUpiSuffix(suffix) {
  const input = document.getElementById('vendorUpiModalInput');
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

function closeVendorUpiModal() {
  const modal = document.getElementById('vendorUpiModalOverlay');
  if (modal) modal.remove();
  activeUpiModalCallback = null;
}

function submitVendorUpiModal() {
  const input = document.getElementById('vendorUpiModalInput');
  if (!input) return;
  const cleaned = input.value.trim();

  if (!cleaned || !cleaned.includes('@') || cleaned.indexOf('@') === 0 || cleaned.endsWith('@')) {
    showToast('Please enter a valid UPI ID (e.g. 9876543210@upi)', 'error');
    return;
  }

  localStorage.setItem('roznama_vendor_upi', cleaned);
  showToast(`Store UPI ID set to ${cleaned}!`, 'success');
  closeVendorUpiModal();
  renderUpiHeaderBadge();

  if (typeof activeUpiModalCallback === 'function') {
    const cb = activeUpiModalCallback;
    activeUpiModalCallback = null;
    cb(cleaned);
  }
}

// Open Smart WhatsApp Reminder Modal
function openSmartReminderModal(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const phone = savedPhones[custKey] || '';

  // 1. Phone check: ask for phone if not present
  if (!phone) {
    openPhoneModal(customerName, () => {
      openSmartReminderModal(customerName);
    });
    return;
  }

  // 2. UPI ID check: ask vendor to enter UPI ID at least once
  const savedUpi = localStorage.getItem('roznama_vendor_upi');
  if (!savedUpi) {
    openVendorUpiModal(() => {
      openSmartReminderModal(customerName);
    });
    return;
  }

  const cust = state.customers.find(c => c.name.toLowerCase().trim() === custKey) || { name: customerName, totalUdhaar: 0 };
  const storeUser = JSON.parse(localStorage.getItem('roznama_user') || '{}');
  const storeName = storeUser.storeName || storeUser.name || 'Kirana Store';

  activeReminderCustomer = {
    name: cust.name,
    phone: phone,
    udhaar: cust.totalUdhaar || 0,
    dueDate: cust.dueDate || 'Tomorrow',
    storeName: storeName
  };
  activeReminderTemplateIndex = 0;

  renderSmartReminderModal(savedUpi);
}

function renderSmartReminderModal(vendorUpi) {
  const existing = document.getElementById('smartReminderModalOverlay');
  if (existing) existing.remove();

  const c = activeReminderCustomer;
  if (!c) return;

  const cleanPhone = c.phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`;

  // Generate UPI payload for offline QR & universal pay.html web link for WhatsApp
  const cleanAmount = parseFloat(String(c.udhaar).replace(/[^0-9.]/g, '') || 0).toFixed(2);
  const cleanStore = (c.storeName || 'Kirana Store').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  // Standard NPCI URI requires literal '@' in pa parameter
  const upiPayload = `upi://pay?pa=${vendorUpi}&pn=${encodeURIComponent(cleanStore)}&am=${cleanAmount}&cu=INR&tn=Khata%20Settlement`;
  const baseUrl = window.location.origin;
  const payUrl = `${baseUrl}/pay.html?pa=${encodeURIComponent(vendorUpi)}&pn=${encodeURIComponent(cleanStore)}&am=${cleanAmount}&cu=INR`;

  const templates = getReminderTemplates(c.name, cleanStore, cleanAmount, c.dueDate, vendorUpi, payUrl);
  const selectedTemplate = templates[activeReminderTemplateIndex] || templates[0];

  const modalHtml = `
    <div id="smartReminderModalOverlay" class="popup-dialog-overlay">
      <div class="popup-dialog-card smart-reminder-card">
        <div class="popup-dialog-header">
          <div class="popup-dialog-title" style="display:flex; align-items:center; gap:0.5rem;">
            <span>💬</span> Smart WhatsApp Reminder
          </div>
          <button class="popup-dialog-close" onclick="closeSmartReminderModal()">&times;</button>
        </div>

        <!-- Customer & Due Banner -->
        <div class="popup-cust-banner">
          <div>
            <div class="popup-cust-name">${escapeHtml(c.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">${escapeHtml(formattedPhone)}</div>
          </div>
          <div style="text-align:right;">
            <div class="popup-cust-balance">₹${c.udhaar}</div>
            <div style="font-size:0.72rem; color:#EF4444; font-weight:600;">Pending Udhaar</div>
          </div>
        </div>

        <!-- Vendor UPI ID & 100% Offline Canvas QR -->
        <div class="smart-upi-section">
          <div class="smart-upi-header">
            <span>Store UPI Payment Setup</span>
            <span style="font-size:0.72rem; color:#10B981; font-weight:600;">● 100% Offline Dynamic QR</span>
          </div>
          <div class="smart-upi-row">
            <div style="flex:1;">
              <label style="display:block; font-size:0.75rem; color:var(--text-dim); margin-bottom:0.25rem;">
                Your Store UPI ID (GPay / PhonePe / Paytm)
              </label>
              <input type="text" id="smartUpiInput" class="transcript-input" value="${escapeHtml(vendorUpi)}" placeholder="e.g. 9876543210@upi or store@okhdfcbank" oninput="onVendorUpiChange(this.value)" style="font-size:0.88rem; padding:8px 10px;" />
              <div style="font-size:0.72rem; color:var(--text-dim); margin-top:0.35rem;">
                Live updates QR & WhatsApp links as you type.
              </div>
            </div>
            <div class="qr-thumbnail-box" title="Offline QR for ₹${c.udhaar} - Scan to Pay">
              <canvas id="smartReminderQrCanvas" class="qr-thumbnail-canvas"></canvas>
              <div style="font-size:0.62rem; color:#0F172A; font-weight:700; text-align:center; margin-top:2px;">₹${c.udhaar} QR</div>
            </div>
          </div>
        </div>

        <!-- Predefined Message Templates -->
        <div style="margin-top: 1rem;">
          <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; margin-bottom:0.4rem;">
            Choose Reminder Message
          </label>
          <div class="template-chips-row">
            ${templates.map((t, idx) => `
              <button type="button" class="template-chip ${idx === activeReminderTemplateIndex ? 'active' : ''}" onclick="selectReminderTemplate(${idx})">
                ${t.chipLabel}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Message Live Preview -->
        <div style="margin-top: 0.85rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
            <label style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase; font-weight:600;">
              WhatsApp Message Preview
            </label>
            <button type="button" class="btn-copy-preview" onclick="copyReminderText()">📋 Copy Text</button>
          </div>
          <div class="wa-preview-bubble">
            <pre id="waPreviewContent" style="margin:0; white-space:pre-wrap; font-family:inherit; font-size:0.82rem; line-height:1.45; color:#E2E8F0;">${escapeHtml(selectedTemplate.text)}</pre>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="popup-actions" style="margin-top:1.25rem;">
          <button type="button" class="btn-discard" onclick="closeSmartReminderModal()">Cancel</button>
          <button type="button" class="btn-whatsapp-send" onclick="sendSmartWhatsApp()">
            <span>💬</span> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Render QR Canvas 100% locally & offline
  setTimeout(() => {
    drawOfflineQrCode(upiPayload);
  }, 50);
}

// 100% Offline Client-Side QR Drawing
function drawOfflineQrCode(upiPayload) {
  const canvas = document.getElementById('smartReminderQrCanvas');
  if (!canvas) return;

  if (window.QRCode && typeof QRCode.toCanvas === 'function') {
    QRCode.toCanvas(canvas, upiPayload, {
      width: 78,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, (error) => {
      if (error) console.error('Offline QR Canvas error:', error);
    });
  }
}

function getReminderTemplates(customerName, storeName, amount, dueDate, upiId, payUrl) {
  return [
    {
      chipLabel: '🌟 Friendly Reminder',
      text: `Namaste ${customerName} ji 🙏\n\nThis is a friendly reminder from ${storeName}.\nYour pending Khata balance is ₹${amount}.\n\n💳 Pay directly via UPI: ${upiId}\n📲 1-Tap UPI Payment Link:\n${payUrl}\n\nThank you for supporting our local store!`
    },
    {
      chipLabel: '📅 Payment Due',
      text: `Namaste ${customerName} ji 🙏\n\nReminder from ${storeName}: Your promised payment of ₹${amount} is due (${dueDate || 'soon'}).\n\nKindly clear the balance using our Store UPI:\n💳 UPI ID: ${upiId}\n📲 Instant Pay Link:\n${payUrl}\n\nDhanyawad!`
    },
    {
      chipLabel: '⚡ Clear Overdue',
      text: `Important Payment Reminder:\n\nDear ${customerName},\nYour outstanding credit balance of ₹${amount} at ${storeName} is overdue.\n\nPlease settle the balance immediately via UPI:\n💳 UPI ID: ${upiId}\n📲 Pay Now:\n${payUrl}\n\nThank you.`
    }
  ];
}

function onVendorUpiChange(newUpi) {
  const cleaned = newUpi.trim();
  localStorage.setItem('roznama_vendor_upi', cleaned);
  renderUpiHeaderBadge();
  if (!activeReminderCustomer) return;

  const cleanAmount = parseFloat(String(activeReminderCustomer.udhaar).replace(/[^0-9.]/g, '') || 0).toFixed(2);
  const cleanStore = (activeReminderCustomer.storeName || 'Kirana Store').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const upiPayload = `upi://pay?pa=${cleaned}&pn=${encodeURIComponent(cleanStore)}&am=${cleanAmount}&cu=INR&tn=Khata%20Settlement`;
  drawOfflineQrCode(upiPayload);

  const baseUrl = window.location.origin;
  const payUrl = `${baseUrl}/pay.html?pa=${encodeURIComponent(cleaned)}&pn=${encodeURIComponent(cleanStore)}&am=${cleanAmount}&cu=INR`;

  const templates = getReminderTemplates(activeReminderCustomer.name, cleanStore, cleanAmount, activeReminderCustomer.dueDate, cleaned, payUrl);
  const selected = templates[activeReminderTemplateIndex] || templates[0];
  const preview = document.getElementById('waPreviewContent');
  if (preview) preview.textContent = selected.text;
}

function selectReminderTemplate(index) {
  activeReminderTemplateIndex = index;
  const vendorUpi = localStorage.getItem('roznama_vendor_upi') || 'store@upi';
  const cleanAmount = parseFloat(String(activeReminderCustomer.udhaar).replace(/[^0-9.]/g, '') || 0).toFixed(2);
  const cleanStore = (activeReminderCustomer.storeName || 'Kirana Store').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const baseUrl = window.location.origin;
  const payUrl = `${baseUrl}/pay.html?pa=${encodeURIComponent(vendorUpi)}&pn=${encodeURIComponent(cleanStore)}&am=${cleanAmount}&cu=INR`;
  const templates = getReminderTemplates(activeReminderCustomer.name, cleanStore, cleanAmount, activeReminderCustomer.dueDate, vendorUpi, payUrl);

  // Update chip active classes
  const chips = document.querySelectorAll('.template-chip');
  chips.forEach((c, idx) => {
    c.classList.toggle('active', idx === index);
  });

  const preview = document.getElementById('waPreviewContent');
  if (preview && templates[index]) {
    preview.textContent = templates[index].text;
  }
}

function copyReminderText() {
  const preview = document.getElementById('waPreviewContent');
  if (preview) {
    navigator.clipboard.writeText(preview.textContent).then(() => {
      showToast('Reminder message copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not copy text', 'error');
    });
  }
}

function sendSmartWhatsApp() {
  if (!activeReminderCustomer) return;
  const preview = document.getElementById('waPreviewContent');
  const text = preview ? preview.textContent : '';
  const cleanPhone = activeReminderCustomer.phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
  showToast(`Opening WhatsApp for ${activeReminderCustomer.name}...`, 'info');
  closeSmartReminderModal();
}

function closeSmartReminderModal() {
  const modal = document.getElementById('smartReminderModalOverlay');
  if (modal) modal.remove();
  activeReminderCustomer = null;
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

// Remind Customer via WhatsApp (opens Smart Reminder Modal)
function remindViaWhatsApp(customerName) {
  openSmartReminderModal(customerName);
}

function getReminderTemplates(customerName, storeName, amount, dueDate, upiId, upiPayload) {
  return [
    {
      chipLabel: '🌟 Friendly Reminder',
      text: `Namaste ${customerName} ji 🙏\n\nThis is a friendly reminder from ${storeName}.\nYour pending Khata balance is ₹${amount}.\n\n💳 Pay directly via UPI: ${upiId}\n📲 1-Tap UPI Payment Link:\n${upiPayload}\n\nThank you for supporting our local store!`
    },
    {
      chipLabel: '📅 Payment Due',
      text: `Namaste ${customerName} ji 🙏\n\nReminder from ${storeName}: Your promised payment of ₹${amount} is due (${dueDate || 'soon'}).\n\nKindly clear the balance using our Store UPI:\n💳 UPI ID: ${upiId}\n📲 Instant Pay Link:\n${upiPayload}\n\nDhanyawad!`
    },
    {
      chipLabel: '⚡ Clear Overdue',
      text: `Important Payment Reminder:\n\nDear ${customerName},\nYour outstanding credit balance of ₹${amount} at ${storeName} is overdue.\n\nPlease settle the balance immediately via UPI:\n💳 UPI ID: ${upiId}\n📲 Pay Now:\n${upiPayload}\n\nThank you.`
    }
  ];
}

function onVendorUpiChange(newUpi) {
  const cleaned = newUpi.trim();
  localStorage.setItem('roznama_vendor_upi', cleaned);
  if (!activeReminderCustomer) return;

  const upiPayload = `upi://pay?pa=${encodeURIComponent(cleaned)}&pn=${encodeURIComponent(activeReminderCustomer.storeName)}&am=${activeReminderCustomer.udhaar}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiPayload)}`;

  const qrImg = document.querySelector('.qr-thumbnail-img');
  if (qrImg) qrImg.src = qrUrl;

  const templates = getReminderTemplates(activeReminderCustomer.name, activeReminderCustomer.storeName, activeReminderCustomer.udhaar, activeReminderCustomer.dueDate, cleaned, upiPayload);
  const selected = templates[activeReminderTemplateIndex] || templates[0];
  const preview = document.getElementById('waPreviewContent');
  if (preview) preview.textContent = selected.text;
}

function selectReminderTemplate(index) {
  activeReminderTemplateIndex = index;
  const vendorUpi = localStorage.getItem('roznama_vendor_upi') || (activeReminderCustomer.storeName ? 'store@upi' : 'kirana@upi');
  const upiPayload = `upi://pay?pa=${encodeURIComponent(vendorUpi)}&pn=${encodeURIComponent(activeReminderCustomer.storeName)}&am=${activeReminderCustomer.udhaar}&cu=INR`;
  const templates = getReminderTemplates(activeReminderCustomer.name, activeReminderCustomer.storeName, activeReminderCustomer.udhaar, activeReminderCustomer.dueDate, vendorUpi, upiPayload);

  // Update chip active classes
  const chips = document.querySelectorAll('.template-chip');
  chips.forEach((c, idx) => {
    c.classList.toggle('active', idx === index);
  });

  const preview = document.getElementById('waPreviewContent');
  if (preview && templates[index]) {
    preview.textContent = templates[index].text;
  }
}

function copyReminderText() {
  const preview = document.getElementById('waPreviewContent');
  if (preview) {
    navigator.clipboard.writeText(preview.textContent).then(() => {
      showToast('Reminder message copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not copy text', 'error');
    });
  }
}

function sendSmartWhatsApp() {
  if (!activeReminderCustomer) return;
  const preview = document.getElementById('waPreviewContent');
  const text = preview ? preview.textContent : '';
  const cleanPhone = activeReminderCustomer.phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
  showToast(`Opening WhatsApp for ${activeReminderCustomer.name}...`, 'info');
  closeSmartReminderModal();
}

function closeSmartReminderModal() {
  const modal = document.getElementById('smartReminderModalOverlay');
  if (modal) modal.remove();
  activeReminderCustomer = null;
}

// Remind Customer via WhatsApp (opens Smart Reminder Modal)
function remindViaWhatsApp(customerName) {
  openSmartReminderModal(customerName);
}

// Remind Customer via Direct Phone Call
function remindViaCall(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const phone = savedPhones[custKey];

  if (!phone) {
    // Open custom phone modal instead of native prompt!
    openPhoneModal(customerName, (newPhone) => {
      window.location.href = `tel:${newPhone.replace(/[^0-9+]/g, '')}`;
    });
    return;
  }

  const clean = phone.replace(/[^0-9+]/g, '');
  window.location.href = `tel:${clean}`;
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}
