// RozNama Voice Helper Presets (No pre-loaded demo customers or demo transactions)

const INITIAL_CUSTOMERS = [];
const INITIAL_TRANSACTIONS = [];

// Sample speech test phrases that vendors can click to test voice transcription
const SAMPLE_VOICE_PRESETS = [
  {
    id: "preset-1",
    title: "Hindi Mixed Payment (Doodh & Udhaar)",
    lang: "hi-IN",
    text: "Ramesh ne 300 rupaye cash diye doodh ke liye aur 150 rupaye udhaar hai jo kal dega",
    category: "Cash + Udhaar"
  },
  {
    id: "preset-2",
    title: "English / Hinglish (Groceries & Due Date)",
    lang: "en-IN",
    text: "Sunil gave me 500 cash for groceries and 200 remaining day after tomorrow",
    category: "Partial Payment"
  },
  {
    id: "preset-3",
    title: "Full Cash Settlement (No Udhaar)",
    lang: "en-IN",
    text: "Pooja paid 1200 rupees full cash payment for ration",
    category: "Full Jama Cash"
  },
  {
    id: "preset-4",
    title: "Full Udhaar Credit Entry",
    lang: "hi-IN",
    text: "Amit ne 450 ka rashan liya hai pura udhaar baki hai agle hafte dega",
    category: "Full Credit / Udhaar"
  }
];
