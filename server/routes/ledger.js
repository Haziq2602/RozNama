const express = require('express');
const { dbQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all ledger endpoints
router.use(authenticateToken);

// Get all transactions for authenticated vendor
router.get('/transactions', async (req, res) => {
  try {
    const rows = await dbQuery.all(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC`,
      [req.user.userId]
    );

    const transactions = rows.map(r => ({
      id: r.client_id || String(r.id),
      customerName: r.customer_name,
      items: r.items || 'General Items',
      jamaCash: Number(r.jama_cash || 0),
      paidAmount: Number(r.jama_cash || 0),
      udhaarAmount: Number(r.udhaar_amount || 0),
      dueDate: r.due_date || '',
      dueDateLabel: r.due_date || (r.udhaar_amount > 0 ? 'Pending' : 'Settled'),
      rawTranscript: r.raw_transcript,
      timestamp: r.timestamp
    }));

    res.json({ transactions });
  } catch (err) {
    console.error('Fetch Transactions Error:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// Create single transaction
router.post('/transaction', async (req, res) => {
  try {
    const { id, customerName, items, jamaCash, paidAmount, udhaarAmount, dueDate, dueDateLabel, rawTranscript, timestamp } = req.body;

    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    const clientId = id ? String(id) : `tx_${Date.now()}`;
    const itemsStr = Array.isArray(items) ? items.join(', ') : (items || 'General Items');
    const cash = jamaCash !== undefined ? Number(jamaCash) : Number(paidAmount || 0);
    const udhaar = Number(udhaarAmount || 0);
    const ts = timestamp || Date.now();
    const due = dueDate || dueDateLabel || '';

    await dbQuery.run(
      `INSERT OR REPLACE INTO transactions 
        (client_id, user_id, customer_name, items, jama_cash, udhaar_amount, due_date, raw_transcript, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, req.user.userId, customerName, itemsStr, cash, udhaar, due, rawTranscript || '', ts]
    );

    res.status(201).json({
      message: 'Transaction saved to cloud!',
      transaction: {
        id: clientId,
        customerName,
        items: itemsStr,
        jamaCash: cash,
        paidAmount: cash,
        udhaarAmount: udhaar,
        dueDate: due,
        dueDateLabel: due || (udhaar > 0 ? 'Pending' : 'Settled'),
        rawTranscript: rawTranscript || '',
      }
    });

  } catch (err) {
    console.error('Save Transaction Error:', err);
    res.status(500).json({ error: 'Failed to save transaction.' });
  }
});

// Bulk sync client IndexedDB transactions with cloud database
router.post('/sync', async (req, res) => {
  try {
    const { transactions } = req.body;

    if (Array.isArray(transactions) && transactions.length > 0) {
      for (const tx of transactions) {
        const clientId = tx.id ? String(tx.id) : `tx_${Date.now()}_${Math.random()}`;
        const itemsStr = Array.isArray(tx.items) ? tx.items.join(', ') : (tx.items || 'General Items');
        const ts = tx.timestamp || Date.now();
        const cash = tx.jamaCash !== undefined ? Number(tx.jamaCash) : Number(tx.paidAmount || 0);
        const udhaar = Number(tx.udhaarAmount || 0);
        const due = tx.dueDate || tx.dueDateLabel || '';

        await dbQuery.run(
          `INSERT OR REPLACE INTO transactions 
            (client_id, user_id, customer_name, items, jama_cash, udhaar_amount, due_date, raw_transcript, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [clientId, req.user.userId, tx.customerName || 'Walk-in Customer', itemsStr, cash, udhaar, due, tx.rawTranscript || '', ts]
        );
      }
    }

    // Return combined merged transactions from server DB
    const rows = await dbQuery.all(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC`,
      [req.user.userId]
    );

    const mergedTransactions = rows.map(r => ({
      id: r.client_id || String(r.id),
      customerName: r.customer_name,
      items: r.items || 'General Items',
      jamaCash: Number(r.jama_cash || 0),
      paidAmount: Number(r.jama_cash || 0),
      udhaarAmount: Number(r.udhaar_amount || 0),
      dueDate: r.due_date || '',
      dueDateLabel: r.due_date || (r.udhaar_amount > 0 ? 'Pending' : 'Settled'),
      rawTranscript: r.raw_transcript,
      timestamp: r.timestamp
    }));

    res.json({
      message: 'Cloud sync successful!',
      syncedCount: mergedTransactions.length,
      transactions: mergedTransactions
    });

  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ error: 'Failed to sync transactions.' });
  }
});

module.exports = router;
