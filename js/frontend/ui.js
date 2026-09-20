// RozNama UI Engine - DOM Rendering & Components

// Render Presets Chip Buttons
function renderPresets() {
  const container = document.getElementById('presetsContainer');
  if (!container || typeof SAMPLE_VOICE_PRESETS === 'undefined') return;

  container.innerHTML = SAMPLE_VOICE_PRESETS.map(preset => `
    <button class="preset-chip" onclick="usePreset('${preset.id}')">
      <span>🗣️ "${preset.title}"</span>
      <span class="chip-tag">${preset.category}</span>
    </button>
  `).join('');
}

function usePreset(presetId) {
  if (typeof SAMPLE_VOICE_PRESETS === 'undefined') return;
  const preset = SAMPLE_VOICE_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  const inputEl = document.getElementById('transcriptInput');
  if (inputEl) inputEl.value = preset.text;
  
  if (typeof processTranscript === 'function') {
    processTranscript(preset.text);
  }
  showToast(`Loaded voice preset: ${preset.title}`, 'info');
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
          <span>✨ Voice Note Parsed Successfully</span>
        </div>
        <span class="badge ${ext.udhaarAmount > 0 ? 'badge-udhaar' : 'badge-paid'}">
          ${ext.udhaarAmount > 0 ? 'Partial Payment + Udhaar' : 'Full Payment'}
        </span>
      </div>

      <div class="raw-transcript-box">
        💬 "${ext.transcript}"
      </div>

      <div class="entity-grid">
        <div class="entity-field">
          <div class="entity-label">Customer Name ✏️</div>
          <input type="text" id="editCustName" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700;" value="${escapeHtml(ext.customerName)}" onchange="updateExtField('customerName', this.value)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Cash Received Today (₹) ✏️</div>
          <input type="number" id="editPaidAmount" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700; color:#34D399;" value="${ext.paidAmount}" onchange="updateExtField('paidAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Udhaar / Credit Added (₹) ✏️</div>
          <input type="number" id="editUdhaarAmount" class="transcript-input" style="padding:0.5rem 0.75rem; font-weight:700; color:#FBBF24;" value="${ext.udhaarAmount}" onchange="updateExtField('udhaarAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Purchased Items ✏️</div>
          <input type="text" id="editItems" class="transcript-input" style="padding:0.5rem 0.75rem;" value="${escapeHtml(ext.items)}" onchange="updateExtField('items', this.value)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Promised Payment Due</div>
          <div class="entity-val" style="font-size:1rem; margin-top:0.3rem;">
            ${ext.dueDate ? `📅 ${ext.dueDate} (${ext.dueDateLabel})` : '✅ Paid in Full'}
          </div>
        </div>
      </div>

      <div class="extraction-actions">
        <button class="btn-tts" onclick="speakConfirmation()">
          🔊 Read Confirmation (TTS)
        </button>
        <button class="btn-discard" onclick="discardExtraction()">
          ❌ Discard
        </button>
        <button class="btn-confirm" onclick="confirmTransaction()">
          💾 Save to Khata Ledger
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
            ? `<span style="font-size:0.82rem; color:var(--accent-gold); font-weight:600;">📅 ${escapeHtml(dueStr)}</span>`
            : `<span style="font-size:0.82rem; color:#34D399;">✓ Full Cash</span>`}
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
        No customer khatas active. Add your first voice entry to build customer accounts.
      </div>
    `;
    return;
  }

  // Load saved phone numbers from localStorage
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');

  container.innerHTML = state.customers.map(cust => {
    const custKey = cust.name.toLowerCase().trim();
    const phone = savedPhones[custKey] || cust.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const whatsappMsg = encodeURIComponent(
      `Namaste ${cust.name} ji, RozNama Store Ledger update: Aapke pass ₹${cust.totalUdhaar} ka baki udhaar balance hai. Kripya jald bhugtan karein. Dhanyawad!`
    );

    const waLink = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}&text=${whatsappMsg}`
      : `javascript:promptCustomerPhone('${cust.name}')`;

    return `
      <div class="customer-item">
        <div>
          <div class="cust-name">${escapeHtml(cust.name)}</div>
          <div class="cust-phone" onclick="promptCustomerPhone('${escapeHtml(cust.name)}')">
            ${phone ? `📱 ${phone}` : '<span style="color:#60A5FA; cursor:pointer; text-decoration:underline;">+ Add Customer Phone</span>'}
          </div>
        </div>
        <div class="cust-debt">
          <div class="cust-debt-val" style="color:${cust.totalUdhaar > 0 ? '#FBBF24' : '#34D399'};">
            ₹${cust.totalUdhaar} ${cust.totalUdhaar > 0 ? 'Udhaar' : 'Settled'}
          </div>
          ${cust.totalUdhaar > 0 ? `
            <a href="${waLink}" target="${cleanPhone ? '_blank' : '_self'}" class="btn-whatsapp" title="Send WhatsApp Payment Reminder">
              💬 Remind WhatsApp
            </a>
          ` : `
            <span style="font-size:0.78rem; color:#34D399; font-weight:600;">✓ Nil Due</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Prompt Storekeeper to Add or Edit Customer Phone Number
function promptCustomerPhone(customerName) {
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  const custKey = customerName.toLowerCase().trim();
  const currentPhone = savedPhones[custKey] || '';

  const input = prompt(`Enter mobile phone number for ${customerName} (e.g. 9876543210):`, currentPhone);
  if (input !== null) {
    const cleaned = input.trim().replace(/[^0-9+]/g, '');
    if (cleaned) {
      savedPhones[custKey] = cleaned;
      localStorage.setItem('roznama_cust_phones', JSON.stringify(savedPhones));
      // Update customer object in state
      const target = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
      if (target) target.phone = cleaned;
      renderCustomerList();
      showToast(`Phone saved for ${customerName}!`, 'success');
    }
  }
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>⚡ ${message}</span>`;
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
