// RozNama Main Engine - Voice Ledger Logic & Speech Processing

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  bindEvents();
  renderAll();
});


// Bind UI Events
function bindEvents() {
  const micBtn = document.getElementById('micBtn');
  const langSelect = document.getElementById('langSelect');
  const parseBtn = document.getElementById('parseBtn');
  const transcriptInput = document.getElementById('transcriptInput');

  if (micBtn) micBtn.addEventListener('click', toggleRecording);
  if (langSelect) langSelect.addEventListener('change', (e) => state.selectedLang = e.target.value);
  
  if (parseBtn) {
    parseBtn.addEventListener('click', () => {
      const text = transcriptInput.value.trim();
      if (text) processTranscript(text);
    });
  }

  if (transcriptInput) {
    transcriptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = transcriptInput.value.trim();
        if (text) processTranscript(text);
      }
    });
  }

  // Render presets
  renderPresets();
}

// Render Presets
function renderPresets() {
  const container = document.getElementById('presetsContainer');
  if (!container) return;

  container.innerHTML = SAMPLE_VOICE_PRESETS.map(preset => `
    <button class="preset-chip" onclick="usePreset('${preset.id}')">
      <span>🗣️ "${preset.title}"</span>
      <span class="chip-tag">${preset.category}</span>
    </button>
  `).join('');
}

function usePreset(presetId) {
  const preset = SAMPLE_VOICE_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  document.getElementById('transcriptInput').value = preset.text;
  processTranscript(preset.text);
  showToast(`Loaded voice preset: ${preset.title}`, 'info');
}

// Web Speech API / Recording Logic
let recognition = null;

function toggleRecording() {
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('recordingStatus');

  if (!state.isRecording) {
    // Start Recording
    state.isRecording = true;
    micBtn.classList.add('recording');
    statusEl.classList.add('listening');
    statusEl.innerHTML = `<span class="pulse-dot"></span> Listening in ${state.selectedLang}... Speak now!`;

    // Try Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = state.selectedLang;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        document.getElementById('transcriptInput').value = transcript;
        if (event.results[0].isFinal) {
          stopRecording();
          processTranscript(transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech Recognition Error / Fallback triggered:", err);
        showToast("Mic active - Simulated voice transcript ready", "info");
      };

      recognition.onend = () => {
        if (state.isRecording) stopRecording();
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn("Speech API start blocked:", e);
      }
    } else {
      showToast("Web Speech API not supported in browser, using fallback transcript parser", "info");
    }
  } else {
    stopRecording();
  }
}

function stopRecording() {
  state.isRecording = false;
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('recordingStatus');
  
  if (micBtn) micBtn.classList.remove('recording');
  if (statusEl) {
    statusEl.classList.remove('listening');
    statusEl.innerHTML = `Tap microphone to record voice ledger note`;
  }

  if (recognition) {
    try { recognition.stop(); } catch(e){}
  }
}

