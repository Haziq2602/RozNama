// RozNama Intelligence Engine - Natural Language Parsing & Entity Extraction

function processTranscript(rawText) {
  if (!rawText || typeof rawText !== 'string') return;
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

  // 4. Relative Date Calculation
  const anchorDate = typeof TODAY_DATE !== 'undefined' ? TODAY_DATE : new Date();
  let targetDate = new Date(anchorDate);
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
