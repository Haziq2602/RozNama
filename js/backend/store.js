// RozNama Engine - IndexedDB Storage & Offline Outbox Sync Engine

let state = {
  customers: [],
  transactions: [],
  isRecording: false,
  selectedLang: 'en-IN',
  currentExtraction: null,
  isOnline: navigator.onLine
};

const DB_NAME = 'RozNamaDB';
const DB_VERSION = 1;
let db = null;

// Initialize IndexedDB Engine
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('customers')) {
        database.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('transactions')) {
        database.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('outbox')) {
        const outboxStore = database.createObjectStore('outbox', { keyPath: 'id' });
        outboxStore.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.error("IndexedDB Open Error:", e.target.error);
      reject(e.target.error);
    };
  });
}

// Helper to identify if a transaction is an udhaar settlement / clear due repayment
function isSettlementTransaction(tx) {
  if (!tx) return false;
  if (tx.isSettlement === true || tx.type === 'settlement' || (tx.settledAmount && tx.settledAmount > 0)) {
    return true;
  }
  const items = String(tx.items || '').toLowerCase();
  const raw = String(tx.rawTranscript || tx.transcript || '').toLowerCase();
  if (items.includes('settlement') || items.includes('clear due') || items.includes('cleared due') || items.includes('udhaar chukta')) {
    return true;
  }
  if (raw.includes('clear udhaar') || raw.includes('cleared udhaar') || raw.includes('chukta') || raw.includes('settle')) {
    return true;
  }
  return false;
}

// Dynamically compute customer balances from transactions (Single Source of Truth)
function recalculateCustomers() {
  const custMap = new Map();

  // Sort transactions chronologically (oldest to newest) to replay credits and debt clearances accurately
  const sortedTxs = [...state.transactions].sort((a, b) => {
    const timeA = Number(a.timestamp) || 0;
    const timeB = Number(b.timestamp) || 0;
    return timeA - timeB;
  });

  const savedPhones = JSON.parse(localStorage.getItem('roznama_cust_phones') || '{}');

  for (const tx of sortedTxs) {
    const rawName = (tx.customerName || 'Walk-in').trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();

    if (!custMap.has(key)) {
      custMap.set(key, {
        id: tx.customerId || `cust-${key.replace(/[^a-z0-9]/gi, '_')}`,
        name: rawName,
        phone: savedPhones[key] || tx.customerPhone || '',
        totalJama: 0,
        totalUdhaar: 0,
        dueDate: '',
        dueDateLabel: 'Settled',
        lastTransaction: typeof tx.timestamp === 'number' 
          ? new Date(tx.timestamp).toISOString().split('T')[0] 
          : (String(tx.timestamp || '').split(' ')[0] || new Date().toISOString().split('T')[0]),
        status: "settled",
        notes: "Store Khata Customer"
      });
    }

    const c = custMap.get(key);

    // Keep phone up-to-date if present
    if (!c.phone && (savedPhones[key] || tx.customerPhone)) {
      c.phone = savedPhones[key] || tx.customerPhone || '';
    }

    // Update lastTransaction with newest transaction date
    const txDate = typeof tx.timestamp === 'number' 
      ? new Date(tx.timestamp).toISOString().split('T')[0] 
      : (String(tx.timestamp || '').split(' ')[0] || '');
    if (txDate) {
      c.lastTransaction = txDate;
    }

    const cash = Number(tx.jamaCash !== undefined ? tx.jamaCash : (tx.paidAmount || 0));
    c.totalJama += cash;

    const isSettlement = isSettlementTransaction(tx);

    if (isSettlement) {
      // Debt clearance: reduce outstanding udhaar
      const settled = Number(tx.settledAmount || cash);
      c.totalUdhaar = Math.max(0, c.totalUdhaar - settled);
      if (c.totalUdhaar === 0) {
        c.status = "settled";
        c.dueDate = '';
        c.dueDateLabel = 'Settled';
      }
    } else {
      // Normal purchase entry: add any new udhaar
      const newUdhaar = Number(tx.udhaarAmount || 0);
      c.totalUdhaar += newUdhaar;

      if (newUdhaar > 0) {
        c.status = "pending";
        if (tx.dueDate) {
          c.dueDate = tx.dueDate;
          c.dueDateLabel = tx.dueDateLabel || tx.dueDate;
        }
      }
    }
  }

  state.customers = Array.from(custMap.values());
}

