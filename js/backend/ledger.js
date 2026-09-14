// RozNama Ledger Engine - Business Logic & Transaction Processing

// Confirm & Save Transaction to State and IndexedDB
function confirmTransaction() {
  if (!state.currentExtraction) return;

  const ext = state.currentExtraction;

  // Find or Create Customer Profile
  const custKey = ext.customerName.toLowerCase().trim();
  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');
  let customer = state.customers.find(c => c.name.toLowerCase().trim() === custKey);
  if (!customer) {
    customer = {
      id: `cust-${Date.now()}`,
      name: ext.customerName,
      phone: savedPhones[custKey] || '',
      totalJama: 0,
      totalUdhaar: 0,
      lastTransaction: new Date().toISOString().split('T')[0],
      status: ext.udhaarAmount > 0 ? "pending" : "settled",
      notes: "Created via Voice Ledger"
    };
    state.customers.push(customer);
  }

  // Update Customer Ledger Balances
  customer.totalJama += ext.paidAmount;
  customer.totalUdhaar += ext.udhaarAmount;
  customer.lastTransaction = new Date().toISOString().split('T')[0];
  if (customer.totalUdhaar > 0) customer.status = "pending";

  // Create Transaction Record
  const newTx = {
    id: `tx-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.name,
    type: ext.udhaarAmount > 0 ? "credit_debit" : "paid",
    paidAmount: ext.paidAmount,
    jamaCash: ext.paidAmount,
    udhaarAmount: ext.udhaarAmount,
    items: ext.items,
    dueDate: ext.dueDate,
    dueDateLabel: ext.dueDateLabel,
    transcript: ext.transcript,
    timestamp: Date.now()
  };

  state.transactions.unshift(newTx);
  saveState();
  if (typeof saveTransactionOffline === 'function') {
    saveTransactionOffline(newTx);
  }
  if (typeof syncWithCloud === 'function') {
    syncWithCloud();
  }

  // Play voice confirmation audio feedback
  if (typeof speakConfirmation === 'function') {
    speakConfirmation();
  }

  if (typeof showToast === 'function') {
    showToast(`Saved transaction for ${ext.customerName}!`, 'success');
  }

  // Reset Input & Extraction Container
  const inputEl = document.getElementById('transcriptInput');
  if (inputEl) inputEl.value = '';
  discardExtraction();

  // Re-render UI
  if (typeof renderAll === 'function') {
    renderAll();
  }
}

// Update field in current draft extraction
function updateExtField(key, value) {
  if (state.currentExtraction) {
    state.currentExtraction[key] = value;
    if (typeof showToast === 'function') {
      showToast(`Updated ${key}: ${value}`, 'info');
    }
  }
}

// Discard draft extraction
function discardExtraction() {
  state.currentExtraction = null;
  const container = document.getElementById('extractionContainer');
  if (container) container.style.display = 'none';
  if (typeof showToast === 'function') {
    showToast("Parsed voice note discarded", "info");
  }
}
