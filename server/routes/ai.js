const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protected AI extraction endpoint
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript text is required.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in server/.env',
        fallback: true
      });
    }

    const prompt = `You are a Kirana store voice ledger assistant for local shops in India.
Your task is to accurately extract financial ledger details from Hindi, Hinglish, or English voice notes.

Extract the following JSON fields:
- "customerName": Name of the customer (string). Default to "Walk-in Customer" if unmentioned.
- "jamaCash": Exact cash received RIGHT NOW (number). If full credit/no cash paid, return 0.
- "udhaarAmount": Pending debt/credit balance to be collected LATER (number). If full payment/no udhaar, return 0.
- "items": Comma-separated list of purchased items (string). E.g. "Chawal, Tel". Default to "General Kirana Items" if unspecified.
- "dueDate": Due date or relative day if promised (string, e.g. "tomorrow", "day after tomorrow", "next Monday", "2026-09-20", or "").

Rules:
1. Be extremely careful with Jama vs. Udhaar:
   - "500 diye 200 baki" -> jamaCash: 500, udhaarAmount: 200
   - "300 lene hai usne 100 diya" -> jamaCash: 100, udhaarAmount: 200
   - "pura udhaar hai 450" -> jamaCash: 0, udhaarAmount: 450
   - "400 pura cash hisab barabar" -> jamaCash: 400, udhaarAmount: 0
2. Return ONLY a valid JSON object matching this schema.

Transcript: "${transcript.trim()}"`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are an expert Indian Kirana store financial extractor. Return pure JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error response:', groqRes.status, errText);
      return res.status(502).json({ error: 'Groq API request failed', details: errText, fallback: true });
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(rawContent);

    // Normalize output
    const extracted = {
      customerName: parsed.customerName || 'Walk-in Customer',
      paidAmount: Number(parsed.jamaCash || 0),
      udhaarAmount: Number(parsed.udhaarAmount || 0),
      items: parsed.items || 'General Kirana Items',
      dueDate: parsed.dueDate || '',
      dueDateLabel: parsed.dueDate || (parsed.udhaarAmount > 0 ? 'Pending' : 'Settled'),
      transcript: transcript.trim()
    };

    res.json({ success: true, extraction: extracted });

  } catch (err) {
    console.error('AI Extraction Error:', err);
    res.status(500).json({ error: 'Failed to extract entities with AI.', fallback: true });
  }
});

// Native Non-Multer Audio Transcription with Groq Whisper Large v3
router.post('/transcribe', authenticateToken, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return res.status(503).json({ error: 'GROQ_API_KEY is not configured in server/.env', fallback: true });
    }

    // req.body contains raw audio bytes directly from express.raw()
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    const contentType = req.headers['content-type'] || 'audio/webm';
    const audioBlob = new Blob([req.body], { type: contentType });

    // Native FormData supported out-of-the-box in Node.js 18+
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio_note.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!whisperRes.ok) {
      const errDetail = await whisperRes.text();
      console.error('Whisper API error:', whisperRes.status, errDetail);
      return res.status(502).json({ error: 'Whisper transcription failed', details: errDetail, fallback: true });
    }

    const data = await whisperRes.json();
    const transcribedText = (data.text || '').trim();

    res.json({
      success: true,
      text: transcribedText,
      engine: 'groq-whisper-large-v3'
    });

  } catch (err) {
    console.error('Audio Transcription Error:', err);
    res.status(500).json({ error: 'Failed to transcribe audio with Whisper', fallback: true });
  }
});

module.exports = router;

