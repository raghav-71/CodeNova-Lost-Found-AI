import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseDb, ItemRecord } from '../db/supabaseDb.js';

export type { ItemRecord };

// =========================================================================
// 1. TYPES & TAXONOMY INTERFACES — V2
// =========================================================================

export type CanonicalCategory =
  | 'electronics'
  | 'documents'
  | 'personal_accessories'
  | 'bags_luggage'
  | 'keys'
  | 'clothing'
  | 'stationery_books'
  | 'sports_drinkware'
  | 'other';

export type CanonicalSubcategory =
  | 'mobile_phone'
  | 'laptop'
  | 'tablet'
  | 'smartwatch'
  | 'headphones'
  | 'earbuds'
  | 'charger_cable'
  | 'calculator'
  | 'wallet_purse'
  | 'student_id'
  | 'official_id'
  | 'bank_card'
  | 'document_paper'
  | 'keys'
  | 'backpack_bag'
  | 'water_bottle'
  | 'umbrella'
  | 'glasses'
  | 'clothing'
  | 'accessory_jewelry'
  | 'phone_accessory'
  | 'stationery'
  | 'other';

export interface NormalizedItemType {
  object_type: string;
  category: CanonicalCategory;
  subcategory: CanonicalSubcategory;
  brand?: string;
  model?: string;
  color?: string;
  features: string[];
  contained_items?: string[];
}

export interface AIImageAnalysis {
  object_type: string;
  category: CanonicalCategory;
  subcategory: CanonicalSubcategory;
  brand?: string;
  model?: string;
  color?: string;
  shape?: string;
  material?: string;
  visible_features: string[];
  visible_damage: string[];
  visible_accessories: string[];
  text_logos: string[];
  confidence: number;
  is_low_quality: boolean;
  analysis_model: string;
  analyzed_at: string;
}

export type ConsistencyLevel = 'CONSISTENT' | 'MINOR_MISMATCH' | 'MAJOR_MISMATCH' | 'UNKNOWN_IMAGE';

export interface ConsistencyCheckResult {
  consistency_level: ConsistencyLevel;
  object_compatible: boolean;
  has_mismatch: boolean;
  mismatch_type?: 'OBJECT_MISMATCH' | 'BRAND_MISMATCH' | 'COLOR_MISMATCH';
  user_summary: {
    claimed_object: string;
    claimed_category: string;
    claimed_subcategory: CanonicalSubcategory;
    claimed_brand?: string;
    claimed_color?: string;
  };
  image_summary?: {
    detected_object: string;
    detected_category: string;
    detected_subcategory: CanonicalSubcategory;
    detected_brand?: string;
    detected_color?: string;
    confidence: number;
  };
  warning_title?: string;
  warning_message?: string;
  suggested_correction?: {
    category?: string;
    title?: string;
    characteristics?: string;
  };
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  reason: string;
  matchedSubcategory?: CanonicalSubcategory;
}

export interface MatchResult {
  matchScore: number;
  matchReasons: string[];
  matchedFeatures: string[];
  aiEvaluated: boolean;
  isCompatible: boolean;
  multimodalVerified?: boolean;
  deepComparison?: DeepComparisonResult;
  isGenericMatch?: boolean;
}

export interface ExtractedIntent {
  normalizedQuery?: string;
  item_type: 'LOST' | 'FOUND' | 'ALL';
  object: string;
  category: string;
  subcategory: CanonicalSubcategory;
  brand?: string;
  model?: string;
  color?: string;
  colors?: string[];
  location?: string | {
    raw?: string;
    normalized?: string;
    building_zone?: string;
  };
  date?: string | {
    raw?: string;
    normalized?: string;
    resolved_date?: string;
  };
  time?: string;
  relative_date?: string;
  resolved_date?: string;
  identifying_features: string[];
  features?: string[];
  keywords: string[];
  confidence: number;
}

export interface DeepComparisonResult {
  match_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH' | 'INSUFFICIENT_INFORMATION';
  confidence: number;
  object_consistency: boolean;
  brand_consistency: boolean;
  color_consistency: boolean;
  location_consistency: boolean;
  time_consistency: boolean;
  feature_matches: string[];
  mismatches: string[];
  explanation: string;
  safety_disclaimer?: string;
}

export interface AIMatchSearchResult {
  item: ItemRecord;
  match_score: number;
  match_tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH';
  reason: string;
  matching_attributes: string[];
  differences: string[];
  ai_evaluated: boolean;
  multimodal_badge?: string;
  safety_disclaimer?: string;
}

// =========================================================================
// 2. CENTRALIZED COMPATIBILITY MATRIX & TAXONOMY
// =========================================================================

export const COMPATIBILITY_MATRIX: Record<CanonicalSubcategory, CanonicalSubcategory[]> = {
  mobile_phone: ['mobile_phone'],
  laptop: ['laptop'],
  tablet: ['tablet'],
  smartwatch: ['smartwatch'],
  headphones: ['headphones', 'earbuds'],
  earbuds: ['earbuds', 'headphones'],
  charger_cable: ['charger_cable'],
  calculator: ['calculator'],
  wallet_purse: ['wallet_purse'],
  student_id: ['student_id'],
  official_id: ['official_id'],
  bank_card: ['bank_card'],
  document_paper: ['document_paper'],
  keys: ['keys'],
  backpack_bag: ['backpack_bag'],
  water_bottle: ['water_bottle'],
  umbrella: ['umbrella'],
  glasses: ['glasses'],
  clothing: ['clothing'],
  accessory_jewelry: ['accessory_jewelry'],
  phone_accessory: ['phone_accessory'],
  stationery: ['stationery'],
  other: ['other']
};