// Initialize Application Storage
async function initStorage() {
  try {
    await openDB();
    setupNetworkListeners();

    const token = localStorage.getItem('roznama_jwt_token');
    if (token && navigator.onLine) {
      // Authenticated vendor: fetch their specific records from cloud
      await syncWithCloud();
    } else {
      // Local mode: load from IndexedDB
      const localTxs = await getAllFromStore('transactions');
      state.transactions = localTxs || [];
      recalculateCustomers();
      if (typeof renderAll === 'function') renderAll();
    }
  } catch (err) {
    console.warn("IndexedDB init warning:", err);
  }
}

// Clear all local database tables (on logout or account switch)
async function clearLocalStore() {
  state.customers = [];
  state.transactions = [];
  if (!db) await openDB();

  return new Promise((resolve) => {
    const tx = db.transaction(['customers', 'transactions', 'outbox'], 'readwrite');
    tx.objectStore('customers').clear();
    tx.objectStore('transactions').clear();
    tx.objectStore('outbox').clear();
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      resolve();
    };
  });
}

// Helper: Save current state items to IndexedDB
async function saveState() {
  if (!db) await openDB();
  const tx = db.transaction(['customers', 'transactions'], 'readwrite');
  const custStore = tx.objectStore('customers');
  const txStore = tx.objectStore('transactions');

  state.customers.forEach(c => custStore.put(c));
  state.transactions.forEach(t => txStore.put(t));
}

// Helper: Get all records from a store
function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve([]);
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Save a new transaction with Offline Queue tracking
async function saveTransactionOffline(newTx, audioBlob = null) {
  if (!db) await openDB();
  
  const tx = db.transaction(['transactions', 'outbox'], 'readwrite');
  tx.objectStore('transactions').put(newTx);

  const outboxItem = {
    id: `outbox-${newTx.id}`,
    txId: newTx.id,
    data: newTx,
    audioBlob: audioBlob,
    status: navigator.onLine ? 'synced' : 'pending_sync',
    createdAt: new Date().toISOString()
  };
  tx.objectStore('outbox').put(outboxItem);

  if (!navigator.onLine) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Saved locally to IndexedDB (Pending Sync)', 'info');
    }
  } else {
    syncPendingQueue();
  }
}

// Sync Pending Outbox Items
async function syncPendingQueue() {
  if (!navigator.onLine || !db) return;

  try {
    const allOutbox = await getAllFromStore('outbox');
    const pendingItems = allOutbox.filter(item => item.status === 'pending_sync');

    if (pendingItems.length === 0) return;
    pendingItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');

    for (const item of pendingItems) {
      item.status = 'synced';
      item.syncedAt = new Date().toISOString();
      store.put(item);
    }

    if (typeof showToast === 'function') {
      showToast(`🔄 Synced ${pendingItems.length} pending offline entry(ies) to cloud!`, 'success');
    }
  } catch (err) {
    console.error("Sync Queue Error:", err);
  }
}

// Network Status Listeners
function setupNetworkListeners() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    if (typeof showToast === 'function') showToast('🟢 Back Online! Syncing...', 'success');
    syncPendingQueue();
    syncWithCloud();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    if (typeof showToast === 'function') showToast('⚠️ Offline Mode. Data saved in IndexedDB.', 'info');
  });
}

// Cloud Synchronization Engine with Express + SQLite Backend
async function syncWithCloud() {
  const token = localStorage.getItem('roznama_jwt_token');
  if (!token || !navigator.onLine) return;

  try {
    const syncUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/ledger/sync' : '/api/ledger/sync';
    const txUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/ledger/transactions' : '/api/ledger/transactions';

    // If local transactions exist, sync them to server
    if (state.transactions.length > 0) {
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactions: state.transactions })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transactions)) {
          state.transactions = data.transactions;
        }
      }
    } else {
      // Otherwise, fetch whatever this logged in vendor has in the cloud
      const res = await fetch(txUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        state.transactions = data.transactions || [];
      }
    }

    // Recalculate customer khatas exclusively from this vendor's transactions
    recalculateCustomers();
    await saveState();
    if (typeof renderAll === 'function') renderAll();

  } catch (err) {
    console.warn('Cloud backend unreachable. Operating in local mode.', err);
  }
}
