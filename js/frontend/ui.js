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
          <input type="text" id="editCustName" class="transcript-input" style="padding:0.4rem 0.6rem; font-weight:700;" value="${ext.customerName}" onchange="updateExtField('customerName', this.value)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Cash Received Today (₹) ✏️</div>
          <input type="number" id="editPaidAmount" class="transcript-input" style="padding:0.4rem 0.6rem; font-weight:700; color:#34D399;" value="${ext.paidAmount}" onchange="updateExtField('paidAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Udhaar / Credit Added (₹) ✏️</div>
          <input type="number" id="editUdhaarAmount" class="transcript-input" style="padding:0.4rem 0.6rem; font-weight:700; color:#FBBF24;" value="${ext.udhaarAmount}" onchange="updateExtField('udhaarAmount', parseInt(this.value, 10) || 0)">
        </div>

        <div class="entity-field">
          <div class="entity-label">Purchased Items ✏️</div>
          <input type="text" id="editItems" class="transcript-input" style="padding:0.4rem 0.6rem; font-size:0.9rem;" value="${ext.items}" onchange="updateExtField('items', this.value)">
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
  const totalCashToday = state.transactions.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
  const totalUdhaarPending = state.customers.reduce((acc, c) => acc + (c.totalUdhaar || 0), 0);
  const activeCustomers = state.customers.length;
  const overdueReminders = state.customers.filter(c => c.totalUdhaar > 0).length;

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

  tableBody.innerHTML = state.transactions.map(tx => `
    <tr>
      <td>
        <div style="font-weight:600;">${tx.customerName}</div>
        <div style="font-size:0.75rem; color:var(--text-dim);">${tx.timestamp}</div>
      </td>
      <td>
        <span class="badge ${tx.udhaarAmount > 0 ? 'badge-udhaar' : 'badge-paid'}">
          ${tx.items}
        </span>
      </td>
      <td style="font-weight:700; color:#34D399;">₹${tx.paidAmount}</td>
      <td style="font-weight:700; color:#FBBF24;">₹${tx.udhaarAmount}</td>
      <td>
        ${tx.dueDate ? `<span style="font-size:0.82rem; color:var(--accent-gold);">📅 ${tx.dueDateLabel}</span>` : '<span style="font-size:0.82rem; color:var(--text-muted);">None</span>'}
      </td>
    </tr>
  `).join('');
}

function renderCustomerList() {
  const container = document.getElementById('customerListContainer');
  if (!container) return;

  container.innerHTML = state.customers.map(cust => {
    const whatsappMsg = encodeURIComponent(
      `Namaste ${cust.name} ji, RozNama Store Ledger update: Aapke pass ₹${cust.totalUdhaar} ka baki udhaar balance hai. Kripya jald bhugtan karein. Dhanyawad!`
    );
    const waLink = `https://api.whatsapp.com/send?phone=${cust.phone.replace(/[^0-9]/g, '')}&text=${whatsappMsg}`;

    return `
      <div class="customer-item">
        <div>
          <div class="cust-name">${cust.name}</div>
          <div class="cust-phone">${cust.phone}</div>
        </div>
        <div class="cust-debt">
          <div class="cust-debt-val">₹${cust.totalUdhaar} Udhaar</div>
          ${cust.totalUdhaar > 0 ? `
            <a href="${waLink}" target="_blank" class="btn-whatsapp">
              📱 Remind WhatsApp
            </a>
          ` : `
            <span style="font-size:0.75rem; color:#34D399;">Clear</span>
          `}
        </div>
      </div>
    `;
  }).join('');
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
