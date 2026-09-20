export type ItemType = 'LOST' | 'FOUND';

export type ItemStatus = 'ACTIVE' | 'MATCH_FOUND' | 'CLAIM_PENDING' | 'RESOLVED' | 'CLOSED';

export type ItemCategory = 
  | 'Electronics'
  | 'Documents'
  | 'Wallet'
  | 'Keys'
  | 'Books'
  | 'Bags'
  | 'Clothing'
  | 'Accessories'
  | 'ID Cards'
  | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  campus?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  created_at?: string;
}

export type ConsistencyLevel = 'CONSISTENT' | 'MINOR_MISMATCH' | 'MAJOR_MISMATCH' | 'UNKNOWN_IMAGE';

export interface AIImageAnalysis {
  object_type: string;
  category: string;
  subcategory: string;
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

export interface ConsistencyCheckResult {
  consistency_level: ConsistencyLevel;
  object_compatible: boolean;
  has_mismatch: boolean;
  mismatch_type?: 'OBJECT_MISMATCH' | 'BRAND_MISMATCH' | 'COLOR_MISMATCH';
  user_summary: {
    claimed_object: string;
    claimed_category: string;
    claimed_subcategory?: string;
    claimed_brand?: string;
    claimed_color?: string;
  };
  image_summary?: {
    detected_object: string;
    detected_category: string;
    detected_subcategory?: string;
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

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  building_zone?: string;
  latitude?: number;
  longitude?: number;
  date: string;
  time?: string;
  status: ItemStatus;
  primary_image?: string;
  characteristics?: string;
  contact_preference?: string;
  // Multimodal AI Verification Fields
  ai_object_type?: string;
  ai_category?: string;
  ai_subcategory?: string;
  ai_brand?: string;
  ai_model?: string;
  ai_color?: string;
  ai_features?: string[];
  ai_image_confidence?: number;
  ai_text_image_consistency?: ConsistencyLevel | string;
  ai_analysis_version?: string;
  ai_analyzed_at?: string;
  ai_image_analysis?: AIImageAnalysis;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
  reporter_campus?: string;
  reporter_avatar?: string;
  potential_matches_count?: number;
  top_match_score?: number;
  claims_count?: number;
  images?: { id: string; image_url: string }[];
}

export interface PotentialMatch {
  match_id: string;
  lost_item_id?: string;
  found_item_id?: string;
  match_score: number;
  match_reasons: string[];
  matched_features: string[];
  ai_evaluated: number | boolean;
  multimodal_verified?: boolean;
  match_status?: string;
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  building_zone?: string;
  date: string;
  time?: string;
  status: ItemStatus;
  primary_image?: string;
  reporter_name?: string;
  reporter_campus?: string;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  location_lost: string;
  date_lost: string;
  identifying_details: string;
  proof_notes?: string;
  contact_share_consent: number | boolean;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
  item_title?: string;
  item_type?: ItemType;
  item_category?: ItemCategory;
  item_location?: string;
  item_date?: string;
  item_status?: ItemStatus;
  item_image?: string;
  reporter_name?: string;
  reporter_campus?: string;
  claimant_name?: string;
  claimant_email?: string;
  claimant_campus?: string;
  claimant_avatar?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: 'AI_MATCH' | 'CLAIM_RECEIVED' | 'CLAIM_APPROVED' | 'CLAIM_REJECTED' | 'WELCOME';
  title: string;
  message: string;
  link_url?: string;
  is_read: number | boolean;
  created_at: string;
}

export interface CampusStats {
  itemsLost: number;
  itemsFound: number;
  totalItems: number;
  resolvedItems: number;
  activeClaims: number;
  potentialMatches: number;
  recoveryRate: number;
}

export interface ExtractedIntent {
  item_type: 'LOST' | 'FOUND' | 'ALL';
  object: string;
  category: string;
  brand?: string;
  color?: string;
  location?: string;
  relative_date?: string;
  resolved_date?: string;
  identifying_features: string[];
  keywords: string[];
  confidence?: number;
}

export interface AIMatchSearchResult {
  item: Item;
  match_score: number;
  match_tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH';
  reason: string;
  matching_attributes: string[];
  differences: string[];
  ai_evaluated: boolean;
}

export interface AISearchResponse {
  query: string;
  intent: ExtractedIntent;
  totalCandidatesScanned: number;
  results: AIMatchSearchResult[];
}