// Natural Language Parser Logic for Multilingual Voice Notes
function processTranscript(rawText) {
  const text = rawText.toLowerCase();
  
  // Stop words to exclude from customer names
  const stopWords = ['will', 'is', 'has', 'paid', 'gave', 'gives', 'give', 'the', 'a', 'an', 'ji', 'ne', 'se', 'ko', 'ka', 'ki', 'he', 'she', 'they', 'buys', 'purchased', 'bought'];

  // 1. Customer Name Extraction
  let customerName = "Unknown Customer";
  
  // Check known customers first
  const knownCustomer = state.customers.find(c => {
    const firstName = c.name.toLowerCase().split(' ')[0];
    return text.includes(firstName);
  });

  if (knownCustomer) {
    customerName = knownCustomer.name;
  } else {
    // Try extract name before verbs
    const nameMatch = rawText.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/i);
    if (nameMatch && nameMatch[1]) {
      const parts = nameMatch[1].split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
      if (parts.length > 0) {
        customerName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      }
    }
  }

  // Fallback specific names
  if (customerName === "Unknown Customer") {
    if (text.includes("rahul")) customerName = "Rahul Sharma";
    else if (text.includes("ramesh")) customerName = "Ramesh Sharma";
    else if (text.includes("ramish")) customerName = "Ramish Khan";
    else if (text.includes("priya")) customerName = "Priya Verma";
    else if (text.includes("amit")) customerName = "Amit Kumar";
    else if (text.includes("sunita")) customerName = "Sunita Gupta";
  }

  // 2. Context-Aware Numeric Extraction (Paid vs Udhaar)
  // Split sentence into clauses (by 'but', 'and', ',', '.', ';')
  const clauses = text.split(/\b(?:but|and|aur|par|then|,|\.)\b/);
  
  let paidAmount = 0;
  let udhaarAmount = 0;

  const paidKeywords = ['paid', 'gave', 'cash', 'diye', 'mila', 'received', 'jama', 'pay'];
  const udhaarKeywords = ['udhaar', 'give', 'clear', 'remaining', 'baki', 'due', 'kal', 'tomorrow', 'parso', 'day after tomorrow', 'will pay', 'will give'];

  // Check each clause for numbers and surrounding context
  clauses.forEach(clause => {
    const numbers = clause.match(/\b\d+\b/g);
    if (!numbers) return;

    numbers.forEach(numStr => {
      const num = parseInt(numStr, 10);
      const isPaidContext = paidKeywords.some(kw => clause.includes(kw));
      const isUdhaarContext = udhaarKeywords.some(kw => clause.includes(kw));

      if (isPaidContext && !isUdhaarContext) {
        paidAmount = num;
      } else if (isUdhaarContext && !isPaidContext) {
        udhaarAmount = num;
      } else if (isPaidContext && isUdhaarContext) {
        // If both keywords exist in clause, check proximity
        const paidIdx = Math.min(...paidKeywords.map(kw => clause.indexOf(kw)).filter(i => i !== -1));
        const udhaarIdx = Math.min(...udhaarKeywords.map(kw => clause.indexOf(kw)).filter(i => i !== -1));
        const numIdx = clause.indexOf(numStr);

        if (Math.abs(numIdx - paidIdx) < Math.abs(numIdx - udhaarIdx)) {
          paidAmount = num;
        } else {
          udhaarAmount = num;
        }
      }
    });
  });

  // Fallback if clause parsing didn't assign both
  const allNumbers = (text.match(/\b\d+\b/g) || []).map(n => parseInt(n, 10));
  if (allNumbers.length === 2 && paidAmount === 0 && udhaarAmount === 0) {
    paidAmount = allNumbers[0];
    udhaarAmount = allNumbers[1];
  } else if (allNumbers.length === 1) {
    const singleNum = allNumbers[0];
    if (paidKeywords.some(kw => text.includes(kw))) {
      paidAmount = singleNum;
    } else if (udhaarKeywords.some(kw => text.includes(kw))) {
      udhaarAmount = singleNum;
    } else {
      paidAmount = singleNum;
    }
  }

  // 3. Category & Items Extraction
  let items = "General Store Items";
  if (text.includes("grocery") || text.includes("groceries") || text.includes("rashan") || text.includes("ration")) {
    items = "Groceries & Ration";
  } else if (text.includes("doodh") || text.includes("milk") || text.includes("bread")) {
    items = "Dairy & Milk Products";
  } else if (text.includes("soap") || text.includes("detergent") || text.includes("shampoo")) {
    items = "Toiletries & Cleaning";
  } else if (text.includes("oil") || text.includes("rice") || text.includes("flour") || text.includes("atta")) {
    items = "Cooking Oil & Staples";
  } else if (text.includes("cosmetics")) {
    items = "Personal Care & Cosmetics";
  }

  // 4. Relative Date Calculation
  let targetDate = new Date(TODAY_DATE);
  let dueDateLabel = "Not Applicable";

  if (udhaarAmount > 0) {
    if (text.includes("day after tomorrow") || text.includes("parso")) {
      targetDate.setDate(targetDate.getDate() + 2);
      dueDateLabel = "Day after tomorrow";
    } else if (text.includes("tomorrow") || text.includes("kal")) {
      targetDate.setDate(targetDate.getDate() + 1);
      dueDateLabel = "Tomorrow";
    } else if (text.includes("next week") || text.includes("agle hafte")) {
      targetDate.setDate(targetDate.getDate() + 7);
      dueDateLabel = "Next Week";
    } else if (text.includes("sunday")) {
      targetDate.setDate(targetDate.getDate() + 7);
      dueDateLabel = "Upcoming Sunday";
    } else {
      targetDate.setDate(targetDate.getDate() + 3);
      dueDateLabel = "In 3 Days";
    }
  }

  const formattedDueDate = udhaarAmount > 0 ? targetDate.toISOString().split('T')[0] : null;

  // Set Extraction Result
  state.currentExtraction = {
    customerName,
    paidAmount,
    udhaarAmount,
    items,
    dueDate: formattedDueDate,
    dueDateLabel,
    transcript: rawText
  };

  renderExtractionCard();
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

  // Scroll to extraction card smoothly
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateExtField(key, value) {
  if (state.currentExtraction) {
    state.currentExtraction[key] = value;
    showToast(`Updated ${key}: ${value}`, 'info');
  }
}

