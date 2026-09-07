// RozNama Engine - IndexedDB Storage & Offline Outbox Sync Engine

let state = {
  customers: [],
  transactions: [],
  isRecording: false,
  selectedLang: 'en-IN',
  currentExtraction: null,
  isOnline: navigator.onLine
};

const TODAY_DATE = new Date('2026-09-06T15:00:00');
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

// Initialize Application Storage
async function initStorage() {
  try {
    await openDB();
    const customers = await getAllFromStore('customers');
    const transactions = await getAllFromStore('transactions');

    if (customers.length > 0 || transactions.length > 0) {
      state.customers = customers;
      state.transactions = transactions;
    } else {
      // Check legacy localStorage or seed with initial demo data
      const storedCust = localStorage.getItem('roznama_customers');
      const storedTx = localStorage.getItem('roznama_transactions');
      if (storedCust && storedTx) {
        state.customers = JSON.parse(storedCust);
        state.transactions = JSON.parse(storedTx);
      } else if (typeof INITIAL_CUSTOMERS !== 'undefined') {
        state.customers = [...INITIAL_CUSTOMERS];
        state.transactions = [...INITIAL_TRANSACTIONS];
      }
      await saveState();
    }

    // Setup Network Listeners & Trigger initial sync if online
    setupNetworkListeners();
    if (navigator.onLine) {
      syncPendingQueue();
    }
  } catch (err) {
    console.warn("IndexedDB init fallback warning:", err);
  }
}

// Helper: Save all state items to IndexedDB
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
  
  // 1. Put into transactions store
  const tx = db.transaction(['transactions', 'outbox'], 'readwrite');
  tx.objectStore('transactions').put(newTx);

  // 2. Queue in outbox table
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

// Sync Pending Outbox Items when Internet Returns (FIFO)
async function syncPendingQueue() {
  if (!navigator.onLine || !db) return;

  try {
    const allOutbox = await getAllFromStore('outbox');
    const pendingItems = allOutbox.filter(item => item.status === 'pending_sync');

    if (pendingItems.length === 0) return;

    // Process FIFO (First In, First Out)
    pendingItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');

    for (const item of pendingItems) {
      // Simulate cloud backend sync / upload
      item.status = 'synced';
      item.syncedAt = new Date().toISOString();
      store.put(item);
    }

    if (typeof showToast === 'function') {
      showToast(`🔄 Auto-synced ${pendingItems.length} pending offline entry(ies) to cloud!`, 'success');
    }

    if (typeof renderAll === 'function') {
      renderAll();
    }
  } catch (err) {
    console.error("Sync Queue Error:", err);
  }
}

// Network Status Listeners
function setupNetworkListeners() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    if (typeof showToast === 'function') showToast('🟢 Back Online! Syncing offline queue...', 'success');
    syncPendingQueue();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    if (typeof showToast === 'function') showToast('⚠️ Offline Mode Activated. Data stored safely in IndexedDB.', 'info');
  });
}
