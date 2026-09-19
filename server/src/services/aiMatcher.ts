import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseService } from '../db/database.js';
import crypto from 'crypto';

export interface MatchResult {
  matchScore: number;
  matchReasons: string[];
  matchedFeatures: string[];
  aiEvaluated: boolean;
}

export interface ItemRecord {
  id: string;
  user_id: string;
  type: 'LOST' | 'FOUND';
  title: string;
  description: string;
  category: string;
  location: string;
  building_zone?: string;
  date: string;
  time?: string;
  status: string;
  primary_image?: string;
  characteristics?: string;
  created_at?: string;
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
  item: ItemRecord;
  match_score: number;
  match_tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH';
  reason: string;
  matching_attributes: string[];
  differences: string[];
  ai_evaluated: boolean;
}

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

  /**
   * Run matching pipeline for a newly created or updated item against opposing active items
   */
  async findMatchesForItem(db: DatabaseService, targetItem: ItemRecord): Promise<number> {
    const opposingType = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';
    
    // Find all active or match-found opposing items
    const candidates = db.query<ItemRecord>(
      `SELECT * FROM items WHERE type = ? AND status IN ('ACTIVE', 'MATCH_FOUND') AND id != ?`,
      [opposingType, targetItem.id]
    );

    let createdCount = 0;

    for (const candidate of candidates) {
      const lostItem = targetItem.type === 'LOST' ? targetItem : candidate;
      const foundItem = targetItem.type === 'FOUND' ? targetItem : candidate;

      // Evaluate similarity
      const matchResult = await this.evaluateSimilarity(lostItem, foundItem);

      // We record matches if score >= 45%
      if (matchResult.matchScore >= 45) {
        const existing = db.queryOne(
          `SELECT id FROM potential_matches WHERE lost_item_id = ? AND found_item_id = ?`,
          [lostItem.id, foundItem.id]
        );

        const matchId = existing ? existing.id : crypto.randomUUID();
        const reasonsJson = JSON.stringify(matchResult.matchReasons);
        const featuresJson = JSON.stringify(matchResult.matchedFeatures);

        if (existing) {
          db.run(
            `UPDATE potential_matches 
             SET match_score = ?, match_reasons = ?, matched_features = ?, ai_evaluated = ?
             WHERE id = ?`,
            [matchResult.matchScore, reasonsJson, featuresJson, matchResult.aiEvaluated ? 1 : 0, matchId]
          );
        } else {
          db.run(
            `INSERT INTO potential_matches (id, lost_item_id, found_item_id, match_score, match_reasons, matched_features, ai_evaluated, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [matchId, lostItem.id, foundItem.id, matchResult.matchScore, reasonsJson, featuresJson, matchResult.aiEvaluated ? 1 : 0]
          );
          createdCount++;

          // Create notifications for both users if they are different
          this.createMatchNotification(db, lostItem.user_id, lostItem, foundItem, matchResult.matchScore);
          if (lostItem.user_id !== foundItem.user_id) {
            this.createMatchNotification(db, foundItem.user_id, foundItem, lostItem, matchResult.matchScore);
          }
        }

        // Update item status to MATCH_FOUND if currently ACTIVE
        if (lostItem.status === 'ACTIVE') {
          db.run(`UPDATE items SET status = 'MATCH_FOUND' WHERE id = ?`, [lostItem.id]);
        }
        if (foundItem.status === 'ACTIVE') {
          db.run(`UPDATE items SET status = 'MATCH_FOUND' WHERE id = ?`, [foundItem.id]);
        }
      }
    }

    return createdCount;
  }

  /**
   * Evaluates similarity between a lost item and a found item
   */
  async evaluateSimilarity(lost: ItemRecord, found: ItemRecord): Promise<MatchResult> {
    if (this.geminiClient) {
      try {
        const aiResult = await this.evaluateWithGemini(lost, found);
        if (aiResult) return aiResult;
      } catch (err) {
        console.warn('Gemini API call failed, falling back to deterministic algorithm:', err);
      }
    }

    return this.evaluateDeterministic(lost, found);
  }

  private async evaluateWithGemini(lost: ItemRecord, found: ItemRecord): Promise<MatchResult | null> {
    if (!this.geminiClient) return null;

    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an AI assistant for a campus Lost & Found system called FindIt AI.
Analyze the following LOST item report and FOUND item report to determine the likelihood they are the same physical item.

CRITICAL SAFETY DIRECTIVE:
Never declare definitive ownership. Only assess potential similarity.

LOST ITEM:
- Title: ${lost.title}
- Category: ${lost.category}
- Description: ${lost.description}
- Location: ${lost.location} ${lost.building_zone ? '(' + lost.building_zone + ')' : ''}
- Date Lost: ${lost.date} ${lost.time || ''}
- Distinctive Characteristics: ${lost.characteristics || 'None stated'}

FOUND ITEM:
- Title: ${found.title}
- Category: ${found.category}
- Description: ${found.description}
- Location Found: ${found.location} ${found.building_zone ? '(' + found.building_zone + ')' : ''}
- Date Found: ${found.date} ${found.time || ''}
- Distinctive Characteristics: ${found.characteristics || 'None stated'}

Respond strictly with a JSON object matching this schema:
{
  "match_score": <number between 0 and 100 representing potential match percentage>,
  "match_reasons": [<2 to 4 concise bullet points explaining why they may be related, e.g. "Matching color and model description", "Found near the same campus zone 1 day later">],
  "matched_features": [<2 to 4 short tag names, e.g. "Category Match", "Location Proximity", "Brand & Model", "Timeline Alignment">]
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      matchScore: Math.min(100, Math.max(0, Math.round(parsed.match_score || 0))),
      matchReasons: Array.isArray(parsed.match_reasons) ? parsed.match_reasons : ['Potential similarity detected in item metadata.'],
      matchedFeatures: Array.isArray(parsed.matched_features) ? parsed.matched_features : ['Category Match'],
      aiEvaluated: true
    };
  }

  // =========================================================================
  // NATURAL LANGUAGE SEARCH & UNDERSTANDING PIPELINE
  // =========================================================================

  /**
   * Stage 1: Natural Language Intent & Entity Extraction
   */
  async extractQueryIntent(query: string, imageBase64?: string): Promise<ExtractedIntent> {
    const todayStr = new Date().toISOString().split('T')[0];

    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert NLP parser for FindIt AI Campus Lost & Found.
Today's Date: ${todayStr}

Analyze the user's natural conversational search query and extract structured entity information.

User Query: "${query}"

Return strictly a JSON object with this exact schema:
{
  "item_type": "LOST" or "FOUND" or "ALL",
  "object": "name of item or device (e.g. Samsung S24, Blue Backpack, Student ID, Wallet)",
  "category": "Electronics" or "Documents" or "Wallet" or "Keys" or "Books" or "Bags" or "Clothing" or "Accessories" or "ID Cards" or "Other",
  "brand": "brand name if mentioned or null",
  "color": "color name if mentioned or null",
  "location": "campus location mentioned (e.g. library, canteen, cafeteria, science building, parking lot) or null",
  "relative_date": "yesterday, today, last night, two days ago, etc. or null",
  "resolved_date": "YYYY-MM-DD estimation based on relative_date and today's date ${todayStr} or null",
  "identifying_features": ["list of specific features, stickers, cracks, cases, contents, markings"],
  "keywords": ["list of 3 to 8 essential search keywords and synonyms to query the database"]
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
          object: parsed.object || query,
          category: parsed.category || this.inferCategoryFromText(query),
          brand: parsed.brand || undefined,
          color: parsed.color || undefined,
          location: parsed.location || undefined,
          relative_date: parsed.relative_date || undefined,
          resolved_date: parsed.resolved_date || undefined,
          identifying_features: Array.isArray(parsed.identifying_features) ? parsed.identifying_features : [],
          keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 
            ? parsed.keywords 
            : this.extractKeywordsFallback(query),
          confidence: 0.95
        };
      } catch (err) {
        console.warn('Gemini intent extraction failed, using deterministic fallback:', err);
      }
    }

    return this.extractIntentFallback(query);
  }

  /**
   * Deterministic fallback intent extractor
   */
  private extractIntentFallback(query: string): ExtractedIntent {
    const lower = query.toLowerCase();
    
    // Determine type
    let item_type: 'LOST' | 'FOUND' | 'ALL' = 'ALL';
    if (lower.includes('lost') || lower.includes('misplaced') || lower.includes('left my') || lower.includes('missing')) {
      item_type = 'LOST';
    } else if (lower.includes('found') || lower.includes('picked up') || lower.includes('saw a') || lower.includes('discovered')) {
      item_type = 'FOUND';
    }

    const category = this.inferCategoryFromText(query);
    const keywords = this.extractKeywordsFallback(query);

    // Color extraction
    const colors = ['black', 'blue', 'silver', 'white', 'grey', 'gray', 'red', 'green', 'gold', 'yellow', 'brown', 'pink', 'purple'];
    const matchedColor = colors.find(c => lower.includes(c));

    // Brand extraction
    const brands = ['apple', 'samsung', 'dell', 'hp', 'lenovo', 'sony', 'nike', 'adidas', 'north face', 'herschel', 'hydro flask', 'casio'];
    const matchedBrand = brands.find(b => lower.includes(b));

    // Location extraction
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

    // Relative date
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
      object: keywords.slice(0, 3).join(' ') || query,
      category,
      brand: matchedBrand,
      color: matchedColor,
      location: locMatch ? locMatch.name : undefined,
      relative_date,
      resolved_date,
      identifying_features: [],
      keywords,
      confidence: 0.75
    };
  }

  private inferCategoryFromText(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('phone') || t.includes('mobile') || t.includes('smartphone') || t.includes('laptop') || t.includes('macbook') || t.includes('ipad') || t.includes('tablet') || t.includes('airpods') || t.includes('earbuds') || t.includes('charger') || t.includes('calculator')) return 'Electronics';
    if (t.includes('wallet') || t.includes('purse') || t.includes('money')) return 'Wallet';
    if (t.includes('id') || t.includes('card') || t.includes('badge') || t.includes('license') || t.includes('passport')) return 'ID Cards';
    if (t.includes('keys') || t.includes('keychain') || t.includes('fob')) return 'Keys';
    if (t.includes('bag') || t.includes('backpack') || t.includes('tote') || t.includes('duffel')) return 'Bags';
    if (t.includes('jacket') || t.includes('hoodie') || t.includes('coat') || t.includes('sweater') || t.includes('shirt') || t.includes('cap')) return 'Clothing';
    if (t.includes('book') || t.includes('notebook') || t.includes('textbook') || t.includes('binder')) return 'Books';
    if (t.includes('document') || t.includes('paper') || t.includes('folder') || t.includes('file')) return 'Documents';
    if (t.includes('watch') || t.includes('glasses') || t.includes('sunglasses') || t.includes('ring') || t.includes('necklace') || t.includes('bottle') || t.includes('umbrella')) return 'Accessories';
    return 'Other';
  }

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

  /**
   * Stage 2: Retrieve candidate items from database using multi-signal search
   */
  async findCandidatesForIntent(db: DatabaseService, intent: ExtractedIntent, filterType?: string): Promise<ItemRecord[]> {
    // If the user said "I lost...", we want to search for FOUND items in the DB!
    // If user said "Someone found...", we search for LOST items in the DB.
    let targetType: string | null = null;
    if (filterType && filterType !== 'ALL') {
      targetType = filterType;
    } else if (intent.item_type === 'LOST') {
      targetType = 'FOUND';
    } else if (intent.item_type === 'FOUND') {
      targetType = 'LOST';
    }

    // Pull active items
    let querySql = `SELECT * FROM items WHERE status IN ('ACTIVE', 'MATCH_FOUND')`;
    const params: any[] = [];

    if (targetType) {
      querySql += ` AND type = ?`;
      params.push(targetType);
    }

    const allActiveItems = db.query<ItemRecord>(querySql, params);
    if (allActiveItems.length === 0) return [];

    // Score candidates based on multi-signal heuristic to select top 10
    const scoredCandidates = allActiveItems.map(item => {
      let heuristicScore = 0;

      // Category match
      if (item.category.toLowerCase() === intent.category.toLowerCase()) {
        heuristicScore += 30;
      } else if (this.areRelatedCategories(item.category, intent.category)) {
        heuristicScore += 15;
      }

      // Keyword & Semantic Overlap
      const itemText = `${item.title} ${item.description} ${item.characteristics || ''} ${item.location}`.toLowerCase();
      
      for (const kw of intent.keywords) {
        if (itemText.includes(kw.toLowerCase())) {
          heuristicScore += 12;
        }
      }

      // Color match
      if (intent.color && itemText.includes(intent.color.toLowerCase())) {
        heuristicScore += 15;
      }

      // Brand match
      if (intent.brand && itemText.includes(intent.brand.toLowerCase())) {
        heuristicScore += 15;
      }

      // Location match
      if (intent.location) {
        const locProximity = this.calculateLocationProximity(item.location, intent.location);
        heuristicScore += locProximity.score;
      }

      // Date proximity
      if (intent.resolved_date && item.date) {
        const dateProximity = this.calculateTemporalProximity(item.date, intent.resolved_date);
        heuristicScore += dateProximity.score;
      }

      return { item, heuristicScore };
    });

    // Sort by heuristic score and take top 10
    scoredCandidates.sort((a, b) => b.heuristicScore - a.heuristicScore);
    return scoredCandidates.slice(0, 10).map(sc => sc.item);
  }

  /**
   * Stage 3 & 4: Deep Natural Language Match Analysis & Ranking
   */
  async evaluateNaturalLanguageMatches(
    query: string,
    intent: ExtractedIntent,
    candidates: ItemRecord[]
  ): Promise<AIMatchSearchResult[]> {
    if (candidates.length === 0) return [];

    const results: AIMatchSearchResult[] = [];

    for (const candidate of candidates) {
      if (this.geminiClient) {
        try {
          const aiEvaluation = await this.evaluateCandidateWithGemini(query, intent, candidate);
          if (aiEvaluation) {
            results.push(aiEvaluation);
            continue;
          }
        } catch (err) {
          console.warn('Gemini candidate evaluation failed, using fallback:', err);
        }
      }

      // Fallback evaluation
      results.push(this.evaluateCandidateFallback(query, intent, candidate));
    }

    // Rank results by match_score descending
    results.sort((a, b) => b.match_score - a.match_score);

    return results;
  }

  private async evaluateCandidateWithGemini(
    query: string,
    intent: ExtractedIntent,
    candidate: ItemRecord
  ): Promise<AIMatchSearchResult | null> {
    if (!this.geminiClient) return null;

    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are the AI Match Reasoner for FindIt AI Campus Lost & Found.

USER DESCRIPTION / QUERY:
"${query}"

STRUCTURED USER INTENT:
- Category: ${intent.category}
- Object: ${intent.object}
- Brand: ${intent.brand || 'Not specified'}
- Color: ${intent.color || 'Not specified'}
- Location: ${intent.location || 'Not specified'}
- Date: ${intent.resolved_date || intent.relative_date || 'Recent'}
- Identifying Features: ${intent.identifying_features.join(', ') || 'None'}

CANDIDATE DATABASE ITEM:
- Title: ${candidate.title}
- Category: ${candidate.category}
- Type: ${candidate.type}
- Description: ${candidate.description}
- Location: ${candidate.location} ${candidate.building_zone ? '(' + candidate.building_zone + ')' : ''}
- Date: ${candidate.date} ${candidate.time || ''}
- Distinctive Characteristics: ${candidate.characteristics || 'None stated'}

CRITICAL SAFETY DIRECTIVE:
Never declare definitive ownership. Use "Potential Match" phrasing.
Analyze semantic similarity, synonyms (e.g. mobile/phone/smartphone, backpack/school bag, student ID/college card), location proximity, and differences.

Respond strictly with a JSON object matching this schema:
{
  "is_potential_match": true or false,
  "match_score": <number between 0 and 98 representing potential match confidence>,
  "reason": "<2-3 sentence clear and concise explanation of why this item is a potential match or why differences exist>",
  "matching_attributes": ["<2 to 4 concise bullet points of matching traits with green checkmark formatting style, e.g. 'Samsung smartphone', 'Black color', 'Found near College Library', 'Matching transparent case'>"],
  "differences": ["<0 to 2 subtle differences noted, e.g. 'Listing does not explicitly mention the crack near camera'>"]
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(result.response.text());
    const score = Math.min(98, Math.max(0, Math.round(parsed.match_score || 0)));

    let tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH' = 'POSSIBLE_MATCH';
    if (score >= 85) tier = 'STRONG_MATCH';
    else if (score >= 70) tier = 'POTENTIAL_MATCH';

    return {
      item: candidate,
      match_score: score,
      match_tier: tier,
      reason: parsed.reason || 'AI identified semantic and contextual alignment with your description.',
      matching_attributes: Array.isArray(parsed.matching_attributes) ? parsed.matching_attributes : ['Category Match', 'Descriptive Keyword Match'],
      differences: Array.isArray(parsed.differences) ? parsed.differences : [],
      ai_evaluated: true
    };
  }

  private evaluateCandidateFallback(
    query: string,
    intent: ExtractedIntent,
    candidate: ItemRecord
  ): AIMatchSearchResult {
    let score = 0;
    const matching_attributes: string[] = [];
    const differences: string[] = [];

    // Category (25 pts)
    if (candidate.category.toLowerCase() === intent.category.toLowerCase()) {
      score += 25;
      matching_attributes.push(`Same Category (${candidate.category})`);
    } else if (this.areRelatedCategories(candidate.category, intent.category)) {
      score += 15;
      matching_attributes.push(`Related Category (${candidate.category})`);
    }

    // Semantic Text Similarity (35 pts)
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
      score += Math.round(kwRatio * 35);
      if (kwRatio > 0.5) {
        matching_attributes.push('High description & keyword alignment');
      } else if (kwRatio > 0.2) {
        matching_attributes.push('Matching key terms');
      }
    }

    // Color & Brand (15 pts)
    if (intent.color && candText.includes(intent.color.toLowerCase())) {
      score += 8;
      matching_attributes.push(`Matching color (${intent.color})`);
    }
    if (intent.brand && candText.includes(intent.brand.toLowerCase())) {
      score += 7;
      matching_attributes.push(`Matching brand (${intent.brand})`);
    }

    // Location Proximity (15 pts)
    if (intent.location) {
      const loc = this.calculateLocationProximity(candidate.location, intent.location);
      score += loc.score;
      if (loc.score > 0) {
        matching_attributes.push(loc.reason);
      }
    }

    // Date Proximity (10 pts)
    if (intent.resolved_date && candidate.date) {
      const dateProx = this.calculateTemporalProximity(candidate.date, intent.resolved_date);
      score += dateProx.score;
      if (dateProx.score > 0) {
        matching_attributes.push(dateProx.reason);
      }
    }

    const finalScore = Math.min(96, Math.max(35, score));
    let tier: 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'POSSIBLE_MATCH' = 'POSSIBLE_MATCH';
    if (finalScore >= 85) tier = 'STRONG_MATCH';
    else if (finalScore >= 70) tier = 'POTENTIAL_MATCH';

    return {
      item: candidate,
      match_score: finalScore,
      match_tier: tier,
      reason: `Potential match based on ${matching_attributes.slice(0, 2).join(' and ')}.`,
      matching_attributes: matching_attributes.length > 0 ? matching_attributes : ['Category overlap'],
      differences,
      ai_evaluated: false
    };
  }

  // =========================================================================
  // HELPER UTILITIES
  // =========================================================================

  private areRelatedCategories(c1: string, c2: string): boolean {
    const pairs = [
      ['Electronics', 'Accessories'],
      ['Documents', 'ID Cards'],
      ['Bags', 'Accessories'],
      ['Clothing', 'Accessories'],
      ['Wallet', 'ID Cards']
    ];
    const c1L = c1.toLowerCase();
    const c2L = c2.toLowerCase();
    return pairs.some(([a, b]) => 
      (a.toLowerCase() === c1L && b.toLowerCase() === c2L) ||
      (b.toLowerCase() === c1L && a.toLowerCase() === c2L)
    );
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
        score: 15,
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
          score: 10,
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
          score: 15,
          feature: 'Same-Day / 24h Timeline',
          reason: 'Occurred within 24-48 hours of each other.'
        };
      } else if (diffDays <= 3) {
        return {
          score: 10,
          feature: 'Recent Timeline (3 Days)',
          reason: `Dates are within ${Math.round(diffDays)} days of each other.`
        };
      } else if (diffDays <= 7) {
        return {
          score: 5,
          feature: 'Within Same Week',
          reason: 'Occurred within the same week.'
        };
      }
    } catch {
      // ignore
    }
    return { score: 0, feature: '', reason: '' };
  }

  private evaluateDeterministic(lost: ItemRecord, found: ItemRecord): MatchResult {
    let score = 0;
    const reasons: string[] = [];
    const features: string[] = [];

    // Category (30 pts)
    if (lost.category.toLowerCase() === found.category.toLowerCase()) {
      score += 30;
      features.push('Exact Category Match');
      reasons.push(`Both items belong to the "${lost.category}" category.`);
    } else if (this.areRelatedCategories(lost.category, found.category)) {
      score += 15;
      features.push('Related Category');
      reasons.push(`Items are in related categories (${lost.category} and ${found.category}).`);
    }

    // Textual Cosine Similarity (40 pts)
    const lostText = `${lost.title} ${lost.description} ${lost.characteristics || ''}`.toLowerCase();
    const foundText = `${found.title} ${found.description} ${found.characteristics || ''}`.toLowerCase();

    const textSim = this.calculateTokenCosineSimilarity(lostText, foundText);
    const textScore = Math.round(textSim * 40);
    score += textScore;

    if (textSim > 0.4) {
      features.push('High Description Overlap');
      reasons.push('High similarity in item description, color, or distinguishing characteristics.');
    } else if (textSim > 0.2) {
      features.push('Keywords Overlap');
      reasons.push('Key descriptive terms align between both reports.');
    }

    // Location (15 pts)
    const locSim = this.calculateLocationProximity(lost.location, found.location);
    score += locSim.score;
    if (locSim.score > 0) {
      features.push(locSim.feature);
      reasons.push(locSim.reason);
    }

    // Time (15 pts)
    const timeSim = this.calculateTemporalProximity(lost.date, found.date);
    score += timeSim.score;
    if (timeSim.score > 0) {
      features.push(timeSim.feature);
      reasons.push(timeSim.reason);
    }

    const finalScore = Math.min(98, Math.max(0, score));

    return {
      matchScore: finalScore,
      matchReasons: reasons.length > 0 ? reasons : ['General campus lost/found proximity.'],
      matchedFeatures: features.length > 0 ? features : ['General Attributes'],
      aiEvaluated: false
    };
  }

  private createMatchNotification(db: DatabaseService, userId: string, myItem: ItemRecord, otherItem: ItemRecord, score: number) {
    const notifId = crypto.randomUUID();
    const title = `AI Potential Match Found (${score}%)`;
    const message = `Our AI detected a potential match between your ${myItem.type.toLowerCase()} item "${myItem.title}" and a ${otherItem.type.toLowerCase()} item "${otherItem.title}".`;
    const linkUrl = `/items/${myItem.id}`;

    db.run(
      `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
       VALUES (?, ?, 'AI_MATCH', ?, ?, ?, 0)`,
      [notifId, userId, title, message, linkUrl]
    );
  }
}

export const aiMatchingService = new AIMatchingService();
