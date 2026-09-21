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

// Render Dashboard Counters & Tables
function renderAll() {
  renderStats();
  renderTransactionTable();
  renderCustomerList();
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

  tableBody.innerHTML = state.transactions.map(tx => {
    const paid = tx.jamaCash !== undefined ? Number(tx.jamaCash) : Number(tx.paidAmount || 0);
    const udhaar = Number(tx.udhaarAmount || 0);
    const itemsStr = Array.isArray(tx.items) ? tx.items.join(', ') : (tx.items || 'General Items');
    const dueStr = tx.dueDateLabel || tx.dueDate || (udhaar > 0 ? 'Pending' : 'Settled');

    // Format human readable date/time
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

function renderCustomerList() {
  const container = document.getElementById('customerListContainer');
  if (!container) return;

  if (!state.customers || state.customers.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; color:var(--text-muted); padding:2rem; font-size:0.9rem;">
        No customer accounts active. Record your first entry to build customer accounts.
      </div>
    `;
    return;
  }

  // Load saved phone numbers from localStorage
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');

  container.innerHTML = state.customers.map(cust => {
    const custKey = cust.name.toLowerCase().trim();
    const phone = savedPhones[custKey] || cust.phone || '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    const whatsappMsg = encodeURIComponent(
      `Namaste ${cust.name} ji, RozNama Store Ledger update: Aapke pass ₹${cust.totalUdhaar} ka baki udhaar balance hai. Kripya jald bhugtan karein. Dhanyawad!`
    );

    const waLink = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}&text=${whatsappMsg}`
      : `javascript:remindViaWhatsApp('${escapeHtml(cust.name)}')`;

    const callLink = cleanPhone 
      ? `tel:${cleanPhone}` 
      : `javascript:remindViaCall('${escapeHtml(cust.name)}')`;

    return `
      <div class="customer-item">
        <div>
          <div class="cust-name">${escapeHtml(cust.name)}</div>
          <div style="margin-top: 4px;">
            ${phone 
              ? `<span class="cust-phone" style="cursor:pointer;" onclick="openPhoneModal('${escapeHtml(cust.name)}')" title="Click to edit phone number">${escapeHtml(phone)}</span> <button class="btn-phone-edit" onclick="openPhoneModal('${escapeHtml(cust.name)}')" title="Edit Phone">Edit</button>`
              : `<button class="btn-add-phone" onclick="openPhoneModal('${escapeHtml(cust.name)}')" title="Add phone number for ${escapeHtml(cust.name)}">+ Phone</button>`
            }
          </div>
        </div>
        <div class="cust-debt">
          <div class="cust-debt-val" style="color:${cust.totalUdhaar > 0 ? '#FBBF24' : '#34D399'};">
            ₹${cust.totalUdhaar} ${cust.totalUdhaar > 0 ? 'Udhaar' : 'Settled'}
          </div>
          ${cust.totalUdhaar > 0 ? `
            <div class="cust-actions">
              <button class="btn-clear-due" onclick="openClearDueModal('${escapeHtml(cust.name)}')" title="Confirm payment received and clear due amount">
                Clear Due
              </button>
              <a href="${waLink}" target="${cleanPhone ? '_blank' : '_self'}" class="btn-whatsapp" title="Send WhatsApp Payment Reminder">
                WhatsApp
              </a>
              <a href="${callLink}" class="btn-call" title="Call ${escapeHtml(cust.name)} directly to remind">
                Call
              </a>
            </div>
          ` : `
            <span style="font-size:0.78rem; color:#34D399; font-weight:600;">Nil Due</span>
          `}
        </div>
      </div>
    `;
  }).join('');
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
  }

  // Record a settlement transaction in ledger
  const settlementTx = {
    id: `tx-${Date.now()}`,
    customerId: cust.id,
    customerName: cust.name,
    type: 'paid',
    paidAmount: settledAmount,
    jamaCash: settledAmount,
    udhaarAmount: 0,
    items: 'Udhaar Settlement / Cash Received',
    dueDate: '',
    dueDateLabel: 'Settled',
    transcript: `Received ₹${settledAmount} cash from ${customerName} to clear udhaar`,
    timestamp: Date.now()
  };

  state.transactions.unshift(settlementTx);
  saveState();

  if (typeof saveTransactionOffline === 'function') {
    saveTransactionOffline(settlementTx);
  }
  if (typeof syncWithCloud === 'function') {
    syncWithCloud();
  }

  closeClearDueModal();
  renderAll();

  if (cust.totalUdhaar === 0) {
    showToast(`Full balance of ₹${settledAmount} cleared for ${customerName}!`, 'success');
  } else {
    showToast(`Received ₹${settledAmount} from ${customerName}. Remaining: ₹${cust.totalUdhaar}`, 'info');
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
            <span style="font-size:0.8rem; color:#60A5FA;">📱 SMS / Call</span>
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

// Remind Customer via WhatsApp
function remindViaWhatsApp(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const phone = savedPhones[custKey];

  if (!phone) {
    // Open custom phone modal instead of native prompt!
    openPhoneModal(customerName, () => {
      remindViaWhatsApp(customerName);
    });
    return;
  }

  const cust = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  const udhaar = cust ? cust.totalUdhaar : 0;
  const clean = phone.replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(`Namaste ${customerName} ji, RozNama Store Ledger update: Aapke pass ₹${udhaar} ka baki udhaar balance hai. Kripya jald bhugtan karein. Dhanyawad!`);
  const url = `https://api.whatsapp.com/send?phone=${clean.length === 10 ? '91' + clean : clean}&text=${msg}`;
  window.open(url, '_blank');
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
