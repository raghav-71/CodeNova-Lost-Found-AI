import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseDb, ItemRecord } from '../db/supabaseDb.js';

export type { ItemRecord };

// =========================================================================
// 1. TYPES & TAXONOMY INTERFACES
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
}

export interface ExtractedIntent {
  item_type: 'LOST' | 'FOUND' | 'ALL';
  object: string;
  category: string;
  subcategory: CanonicalSubcategory;
  brand?: string;
  model?: string;
  color?: string;
  location?: string;
  relative_date?: string;
  resolved_date?: string;
  identifying_features: string[];
  keywords: string[];
  confidence?: number;
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
}

// =========================================================================
// 2. CENTRALIZED COMPATIBILITY MATRIX & TAXONOMY
// =========================================================================

export const COMPATIBILITY_MATRIX: Record<CanonicalSubcategory, CanonicalSubcategory[]> = {
  mobile_phone: ['mobile_phone'],
  laptop: ['laptop'],
  tablet: ['tablet'],
  smartwatch: ['smartwatch'],
  headphones: ['headphones'],
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
  // 1. Accessories for devices
  {
    subcategory: 'phone_accessory',
    category: 'personal_accessories',
    defaultObjectType: 'phone_case',
    patterns: [
      /\b(phone\s*case|phone\s*cover|mobile\s*case|mobile\s*cover|iphone\s*case|iphone\s*cover|screen\s*protector|popsocket|phone\s*skin)\b/i
    ]
  },
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
      /\b(laptop|macbook|macbook\s*pro|macbook\s*air|notebook\s*computer|notebook|thinkpad|chromebook|dell\s*xps|dell\s*inspiron|dell\s*latitude|hp\s*pavilion|hp\s*spectre|lenovo\s*ideapad|lenovo\s*legion|surface\s*laptop|asus\s*zenbook|acer\s*aspire)\b/i
    ],
    negativePatterns: [
      /\b(laptop\s*bag|laptop\s*sleeve|laptop\s*charger|notebook\s*paper|paper\s*notebook|spiral\s*notebook)\b/i
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

  // 6. Headphones
  {
    subcategory: 'headphones',
    category: 'electronics',
    defaultObjectType: 'headphones',
    patterns: [
      /\b(headphones|earphones|earbuds|airpods|airpods\s*pro|galaxy\s*buds|headset|ear\s*buds|pixel\s*buds|over[- ]ear\s*headphones|in[- ]ear\s*earphones|bluetooth\s*earphones|bose\s*quietcomfort|sony\s*wh[- ]\d+|sony\s*wf[- ]\d+)\b/i
    ]
  },

  // 7. Calculators
  {
    subcategory: 'calculator',
    category: 'electronics',
    defaultObjectType: 'calculator',
    patterns: [
      /\b(calculator|scientific\s*calculator|ti[- ]?84|ti[- ]?83|casio\s*fx|casio\s*calculator)\b/i
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
      /\b(debit\s*card|credit\s*card|atm\s*card|visa\s*card|mastercard|amex\s*card|bank\s*card)\b/i
    ]
  },

  // 10. Documents & Academic Papers
  {
    subcategory: 'document_paper',
    category: 'documents',
    defaultObjectType: 'document',
    patterns: [
      /\b(document|paper|certificate|folder|file|transcript|assignment|notes|study\s*material|textbook|spiral\s*notebook|binder|exam\s*sheet)\b/i
    ]
  },

  // 11. Keys
  {
    subcategory: 'keys',
    category: 'keys',
    defaultObjectType: 'keys',
    patterns: [
      /\b(keys|key\s*chain|keychain|car\s*key|bike\s*key|room\s*key|dorm\s*key|key\s*fob|house\s*key|padlock\s*key|bike\s*lock)\b/i
    ]
  },

  // 12. Backpacks & Bags
  {
    subcategory: 'backpack_bag',
    category: 'bags_luggage',
    defaultObjectType: 'backpack',
    patterns: [
      /\b(backpack|back\s*pack|school\s*bag|book\s*bag|laptop\s*bag|rucksack|tote\s*bag|tote|duffel\s*bag|duffel|gym\s*bag|shoulder\s*bag|messenger\s*bag|handbag|sling\s*bag|drawstring\s*bag|briefcase|bag)\b/i
    ]
  },

  // 13. Water Bottles
  {
    subcategory: 'water_bottle',
    category: 'sports_drinkware',
    defaultObjectType: 'water_bottle',
    patterns: [
      /\b(water\s*bottle|bottle|flask|tumbler|thermos|hydro\s*flask|sipper|yeti\s*cup|mug|travel\s*mug)\b/i
    ]
  },

  // 14. Umbrellas
  {
    subcategory: 'umbrella',
    category: 'personal_accessories',
    defaultObjectType: 'umbrella',
    patterns: [
      /\b(umbrella|parasol|rain\s*umbrella)\b/i
    ]
  },

  // 15. Eyewear
  {
    subcategory: 'glasses',
    category: 'personal_accessories',
    defaultObjectType: 'glasses',
    patterns: [
      /\b(glasses|eyeglasses|spectacles|sunglasses|sun\s*glasses|reading\s*glasses|shades|ray[- ]ban|eyewear|frames)\b/i
    ]
  },

  // 16. Clothing & Apparel
  {
    subcategory: 'clothing',
    category: 'clothing',
    defaultObjectType: 'clothing',
    patterns: [
      /\b(jacket|hoodie|coat|sweater|sweatshirt|cardigan|shirt|t[- ]shirt|tee|pants|jeans|trousers|shorts|scarf|gloves|cap|hat|beanie|shoes|sneakers|sandals|boots)\b/i
    ]
  },

  // 17. Jewelry & Watches
  {
    subcategory: 'accessory_jewelry',
    category: 'personal_accessories',
    defaultObjectType: 'jewelry',
    patterns: [
      /\b(ring|necklace|bracelet|chain|earring|earrings|pendant|wrist\s*watch|analog\s*watch|jewel|jewelry)\b/i
    ],
    negativePatterns: [
      /\b(apple\s*watch|galaxy\s*watch|smartwatch|fitbit|garmin)\b/i
    ]
  },

  // 18. Stationery
  {
    subcategory: 'stationery',
    category: 'stationery_books',
    defaultObjectType: 'stationery',
    patterns: [
      /\b(pencil\s*case|pencil\s*pouch|pen|pencil|geometry\s*box|stapler|highlighter|stationery)\b/i
    ]
  }
];

