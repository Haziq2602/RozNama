// ============================================================================
// RozNama Machine Learning Engine - Predefined Retail Classifier
// ============================================================================
// On-device feature-weighted retail category and item extraction model.
// Runs 100% locally in the browser with zero cloud or API dependency.

// Predefined Kirana Retail Category Feature Taxonomy
const PREDEFINED_ML_CATEGORIES = {
  "Groceries & Ration": [
    'grocery', 'groceries', 'rashan', 'ration', 'chawal', 'rice', 'atta', 'aata', 'wheat', 'gehu',
    'dal', 'daal', 'pulses', 'sugar', 'cheeni', 'chini', 'shakkar', 'namak', 'salt', 'besan',
    'maida', 'suji', 'sooji', 'poha', 'chana', 'rajma', 'moong', 'urad', 'masoor', 'toor', 'grain'
  ],
  "Dairy & Milk Products": [
    'doodh', 'dudh', 'milk', 'paneer', 'dahi', 'curd', 'butter', 'makkhan', 'makhan', 'bread',
    'chaas', 'chhas', 'lassi', 'cheese', 'eggs', 'ande', 'anda', 'malai'
  ],
  "Cooking Oils & Ghee": [
    'oil', 'tel', 'sarson', 'mustard', 'refined', 'refine', 'fortune', 'dhara', 'ghee', 'dalda', 'vanaspati'
  ],
  "Spices & Masala": [
    'masala', 'masale', 'mirch', 'mirchi', 'chili', 'haldi', 'turmeric', 'jeera', 'cumin', 'dhaniya',
    'coriander', 'garam masala', 'hing', 'rai', 'methi', 'tejpatta', 'elaichi', 'laung', 'kali mirch'
  ],
  "Snacks & Beverages": [
    'biscuit', 'biscuits', 'parle', 'oreo', 'namkeen', 'bhujia', 'chips', 'lays', 'kurkure',
    'chocolate', 'cadbury', 'toffee', 'maggi', 'maggie', 'noodles', 'chai', 'tea', 'coffee',
    'cold drink', 'coke', 'pepsi', 'frooti', 'juice', 'water bottle', 'snack'
  ],
  "Toiletries & Cleaning": [
    'soap', 'sabun', 'surf', 'detergent', 'rin', 'wheel', 'tide', 'aerial', 'vim', 'vimbar',
    'shampoo', 'clinic plus', 'sunsilk', 'colgate', 'toothpaste', 'brush', 'dettol', 'harpic',
    'phenyl', 'broom', 'cleaning', 'handwash'
  ],
  "Personal Care & Cosmetics": [
    'cream', 'fair lovely', 'glow lovely', 'powder', 'talc', 'boroplus', 'vaseline', 'lotion',
    'cosmetics', 'perfume', 'deo', 'hair oil', 'navratna', 'bajaj', 'coconut oil', 'nivea', 'shave'
  ]
};

// Item Keyword to Normalized Display Name Mapping
const PREDEFINED_ITEM_MAPPING = [
  { keywords: ['doodh', 'dudh', 'milk'], label: 'Doodh (Milk)' },
  { keywords: ['bread'], label: 'Bread' },
  { keywords: ['paneer'], label: 'Paneer' },
  { keywords: ['dahi', 'curd'], label: 'Dahi (Curd)' },
  { keywords: ['butter', 'makkhan', 'makhan'], label: 'Butter' },
  { keywords: ['ghee'], label: 'Desi Ghee' },
  { keywords: ['ande', 'anda', 'eggs'], label: 'Eggs' },
  { keywords: ['atta', 'aata', 'wheat', 'flour'], label: 'Atta (Flour)' },
  { keywords: ['chawal', 'rice'], label: 'Chawal (Rice)' },
  { keywords: ['dal', 'daal'], label: 'Dal (Pulses)' },
  { keywords: ['cheeni', 'chini', 'sugar'], label: 'Cheeni (Sugar)' },
  { keywords: ['tel', 'oil', 'refined'], label: 'Cooking Oil' },
  { keywords: ['sarson'], label: 'Mustard Oil' },
  { keywords: ['namak', 'salt'], label: 'Namak (Salt)' },
  { keywords: ['masala', 'masale'], label: 'Spices / Masale' },
  { keywords: ['haldi', 'turmeric'], label: 'Haldi' },
  { keywords: ['mirch', 'mirchi', 'chili'], label: 'Mirchi' },
  { keywords: ['biscuit', 'biscuits'], label: 'Biscuits' },
  { keywords: ['namkeen', 'bhujia'], label: 'Namkeen' },
  { keywords: ['chips', 'kurkure'], label: 'Chips & Snacks' },
  { keywords: ['maggi', 'maggie', 'noodles'], label: 'Maggi / Noodles' },
  { keywords: ['chai', 'tea'], label: 'Chai Patti (Tea)' },
  { keywords: ['coffee'], label: 'Coffee' },
  { keywords: ['sabun', 'soap'], label: 'Sabun (Soap)' },
  { keywords: ['surf', 'detergent'], label: 'Detergent / Surf' },
  { keywords: ['shampoo'], label: 'Shampoo' },
  { keywords: ['toothpaste', 'colgate'], label: 'Toothpaste' }
];

/**
 * Offline Machine Learning Classifier for Retail Category & Item Names
 * Evaluates term frequencies and feature weights across retail taxonomies.
 * 
 * @param {string} rawText The spoken or typed input text
 * @returns {{ category: string, items: string }} Extracted category and item labels
 */
function classifyCategoryAndItemsOffline(rawText) {
  const text = (rawText || '').toLowerCase();

  // 1. Extract Specific Items from Text
  const foundItems = [];
  for (const item of PREDEFINED_ITEM_MAPPING) {
    if (item.keywords.some(kw => text.includes(kw))) {
      foundItems.push(item.label);
    }
  }

  const itemsString = foundItems.length > 0 
    ? foundItems.join(', ') 
    : 'Kirana & General Items';

  // 2. Compute Likelihood Scores across Predefined Categories
  const scores = {};
  for (const [cat, keywords] of Object.entries(PREDEFINED_ML_CATEGORIES)) {
    scores[cat] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        // Boost score based on word length / specificity
        scores[cat] += kw.length > 4 ? 2 : 1;
      }
    }
  }

  // Find Category with Highest Score
  let bestCategory = "General Kirana / Khata";
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  return {
    category: bestCategory,
    items: itemsString
  };
}