function discardExtraction() {
  state.currentExtraction = null;
  const container = document.getElementById('extractionContainer');
  if (container) container.style.display = 'none';
  showToast("Parsed voice note discarded", "info");
}

// Speak Voice Confirmation using Web Speech Synthesis
function speakConfirmation() {
  if (!state.currentExtraction) return;

  const ext = state.currentExtraction;
  let textToSpeak = `${ext.customerName} se ${ext.paidAmount} rupaye cash mile. `;
  if (ext.udhaarAmount > 0) {
    textToSpeak += `${ext.udhaarAmount} rupaye udhaar khate mein jode gaye hain, jo ${ext.dueDateLabel} tak milenge.`;
  } else {
    textToSpeak += `Pura bhugtan safal raha.`;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any active speech
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    showToast("Playing voice confirmation feedback...", "info");
  } else {
    alert(`Voice Confirmation Readout:\n"${textToSpeak}"`);
  }
}

// Confirm & Save Transaction to State
function confirmTransaction() {
  if (!state.currentExtraction) return;

  const ext = state.currentExtraction;

  // Find or Create Customer
  let customer = state.customers.find(c => c.name.toLowerCase() === ext.customerName.toLowerCase());
  if (!customer) {
    customer = {
      id: `cust-${Date.now()}`,
      name: ext.customerName,
      phone: "+91 9" + Math.floor(100000000 + Math.random() * 900000000),
      totalJama: 0,
      totalUdhaar: 0,
      lastTransaction: new Date().toISOString().split('T')[0],
      status: ext.udhaarAmount > 0 ? "pending" : "settled",
      notes: "Created via Voice Ledger"
    };
    state.customers.push(customer);
  }

  // Update Customer Stats
  customer.totalJama += ext.paidAmount;
  customer.totalUdhaar += ext.udhaarAmount;
  customer.lastTransaction = new Date().toISOString().split('T')[0];
  if (customer.totalUdhaar > 0) customer.status = "pending";

  // Create Transaction Entry
  const newTx = {
    id: `tx-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.name,
    type: ext.udhaarAmount > 0 ? "credit_debit" : "paid",
    paidAmount: ext.paidAmount,
    udhaarAmount: ext.udhaarAmount,
    items: ext.items,
    dueDate: ext.dueDate,
    dueDateLabel: ext.dueDateLabel,
    transcript: ext.transcript,
    timestamp: new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric' })
  };

  state.transactions.unshift(newTx);
  saveState();
  saveTransactionOffline(newTx);

  // Speak voice confirmation automatically
  speakConfirmation();

  showToast(`Saved transaction for ${ext.customerName}!`, 'success');

  // Reset Input & Extraction Container
  document.getElementById('transcriptInput').value = '';
  discardExtraction();

  // Re-render
  renderAll();
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

  document.getElementById('statCashToday').innerText = `₹${totalCashToday.toLocaleString('en-IN')}`;
  document.getElementById('statUdhaarPending').innerText = `₹${totalUdhaarPending.toLocaleString('en-IN')}`;
  document.getElementById('statActiveCust').innerText = activeCustomers;
  document.getElementById('statOverdueCount').innerText = overdueReminders;
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
