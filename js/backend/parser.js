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

  if (USE_AI_EXTRACTION && navigator.onLine) {
    try {
      if (typeof showToast === 'function') {
        showToast('Processing voice note...', 'info');
      }

      const aiUrl = window.location.protocol === 'file:' ? 'http://localhost:5000/api/ai/extract' : '/api/ai/extract';
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ transcript: rawText })
      });

      const data = await res.json();

      if (res.ok && data.success && data.extraction) {
        // Guarantee date calculation and tomorrow default if udhaar > 0
        const ext = data.extraction;
        if (ext.udhaarAmount > 0) {
          const dateInfo = calculateDueDate(rawText, ext.dueDate);
          ext.dueDate = dateInfo.dueDate;
          ext.dueDateLabel = dateInfo.dueDateLabel;
        } else {
          ext.dueDate = '';
          ext.dueDateLabel = 'Settled';
        }

        state.currentExtraction = ext;
        if (typeof renderExtractionCard === 'function') {
          renderExtractionCard();
        }
        if (typeof showToast === 'function') {
          showToast('Entry recorded successfully', 'success');
        }
        return;
      }
    } catch (err) {
      console.warn('Backend extraction unavailable, using local rules:', err);
    }
  }

  // Fallback to manual rule-based extraction
  manualRuleBasedExtraction(rawText);
}

// Preserved Original Manual Rule-Based Parser (Offline Fallback)
function manualRuleBasedExtraction(rawText) {
  const text = rawText.toLowerCase();

  // Stop words to exclude from customer names
  const stopWords = ['will', 'is', 'has', 'paid', 'gave', 'gives', 'give', 'the', 'a', 'an', 'ji', 'ne', 'se', 'ko', 'ka', 'ki', 'he', 'she', 'they', 'buys', 'purchased', 'bought'];

  // 1. Customer Name Extraction
  let customerName = "Unknown Customer";

  // Check known customers first
  if (state.customers && state.customers.length > 0) {
    const knownCustomer = state.customers.find(c => {
      const firstName = c.name.toLowerCase().split(' ')[0];
      return text.includes(firstName);
    });

    if (knownCustomer) {
      customerName = knownCustomer.name;
    }
  }

  // If not matched to known customer, try regex extraction
  if (customerName === "Unknown Customer") {
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
  const clauses = text.split(/\b(?:but|and|aur|par|then|,|\.)\b/);
  
  let paidAmount = 0;
  let udhaarAmount = 0;

  const paidKeywords = ['paid', 'gave', 'cash', 'diye', 'mila', 'received', 'jama', 'pay'];
  const udhaarKeywords = ['udhaar', 'give', 'clear', 'remaining', 'baki', 'due', 'kal', 'tomorrow', 'parso', 'day after tomorrow', 'will pay', 'will give'];

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

  // 4. Exact Date Calculation (defaults to tomorrow if udhaar > 0 and no date spoken)
  let formattedDueDate = null;
  let dueDateLabel = "Settled";

  if (udhaarAmount > 0) {
    const dateInfo = calculateDueDate(text);
    formattedDueDate = dateInfo.dueDate;
    dueDateLabel = dateInfo.dueDateLabel;
  }

  // Set Extraction Result in State
  state.currentExtraction = {
    customerName,
    paidAmount,
    udhaarAmount,
    items,
    dueDate: formattedDueDate,
    dueDateLabel,
    transcript: rawText
  };

  // Trigger UI Extraction Card Render
  if (typeof renderExtractionCard === 'function') {
    renderExtractionCard();
  }
}