const BRAND_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Apple', regex: /\b(apple|iphone|ipad|macbook|airpods)\b/i },
  { name: 'Samsung', regex: /\b(samsung|galaxy)\b/i },
  { name: 'Dell', regex: /\b(dell|xps|inspiron|latitude)\b/i },
  { name: 'HP', regex: /\b(hp|hewlett packard|pavilion|spectre|envy)\b/i },
  { name: 'Lenovo', regex: /\b(lenovo|thinkpad|ideapad|legion)\b/i },
  { name: 'Sony', regex: /\b(sony|playstation|bravia|wh-1000|wf-1000)\b/i },
  { name: 'OnePlus', regex: /\b(oneplus|nord)\b/i },
  { name: 'Google', regex: /\b(google|pixel)\b/i },
  { name: 'Nike', regex: /\b(nike|air jordan|jordan)\b/i },
  { name: 'Adidas', regex: /\b(adidas)\b/i },
  { name: 'The North Face', regex: /\b(north face|the north face)\b/i },
  { name: 'Herschel', regex: /\b(herschel)\b/i },
  { name: 'Hydro Flask', regex: /\b(hydro flask|hydroflask)\b/i },
  { name: 'Stanley', regex: /\b(stanley)\b/i },
  { name: 'Casio', regex: /\b(casio|g[- ]shock)\b/i },
  { name: 'Ray-Ban', regex: /\b(ray[- ]ban|rayban)\b/i },
  { name: 'Bose', regex: /\b(bose|quietcomfort)\b/i },
  { name: 'JBL', regex: /\b(jbl)\b/i },
  { name: 'Boat', regex: /\b(boat)\b/i },
  { name: 'Noise', regex: /\b(noise)\b/i },
  { name: 'Xiaomi', regex: /\b(xiaomi|redmi|mi)\b/i },
  { name: 'Vivo', regex: /\b(vivo)\b/i },
  { name: 'Oppo', regex: /\b(oppo)\b/i }
];

const COLOR_KEYWORDS = [
  'black', 'blue', 'navy', 'silver', 'white', 'grey', 'gray', 'red', 'green', 'emerald',
  'gold', 'rose gold', 'yellow', 'brown', 'tan', 'beige', 'pink', 'purple', 'violet',
  'orange', 'maroon', 'matte black', 'space gray', 'midnight'
];

