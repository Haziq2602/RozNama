// RozNama Intelligence Engine - Natural Language Parsing & Entity Extraction

// Toggle to switch between Groq LLM extraction and manual regex
const USE_AI_EXTRACTION = true;

// Helper to calculate exact date from transcript or spoken hint
function calculateDueDate(text, spokenHint) {
  const combined = `${text || ''} ${spokenHint || ''}`.toLowerCase();
  const today = new Date();
  
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (num) => {
    const d = new Date(today);
    d.setDate(d.getDate() + num);
    return d;
  };

  // 1. Day after tomorrow / parso
  if (combined.includes('day after tomorrow') || combined.includes('parso') || combined.includes('after tomorrow')) {
    const target = addDays(2);
    return {
      dueDate: formatYMD(target),
      dueDateLabel: 'Day after tomorrow'
    };
  }

  // 2. Tomorrow / kal
  if (combined.includes('tomorrow') || /\bkal\b/.test(combined)) {
    const target = addDays(1);
    return {
      dueDate: formatYMD(target),
      dueDateLabel: 'Tomorrow'
    };
  }

  // 3. "in X days" / "after X days" / "X din baad"
  const daysMatch = combined.match(/\b(?:in|after)?\s*(\d+)\s*(?:days?|din)\b/i);
  if (daysMatch && daysMatch[1]) {
    const n = parseInt(daysMatch[1], 10);
    if (n > 0 && n <= 365) {
      const target = addDays(n);
      return {
        dueDate: formatYMD(target),
        dueDateLabel: `In ${n} days`
      };
    }
  }

  // 4. "next week" / "agle hafte"
  if (combined.includes('next week') || combined.includes('agle hafte') || combined.includes('1 week')) {
    const target = addDays(7);
    return {
      dueDate: formatYMD(target),
      dueDateLabel: 'Next week'
    };
  }

  // 5. Specific weekdays
  const weekdays = [
    { names: ['sunday', 'itwar', 'ravivar'], dayIndex: 0 },
    { names: ['monday', 'somwar'], dayIndex: 1 },
    { names: ['tuesday', 'mangalwar'], dayIndex: 2 },
    { names: ['wednesday', 'budhwar'], dayIndex: 3 },
    { names: ['thursday', 'guruwar', 'veervar'], dayIndex: 4 },
    { names: ['friday', 'shukrawar', 'jumma'], dayIndex: 5 },
    { names: ['saturday', 'shaniwar'], dayIndex: 6 }
  ];

  for (const wd of weekdays) {
    if (wd.names.some(name => combined.includes(name))) {
      let diff = wd.dayIndex - today.getDay();
      if (diff <= 0) diff += 7;
      const target = addDays(diff);
      const capName = wd.names[0].charAt(0).toUpperCase() + wd.names[0].slice(1);
      return {
        dueDate: formatYMD(target),
        dueDateLabel: `Upcoming ${capName}`
      };
    }
  }

  // 6. Direct YYYY-MM-DD
  const directMatch = combined.match(/\b(20\d\d-\d{2}-\d{2})\b/);
  if (directMatch) {
    return {
      dueDate: directMatch[1],
      dueDateLabel: directMatch[1]
    };
  }

  // 7. Default if udhaar exists but no date spoken: Tomorrow
  const defaultTarget = addDays(1);
  return {
    dueDate: formatYMD(defaultTarget),
    dueDateLabel: 'Tomorrow (Default)'
  };
}

async function processTranscript(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return;

  const token = localStorage.getItem('roznama_jwt_token');

  // 1. ONLINE CLOUD AI PIPELINE: Groq LLM Extraction
  if (USE_AI_EXTRACTION && navigator.onLine && token) {
    try {
      if (typeof showToast === 'function') {
        showToast('Processing with Cloud AI...', 'info');
      }

      const aiUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/ai/extract' : '/api/ai/extract';
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transcript: rawText })
      });

      const data = await res.json();

      if (res.ok && data.success && data.extraction) {
        const ext = data.extraction;
        if (ext.udhaarAmount > 0) {
          const dateInfo = calculateDueDate(rawText, ext.dueDate);
          ext.dueDate = dateInfo.dueDate;
          ext.dueDateLabel = dateInfo.dueDateLabel;
        } else {
          ext.dueDate = '';
          ext.dueDateLabel = 'Settled';
        }

        // If category is not provided by backend, classify using offline ML
        if (!ext.category || ext.category === 'General Items') {
          const mlResult = classifyCategoryAndItemsOffline(rawText);
          ext.category = mlResult.category;
          if (!ext.items || ext.items === 'General Items') {
            ext.items = mlResult.items;
          }
        }

        ext.extractionMode = 'online';
        state.currentExtraction = ext;

        if (typeof renderExtractionCard === 'function') {
          renderExtractionCard();
        }
        if (typeof showToast === 'function') {
          showToast('Entry extracted via Cloud AI', 'success');
        }
        return;
      }
    } catch (err) {
      console.warn('Backend Cloud AI unavailable, switching to Predefined Offline ML Engine:', err);
    }
  }

  // 2. OFFLINE HYBRID PIPELINE: Predefined Offline Machine Learning Classifier & Extractor
  offlineMLExtraction(rawText);
}