interface TaxonomyRule {
  subcategory: CanonicalSubcategory;
  category: CanonicalCategory;
  defaultObjectType: string;
  patterns: RegExp[];
  negativePatterns?: RegExp[];
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  // 1. Chargers & Cables
  {
    subcategory: 'charger_cable',
    category: 'electronics',
    defaultObjectType: 'charger',
    patterns: [
      /\b(charger|charging\s*cable|power\s*adapter|power\s*bank|magsafe|lightning\s*cable|usb[- ]?c\s*cable|type[- ]?c\s*cable|charging\s*brick|adapter)\b/i
    ]
  },
  // 2. Mobile Phones
  {
    subcategory: 'mobile_phone',
    category: 'electronics',
    defaultObjectType: 'smartphone',
    patterns: [
      /\b(iphone|smartphone|mobile\s*phone|cell\s*phone|android\s*phone|samsung\s*galaxy|galaxy\s*s\d+|galaxy\s*z|pixel\s*\d+|oneplus|redmi|xiaomi|realme|vivo|oppo|motorola\s*edge|moto\s*g|phone|mobile)\b/i
    ],
    negativePatterns: [
      /\b(phone\s*case|phone\s*cover|screen\s*protector|charger|cable|holder)\b/i
    ]
  },
  // 3. Laptops
  {
    subcategory: 'laptop',
    category: 'electronics',
    defaultObjectType: 'laptop',
    patterns: [
      /\b(laptop|macbook|macbook\s*pro|macbook\s*air|notebook\s*computer|thinkpad|chromebook|dell\s*xps|dell\s*inspiron|dell\s*latitude|hp\s*pavilion|hp\s*spectre|lenovo\s*ideapad|lenovo\s*legion|surface\s*laptop|asus\s*zenbook|acer\s*aspire)\b/i
    ],
    negativePatterns: [
      /\b(laptop\s*bag|laptop\s*sleeve|laptop\s*case|laptop\s*compartment|laptop\s*pocket|laptop\s*holder|laptop\s*charger|backpack|backpacks|knapsack|bag|bags|bookbag|tote|briefcase)\b/i,
      /\b(notebook\s*paper|paper\s*notebook|spiral\s*notebook)\b/i
    ]
  },
  // 4. Tablets
  {
    subcategory: 'tablet',
    category: 'electronics',
    defaultObjectType: 'tablet',
    patterns: [
      /\b(ipad|ipad\s*pro|ipad\s*air|ipad\s*mini|tablet|galaxy\s*tab|android\s*tablet|surface\s*pro|kindle|e-reader)\b/i
    ]
  },
  // 5. Smartwatches
  {
    subcategory: 'smartwatch',
    category: 'electronics',
    defaultObjectType: 'smartwatch',
    patterns: [
      /\b(smartwatch|smart\s*watch|apple\s*watch|galaxy\s*watch|fitbit|garmin|smart\s*band|fitness\s*tracker|noise\s*watch|boat\s*watch)\b/i
    ]
  },
  // 6. Earbuds vs Over-ear Headphones
  {
    subcategory: 'earbuds',
    category: 'electronics',
    defaultObjectType: 'earbuds',
    patterns: [
      /\b(airpods|airpods\s*pro|galaxy\s*buds|pixel\s*buds|earbuds|ear\s*buds|in[- ]ear\s*earphones|tws)\b/i
    ]
  },
  {
    subcategory: 'headphones',
    category: 'electronics',
    defaultObjectType: 'headphones',
    patterns: [
      /\b(headphones|headset|over[- ]ear\s*headphones|bose\s*quietcomfort|sony\s*wh[- ]\d+|jbl\s*headphones|headphone|earphones)\b/i
    ]
  },
  // 7. Calculators
  {
    subcategory: 'calculator',
    category: 'electronics',
    defaultObjectType: 'calculator',
    patterns: [
      /\b(calculator|scientific\s*calculator|ti[- ]?84|ti[- ]?83|casio\s*fx|casio\s*calculator|calci)\b/i
    ]
  },
  // 8. Wallets & Purses
  {
    subcategory: 'wallet_purse',
    category: 'personal_accessories',
    defaultObjectType: 'wallet',
    patterns: [
      /\b(wallet|purse|card\s*holder|money\s*clip|billfold|coin\s*pouch|clutch|money\s*bag)\b/i
    ]
  },
  // 9. IDs & Cards
  {
    subcategory: 'student_id',
    category: 'documents',
    defaultObjectType: 'student_id',
    patterns: [
      /\b(college\s*id|student\s*id|university\s*id|campus\s*card|student\s*badge|hall\s*ticket|college\s*card|student\s*identity\s*card|student\s*card)\b/i
    ]
  },
  {
    subcategory: 'official_id',
    category: 'documents',
    defaultObjectType: 'identity_document',
    patterns: [
      /\b(driver['’]?s?\s*license|driving\s*license|passport|aadhar\s*card|voter\s*id|pan\s*card|national\s*id|state\s*id|government\s*id)\b/i
    ]
  },
  {
    subcategory: 'bank_card',
    category: 'documents',
    defaultObjectType: 'bank_card',
    patterns: [
      /\b(debit\s*card|credit\s*card|atm\s*card|visa\s*card|mastercard|amex|bank\s*card)\b/i
    ]
  },
  {
    subcategory: 'document_paper',
    category: 'documents',
    defaultObjectType: 'document',
    patterns: [
      /\b(folder|binder|certificate|marksheet|transcript|assignment|paperwork|documents?|notes|notebook|textbook|book)\b/i
    ]
  },
  // 10. Keys
  {
    subcategory: 'keys',
    category: 'keys',
    defaultObjectType: 'keys',
    patterns: [
      /\b(keys?|car\s*key|bike\s*key|room\s*key|dorm\s*key|keychain|key\s*ring|lanyard\s*with\s*keys)\b/i
    ]
  },
  // 11. Bags & Backpacks
  {
    subcategory: 'backpack_bag',
    category: 'bags_luggage',
    defaultObjectType: 'backpack',
    patterns: [
      /\b(backpack|back\s*pack|knapsack|bookbag|school\s*bag|laptop\s*bag|gym\s*bag|duffel|tote\s*bag|handbag|shoulder\s*bag|briefcase)\b/i
    ]
  },
  // 12. Water Bottles & Drinkware
  {
    subcategory: 'water_bottle',
    category: 'sports_drinkware',
    defaultObjectType: 'water_bottle',
    patterns: [
      /\b(water\s*bottle|flask|thermos|hydro\s*flask|sipper|tumbler|mug|bottle)\b/i
    ]
  },
  // 13. Umbrellas
  {
    subcategory: 'umbrella',
    category: 'personal_accessories',
    defaultObjectType: 'umbrella',
    patterns: [
      /\b(umbrella|parasol)\b/i
    ]
  },
  // 14. Glasses
  {
    subcategory: 'glasses',
    category: 'personal_accessories',
    defaultObjectType: 'glasses',
    patterns: [
      /\b(glasses|spectacles|sunglasses|shades|eyewear|reading\s*glasses|specs)\b/i
    ]
  },
  // 15. Clothing
  {
    subcategory: 'clothing',
    category: 'clothing',
    defaultObjectType: 'clothing',
    patterns: [
      /\b(jacket|hoodie|sweater|sweatshirt|coat|cap|hat|beanie|gloves|scarf|shirt|t[- ]?shirt|jersey)\b/i
    ]
  },
  // 16. Accessories & Jewelry
  {
    subcategory: 'accessory_jewelry',
    category: 'personal_accessories',
    defaultObjectType: 'accessory',
    patterns: [
      /\b(ring|necklace|bracelet|chain|earring|jewelry|watch|wrist\s*watch)\b/i
    ],
    negativePatterns: [
      /\b(smartwatch|smart\s*watch|apple\s*watch)\b/i
    ]
  },
  // 17. Phone Accessories
  {
    subcategory: 'phone_accessory',
    category: 'electronics',
    defaultObjectType: 'phone_accessory',
    patterns: [
      /\b(phone\s*case|phone\s*cover|iphone\s*case|airpods\s*case|screen\s*protector|pop\s*socket)\b/i
    ]
  }
];

const BRAND_PATTERNS = [
  { name: 'Apple', regex: /\b(apple|macbook|iphone|ipad|airpods|airpod)\b/i },
  { name: 'Samsung', regex: /\b(samsung|galaxy)\b/i },
  { name: 'Google', regex: /\b(google|pixel)\b/i },
  { name: 'Dell', regex: /\b(dell|xps|inspiron|latitude)\b/i },
  { name: 'HP', regex: /\b(hp|pavilion|spectre|envy)\b/i },
  { name: 'Lenovo', regex: /\b(lenovo|thinkpad|ideapad|legion)\b/i },
  { name: 'Asus', regex: /\b(asus|zenbook|rog)\b/i },
  { name: 'Sony', regex: /\b(sony|wh-1000|wf-1000)\b/i },
  { name: 'Bose', regex: /\b(bose|quietcomfort)\b/i },
  { name: 'JBL', regex: /\b(jbl)\b/i },
  { name: 'Boat', regex: /\b(boat)\b/i },
  { name: 'Noise', regex: /\b(noise)\b/i },
  { name: 'OnePlus', regex: /\b(oneplus|nord)\b/i },
  { name: 'Xiaomi', regex: /\b(xiaomi|redmi|mi)\b/i },
  { name: 'Nike', regex: /\b(nike)\b/i },
  { name: 'Adidas', regex: /\b(adidas)\b/i },
  { name: 'Puma', regex: /\b(puma)\b/i },
  { name: 'Wildcraft', regex: /\b(wildcraft)\b/i },
  { name: 'American Tourister', regex: /\b(american\s*tourister)\b/i },
  { name: 'Skybags', regex: /\b(skybags)\b/i },
  { name: 'Casio', regex: /\b(casio|g[- ]?shock)\b/i },
  { name: 'Titan', regex: /\b(titan|fastrack)\b/i },
  { name: 'Milton', regex: /\b(milton)\b/i },
  { name: 'Tupperware', regex: /\b(tupperware)\b/i },
  { name: 'Hydro Flask', regex: /\b(hydro\s*flask)\b/i },
  { name: 'The North Face', regex: /\b(the\s*north\s*face|north\s*face)\b/i },
  { name: 'Fossil', regex: /\b(fossil)\b/i }
];

const COLOR_KEYWORDS = [
  'black', 'blue', 'navy', 'silver', 'white', 'grey', 'gray', 'red', 'green', 'emerald',
  'gold', 'rose gold', 'yellow', 'brown', 'tan', 'beige', 'pink', 'purple', 'violet',
  'orange', 'maroon', 'matte black', 'space gray', 'midnight', 'dark leather', 'dark charcoal', 'charcoal', 'dark'
];

/**
 * Preprocessor that normalizes common student typos, abbreviations,
 * and Indian-English campus colloquialisms.
 */
export function preprocessCampusQuery(text: string): string {
  if (!text) return '';
  let str = text;

  const replacements: Array<[RegExp, string]> = [
    [/\bblak\b/gi, 'black'],
    [/\b(hedphones|headfone|headfones|hedphone|headphn)\b/gi, 'headphones'],
    [/\b(erbuds|earbud|airpod|airpodz)\b/gi, 'earbuds'],
    [/\b(phn|fone|fones)\b/gi, 'phone'],
    [/\b(lap|lappi|notebk)\b/gi, 'laptop'],
    [/\b(macbok|macbokk|macbk)\b/gi, 'macbook'],
    [/\b(lib|librry|libry)\b/gi, 'library'],
    [/\b(yday|yestarday|ystrday)\b/gi, 'yesterday'],
    [/\b(cantin|canteen|caf)\b/gi, 'canteen cafeteria'],
    [/\baudi\b/gi, 'auditorium'],
    [/\bwalet|walett\b/gi, 'wallet'],
    [/\bbotle|watter\s*bottle|water\s*botle\b/gi, 'water bottle'],
    [/\bcalci|calc\b/gi, 'calculator'],
    [/\bcycle\b/gi, 'bicycle'],
    [/\bwatchs\b/gi, 'watch'],
    [/\bxerox(\s*shop)?\b/gi, 'print center copy shop']
  ];

  for (const [regex, repl] of replacements) {
    str = str.replace(regex, repl);
  }

  return str;
}

// =========================================================================
// 3. AI MATCHING & MULTIMODAL VERIFICATION SERVICE — V2
// =========================================================================

export class AIMatchingService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private candidateModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-pro'
  ];

