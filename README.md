# RozNama

RozNama is a smart voice-note ledger tailored for Bharat's local vendors and Kirana storekeepers. Speak naturally in Hindi, Hinglish, or regional languages to automatically log daily sales, track *udhaar* (credit), and send WhatsApp payment reminders.

## Architecture Migration: IndexedDB & Offline Sync Engine

We migrated RozNama's local persistence engine from synchronous `localStorage` to asynchronous **IndexedDB** with an automated **Offline Outbox Queue**. Synchronous `localStorage` was dropped because it carries a strict 5MB quota cap, cannot natively store raw voice audio recordings (BLOBs), and blocks the main UI thread during frequent JSON serialization.

By adopting IndexedDB, RozNama operates as a resilient local-first application capable of storing gigabytes of structured transactions and audio clips directly on the device. When working offline in low-connectivity markets, voice ledger entries are queued locally with `status: "pending_sync"`. The moment internet access is restored, an automated FIFO queue syncs all pending outbox items to the cloud backend seamlessly.
