// RozNama Initial Demo Data & Sample Voice Presets

const INITIAL_CUSTOMERS = [
  {
    id: "cust-1",
    name: "Ramish Khan",
    phone: "+91 98765 43210",
    totalJama: 1200,
    totalUdhaar: 450,
    lastTransaction: "2026-09-05",
    status: "pending",
    notes: "Regular customer from Sector 4"
  },
  {
    id: "cust-2",
    name: "Suresh Sharma",
    phone: "+91 98123 45678",
    totalJama: 3400,
    totalUdhaar: 0,
    lastTransaction: "2026-09-04",
    status: "settled",
    notes: "Prefers UPI payments"
  },
  {
    id: "cust-3",
    name: "Priya Verma",
    phone: "+91 99887 76655",
    totalJama: 850,
    totalUdhaar: 300,
    lastTransaction: "2026-09-02",
    status: "pending",
    notes: "Lives near temple"
  },
  {
    id: "cust-4",
    name: "Sunita Gupta",
    phone: "+91 97654 32109",
    totalJama: 2100,
    totalUdhaar: 800,
    lastTransaction: "2026-09-01",
    status: "overdue",
    notes: "Promised payment by Sunday"
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: "tx-101",
    customerId: "cust-1",
    customerName: "Ramish Khan",
    type: "credit_debit",
    paidAmount: 500,
    udhaarAmount: 200,
    items: "Groceries & Spices",
    dueDate: "2026-09-08",
    dueDateLabel: "Day after tomorrow",
    transcript: "Ramish gave me 500 for the groceries he purchases and he will give me the remaining 200 the day after tomorrow",
    timestamp: "2026-09-06 10:30 AM"
  },
  {
    id: "tx-102",
    customerId: "cust-2",
    customerName: "Suresh Sharma",
    type: "paid",
    paidAmount: 650,
    udhaarAmount: 0,
    items: "Cooking Oil & Rice (5kg)",
    dueDate: null,
    dueDateLabel: "Full Payment",
    transcript: "Suresh paid 650 rupees full cash for oil and rice",
    timestamp: "2026-09-05 04:15 PM"
  },
  {
    id: "tx-103",
    customerId: "cust-3",
    customerName: "Priya Verma",
    type: "credit_debit",
    paidAmount: 200,
    udhaarAmount: 300,
    items: "Soaps, Shampoo & Detergent",
    dueDate: "2026-09-07",
    dueDateLabel: "Tomorrow",
    transcript: "Priya gave 200 rupees for soap detergent, 300 rupees udhaar due tomorrow",
    timestamp: "2026-09-04 06:45 PM"
  },
  {
    id: "tx-104",
    customerId: "cust-4",
    customerName: "Sunita Gupta",
    type: "credit_debit",
    paidAmount: 500,
    udhaarAmount: 800,
    items: "Monthly Ration Package",
    dueDate: "2026-09-05",
    dueDateLabel: "Overdue",
    transcript: "Sunita ji gave 500 cash for ration and 800 balance to pay by Sept 5",
    timestamp: "2026-09-01 11:20 AM"
  }
];

const SAMPLE_VOICE_PRESETS = [
  {
    id: "preset-1",
    title: "Ramish (Groceries & Udhaar)",
    lang: "en-IN",
    text: "Ramish gave me 500 for the groceries he purchases and he will give me the remaining 200 the day after tomorrow",
    category: "Partial Payment + Udhaar"
  },
  {
    id: "preset-2",
    title: "Ramesh (Hindi Doodh & Kal Udhaar)",
    lang: "hi-IN",
    text: "Ramesh ne 300 rupaye cash diye doodh ke liye aur 150 rupaye udhaar hai jo kal dega",
    category: "Hindi Mixed Payment"
  },
  {
    id: "preset-3",
    title: "Priya (Full Cash Payment)",
    lang: "en-IN",
    text: "Priya paid 1200 rupees full cash payment for cosmetics and ration",
    category: "Full Cash Settlement"
  },
  {
    id: "preset-4",
    title: "Amit (Pure Credit / Udhaar Entry)",
    lang: "hi-IN",
    text: "Amit ne 450 ka rashan liya hai pura udhaar baki hai agle hafte dega",
    category: "Full Udhaar Entry"
  }
];
