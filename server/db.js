const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. Supabase Cloud Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('your-project-id') &&
  !SUPABASE_KEY.includes('your-supabase')
);

let supabase = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log('⚡ Connected to Supabase Cloud Database at:', SUPABASE_URL);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
}

// 2. Local SQLite Fallback Setup
const dbPath = path.resolve(__dirname, 'roznama.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else if (!isSupabaseConfigured) {
    console.log('ℹ️ Supabase credentials not set in .env; Connected to local SQLite at:', dbPath);
  }
});

// Initialize SQLite schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      store_name TEXT DEFAULT 'Kirana Store',
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      items TEXT DEFAULT '',
      jama_cash REAL DEFAULT 0,
      udhaar_amount REAL DEFAULT 0,
      due_date TEXT DEFAULT '',
      raw_transcript TEXT DEFAULT '',
      timestamp INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, client_id)
    )
  `);
});

// Promisified SQLite Query Helpers
const dbQuery = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

// 3. Unified Database Service (Supabase first with transparent SQLite fallback)
const dbService = {
  isSupabase: () => isSupabaseConfigured && supabase !== null,

  async getUserByPhone(phone) {
    if (this.isSupabase()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return dbQuery.get('SELECT * FROM users WHERE phone = ?', [phone]);
  },

  async getUserById(id) {
    if (this.isSupabase()) {
      const { data, error } = await supabase
        .from('users')
        .select('id, phone, name, store_name, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return dbQuery.get('SELECT id, phone, name, store_name, created_at FROM users WHERE id = ?', [id]);
  },

  async createUser({ phone, name, storeName, passwordHash }) {
    if (this.isSupabase()) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone,
          name,
          store_name: storeName || 'Kirana Store',
          password_hash: passwordHash
        })
        .select('id, phone, name, store_name')
        .single();
      if (error) throw error;
      return data;
    }
    const result = await dbQuery.run(
      'INSERT INTO users (phone, name, store_name, password_hash) VALUES (?, ?, ?, ?)',
      [phone, name, storeName || 'Kirana Store', passwordHash]
    );
    return {
      id: result.lastID,
      phone,
      name,
      store_name: storeName || 'Kirana Store'
    };
  },

  async getTransactions(userId) {
    if (this.isSupabase()) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return dbQuery.all(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );
  },

  async upsertTransaction({ clientId, userId, customerName, items, jamaCash, udhaarAmount, dueDate, rawTranscript, timestamp }) {
    if (this.isSupabase()) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(
          {
            client_id: clientId,
            user_id: userId,
            customer_name: customerName,
            items: items || '',
            jama_cash: Number(jamaCash || 0),
            udhaar_amount: Number(udhaarAmount || 0),
            due_date: dueDate || '',
            raw_transcript: rawTranscript || '',
            timestamp: Number(timestamp || Date.now())
          },
          { onConflict: 'user_id, client_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    await dbQuery.run(
      `INSERT OR REPLACE INTO transactions 
        (client_id, user_id, customer_name, items, jama_cash, udhaar_amount, due_date, raw_transcript, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, userId, customerName, items || '', Number(jamaCash || 0), Number(udhaarAmount || 0), dueDate || '', rawTranscript || '', Number(timestamp || Date.now())]
    );

    return {
      client_id: clientId,
      user_id: userId,
      customer_name: customerName,
      items: items || '',
      jama_cash: Number(jamaCash || 0),
      udhaar_amount: Number(udhaarAmount || 0),
      due_date: dueDate || '',
      raw_transcript: rawTranscript || '',
      timestamp: Number(timestamp || Date.now())
    };
  },

  async deleteTransaction(clientId, userId) {
    if (this.isSupabase()) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const result = await dbQuery.run(
      'DELETE FROM transactions WHERE client_id = ? AND user_id = ?',
      [clientId, userId]
    );
    return result.changes > 0;
  }
};

module.exports = { db, dbQuery, supabase, isSupabaseConfigured, dbService };