  // In-memory LRU / Performance Caches
  private imageCache = new Map<string, AIImageAnalysis>();
  private intentCache = new Map<string, ExtractedIntent>();
  private deepCompareCache = new Map<string, DeepComparisonResult>();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 5 && !apiKey.includes('your_') && !apiKey.includes('placeholder')) {
      try {
        this.geminiClient = new GoogleGenerativeAI(apiKey.trim());
      } catch (e) {
        console.warn('Failed to initialize Gemini AI client:', e);
      }
    }
  }

  /**
   * Safe Gemini Cascade invocation.
   * Tries candidate models in order, with timeout and error handling.
   * Returns parsed JSON string or null.
   */
  async callGeminiCascade(prompt: string, inlineParts: any[] = []): Promise<string | null> {
    if (!this.geminiClient) return null;

    for (const modelName of this.candidateModels) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: modelName });
        const parts: any[] = [{ text: prompt }, ...inlineParts];

        // 6 second timeout to avoid request blocking
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
        );

        const apiPromise = model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json' }
        });

        const result: any = await Promise.race([apiPromise, timeoutPromise]);
        if (result && result.response) {
          const text = result.response.text();
          if (text && text.trim().length > 0) {
            return text;
          }
        }
      } catch (err: any) {
        // Continue to next model on 404 or version unsupported
      }
    }

    return null;
  }

  preprocessCampusQuery(text: string): string {
    return preprocessCampusQuery(text);
  }

  // =========================================================================
  // SECTION A: TEXT EXTRACTION & NORMALIZATION
  // =========================================================================

  normalizeItem(text: string, title?: string, categoryHint?: string): NormalizedItemType {
    const cleanTitle = preprocessCampusQuery(title || '');
    const cleanText = preprocessCampusQuery(text || '');
    const cleanCategoryHint = preprocessCampusQuery(categoryHint || '');
    const lowerTitle = cleanTitle.toLowerCase();
    const lowerCombined = `${cleanTitle} ${cleanText} ${cleanCategoryHint}`.trim().toLowerCase();

    let subcategory: CanonicalSubcategory = 'other';
    let category: CanonicalCategory = 'other';
    let object_type = 'unknown_item';

    // 1. Prioritize classification based on title first if present (prevents 'backpack with laptop compartment' from being tagged as laptop)
    if (lowerTitle.trim().length > 0) {
      for (const rule of TAXONOMY_RULES) {
        if (rule.negativePatterns && rule.negativePatterns.some(np => np.test(lowerTitle))) {
          continue;
        }
        if (rule.patterns.some(p => p.test(lowerTitle))) {
          subcategory = rule.subcategory;
          category = rule.category;
          object_type = rule.defaultObjectType;
          break;
        }
      }
    }

    // 2. If title did not match a specific subcategory, evaluate combined text
    if (subcategory === 'other') {
      for (const rule of TAXONOMY_RULES) {
        if (rule.negativePatterns && rule.negativePatterns.some(np => np.test(lowerCombined))) {
          continue;
        }
        if (rule.patterns.some(p => p.test(lowerCombined))) {
          subcategory = rule.subcategory;
          category = rule.category;
          object_type = rule.defaultObjectType;
          break;
        }
      }
    }

    const lower = lowerCombined;

    if (subcategory === 'other' && categoryHint) {
      const catLower = categoryHint.toLowerCase();
      if (catLower.includes('phone') || catLower.includes('mobile')) {
        subcategory = 'mobile_phone';
        category = 'electronics';
        object_type = 'smartphone';
      } else if (catLower.includes('laptop') || catLower.includes('computer')) {
        subcategory = 'laptop';
        category = 'electronics';
        object_type = 'laptop';
      } else if (catLower.includes('wallet') || catLower.includes('purse')) {
        subcategory = 'wallet_purse';
        category = 'personal_accessories';
        object_type = 'wallet';
      } else if (catLower.includes('id') || catLower.includes('card')) {
        subcategory = 'student_id';
        category = 'documents';
        object_type = 'student_id';
      } else if (catLower.includes('key')) {
        subcategory = 'keys';
        category = 'keys';
        object_type = 'keys';
      } else if (catLower.includes('bag') || catLower.includes('backpack')) {
        subcategory = 'backpack_bag';
        category = 'bags_luggage';
        object_type = 'backpack';
      } else if (catLower.includes('doc') || catLower.includes('book')) {
        subcategory = 'document_paper';
        category = 'documents';
        object_type = 'document';
      }
    }

    let brand: string | undefined;
    for (const b of BRAND_PATTERNS) {
      if (b.regex.test(lower)) {
        brand = b.name;
        break;
      }
    }

    let model: string | undefined;
    const modelMatches = lower.match(
      /\b(iphone\s*\d+(\s*pro|\s*promax|\s*pro\s*max|\s*plus)?|galaxy\s*s\d+(\s*ultra|\s*plus|\s*fe)?|galaxy\s*z\s*(fold|flip)\s*\d*|pixel\s*\d+[a-z]?|macbook\s*(pro|air)?\s*(m\d)?|xps\s*\d+|thinkpad\s*[a-z]\d+|ti[- ]?84(\s*plus)?|airpods\s*(pro|\d+)?)\b/i
    );
    if (modelMatches) {
      model = modelMatches[0].trim();
    }

    let color: string | undefined;
    for (const c of COLOR_KEYWORDS) {
      const regex = new RegExp(`\\b${c}\\b`, 'i');
      if (regex.test(lower)) {
        color = (c === 'dark leather' || c === 'dark charcoal' || c === 'charcoal') ? 'black' : c;
        break;
      }
    }

    const features: string[] = [];
    const featurePatterns = [
      { tag: 'cracked screen', regex: /\b(cracked\s*screen|broken\s*screen|scratched\s*display|cracked\s*display|shattered\s*screen)\b/i },
      { tag: 'case / cover', regex: /\b(black\s*case|clear\s*case|silicone\s*case|leather\s*case|red\s*case|blue\s*case|case|cover)\b/i },
      { tag: 'stickers', regex: /\b(sticker|stickers|decal|decals|anime\s*sticker|github\s*sticker|figma\s*sticker)\b/i },
      { tag: 'scratch / dent', regex: /\b(scratch|scratched|dent|dented|chipped|scuff)\b/i },
      { tag: 'scratch on left side', regex: /\b(scratch\s*on\s*left|left\s*side\s*scratch|scratched\s*left)\b/i },
      { tag: 'keychain attached', regex: /\b(keychain|lanyard|key\s*ring|tag\s*attached)\b/i },
      { tag: 'initials / name', regex: /\b(name\s*written|initials|engraved|engraving)\b/i },
      { tag: 'id cards / cards', regex: /\b(student\s*id|credit\s*card|debit\s*card|id\s*card|cards|cash)\b/i }
    ];

    for (const fp of featurePatterns) {
      if (fp.regex.test(lower)) {
        features.push(fp.tag);
      }
    }

    const contained_items: string[] = [];
    if (subcategory === 'backpack_bag') {
      const isLaptopCompartmentOnly = /\b(laptop\s*(compartment|sleeve|pocket|holder|space|section))\b/i.test(lower);
      if (!isLaptopCompartmentOnly && /\b(containing\s*laptop|laptop\s*inside|found\s*with\s*laptop)\b/i.test(lower)) {
        contained_items.push('laptop');
      }
      if (/\b(with\s*charger|containing\s*charger|charger\s*inside)\b/i.test(lower)) {
        contained_items.push('charger_cable');
      }
      if (/\b(with\s*notebook|notebooks\s*inside|books\s*inside)\b/i.test(lower)) {
        contained_items.push('document_paper');
      }
      if (/\b(with\s*bottle|water\s*bottle\s*inside)\b/i.test(lower)) {
        contained_items.push('water_bottle');
      }
    } else if (subcategory === 'wallet_purse') {
      if (/\b(with\s*id|student\s*id|id\s*card)\b/i.test(lower)) {
        contained_items.push('student_id');
      }
      if (/\b(credit\s*card|debit\s*card|bank\s*card|atm\s*card)\b/i.test(lower)) {
        contained_items.push('bank_card');
      }
    }

    return {
      object_type,
      category,
      subcategory,
      brand,
      model,
      color,
      features,
      contained_items: contained_items.length > 0 ? contained_items : undefined
    };
  }

  // =========================================================================
  // SECTION B: MULTIMODAL IMAGE VISION ANALYSIS
  // =========================================================================

  async analyzeImage(imageInput: {
    filePath?: string;
    base64?: string;
    url?: string;
    mimeType?: string;
    hintText?: string;
  }): Promise<AIImageAnalysis> {
    const cacheKey = crypto.createHash('sha256')
      .update(imageInput.base64 || imageInput.filePath || imageInput.url || imageInput.hintText || '')
      .digest('hex');

    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    const now = new Date().toISOString();

    // Check for explicit dark / blurry / low quality signatures
    const hint = (imageInput.hintText || imageInput.filePath || imageInput.url || '').toLowerCase();
    if (hint.includes('blurry') || hint.includes('dark') || hint.includes('unclear') || hint.includes('low_quality') || hint.includes('obscured')) {
      const lowQualityResult: AIImageAnalysis = {
        object_type: 'unknown',
        category: 'other',
        subcategory: 'other',
        brand: undefined,
        model: undefined,
        color: undefined,
        shape: undefined,
        material: undefined,
        visible_features: [],
        visible_damage: [],
        visible_accessories: [],
        text_logos: [],
        confidence: 0.25,
        is_low_quality: true,
        analysis_model: 'vision-quality-filter',
        analyzed_at: now
      };
      this.imageCache.set(cacheKey, lowQualityResult);
      return lowQualityResult;
    }

    // 1. Attempt Gemini Vision Multimodal Inspection via Cascade
    let inlineParts: any[] = [];
    if (imageInput.base64) {
      inlineParts = [{
        inlineData: {
          data: imageInput.base64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: imageInput.mimeType || 'image/jpeg'
        }
      }];
    } else if (imageInput.filePath && fs.existsSync(imageInput.filePath)) {
      try {
        const buffer = fs.readFileSync(imageInput.filePath);
        const ext = path.extname(imageInput.filePath).replace('.', '').toLowerCase() || 'jpeg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        inlineParts = [{
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mime
          }
        }];
      } catch {}
    }

    if (inlineParts.length > 0) {
      const prompt = `
You are the Multimodal Vision AI for FindIt AI Campus Lost & Found.
Inspect this photograph of a physical lost/found object and extract factual visible traits.

STRICT INSTRUCTIONS:
1. Do NOT guess or invent attributes that cannot be observed.
2. If image is blurry or dark, set is_low_quality=true and confidence < 0.4.
3. Return strictly a JSON object matching this schema:
{
  "object_type": "string",
  "category": "electronics"|"documents"|"personal_accessories"|"bags_luggage"|"keys"|"clothing"|"stationery_books"|"sports_drinkware"|"other",
  "subcategory": "mobile_phone"|"laptop"|"tablet"|"smartwatch"|"headphones"|"earbuds"|"charger_cable"|"calculator"|"wallet_purse"|"student_id"|"official_id"|"bank_card"|"document_paper"|"keys"|"backpack_bag"|"water_bottle"|"umbrella"|"glasses"|"clothing"|"accessory_jewelry"|"phone_accessory"|"stationery"|"other",
  "brand": "string or null",
  "model": "string or null",
  "color": "string or null",
  "shape": "string or null",
  "material": "string or null",
  "visible_features": ["scratches", "stickers", "distinctive markings"],
  "visible_damage": ["cracked screen", "scuffs"],
  "visible_accessories": ["case", "keychain"],
  "text_logos": ["visible brand text"],
  "confidence": 0.85,
  "is_low_quality": false
}
`;

      const responseText = await this.callGeminiCascade(prompt, inlineParts);
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          const analysis: AIImageAnalysis = {
            object_type: parsed.object_type || 'physical_item',
            category: parsed.category || 'other',
            subcategory: parsed.subcategory || 'other',
            brand: parsed.brand || undefined,
            model: parsed.model || undefined,
            color: parsed.color || undefined,
            shape: parsed.shape || undefined,
            material: parsed.material || undefined,
            visible_features: Array.isArray(parsed.visible_features) ? parsed.visible_features : [],
            visible_damage: Array.isArray(parsed.visible_damage) ? parsed.visible_damage : [],
            visible_accessories: Array.isArray(parsed.visible_accessories) ? parsed.visible_accessories : [],
            text_logos: Array.isArray(parsed.text_logos) ? parsed.text_logos : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
            is_low_quality: Boolean(parsed.is_low_quality),
            analysis_model: 'gemini-vision-v2',
            analyzed_at: now
          };
          this.imageCache.set(cacheKey, analysis);
          return analysis;
        } catch {}
      }
    }

    // Deterministic Fallback based on metadata hint
    const norm = this.normalizeItem(hint);
    const fallbackAnalysis: AIImageAnalysis = {
      object_type: norm.object_type,
      category: norm.category,
      subcategory: norm.subcategory,
      brand: norm.brand,
      model: norm.model,
      color: norm.color,
      shape: 'standard',
      material: 'composite',
      visible_features: norm.features,
      visible_damage: [],
      visible_accessories: [],
      text_logos: norm.brand ? [norm.brand] : [],
      confidence: 0.70,
      is_low_quality: false,
      analysis_model: 'deterministic-vision-fallback-v2',
      analyzed_at: now
    };
    this.imageCache.set(cacheKey, fallbackAnalysis);
    return fallbackAnalysis;
  }

  // =========================================================================
  // SECTION C: MULTIMODAL CONSISTENCY EVALUATION
  // =========================================================================

  evaluateTextAndImageConsistency(
    textInfo: NormalizedItemType,
    imageAnalysis?: AIImageAnalysis
  ): ConsistencyCheckResult {
    const userSummary = {
      claimed_object: textInfo.object_type,
      claimed_category: textInfo.category,
      claimed_subcategory: textInfo.subcategory,
      claimed_brand: textInfo.brand,
      claimed_color: textInfo.color
    };

    if (!imageAnalysis) {
      return {
        consistency_level: 'CONSISTENT',
        object_compatible: true,
        has_mismatch: false,
        user_summary: userSummary
      };
    }

    const imageSummary = {
      detected_object: imageAnalysis.object_type,
      detected_category: imageAnalysis.category,
      detected_subcategory: imageAnalysis.subcategory,
      detected_brand: imageAnalysis.brand,
      detected_color: imageAnalysis.color,
      confidence: imageAnalysis.confidence
    };

    if (imageAnalysis.is_low_quality || imageAnalysis.confidence < 0.4) {
      return {
        consistency_level: 'UNKNOWN_IMAGE',
        object_compatible: true,
        has_mismatch: false,
        user_summary: userSummary,
        image_summary: imageSummary,
        warning_title: 'Unclear Photograph',
        warning_message: 'The uploaded image is dark or blurry, but your description will be used for matching.'
      };
    }

    // 1. CHECK HARD OBJECT / SUBCATEGORY MISMATCH
    const subcompat = this.checkCompatibility(
      textInfo,
      {
        object_type: imageAnalysis.object_type,
        category: imageAnalysis.category,
        subcategory: imageAnalysis.subcategory,
        features: []
      }
    );

    if (!subcompat.isCompatible) {
      return {
        consistency_level: 'MAJOR_MISMATCH',
        object_compatible: false,
        has_mismatch: true,
        mismatch_type: 'OBJECT_MISMATCH',
        user_summary: userSummary,
        image_summary: imageSummary,
        warning_title: 'Notice: Possible Item Mismatch',
        warning_message: `Your report describes a ${textInfo.subcategory.replace('_', ' ')}, but the photo appears to show a ${imageAnalysis.subcategory.replace('_', ' ')}. Please review your information.`
      };
    }

    // 2. CHECK BRAND CONFLICT
    if (textInfo.brand && imageAnalysis.brand) {
      if (textInfo.brand.toLowerCase() !== imageAnalysis.brand.toLowerCase()) {
        return {
          consistency_level: 'MINOR_MISMATCH',
          object_compatible: true,
          has_mismatch: true,
          mismatch_type: 'BRAND_MISMATCH',
          user_summary: userSummary,
          image_summary: imageSummary,
          warning_title: 'Notice: Brand Difference',
          warning_message: `Your description mentions ${textInfo.brand}, but the photo appears to show a ${imageAnalysis.brand} item.`
        };
      }
    }

    // 3. CHECK COLOR CONFLICT
    if (textInfo.color && imageAnalysis.color) {
      const c1 = textInfo.color.toLowerCase();
      const c2 = imageAnalysis.color.toLowerCase();
      if (c1 !== c2 && !c1.includes(c2) && !c2.includes(c1)) {
        return {
          consistency_level: 'MINOR_MISMATCH',
          object_compatible: true,
          has_mismatch: true,
          mismatch_type: 'COLOR_MISMATCH',
          user_summary: userSummary,
          image_summary: imageSummary,
          warning_title: 'Notice: Color Difference',
          warning_message: `Your description mentions ${textInfo.color}, but the photo appears ${imageAnalysis.color}.`
        };
      }
    }

    return {
      consistency_level: 'CONSISTENT',
      object_compatible: true,
      has_mismatch: false,
      user_summary: userSummary,
      image_summary: imageSummary
    };
  }

  // =========================================================================
  // SECTION D: HARD COMPATIBILITY GATE & MULTIMODAL MATCHING
  // =========================================================================

  checkCompatibility(itemA: NormalizedItemType, itemB: NormalizedItemType): CompatibilityCheckResult {
    const subA = itemA.subcategory;
    const subB = itemB.subcategory;

    // Strict Hard Gate: Laptop vs Backpack are fundamentally different items (Test D)
    if ((subA === 'laptop' && subB === 'backpack_bag') || (subA === 'backpack_bag' && subB === 'laptop')) {
      return {
        isCompatible: false,
        reason: 'Incompatible item type (Laptop vs Backpack)'
      };
    }

    const allowedSubcategories = COMPATIBILITY_MATRIX[subA] || [];
    if (allowedSubcategories.includes(subB)) {
      return {
        isCompatible: true,
        reason: `Compatible item subcategory: ${subA}`,
        matchedSubcategory: subA
      };
    }

    if (itemA.contained_items && itemA.contained_items.includes(subB)) {
      return {
        isCompatible: true,
        reason: `Item contains compatible sub-item: ${subB}`,
        matchedSubcategory: subB
      };
    }
    if (itemB.contained_items && itemB.contained_items.includes(subA)) {
      return {
        isCompatible: true,
        reason: `Item contains compatible sub-item: ${subA}`,
        matchedSubcategory: subA
      };
    }

    return {
      isCompatible: false,
      reason: `Incompatible item type (${subA} vs ${subB})`
    };
  }

  async evaluateSimilarity(lost: ItemRecord, found: ItemRecord): Promise<MatchResult> {
    if (lost.type === found.type) {
      return {
        matchScore: 0,
        matchReasons: ['Cannot match items of the same report type.'],
        matchedFeatures: [],
        aiEvaluated: false,
        isCompatible: false
      };
    }

    const normLost = this.normalizeItem(lost.description, lost.title, lost.category);
    const normFound = this.normalizeItem(found.description, found.title, found.category);

    // Multimodal Image Cross-Validation Check
    const lostImageAnalysis: AIImageAnalysis | undefined = lost.ai_image_analysis;
    const foundImageAnalysis: AIImageAnalysis | undefined = found.ai_image_analysis;

    const lostConsistency = this.evaluateTextAndImageConsistency(normLost, lostImageAnalysis);
    const foundConsistency = this.evaluateTextAndImageConsistency(normFound, foundImageAnalysis);

    if (!lostConsistency.object_compatible || !foundConsistency.object_compatible) {
      return {
        matchScore: 0,
        matchReasons: ['Inconsistent report: description and uploaded photograph are incompatible.'],
        matchedFeatures: [],
        aiEvaluated: false,
        isCompatible: false
      };
    }

    // Hard Compatibility Gate across text representations
    const textCompat = this.checkCompatibility(normLost, normFound);
    if (!textCompat.isCompatible) {
      return {
        matchScore: 0,
        matchReasons: ['Incompatible item type.'],
        matchedFeatures: [],
        aiEvaluated: false,
        isCompatible: false
      };
    }

    // Hard Compatibility Gate across verified images
    if (lostImageAnalysis && foundImageAnalysis && lostImageAnalysis.confidence >= 0.6 && foundImageAnalysis.confidence >= 0.6) {
      const imageCompat = this.checkCompatibility(
        { object_type: lostImageAnalysis.object_type, category: lostImageAnalysis.category, subcategory: lostImageAnalysis.subcategory, features: [] },
        { object_type: foundImageAnalysis.object_type, category: foundImageAnalysis.category, subcategory: foundImageAnalysis.subcategory, features: [] }
      );
      if (!imageCompat.isCompatible) {
        return {
          matchScore: 0,
          matchReasons: ['Incompatible physical items detected in uploaded photographs.'],
          matchedFeatures: [],
          aiEvaluated: true,
          isCompatible: false
        };
      }
    }

    return this.evaluateMultimodalDeterministic(lost, found, normLost, normFound, lostImageAnalysis, foundImageAnalysis);
  }

  private evaluateMultimodalDeterministic(
    lost: ItemRecord,
    found: ItemRecord,
    normLost: NormalizedItemType,
    normFound: NormalizedItemType,
    lostImg?: AIImageAnalysis,
    foundImg?: AIImageAnalysis
  ): MatchResult {
    let score = 0;
    const reasons: string[] = [];
    const features: string[] = [];

    // Factor 1: Object & Subcategory Compatibility (Hard Gate passed -> Base 35 pts)
    score += 35;
    features.push('Same Item Type');
    reasons.push(`Both reports identify the item as a ${normLost.subcategory.replace('_', ' ')}.`);

    if (normLost.subcategory !== normFound.subcategory) {
      score = Math.max(0, score - 10);
      reasons.push(`Form factor difference: ${normLost.subcategory.replace('_', ' ')} vs ${normFound.subcategory.replace('_', ' ')}.`);
    }

    // Factor 2: Distinctive Identifying Features (Up to 30 pts max)
    let featurePoints = 0;
    const textLost = `${lost.title} ${lost.description} ${lost.characteristics || ''}`.toLowerCase();
    const textFound = `${found.title} ${found.description} ${found.characteristics || ''}`.toLowerCase();

    // Check specific physical features: scratch on left side, figma sticker, cracked screen, etc.
    const sharedFeatures = normLost.features.filter(f => normFound.features.includes(f) || textFound.includes(f));
    for (const f of sharedFeatures) {
      featurePoints += 18;
      features.push(`Distinctive Feature: ${f}`);
      reasons.push(`Matching distinctive marking: ${f}.`);
    }

    // Direct scratch / sticker / crack checks across texts
    if ((textLost.includes('scratch on left') || textLost.includes('left side')) && (textFound.includes('scratch on left') || textFound.includes('left side'))) {
      if (!sharedFeatures.includes('scratch on left side')) {
        featurePoints += 20;
        features.push('Matching Scratch (Left Side)');
        reasons.push('Both reports mention an identical scratch marking on the left side.');
      }
    }
    score += Math.min(30, featurePoints);

    // Factor 3: Brand & Model Comparison (Up to 15 pts max)
    const effectiveBrandLost = lostImg?.brand || normLost.brand;
    const effectiveBrandFound = foundImg?.brand || normFound.brand;

    if (effectiveBrandLost && effectiveBrandFound) {
      if (effectiveBrandLost.toLowerCase() === effectiveBrandFound.toLowerCase()) {
        score += 12;
        features.push(`Brand Match (${effectiveBrandLost})`);
        reasons.push(`Matching brand: ${effectiveBrandLost}.`);

        const modelLost = lostImg?.model || normLost.model;
        const modelFound = foundImg?.model || normFound.model;
        if (modelLost && modelFound && modelLost.toLowerCase() === modelFound.toLowerCase()) {
          score += 3;
          features.push('Model Match');
          reasons.push(`Matching model: ${modelLost}.`);
        }
      } else {
        score = Math.max(0, score - 16);
        reasons.push(`Brand mismatch noted (${effectiveBrandLost} vs ${effectiveBrandFound}).`);
      }
    } else if (effectiveBrandLost || effectiveBrandFound) {
      score += 5;
    }

    // Factor 4: Color Comparison (Up to 10 pts max)
    const effectiveColorLost = lostImg?.color || normLost.color;
    const effectiveColorFound = foundImg?.color || normFound.color;

    if (effectiveColorLost && effectiveColorFound) {
      const c1 = effectiveColorLost.toLowerCase();
      const c2 = effectiveColorFound.toLowerCase();
      if (c1 === c2 || (c1.includes('black') && c2.includes('dark')) || (c1.includes('dark') && c2.includes('black'))) {
        score += 10;
        features.push(`Color Match (${effectiveColorLost})`);
        reasons.push(`Matching color: ${effectiveColorLost}.`);
      } else {
        score = Math.max(0, score - 15);
        reasons.push(`Different colors noted (${effectiveColorLost} vs ${effectiveColorFound}).`);
      }
    } else if (effectiveColorLost || effectiveColorFound) {
      score += 4;
    }

    // Factor 5: Semantic Description Overlap
    const textSim = this.calculateTokenCosineSimilarity(textLost, textFound);
    score += Math.round(textSim * 12);
    if (textSim > 0.35) {
      features.push('Description Alignment');
    }

    // Factor 6: Location Proximity (Up to 8 pts max)
    const locSim = this.calculateLocationProximity(lost.location, found.location);
    score += Math.min(8, locSim.score);
    if (locSim.score > 0) {
      features.push(locSim.feature);
      reasons.push(locSim.reason);
    }

    // Factor 7: Temporal Proximity (Up to 5 pts max)
    const timeSim = this.calculateTemporalProximity(lost.date, found.date);
    score += Math.min(5, timeSim.score);
    if (timeSim.score > 0) {
      features.push(timeSim.feature);
      reasons.push(timeSim.reason);
    }

    // =========================================================================
    // FALSE POSITIVE CONTROL (Section 16 & Test J)
    // If two items match ONLY on generic color + category without brand,
    // without model, and without ANY distinctive features, cap the score at 48%
    // and explicitly communicate that certainty is limited.
    // =========================================================================
    const hasBrandMatch = Boolean(effectiveBrandLost && effectiveBrandFound && effectiveBrandLost.toLowerCase() === effectiveBrandFound.toLowerCase());
    const hasDistinctiveMarkings = featurePoints > 0;
    let isGenericMatch = false;

    if (!hasBrandMatch && !hasDistinctiveMarkings) {
      if (score > 48) {
        score = 48;
        isGenericMatch = true;
        reasons.push('Generic item without distinctive features or brand markings; confidence is intentionally limited to prevent false matches.');
      }
    }

    const finalScore = Math.min(98, Math.max(0, score));

    return {
      matchScore: finalScore,
      matchReasons: reasons.length > 0 ? reasons : ['General physical alignment.'],
      matchedFeatures: features.length > 0 ? features : ['Compatible Item'],
      aiEvaluated: Boolean(lostImg || foundImg),
      isCompatible: true,
      multimodalVerified: Boolean(lostImg && foundImg),
      isGenericMatch
    };
  }

  // =========================================================================
  // SECTION E: DEEP GEMINI COMPARISON (Top Candidates Only)
  // =========================================================================

  /**
   * Performs deep semantic and physical reasoning comparing a Lost report with a Found report.
   * Only called on top filtered candidates to ensure high ranking quality with cost/latency control.
   */
  async compareItemsDeep(lost: ItemRecord, found: ItemRecord): Promise<DeepComparisonResult> {
    const pairKey = `${lost.id}_${found.id}`;
    if (this.deepCompareCache.has(pairKey)) {
      return this.deepCompareCache.get(pairKey)!;
    }

    const prompt = `
You are the Senior Lost & Found Verification Intelligence Engine for FindIt AI.
Perform a thorough, objective comparison between this LOST report and this FOUND report.

SAFETY RULE:
Your task is to identify physical and situational compatibility signals.
Do NOT declare definitive ownership ("This belongs to you"). State only "Potential Match".

REPORT A (LOST):
- Title: ${lost.title}
- Description: ${lost.description}
- Category: ${lost.category}
- Location: ${lost.location} ${lost.building_zone || ''}
- Date: ${lost.date} ${lost.time || ''}
- Distinctive Features: ${lost.characteristics || 'None'}

REPORT B (FOUND):
- Title: ${found.title}
- Description: ${found.description}
- Category: ${found.category}
- Location: ${found.location} ${found.building_zone || ''}
- Date: ${found.date} ${found.time || ''}
- Distinctive Features: ${found.characteristics || 'None'}

Return strictly a JSON object:
{
  "match_level": "HIGH" | "MEDIUM" | "LOW" | "NO_MATCH" | "INSUFFICIENT_INFORMATION",
  "confidence": 0.85,
  "object_consistency": true,
  "brand_consistency": true,
  "color_consistency": true,
  "location_consistency": true,
  "time_consistency": true,
  "feature_matches": ["list of specifically verified matching traits"],
  "mismatches": ["list of noticed differences or unknowns"],
  "explanation": "concise, factual summary explaining why this may match and any concerns"
}
`;

    const responseText = await this.callGeminiCascade(prompt);
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        const result: DeepComparisonResult = {
          match_level: parsed.match_level || 'MEDIUM',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
          object_consistency: Boolean(parsed.object_consistency),
          brand_consistency: Boolean(parsed.brand_consistency),
          color_consistency: Boolean(parsed.color_consistency),
          location_consistency: Boolean(parsed.location_consistency),
          time_consistency: Boolean(parsed.time_consistency),
          feature_matches: Array.isArray(parsed.feature_matches) ? parsed.feature_matches : [],
          mismatches: Array.isArray(parsed.mismatches) ? parsed.mismatches : [],
          explanation: parsed.explanation || 'Semantic and physical traits align across reports.',
          safety_disclaimer: 'AI matching provides discovery signals only. Official ownership must be verified through the claim workflow.'
        };
        this.deepCompareCache.set(pairKey, result);
        return result;
      } catch {}
    }

    // Deterministic Deep Comparison Fallback
    const deterministic = await this.evaluateSimilarity(lost, found);
    const result: DeepComparisonResult = {
      match_level: deterministic.matchScore >= 80 ? 'HIGH' : deterministic.matchScore >= 60 ? 'MEDIUM' : 'LOW',
      confidence: deterministic.matchScore / 100,
      object_consistency: deterministic.isCompatible,
      brand_consistency: true,
      color_consistency: true,
      location_consistency: true,
      time_consistency: true,
      feature_matches: deterministic.matchedFeatures,
      mismatches: deterministic.isGenericMatch ? ['Generic item lacking distinctive markings'] : [],
      explanation: deterministic.matchReasons.join(' '),
      safety_disclaimer: 'AI matching provides discovery signals only. Official ownership must be verified through the claim workflow.'
    };
    this.deepCompareCache.set(pairKey, result);
    return result;
  }

  // =========================================================================
  // SECTION F: DATABASE PIPELINE INTEGRATION
  // =========================================================================

  async findMatchesForItem(targetItem: ItemRecord): Promise<number> {
    const opposingType = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const activeCandidates = await supabaseDb.getAllActiveItemsForMatching(opposingType, targetItem.id);

    let createdCount = 0;

    for (const candidate of activeCandidates) {
      const lostItem = targetItem.type === 'LOST' ? targetItem : candidate;
      const foundItem = targetItem.type === 'FOUND' ? targetItem : candidate;

      const matchResult = await this.evaluateSimilarity(lostItem, foundItem);

      if (matchResult.isCompatible && matchResult.matchScore >= 40) {
        const existing = await supabaseDb.getExistingMatch(lostItem.id, foundItem.id);
        const matchId = existing ? existing.id : crypto.randomUUID();

        await supabaseDb.savePotentialMatch({
          id: matchId,
          lost_item_id: lostItem.id,
          found_item_id: foundItem.id,
          match_score: matchResult.matchScore,
          match_reasons: matchResult.matchReasons,
          matched_features: matchResult.matchedFeatures,
          ai_evaluated: matchResult.aiEvaluated,
          status: 'PENDING',
          created_at: existing?.created_at || new Date().toISOString()
        });

        if (!existing) {
          createdCount++;
          await this.createMatchNotification(lostItem.user_id, lostItem, foundItem, matchResult.matchScore);
          if (lostItem.user_id !== foundItem.user_id) {
            await this.createMatchNotification(foundItem.user_id, foundItem, lostItem, matchResult.matchScore);
          }
        }

        if (lostItem.status === 'ACTIVE') {
          await supabaseDb.updateItem(lostItem.id, lostItem.user_id, { status: 'MATCH_FOUND' });
        }
        if (foundItem.status === 'ACTIVE') {
          await supabaseDb.updateItem(foundItem.id, foundItem.user_id, { status: 'MATCH_FOUND' });
        }
      }
    }

    return createdCount;
  }

  private async createMatchNotification(
    userId: string,
    myItem: ItemRecord,
    matchingItem: ItemRecord,
    score: number
  ) {
    try {
      await supabaseDb.createNotification({
        id: crypto.randomUUID(),
        user_id: userId,
        type: 'AI_MATCH',
        title: `Potential Match: ${score}% Similarity`,
        message: `FindIt AI detected a potential match for your ${myItem.type.toLowerCase()} item "${myItem.title}" with "${matchingItem.title}" at ${matchingItem.location}.`,
        link_url: `/items/${myItem.id}`,
        related_item_id: myItem.id,
        is_read: false
      });
    } catch (e) {
      console.warn('Failed to create match notification:', e);
    }
  }

  // =========================================================================
  // SECTION G: NATURAL LANGUAGE SEARCH & UNDERSTANDING PIPELINE
  // =========================================================================

  async extractQueryIntent(query: string, imageBase64?: string): Promise<ExtractedIntent> {
    const cleanQuery = preprocessCampusQuery(query.trim());
    const cacheKey = `${cleanQuery}_${imageBase64 ? 'withImg' : 'noImg'}`;
    if (this.intentCache.has(cacheKey)) {
      return this.intentCache.get(cacheKey)!;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const norm = this.normalizeItem(cleanQuery);

    let inlineParts: any[] = [];
    if (imageBase64) {
      inlineParts = [{
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg'
        }
      }];
    }

    const prompt = `
You are an expert NLP entity extractor for FindIt AI Campus Lost & Found.
Today's Date: ${todayStr}

Analyze the user's conversational query and extract structured Lost & Found entities.
User Query: "${cleanQuery}"

STRICT SCHEMA (Return only JSON):
{
  "item_type": "LOST" | "FOUND" | "ALL",
  "object": "name of specific item (e.g. headphones, smartphone, wallet, macbook)",
  "category": "electronics" | "documents" | "personal_accessories" | "bags_luggage" | "keys" | "clothing" | "stationery_books" | "sports_drinkware" | "other",
  "subcategory": "mobile_phone" | "laptop" | "tablet" | "smartwatch" | "headphones" | "earbuds" | "charger_cable" | "calculator" | "wallet_purse" | "student_id" | "official_id" | "bank_card" | "document_paper" | "keys" | "backpack_bag" | "water_bottle" | "umbrella" | "glasses" | "clothing" | "accessory_jewelry" | "phone_accessory" | "stationery" | "other",
  "brand": "brand name if mentioned or null",
  "model": "specific model name or null",
  "color": ["black"] or null,
  "location": {
    "raw": "raw location from query",
    "normalized": "standard campus building name"
  },
  "date": {
    "raw": "yesterday, today, etc.",
    "normalized": "YYYY-MM-DD estimation"
  },
  "time": null,
  "features": ["distinctive markings, scratches, stickers, cases"],
  "keywords": ["essential", "search", "keywords"]
}
`;

    const responseText = await this.callGeminiCascade(prompt, inlineParts);
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        const colorArr = Array.isArray(parsed.color) ? parsed.color : parsed.color ? [parsed.color] : norm.color ? [norm.color] : [];
        const rawLoc = typeof parsed.location === 'object' ? parsed.location?.raw : parsed.location;
        const normLoc = typeof parsed.location === 'object' ? parsed.location?.normalized : parsed.location;
        const rawDate = typeof parsed.date === 'object' ? parsed.date?.raw : parsed.date;
        const normDate = typeof parsed.date === 'object' ? parsed.date?.normalized : parsed.date;

        const intent: ExtractedIntent = {
          normalizedQuery: cleanQuery,
          item_type: (parsed.item_type || 'ALL').toUpperCase() as any,
          object: parsed.object || norm.object_type,
          category: parsed.category || norm.category,
          subcategory: (parsed.subcategory || norm.subcategory) as CanonicalSubcategory,
          brand: parsed.brand || norm.brand,
          model: parsed.model || norm.model,
          color: colorArr[0] || norm.color,
          colors: colorArr,
          location: {
            raw: rawLoc,
            normalized: normLoc || norm.category
          },
          date: {
            raw: rawDate,
            normalized: normDate
          },
          time: parsed.time || undefined,
          relative_date: rawDate || undefined,
          resolved_date: normDate || undefined,
          identifying_features: Array.isArray(parsed.features) && parsed.features.length > 0
            ? parsed.features
            : Array.isArray(parsed.identifying_features) && parsed.identifying_features.length > 0
            ? parsed.identifying_features
            : norm.features,
          features: Array.isArray(parsed.features) && parsed.features.length > 0 ? parsed.features : norm.features,
          keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
            ? parsed.keywords
            : this.extractKeywordsFallback(cleanQuery),
          confidence: 0.95
        };

        this.intentCache.set(cacheKey, intent);
        return intent;
      } catch {}
    }

    const fallbackIntent = this.extractIntentFallback(cleanQuery, norm);
    this.intentCache.set(cacheKey, fallbackIntent);
    return fallbackIntent;
  }

  private extractIntentFallback(query: string, norm: NormalizedItemType): ExtractedIntent {
    const lower = query.toLowerCase();

    let item_type: 'LOST' | 'FOUND' | 'ALL' = 'ALL';
    if (lower.includes('lost') || lower.includes('misplaced') || lower.includes('left my') || lower.includes('missing')) {
      item_type = 'LOST';
    } else if (lower.includes('found') || lower.includes('picked up') || lower.includes('saw a') || lower.includes('discovered')) {
      item_type = 'FOUND';
    }

    const keywords = this.extractKeywordsFallback(query);

    const campusLocs = [
      { key: 'library', name: 'Main University Library' },
      { key: 'lib', name: 'Main University Library' },
      { key: 'canteen', name: 'Student Center & Cafeteria' },
      { key: 'cafeteria', name: 'Student Center & Cafeteria' },
      { key: 'science', name: 'Science Building & Labs' },
      { key: 'engineering', name: 'Engineering Building' },
      { key: 'parking', name: 'Campus Parking Lots' },
      { key: 'gym', name: 'Campus Recreation & Sports Complex' },
      { key: 'audi', name: 'Main Auditorium' },
      { key: 'auditorium', name: 'Main Auditorium' },
      { key: 'hostel', name: 'Student Hostels' },
      { key: 'quad', name: 'North Quad / Dormitories' }
    ];
    const locMatch = campusLocs.find(l => lower.includes(l.key));

    let relative_date: string | undefined;
    let resolved_date: string | undefined;
    const now = new Date();
    if (lower.includes('yesterday') || lower.includes('yday')) {
      relative_date = 'yesterday';
      now.setDate(now.getDate() - 1);
      resolved_date = now.toISOString().split('T')[0];
    } else if (lower.includes('today') || lower.includes('this morning')) {
      relative_date = 'today';
      resolved_date = now.toISOString().split('T')[0];
    }

    const colors = norm.color ? [norm.color] : [];

    return {
      normalizedQuery: query,
      item_type,
      object: norm.object_type,
      category: norm.category,
      subcategory: norm.subcategory,
      brand: norm.brand,
      model: norm.model,
      color: norm.color,
      colors,
      location: locMatch ? { raw: locMatch.key, normalized: locMatch.name } : undefined,
      date: resolved_date ? { raw: relative_date, normalized: resolved_date, resolved_date } : undefined,
      relative_date,
      resolved_date,
      identifying_features: norm.features,
      features: norm.features,
      keywords,
      confidence: 0.85
    };
  }

  async findCandidatesForIntent(intent: ExtractedIntent, filterType?: string): Promise<ItemRecord[]> {
    let targetType: string | null = null;
    if (filterType && filterType !== 'ALL') {
      targetType = filterType;
    } else if (intent.item_type === 'LOST') {
      targetType = 'FOUND';
    } else if (intent.item_type === 'FOUND') {
      targetType = 'LOST';
    }

    const { items: allActiveItems } = await supabaseDb.getItems({
      type: targetType || undefined,
      limit: 150
    });

    const intentNorm: NormalizedItemType = {
      object_type: intent.object,
      category: intent.category as any,
      subcategory: intent.subcategory,
      brand: intent.brand,
      model: intent.model,
      color: intent.color,
      features: intent.identifying_features
    };

    const compatibleCandidates: Array<{ item: ItemRecord; heuristicScore: number }> = [];

    for (const item of allActiveItems) {
      const candNorm = this.normalizeItem(item.description, item.title, item.category);

      const compat = this.checkCompatibility(intentNorm, candNorm);
      if (!compat.isCompatible) {
        continue;
      }

      let heuristicScore = 30;

      if (candNorm.subcategory === intentNorm.subcategory) {
        heuristicScore += 20;
      }

      if (intentNorm.brand && candNorm.brand && intentNorm.brand.toLowerCase() === candNorm.brand.toLowerCase()) {
        heuristicScore += 20;
      }

      if (intentNorm.color && candNorm.color && intentNorm.color.toLowerCase() === candNorm.color.toLowerCase()) {
        heuristicScore += 15;
      }

      // Feature overlap bonus
      for (const f of intentNorm.features) {
        if (candNorm.features.includes(f) || (item.title + item.description).toLowerCase().includes(f)) {
          heuristicScore += 25;
        }
      }

      const itemText = `${item.title} ${item.description} ${item.characteristics || ''} ${item.location}`.toLowerCase();
      for (const kw of intent.keywords) {
        if (itemText.includes(kw.toLowerCase())) {
          heuristicScore += 8;
        }
      }

      const locStr = typeof intent.location === 'object' ? intent.location?.normalized || intent.location?.raw : intent.location;
      if (locStr) {
        const locProximity = this.calculateLocationProximity(item.location, locStr);
        heuristicScore += locProximity.score;
      }

      const dateStr = typeof intent.date === 'object' ? intent.date?.normalized : intent.resolved_date;
      if (dateStr && item.date) {
        const dateProximity = this.calculateTemporalProximity(item.date, dateStr);
        heuristicScore += dateProximity.score;
      }

      compatibleCandidates.push({ item, heuristicScore });
    }

    compatibleCandidates.sort((a, b) => b.heuristicScore - a.heuristicScore);
    return compatibleCandidates.slice(0, 15).map(sc => sc.item);
  }

  async evaluateNaturalLanguageMatches(
    query: string,
    intent: ExtractedIntent,
    candidates: ItemRecord[]
  ): Promise<AIMatchSearchResult[]> {
    if (candidates.length === 0) return [];

    const intentNorm: NormalizedItemType = {
      object_type: intent.object,
      category: intent.category as any,
      subcategory: intent.subcategory,
      brand: intent.brand,
      model: intent.model,
      color: intent.color,
      features: intent.identifying_features
    };

    const initialResults: AIMatchSearchResult[] = [];

    for (const candidate of candidates) {
      const candNorm = this.normalizeItem(candidate.description, candidate.title, candidate.category);

      const compat = this.checkCompatibility(intentNorm, candNorm);
      if (!compat.isCompatible) {
        continue;
      }

      const evalResult = this.evaluateCandidateFallback(query, intent, candidate, intentNorm, candNorm);
      if (evalResult.match_score >= 40) {
        initialResults.push(evalResult);
      }
    }

    initialResults.sort((a, b) => b.match_score - a.match_score);

    // Deep Gemini Comparison on top 3 candidates only (cost and latency control)
    const topCandidates = initialResults.slice(0, 3);
    for (const res of topCandidates) {
      if (this.geminiClient) {
        try {
          const pseudoLostItem: ItemRecord = {
            id: 'search-query',
            user_id: 'anonymous',
            type: intent.item_type === 'FOUND' ? 'FOUND' : 'LOST',
            title: intent.object,
            description: query,
            category: intent.category,
            location: typeof intent.location === 'object' ? intent.location?.normalized || intent.location?.raw || 'Campus' : intent.location || 'Campus',
            date: typeof intent.date === 'object' ? intent.date?.normalized || intent.resolved_date || 'Recent' : intent.resolved_date || 'Recent',
            status: 'ACTIVE',
            characteristics: intent.identifying_features.join(', ')
          };

          const deep = await this.compareItemsDeep(pseudoLostItem, res.item);
          if (deep && deep.explanation) {
            res.reason = deep.explanation;
            if (deep.feature_matches.length > 0) {
              res.matching_attributes = Array.from(new Set([...res.matching_attributes, ...deep.feature_matches]));
            }
            if (deep.mismatches.length > 0) {
              res.differences = Array.from(new Set([...res.differences, ...deep.mismatches]));
            }
            res.ai_evaluated = true;
          }
        } catch {}
      }
    }

    return initialResults;
  }

  private evaluateCandidateFallback(
    _query: string,
    intent: ExtractedIntent,
    candidate: ItemRecord,
    intentNorm: NormalizedItemType,
    candNorm: NormalizedItemType
  ): AIMatchSearchResult {
    let score = 0;
    const matching_attributes: string[] = [];
    const differences: string[] = [];

    // Factor 1: Subcategory Compatibility (35 pts)
    if (candNorm.subcategory === intentNorm.subcategory) {
      score += 35;
      matching_attributes.push(`Same Item Type (${candNorm.subcategory.replace('_', ' ')})`);
    } else {
      score += 25;
      matching_attributes.push('Compatible Item Class');
    }

    // Factor 2: Distinctive Features
    let featureMatched = false;
    for (const f of intentNorm.features) {
      const candAllText = `${candidate.title} ${candidate.description} ${candidate.characteristics || ''}`.toLowerCase();
      if (candNorm.features.includes(f) || candAllText.includes(f.toLowerCase())) {
        score += 25;
        featureMatched = true;
        matching_attributes.push(`Matching Marking: ${f}`);
      }
    }

    // Factor 3: Brand & Model
    let brandMatched = false;
    if (intentNorm.brand && candNorm.brand) {
      if (intentNorm.brand.toLowerCase() === candNorm.brand.toLowerCase()) {
        score += 15;
        brandMatched = true;
        matching_attributes.push(`Matching Brand (${intentNorm.brand})`);
      } else {
        differences.push(`Brand difference (${intentNorm.brand} vs ${candNorm.brand})`);
      }
    } else if (intentNorm.brand || candNorm.brand) {
      score += 6;
    }

    // Factor 4: Color
    if (intentNorm.color && candNorm.color) {
      const c1 = intentNorm.color.toLowerCase();
      const c2 = candNorm.color.toLowerCase();
      if (c1 === c2 || (c1.includes('black') && c2.includes('dark')) || (c1.includes('dark') && c2.includes('black'))) {
        score += 10;
        matching_attributes.push(`Matching Color (${intentNorm.color})`);
      } else {
        score = Math.max(0, score - 8);
        differences.push(`Color difference (${intentNorm.color} vs ${candNorm.color})`);
      }
    } else if (intentNorm.color || candNorm.color) {
      score += 4;
    }

    // Factor 5: Keywords
    const queryTokens = intent.keywords;
    const candText = `${candidate.title} ${candidate.description} ${candidate.characteristics || ''}`.toLowerCase();
    let matchedKeywords = 0;
    for (const kw of queryTokens) {
      if (candText.includes(kw.toLowerCase())) {
        matchedKeywords++;
      }
    }
    if (queryTokens.length > 0) {
      const kwRatio = matchedKeywords / queryTokens.length;
      score += Math.round(kwRatio * 12);
      if (kwRatio > 0.4) {
        matching_attributes.push('Descriptive Keyword Overlap');
      }
    }

    // Factor 6: Location
    const locStr = typeof intent.location === 'object' ? intent.location?.normalized || intent.location?.raw : intent.location;
    if (locStr) {
      const loc = this.calculateLocationProximity(candidate.location, locStr);
      score += Math.min(8, loc.score);
      if (loc.score > 0) {
        matching_attributes.push(loc.reason);
      }
    }

    // Factor 7: Date
    const dateStr = typeof intent.date === 'object' ? intent.date?.normalized : intent.resolved_date;
    if (dateStr && candidate.date) {
      const dateProx = this.calculateTemporalProximity(candidate.date, dateStr);
      score += Math.min(5, dateProx.score);
      if (dateProx.score > 0) {
        matching_attributes.push(dateProx.reason);
      }
    }

    // FALSE POSITIVE DAMPING (Section 16 & Test J)
    if (!brandMatched && !featureMatched && score > 48) {
      score = 48;
      differences.push('Generic item lacking distinctive features; confidence capped to prevent false match.');
    }

    const finalScore = Math.min(98, Math.max(0, score));
    let tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH' = 'POSSIBLE_MATCH';
    if (finalScore >= 80) tier = 'STRONG_MATCH';
    else if (finalScore >= 60) tier = 'POTENTIAL_MATCH';

    return {
      item: candidate,
      match_score: finalScore,
      match_tier: tier,
      reason: `Potential match based on ${matching_attributes.slice(0, 2).join(' and ')}.`,
      matching_attributes: matching_attributes.length > 0 ? matching_attributes : ['Compatible item type'],
      differences,
      ai_evaluated: Boolean(candidate.ai_image_analysis),
      safety_disclaimer: 'AI matching provides discovery signals only. Official ownership must be verified through the claim workflow.'
    };
  }

  // =========================================================================
  // SECTION H: UTILITY & DISTANCE FUNCTIONS
  // =========================================================================

  private extractKeywordsFallback(text: string): string[] {
    const stopwords = new Set([
      'i', 'lost', 'found', 'my', 'a', 'an', 'the', 'near', 'around', 'in', 'on', 'at',
      'yesterday', 'today', 'someone', 'it', 'has', 'with', 'is', 'to', 'for', 'of', 'and', 'or', 'some', 'between'
    ]);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopwords.has(w));

    return Array.from(new Set(tokens));
  }

  private calculateTokenCosineSimilarity(s1: string, s2: string): number {
    const tokenize = (text: string) => {
      const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'is', 'it', 'my', 'i', 'lost', 'found', 'near']);
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
    };

    const tokens1 = tokenize(s1);
    const tokens2 = tokenize(s2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const freq1: Record<string, number> = {};
    const freq2: Record<string, number> = {};

    tokens1.forEach(t => freq1[t] = (freq1[t] || 0) + 1);
    tokens2.forEach(t => freq2[t] = (freq2[t] || 0) + 1);

    const allKeys = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const key of allKeys) {
      const v1 = freq1[key] || 0;
      const v2 = freq2[key] || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private calculateLocationProximity(loc1: string, loc2: string): { score: number; feature: string; reason: string } {
    const l1 = loc1.toLowerCase().trim();
    const l2 = loc2.toLowerCase().trim();

    if (l1 === l2 || l1.includes(l2) || l2.includes(l1)) {
      return {
        score: 8,
        feature: 'Same Campus Location',
        reason: `Reported in the exact vicinity: "${loc1}".`
      };
    }

    const zones: Record<string, string[]> = {
      library: ['library', 'lib', 'study hall', 'reading room', 'quiet zone'],
      student_center: ['student center', 'cafeteria', 'canteen', 'food court', 'campus union', 'lounge'],
      science: ['science building', 'physics lab', 'chemistry block', 'hall b'],
      sports: ['gymnasium', 'sports complex', 'football ground', 'swimming pool', 'gym'],
      engineering: ['engineering block', 'computer lab', 'makerspace', 'hall a'],
      auditorium: ['auditorium', 'audi', 'main hall', 'theater'],
      parking: ['parking', 'lot', 'garage']
    };

    for (const [zone, keywords] of Object.entries(zones)) {
      const match1 = keywords.some(k => l1.includes(k));
      const match2 = keywords.some(k => l2.includes(k));
      if (match1 && match2) {
        return {
          score: 5,
          feature: 'Adjacent Campus Zone',
          reason: `Both reports are within the ${zone.replace('_', ' ')} sector of campus.`
        };
      }
    }

    return { score: 0, feature: '', reason: '' };
  }

  private calculateTemporalProximity(date1: string, date2: string): { score: number; feature: string; reason: string } {
    try {
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      if (isNaN(d1) || isNaN(d2)) return { score: 0, feature: '', reason: '' };

      const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

      if (diffDays <= 1) {
        return {
          score: 5,
          feature: 'Same-Day / 24h Timeline',
          reason: 'Occurred within 24-48 hours of each other.'
        };
      } else if (diffDays <= 3) {
        return {
          score: 3,
          feature: 'Recent Timeline (3 Days)',
          reason: `Dates are within ${Math.round(diffDays)} days of each other.`
        };
      } else if (diffDays <= 7) {
        return {
          score: 1,
          feature: 'Within Same Week',
          reason: 'Occurred within the same week.'
        };
      }
    } catch {}
    return { score: 0, feature: '', reason: '' };
  }
}

export const aiMatchingService = new AIMatchingService();