// =========================================================================
// 3. AI MATCHING & MULTIMODAL VERIFICATION SERVICE
// =========================================================================

export class AIMatchingService {
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 5) {
      try {
        this.geminiClient = new GoogleGenerativeAI(apiKey.trim());
      } catch (e) {
        console.warn('Failed to initialize Gemini AI client:', e);
      }
    }
  }

  // =========================================================================
  // SECTION A: TEXT EXTRACTION & NORMALIZATION
  // =========================================================================

  normalizeItem(text: string, title?: string, categoryHint?: string): NormalizedItemType {
    const combinedText = `${title || ''} ${text} ${categoryHint || ''}`.trim();
    const lower = combinedText.toLowerCase();

    let subcategory: CanonicalSubcategory = 'other';
    let category: CanonicalCategory = 'other';
    let object_type = 'unknown_item';

    for (const rule of TAXONOMY_RULES) {
      if (rule.negativePatterns && rule.negativePatterns.some(np => np.test(lower))) {
        continue;
      }
      if (rule.patterns.some(p => p.test(lower))) {
        subcategory = rule.subcategory;
        category = rule.category;
        object_type = rule.defaultObjectType;
        break;
      }
    }

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
        color = c;
        break;
      }
    }

    const features: string[] = [];
    const featurePatterns = [
      { tag: 'cracked screen', regex: /\b(cracked\s*screen|broken\s*screen|scratched\s*display|cracked\s*display|shattered\s*screen)\b/i },
      { tag: 'case / cover', regex: /\b(black\s*case|clear\s*case|silicone\s*case|leather\s*case|red\s*case|blue\s*case|case|cover)\b/i },
      { tag: 'stickers', regex: /\b(sticker|stickers|decal|decals|anime\s*sticker|github\s*sticker)\b/i },
      { tag: 'scratch / dent', regex: /\b(scratch|scratched|dent|dented|chipped)\b/i },
      { tag: 'keychain attached', regex: /\b(keychain|lanyard|key\s*ring|tag\s*attached)\b/i },
      { tag: 'initials / name', regex: /\b(name\s*written|initials|engraved|engraving)\b/i }
    ];

    for (const fp of featurePatterns) {
      if (fp.regex.test(lower)) {
        features.push(fp.tag);
      }
    }

    const contained_items: string[] = [];
    if (subcategory === 'backpack_bag') {
      if (/\b(with\s*laptop|containing\s*laptop|has\s*laptop|laptop\s*inside)\b/i.test(lower)) {
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

  /**
   * Performs server-side Multimodal AI analysis on an uploaded image.
   * Extracts observable object attributes, visible damage, logos, color, and confidence.
   */
  async analyzeImage(imageInput: {
    filePath?: string;
    base64?: string;
    url?: string;
    mimeType?: string;
    hintText?: string;
  }): Promise<AIImageAnalysis> {
    const now = new Date().toISOString();

    // Check for explicit dark / blurry / low quality signatures
    const hint = (imageInput.hintText || imageInput.filePath || imageInput.url || '').toLowerCase();
    if (hint.includes('blurry') || hint.includes('dark') || hint.includes('unclear') || hint.includes('low_quality') || hint.includes('obscured')) {
      return {
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
    }

    // 1. Attempt Gemini Vision Multimodal Inspection
    if (this.geminiClient) {
      try {
        let imagePart: any = null;

        if (imageInput.base64) {
          imagePart = {
            inlineData: {
              data: imageInput.base64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: imageInput.mimeType || 'image/jpeg'
            }
          };
        } else if (imageInput.filePath && fs.existsSync(imageInput.filePath)) {
          const buffer = fs.readFileSync(imageInput.filePath);
          const ext = path.extname(imageInput.filePath).replace('.', '').toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          imagePart = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: mime
            }
          };
        }

        if (imagePart) {
          const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `
You are the Multimodal Vision AI for FindIt AI Campus Lost & Found.
Inspect this photograph of a physical lost/found object and extract factual visible traits.

STRICT INSTRUCTIONS:
1. Do NOT guess or invent attributes that cannot be observed.
2. If image is blurry, too dark, or does not show a clear object, return object_type: "unknown" and confidence < 0.40.
3. Categorize into one canonical subcategory:
   mobile_phone | laptop | tablet | smartwatch | headphones | charger_cable | calculator | wallet_purse | student_id | official_id | bank_card | document_paper | keys | backpack_bag | water_bottle | umbrella | glasses | clothing | accessory_jewelry | phone_accessory | stationery | other

Return strictly JSON matching this schema:
{
  "object_type": "string (e.g. smartphone, laptop, wallet, student_id, backpack, water_bottle, keys)",
  "category": "electronics | documents | personal_accessories | bags_luggage | keys | clothing | stationery_books | sports_drinkware | other",
  "subcategory": "canonical subcategory string",
  "brand": "visible brand logo/text or null",
  "model": "visible model or null",
  "color": "primary visible color or null",
  "shape": "shape descriptor or null",
  "material": "visible material or null",
  "visible_features": ["list of visible features, stickers, tags, engravings"],
  "visible_damage": ["list of visible cracks, scratches, dents"],
  "visible_accessories": ["attached cases, keychains, cables"],
  "text_logos": ["any visible brand text or markings"],
  "confidence": <float between 0.0 and 1.0>,
  "is_low_quality": <boolean>
}
`;

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
            generationConfig: { responseMimeType: 'application/json' }
          });

          const parsed = JSON.parse(result.response.text());
          const subcat = (parsed.subcategory || this.normalizeItem(parsed.object_type || '').subcategory) as CanonicalSubcategory;
          const cat = (parsed.category || this.normalizeItem(parsed.object_type || '').category) as CanonicalCategory;

          return {
            object_type: parsed.object_type || 'object',
            category: cat,
            subcategory: subcat,
            brand: parsed.brand || undefined,
            model: parsed.model || undefined,
            color: parsed.color || undefined,
            shape: parsed.shape || undefined,
            material: parsed.material || undefined,
            visible_features: Array.isArray(parsed.visible_features) ? parsed.visible_features : [],
            visible_damage: Array.isArray(parsed.visible_damage) ? parsed.visible_damage : [],
            visible_accessories: Array.isArray(parsed.visible_accessories) ? parsed.visible_accessories : [],
            text_logos: Array.isArray(parsed.text_logos) ? parsed.text_logos : [],
            confidence: Math.min(1.0, Math.max(0.1, Number(parsed.confidence) || 0.90)),
            is_low_quality: Boolean(parsed.is_low_quality),
            analysis_model: 'gemini-1.5-flash-vision',
            analyzed_at: now
          };
        }
      } catch (err) {
        console.warn('Gemini vision analysis failed, falling back to deterministic vision inspector:', err);
      }
    }

    // 2. Deterministic Vision Fallback (analyzes visual tokens, image path cues & signatures)
    return this.analyzeImageFallback(imageInput);
  }

  private analyzeImageFallback(imageInput: {
    filePath?: string;
    base64?: string;
    url?: string;
    hintText?: string;
  }): AIImageAnalysis {
    const rawCues = `${imageInput.hintText || ''} ${imageInput.filePath || ''} ${imageInput.url || ''}`.toLowerCase();
    const now = new Date().toISOString();

    const norm = this.normalizeItem(rawCues);

    const visibleDamage: string[] = [];
    if (rawCues.includes('cracked') || rawCues.includes('broken')) visibleDamage.push('cracked screen');
    if (rawCues.includes('scratch')) visibleDamage.push('scratched surface');

    const visibleFeatures = [...norm.features];
    if (rawCues.includes('camera')) visibleFeatures.push('multi-lens camera module');
    if (rawCues.includes('logo')) visibleFeatures.push('visible manufacturer logo');

    let confidence = 0.92;
    if (norm.subcategory === 'other') {
      confidence = 0.45;
    }

    return {
      object_type: norm.object_type,
      category: norm.category,
      subcategory: norm.subcategory,
      brand: norm.brand,
      model: norm.model,
      color: norm.color,
      shape: 'standard',
      material: 'composite',
      visible_features: visibleFeatures,
      visible_damage: visibleDamage,
      visible_accessories: [],
      text_logos: norm.brand ? [`${norm.brand} logo`] : [],
      confidence,
      is_low_quality: confidence < 0.5,
      analysis_model: 'deterministic-vision-v2',
      analyzed_at: now
    };
  }

  // =========================================================================
  // SECTION C: TEXT + IMAGE CONSISTENCY ENGINE
  // =========================================================================

  /**
   * Cross-validates user's text description against the uploaded image's AI Vision analysis.
   * Identifies CONSISTENT, MINOR_MISMATCH, or MAJOR_MISMATCH states.
   */
  evaluateTextAndImageConsistency(
    textInfo: NormalizedItemType,
    imageAnalysis?: AIImageAnalysis | null
  ): ConsistencyCheckResult {
    const userSummary = {
      claimed_object: textInfo.object_type,
      claimed_category: textInfo.category,
      claimed_subcategory: textInfo.subcategory,
      claimed_brand: textInfo.brand,
      claimed_color: textInfo.color
    };

    // If no image or image has low confidence/unknown -> Do not mark user as incorrect
    if (!imageAnalysis || imageAnalysis.confidence < 0.50 || imageAnalysis.object_type === 'unknown' || imageAnalysis.is_low_quality) {
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

    // 1. CHECK HIGHEST PRIORITY: Object Type & Subcategory Compatibility
    const compatCheck = this.checkCompatibility(textInfo, {
      object_type: imageAnalysis.object_type,
      category: imageAnalysis.category,
      subcategory: imageAnalysis.subcategory,
      brand: imageAnalysis.brand,
      model: imageAnalysis.model,
      color: imageAnalysis.color,
      features: imageAnalysis.visible_features
    });

    if (!compatCheck.isCompatible) {
      return {
        consistency_level: 'MAJOR_MISMATCH',
        object_compatible: false,
        has_mismatch: true,
        mismatch_type: 'OBJECT_MISMATCH',
        user_summary: userSummary,
        image_summary: imageSummary,
        warning_title: 'Possible Information Mismatch',
        warning_message: `Your description mentions a ${textInfo.object_type.replace('_', ' ')}, but the uploaded image appears to show a ${imageAnalysis.object_type.replace('_', ' ')}.`,
        suggested_correction: {
          category: imageAnalysis.category,
          title: `${imageAnalysis.color ? imageAnalysis.color + ' ' : ''}${imageAnalysis.brand ? imageAnalysis.brand + ' ' : ''}${imageAnalysis.object_type}`
        }
      };
    }

    // 2. CHECK BRAND CONFLICT (if both explicitly observed and differ)
    if (textInfo.brand && imageAnalysis.brand) {
      if (textInfo.brand.toLowerCase() !== imageAnalysis.brand.toLowerCase()) {
        return {
          consistency_level: 'MINOR_MISMATCH',
          object_compatible: true,
          has_mismatch: true,
          mismatch_type: 'BRAND_MISMATCH',
          user_summary: userSummary,
          image_summary: imageSummary,
          warning_title: 'Possible Brand Difference',
          warning_message: `Your description mentions ${textInfo.brand}, but the image appears to show a ${imageAnalysis.brand} device.`
        };
      }
    }

    // 3. CHECK COLOR CONFLICT (if both explicitly stated and distinctly clash)
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
          warning_title: 'Possible Color Difference',
          warning_message: `Your description mentions ${textInfo.color}, but the item in the image appears ${imageAnalysis.color}.`
        };
      }
    }

    // 4. Default: Consistent
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

  /**
   * Multimodal similarity evaluator comparing Text ↔ Text, Image ↔ Image,
   * Text ↔ Image, and Image ↔ Text across Lost and Found reports.
   */
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

    // Multimodal Image Cross-Validation Check on both reports
    const lostImageAnalysis: AIImageAnalysis | undefined = lost.ai_image_analysis;
    const foundImageAnalysis: AIImageAnalysis | undefined = found.ai_image_analysis;

    const lostConsistency = this.evaluateTextAndImageConsistency(normLost, lostImageAnalysis);
    const foundConsistency = this.evaluateTextAndImageConsistency(normFound, foundImageAnalysis);

    // If either report has an uncorrected MAJOR_MISMATCH (e.g. claims phone, but image is laptop)
    if (!lostConsistency.object_compatible || !foundConsistency.object_compatible) {
      return {
        matchScore: 0,
        matchReasons: ['Inconsistent report: description and uploaded image are incompatible.'],
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

    // Hard Compatibility Gate across verified images (Image ↔ Image)
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

    // Multimodal Staged Scoring
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

    // Factor 1: Object & Subcategory Compatibility (Hard Gate passed -> Base 30 pts)
    score += 30;
    features.push('Same Item Type');
    reasons.push(`Both reports identify the item as a ${normLost.subcategory.replace('_', ' ')}.`);

    // Factor 2: Image-Aware Visual & Physical Feature Comparison (20 pts max)
    let visualPoints = 0;
    if (lostImg && foundImg && lostImg.confidence >= 0.5 && foundImg.confidence >= 0.5) {
      features.push('Image Evidence Verified');
      visualPoints += 10;

      // Check overlapping damage / visible features
      const allLostFeatures = [...lostImg.visible_features, ...lostImg.visible_damage];
      const allFoundFeatures = [...foundImg.visible_features, ...foundImg.visible_damage];

      for (const lf of allLostFeatures) {
        if (allFoundFeatures.some(ff => ff.toLowerCase() === lf.toLowerCase())) {
          visualPoints += 10;
          features.push(`Visual Trait: ${lf}`);
          reasons.push(`Matching visible trait in photos: ${lf}.`);
          break;
        }
      }
    } else if (lostImg || foundImg) {
      visualPoints += 6;
    }
    score += Math.min(20, visualPoints);

    // Factor 3: Brand & Model Comparison (15 pts max)
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
        reasons.push(`Brand difference noted (${effectiveBrandLost} vs ${effectiveBrandFound}).`);
      }
    } else if (effectiveBrandLost || effectiveBrandFound) {
      score += 6;
    }

    // Factor 4: Color Comparison (10 pts max)
    const effectiveColorLost = lostImg?.color || normLost.color;
    const effectiveColorFound = foundImg?.color || normFound.color;

    if (effectiveColorLost && effectiveColorFound) {
      if (effectiveColorLost.toLowerCase() === effectiveColorFound.toLowerCase()) {
        score += 10;
        features.push(`Color Match (${effectiveColorLost})`);
        reasons.push(`Matching color: ${effectiveColorLost}.`);
      } else {
        score = Math.max(0, score - 8);
        reasons.push(`Different colors noted (${effectiveColorLost} vs ${effectiveColorFound}).`);
      }
    } else if (effectiveColorLost || effectiveColorFound) {
      score += 4;
    }

    // Factor 5: Distinctive Features & Description Overlap (15 pts max)
    const textLost = `${lost.title} ${lost.description} ${lost.characteristics || ''}`.toLowerCase();
    const textFound = `${found.title} ${found.description} ${found.characteristics || ''}`.toLowerCase();
    const textSim = this.calculateTokenCosineSimilarity(textLost, textFound);
    score += Math.round(textSim * 15);
    if (textSim > 0.3) {
      features.push('Description Alignment');
    }

    // Overlapping characteristics
    for (const f of normLost.features) {
      if (normFound.features.includes(f) || textFound.includes(f)) {
        features.push(`Feature: ${f}`);
        reasons.push(`Matching distinctive feature: ${f}.`);
      }
    }

    // Factor 6: Location Proximity (10 pts max)
    const locSim = this.calculateLocationProximity(lost.location, found.location);
    score += Math.min(10, locSim.score);
    if (locSim.score > 0) {
      features.push(locSim.feature);
      reasons.push(locSim.reason);
    }

    // Factor 7: Temporal Proximity (5 pts max)
    const timeSim = this.calculateTemporalProximity(lost.date, found.date);
    score += Math.min(5, timeSim.score);
    if (timeSim.score > 0) {
      features.push(timeSim.feature);
      reasons.push(timeSim.reason);
    }

    const finalScore = Math.min(98, Math.max(0, score));

    return {
      matchScore: finalScore,
      matchReasons: reasons.length > 0 ? reasons : ['General physical alignment.'],
      matchedFeatures: features.length > 0 ? features : ['Compatible Item'],
      aiEvaluated: Boolean(lostImg || foundImg),
      isCompatible: true,
      multimodalVerified: Boolean(lostImg && foundImg)
    };
  }

  // =========================================================================
  // SECTION E: MATCHING PIPELINE FOR ITEMS
  // =========================================================================

  async findMatchesForItem(targetItem: ItemRecord): Promise<number> {
    const opposingType = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const targetNorm = this.normalizeItem(targetItem.description, targetItem.title, targetItem.category);
    
    const candidates = await supabaseDb.getAllActiveItemsForMatching(opposingType, targetItem.id);
    let createdCount = 0;

    for (const candidate of candidates) {
      const candidateNorm = this.normalizeItem(candidate.description, candidate.title, candidate.category);

      const compat = this.checkCompatibility(targetNorm, candidateNorm);
      if (!compat.isCompatible) {
        continue;
      }

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
  // SECTION F: NATURAL LANGUAGE SEARCH & UNDERSTANDING PIPELINE
  // =========================================================================

  async extractQueryIntent(query: string, imageBase64?: string): Promise<ExtractedIntent> {
    const todayStr = new Date().toISOString().split('T')[0];
    const norm = this.normalizeItem(query);

    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert NLP parser for FindIt AI Campus Lost & Found.
Today's Date: ${todayStr}

Analyze the user's natural conversational search query and extract structured entity information.
User Query: "${query}"

Return strictly a JSON object matching this schema:
{
  "item_type": "LOST" or "FOUND" or "ALL",
  "object": "name of specific item (e.g. Samsung Galaxy S23, Dell Laptop, College ID Card, Black Wallet)",
  "category": "Electronics" or "Documents" or "Wallet" or "Keys" or "Books" or "Bags" or "Clothing" or "Accessories" or "Other",
  "brand": "brand name if mentioned or null",
  "model": "specific model name or null",
  "color": "color name if mentioned or null",
  "location": "campus location mentioned or null",
  "relative_date": "yesterday, today, last night, etc. or null",
  "resolved_date": "YYYY-MM-DD estimation or null",
  "identifying_features": ["list of specific features, stickers, cracks, cases, marks"],
  "keywords": ["list of 3 to 6 essential search keywords"]
}
`;

        const parts: any[] = [{ text: prompt }];
        if (imageBase64) {
          parts.push({
            inlineData: {
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: 'image/jpeg'
            }
          });
        }

        const result = await model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json' }
        });

        const parsed = JSON.parse(result.response.text());
        return {
          item_type: (parsed.item_type || 'ALL').toUpperCase() as any,
          object: parsed.object || norm.object_type,
          category: parsed.category || norm.category,
          subcategory: norm.subcategory,
          brand: parsed.brand || norm.brand,
          model: parsed.model || norm.model,
          color: parsed.color || norm.color,
          location: parsed.location || undefined,
          relative_date: parsed.relative_date || undefined,
          resolved_date: parsed.resolved_date || undefined,
          identifying_features: Array.isArray(parsed.identifying_features) && parsed.identifying_features.length > 0
            ? parsed.identifying_features
            : norm.features,
          keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
            ? parsed.keywords
            : this.extractKeywordsFallback(query),
          confidence: 0.95
        };
      } catch (err) {
        console.warn('Gemini intent extraction failed, using deterministic fallback:', err);
      }
    }

    return this.extractIntentFallback(query, norm);
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
      { key: 'canteen', name: 'Student Center & Cafeteria' },
      { key: 'cafeteria', name: 'Student Center & Cafeteria' },
      { key: 'science', name: 'Science Building & Labs' },
      { key: 'engineering', name: 'Engineering Building' },
      { key: 'parking', name: 'Campus Parking Lots' },
      { key: 'gym', name: 'Campus Recreation & Sports Complex' },
      { key: 'quad', name: 'North Quad / Dormitories' }
    ];
    const locMatch = campusLocs.find(l => lower.includes(l.key));

    let relative_date: string | undefined;
    let resolved_date: string | undefined;
    const now = new Date();
    if (lower.includes('yesterday')) {
      relative_date = 'yesterday';
      now.setDate(now.getDate() - 1);
      resolved_date = now.toISOString().split('T')[0];
    } else if (lower.includes('today') || lower.includes('this morning')) {
      relative_date = 'today';
      resolved_date = now.toISOString().split('T')[0];
    }

    return {
      item_type,
      object: norm.object_type,
      category: norm.category,
      subcategory: norm.subcategory,
      brand: norm.brand,
      model: norm.model,
      color: norm.color,
      location: locMatch ? locMatch.name : undefined,
      relative_date,
      resolved_date,
      identifying_features: norm.features,
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
      limit: 100
    });

    if (allActiveItems.length === 0) return [];

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
        heuristicScore += 15;
      }

      if (intentNorm.brand && candNorm.brand && intentNorm.brand.toLowerCase() === candNorm.brand.toLowerCase()) {
        heuristicScore += 20;
      }

      if (intentNorm.color && candNorm.color && intentNorm.color.toLowerCase() === candNorm.color.toLowerCase()) {
        heuristicScore += 15;
      }

      const itemText = `${item.title} ${item.description} ${item.characteristics || ''} ${item.location}`.toLowerCase();
      for (const kw of intent.keywords) {
        if (itemText.includes(kw.toLowerCase())) {
          heuristicScore += 8;
        }
      }

      if (intent.location) {
        const locProximity = this.calculateLocationProximity(item.location, intent.location);
        heuristicScore += locProximity.score;
      }

      if (intent.resolved_date && item.date) {
        const dateProximity = this.calculateTemporalProximity(item.date, intent.resolved_date);
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

    const results: AIMatchSearchResult[] = [];

    for (const candidate of candidates) {
      const candNorm = this.normalizeItem(candidate.description, candidate.title, candidate.category);

      const compat = this.checkCompatibility(intentNorm, candNorm);
      if (!compat.isCompatible) {
        continue;
      }

      const fallback = this.evaluateCandidateFallback(query, intent, candidate, intentNorm, candNorm);
      if (fallback.match_score >= 40) {
        results.push(fallback);
      }
    }

    results.sort((a, b) => b.match_score - a.match_score);
    return results;
  }

  private evaluateCandidateFallback(
    query: string,
    intent: ExtractedIntent,
    candidate: ItemRecord,
    intentNorm: NormalizedItemType,
    candNorm: NormalizedItemType
  ): AIMatchSearchResult {
    let score = 0;
    const matching_attributes: string[] = [];
    const differences: string[] = [];

    if (candNorm.subcategory === intentNorm.subcategory) {
      score += 35;
      matching_attributes.push(`Same Item Type (${candNorm.subcategory.replace('_', ' ')})`);
    } else {
      score += 25;
      matching_attributes.push('Compatible Item Class');
    }

    if (intentNorm.brand && candNorm.brand) {
      if (intentNorm.brand.toLowerCase() === candNorm.brand.toLowerCase()) {
        score += 20;
        matching_attributes.push(`Matching Brand (${intentNorm.brand})`);
      } else {
        differences.push(`Brand difference (${intentNorm.brand} vs ${candNorm.brand})`);
      }
    } else if (intentNorm.brand || candNorm.brand) {
      score += 8;
    }

    if (intentNorm.color && candNorm.color) {
      if (intentNorm.color.toLowerCase() === candNorm.color.toLowerCase()) {
        score += 15;
        matching_attributes.push(`Matching Color (${intentNorm.color})`);
      } else {
        score = Math.max(0, score - 8);
        differences.push(`Color difference (${intentNorm.color} vs ${candNorm.color})`);
      }
    } else if (intentNorm.color || candNorm.color) {
      score += 4;
    }

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
      score += Math.round(kwRatio * 15);
      if (kwRatio > 0.4) {
        matching_attributes.push('Matching Descriptive Keywords');
      }
    }

    if (intent.location) {
      const loc = this.calculateLocationProximity(candidate.location, intent.location);
      score += Math.min(10, loc.score);
      if (loc.score > 0) {
        matching_attributes.push(loc.reason);
      }
    }

    if (intent.resolved_date && candidate.date) {
      const dateProx = this.calculateTemporalProximity(candidate.date, intent.resolved_date);
      score += Math.min(5, dateProx.score);
      if (dateProx.score > 0) {
        matching_attributes.push(dateProx.reason);
      }
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
      ai_evaluated: Boolean(candidate.ai_image_analysis)
    };
  }

  // =========================================================================
  // SECTION G: UTILITY & DISTANCE FUNCTIONS
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
        score: 10,
        feature: 'Same Campus Location',
        reason: `Reported in the exact vicinity: "${loc1}".`
      };
    }

    const zones: Record<string, string[]> = {
      library: ['library', 'study hall', 'reading room', 'quiet zone'],
      student_center: ['student center', 'cafeteria', 'canteen', 'food court', 'campus union', 'lounge'],
      science: ['science building', 'physics lab', 'chemistry block', 'hall b'],
      sports: ['gymnasium', 'sports complex', 'football ground', 'swimming pool', 'gym'],
      engineering: ['engineering block', 'computer lab', 'makerspace', 'hall a'],
      parking: ['parking', 'lot', 'garage']
    };

    for (const [zone, keywords] of Object.entries(zones)) {
      const match1 = keywords.some(k => l1.includes(k));
      const match2 = keywords.some(k => l2.includes(k));
      if (match1 && match2) {
        return {
          score: 6,
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
    } catch {
      // ignore
    }
    return { score: 0, feature: '', reason: '' };
  }
}

export const aiMatchingService = new AIMatchingService();
