/**
 * RozNama - Frontend Modals & Dialog System
 * Modular popup modals for Khata operations:
 * - Clear Customer Udhaar Dialog
 * - Customer Mobile & WhatsApp Phone Number Dialog
 * - Store UPI Setup & VPA Management Dialog
 * - Smart WhatsApp Payment Reminder with Offline Canvas QR
 * - Internet Restored & IndexedDB-to-Supabase Sync Dialog
 * - Toast Notification System
 */

// Safe HTML escaper helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// Toast Notification Engine
// -------------------------------------------------------------
function createToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'info') {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// -------------------------------------------------------------
// Modal 1: Clear Customer Udhaar (Cash Settlement)
// -------------------------------------------------------------
function openClearDueModal(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const cust = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  if (!cust || cust.totalUdhaar <= 0) return;

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

  // Record settlement in ledger
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
  if (typeof saveState === 'function') {
    saveState();
  }
  if (typeof saveTransactionOffline === 'function') {
    saveTransactionOffline(settlementTx);
  }
  if (typeof syncWithCloud === 'function') {
    syncWithCloud();
  }

  closeClearDueModal();
  if (typeof renderAll === 'function') {
    renderAll();
  }

  const updatedCust = state.customers.find(c => c.name.toLowerCase().trim() === custKey) || cust;
  if (updatedCust.totalUdhaar === 0) {
    showToast(`Full balance of ₹${settledAmount} cleared for ${customerName}!`, 'success');
  } else {
    showToast(`Received ₹${settledAmount} from ${customerName}. Remaining: ₹${updatedCust.totalUdhaar}`, 'info');
  }
}

// -------------------------------------------------------------
// Modal 2: Customer Phone Number Dialog
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
  if (typeof renderCustomerList === 'function') {
    renderCustomerList();
  }
  showToast(`Phone number saved for ${customerName}!`, 'success');

  if (typeof cb === 'function') {
    cb(cleaned);
  }
}

// -------------------------------------------------------------
// Modal 3: Vendor Store UPI ID Setup Dialog
// -------------------------------------------------------------
let activeUpiModalCallback = null;

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
  if (typeof renderUpiHeaderBadge === 'function') {
    renderUpiHeaderBadge();
  }

  if (typeof activeUpiModalCallback === 'function') {
    const cb = activeUpiModalCallback;
    activeUpiModalCallback = null;
    cb(cleaned);
  }
}

// -------------------------------------------------------------
// Modal 4: Smart WhatsApp Payment Reminder & Offline Canvas QR
// -------------------------------------------------------------
let activeReminderCustomer = null;
let activeReminderTemplateIndex = 0;

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
  if (typeof renderUpiHeaderBadge === 'function') {
    renderUpiHeaderBadge();
  }
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

// -------------------------------------------------------------
// Quick Customer Communication Triggers
// -------------------------------------------------------------
function remindViaWhatsApp(customerName) {
  openSmartReminderModal(customerName);
}

function remindViaCall(customerName) {
  const custKey = customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const phone = savedPhones[custKey];

  if (!phone) {
    openPhoneModal(customerName, (newPhone) => {
      window.location.href = `tel:${newPhone.replace(/[^0-9+]/g, '')}`;
    });
    return;
  }

  const clean = phone.replace(/[^0-9+]/g, '');
  window.location.href = `tel:${clean}`;
}

// -------------------------------------------------------------
// Modal 5: Internet Restored & IndexedDB-to-Supabase Sync Dialog
// -------------------------------------------------------------
function openInternetRestoredModal(pendingCount = 0) {
  const existing = document.getElementById('internetRestoredModalOverlay');
  if (existing) existing.remove();

  const count = typeof pendingCount === 'number' ? pendingCount : 0;

  const modalHtml = `
    <div id="internetRestoredModalOverlay" class="popup-dialog-overlay">
      <div class="popup-dialog-card" style="border-color: rgba(52, 211, 153, 0.4); box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.18);">
        <div class="popup-dialog-header">
          <div class="popup-dialog-title" style="display:flex; align-items:center; gap:0.6rem; color:#34D399;">
            <span style="font-size:1.2rem;">🟢</span>
            <span>Internet Connected</span>
          </div>
          <button class="popup-dialog-close" onclick="closeInternetRestoredModal()">&times;</button>
        </div>

        <div class="popup-cust-banner" style="background:#09161F; border-color: rgba(52, 211, 153, 0.3);">
          <div>
            <div style="font-weight:700; color:#34D399; font-size:1.02rem;">
              You're Back Online!
            </div>
            <div style="font-size:0.78rem; color:var(--text-dim); margin-top:2px;">
              Internet connection successfully restored
            </div>
          </div>
          <div style="font-size:1.75rem;">📶</div>
        </div>

        <div style="margin-bottom: 1.25rem; font-size:0.92rem; line-height:1.55; color:var(--text-main);">
          ${count > 0 
            ? `You have <strong style="color:var(--accent-gold); font-size:1.05rem;">${count} offline transaction(s)</strong> stored locally in your <strong>IndexedDB</strong> database.<br><br>Would you like to sync your IndexedDB Khata storage to <strong>Supabase Cloud</strong> now?`
            : `Your local <strong>IndexedDB</strong> storage is currently in sync. Would you like to sync now to refresh your Khata from <strong>Supabase Cloud</strong>?`
          }
        </div>

        <div class="popup-actions" style="display:flex; gap:0.75rem;">
          <button type="button" class="btn-discard" style="flex:1;" onclick="closeInternetRestoredModal()">
            Keep Local / Later
          </button>
          <button type="button" class="btn-confirm" id="confirmInternetSyncBtn" style="flex:1.5;" onclick="handleInternetModalSync()">
            🔄 Sync to Supabase
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeInternetRestoredModal() {
  const modal = document.getElementById('internetRestoredModalOverlay');
  if (modal) modal.remove();
}

async function handleInternetModalSync() {
  const syncBtn = document.getElementById('confirmInternetSyncBtn');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '🔄 Syncing to Supabase...';
  }

  try {
    let syncedCount = 0;
    if (typeof syncPendingQueue === 'function') {
      syncedCount = await syncPendingQueue();
    }
    if (typeof syncWithCloud === 'function') {
      await syncWithCloud();
    }
    closeInternetRestoredModal();
    if (typeof showToast === 'function') {
      showToast(syncedCount > 0 
        ? `✅ Synced ${syncedCount} offline entry(ies) to Supabase Cloud!` 
        : `✅ Khata successfully synchronized with Supabase!`, 'success');
    }
  } catch (err) {
    console.error("Internet modal sync error:", err);
    if (typeof showToast === 'function') {
      showToast('Sync failed. Please check network connection.', 'error');
    }
    closeInternetRestoredModal();
  }
}
