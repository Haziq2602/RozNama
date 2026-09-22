const express = require('express');
const { dbService } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all ledger endpoints
router.use(authenticateToken);

// Get all transactions for authenticated vendor
router.get('/transactions', async (req, res) => {
  try {
    const rows = await dbService.getTransactions(req.user.userId);

    const transactions = rows.map(r => {
      const isSettlement = (r.items && (r.items.toLowerCase().includes('settlement') || r.items.toLowerCase().includes('clear due'))) ||
                           (r.raw_transcript && (r.raw_transcript.toLowerCase().includes('clear udhaar') || r.raw_transcript.toLowerCase().includes('chukta')));
      return {
        id: r.client_id || String(r.id),
        customerName: r.customer_name,
        items: r.items || 'General Items',
        type: isSettlement ? 'settlement' : (Number(r.udhaar_amount || 0) > 0 ? 'credit_debit' : 'paid'),
        isSettlement: isSettlement,
        settledAmount: isSettlement ? Number(r.jama_cash || 0) : 0,
        jamaCash: Number(r.jama_cash || 0),
        paidAmount: Number(r.jama_cash || 0),
        udhaarAmount: Number(r.udhaar_amount || 0),
        dueDate: r.due_date || '',
        dueDateLabel: r.due_date || (Number(r.udhaar_amount || 0) > 0 ? 'Pending' : 'Settled'),
        rawTranscript: r.raw_transcript,
        transcript: r.raw_transcript,
        timestamp: Number(r.timestamp)
      };
    });

    res.json({ transactions });
  } catch (err) {
    console.error('Fetch Transactions Error:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// Create single transaction
router.post('/transaction', async (req, res) => {
  try {
    const { id, customerName, items, jamaCash, paidAmount, udhaarAmount, dueDate, dueDateLabel, rawTranscript, transcript, timestamp } = req.body;

    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    const clientId = id ? String(id) : `tx_${Date.now()}`;
    const itemsStr = Array.isArray(items) ? items.join(', ') : (items || 'General Items');
    const cash = jamaCash !== undefined ? Number(jamaCash) : Number(paidAmount || 0);
    const udhaar = Number(udhaarAmount || 0);
    const ts = timestamp || Date.now();
    const due = dueDate || dueDateLabel || '';
    const raw = rawTranscript || transcript || '';

    await dbService.upsertTransaction({
      clientId,
      userId: req.user.userId,
      customerName,
      items: itemsStr,
      jamaCash: cash,
      udhaarAmount: udhaar,
      dueDate: due,
      rawTranscript: raw,
      timestamp: ts
    });

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
        rawTranscript: raw,
        transcript: raw,
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
        const raw = tx.rawTranscript || tx.transcript || '';

        await dbService.upsertTransaction({
          clientId,
          userId: req.user.userId,
          customerName: tx.customerName || 'Walk-in Customer',
          items: itemsStr,
          jamaCash: cash,
          udhaarAmount: udhaar,
          dueDate: due,
          rawTranscript: raw,
          timestamp: ts
        });
      }
    }

    // Return combined merged transactions from cloud/local DB
    const rows = await dbService.getTransactions(req.user.userId);

    const mergedTransactions = rows.map(r => {
      const isSettlement = (r.items && (r.items.toLowerCase().includes('settlement') || r.items.toLowerCase().includes('clear due'))) ||
                           (r.raw_transcript && (r.raw_transcript.toLowerCase().includes('clear udhaar') || r.raw_transcript.toLowerCase().includes('chukta')));
      return {
        id: r.client_id || String(r.id),
        customerName: r.customer_name,
        items: r.items || 'General Items',
        type: isSettlement ? 'settlement' : (Number(r.udhaar_amount || 0) > 0 ? 'credit_debit' : 'paid'),
        isSettlement: isSettlement,
        settledAmount: isSettlement ? Number(r.jama_cash || 0) : 0,
        jamaCash: Number(r.jama_cash || 0),
        paidAmount: Number(r.jama_cash || 0),
        udhaarAmount: Number(r.udhaar_amount || 0),
        dueDate: r.due_date || '',
        dueDateLabel: r.due_date || (Number(r.udhaar_amount || 0) > 0 ? 'Pending' : 'Settled'),
        rawTranscript: r.raw_transcript,
        transcript: r.raw_transcript,
        timestamp: Number(r.timestamp)
      };
    });

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