// ============================================================================
// Offline Vernacular NLP Extraction Engine
// (Category & Item classification delegated to js/backend/classifier.js)
// ============================================================================

// Offline Context-Aware Amount Extractor (Jama Cash vs Udhaar Balance)
function extractAmountsOffline(rawText) {
  let text = (rawText || '').toLowerCase();

  // Convert common spoken Hindi number words to digits
  const hindiWordMap = [
    { regex: /\b(?:ek\s*sau|ek\s*so)\b/g, val: '100' },
    { regex: /\b(?:dedh\s*sau|dedh\s*so)\b/g, val: '150' },
    { regex: /\b(?:do\s*sau|do\s*so)\b/g, val: '200' },
    { regex: /\b(?:dhai\s*sau|dhai\s*so)\b/g, val: '250' },
    { regex: /\b(?:teen\s*sau|teen\s*so)\b/g, val: '300' },
    { regex: /\b(?:char\s*sau|char\s*so)\b/g, val: '400' },
    { regex: /\b(?:paanch\s*sau|panch\s*sau|panch\s*so)\b/g, val: '500' },
    { regex: /\b(?:hazaar|hazar)\b/g, val: '1000' }
  ];
  for (const h of hindiWordMap) {
    text = text.replace(h.regex, h.val);
  }

  const clauses = text.split(/\b(?:but|and|aur|par|then|lekin|,|\.)\b/);

  let paidAmount = 0;
  let udhaarAmount = 0;

  const paidKeywords = ['paid', 'gave', 'cash', 'diye', 'diya', 'mila', 'received', 'jama', 'pay', 'advance', 'bhugtan'];
  const udhaarKeywords = ['udhaar', 'udhar', 'credit', 'give', 'clear', 'remaining', 'baki', 'baaki', 'due', 'kal', 'tomorrow', 'parso', 'day after tomorrow', 'will pay', 'will give', 'likh lo', 'khate me', 'dega', 'denge'];

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
  } else if (allNumbers.length === 1 && paidAmount === 0 && udhaarAmount === 0) {
    const singleNum = allNumbers[0];
    if (udhaarKeywords.some(kw => text.includes(kw))) {
      udhaarAmount = singleNum;
    } else {
      paidAmount = singleNum;
    }
  }

  return { paidAmount, udhaarAmount };
}

// Offline Customer Name Extractor
function extractCustomerNameOffline(rawText) {
  const text = (rawText || '').toLowerCase();
  const stopWords = ['will', 'is', 'has', 'paid', 'gave', 'gives', 'give', 'the', 'a', 'an', 'ji', 'ne', 'se', 'ko', 'ka', 'ki', 'he', 'she', 'they', 'buys', 'purchased', 'bought', 'bhai', 'seth', 'uncle', 'aunty'];

  // 1. Check known registered store customers in state
  if (state.customers && state.customers.length > 0) {
    const knownCustomer = state.customers.find(c => {
      const firstName = (c.name || '').toLowerCase().split(' ')[0];
      return firstName.length > 2 && text.includes(firstName);
    });
    if (knownCustomer) {
      return knownCustomer.name;
    }
  }

  // 2. Try Regex pattern at beginning of utterance
  const nameMatch = rawText.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/i);
  if (nameMatch && nameMatch[1]) {
    const parts = nameMatch[1].split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
    if (parts.length > 0) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
  }

  // 3. Common Indian Name Fallbacks
  if (text.includes("rahul")) return "Rahul Sharma";
  if (text.includes("ramesh")) return "Ramesh Sharma";
  if (text.includes("ramish")) return "Ramish Khan";
  if (text.includes("priya")) return "Priya Verma";
  if (text.includes("amit")) return "Amit Kumar";
  if (text.includes("sunita")) return "Sunita Gupta";
  if (text.includes("suresh")) return "Suresh Kumar";
  if (text.includes("vikram")) return "Vikram Singh";
  if (text.includes("mohit")) return "Mohit Patel";

  return "Walk-in Customer";
}

// Offline Machine Learning Full Extraction Handler
function offlineMLExtraction(rawText) {
  // 1. Context-Aware Amount Extraction
  const { paidAmount, udhaarAmount } = extractAmountsOffline(rawText);

  // 2. Customer Name Extraction
  const customerName = extractCustomerNameOffline(rawText);

  // 3. Predefined ML Category & Items Classification
  const { category, items } = classifyCategoryAndItemsOffline(rawText);

  // 4. Exact Relative Due Date Calculation
  let formattedDueDate = null;
  let dueDateLabel = "Settled";

  if (udhaarAmount > 0) {
    const dateInfo = calculateDueDate(rawText);
    formattedDueDate = dateInfo.dueDate;
    dueDateLabel = dateInfo.dueDateLabel;
  }

  // 5. Store in State with Extraction Mode
  state.currentExtraction = {
    customerName,
    paidAmount,
    udhaarAmount,
    items,
    category,
    dueDate: formattedDueDate,
    dueDateLabel,
    transcript: rawText,
    extractionMode: 'offline_ml'
  };

  // 6. Trigger UI Extraction Review Card
  if (typeof renderExtractionCard === 'function') {
    renderExtractionCard();
  }

  if (typeof showToast === 'function') {
    showToast('⚡ Extracted locally via Predefined ML Engine', 'info');
  }
}
