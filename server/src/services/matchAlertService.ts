import crypto from 'crypto';
import { supabaseDb, ItemRecord, PotentialMatchRecord } from '../db/supabaseDb.js';
import { aiMatchingService, DeepComparisonResult } from './aiMatcher.js';
import { multilingualEngine } from './multilingualEngine.js';

export interface MatchAlertResult {
  matchesFound: number;
  matches: Array<{
    matchId: string;
    lostItemId: string;
    foundItemId: string;
    score: number;
    reasons: string[];
    features: string[];
    aiEvaluated: boolean;
  }>;
}

export class MatchAlertService {
  /**
   * Configurable threshold from environment variable.
   * Default: 75%
   */
  get threshold(): number {
    const envVal = process.env.AI_MATCH_ALERT_THRESHOLD;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 75;
  }

  /**
   * Process a newly created or updated report.
   * Automatically checks whether it potentially matches existing eligible reports created by OTHER users.
   */
  async processNewReport(targetItem: ItemRecord): Promise<MatchAlertResult> {
    const result: MatchAlertResult = {
      matchesFound: 0,
      matches: []
    };

    try {
      // 1. Validation & eligibility check
      if (!targetItem || !targetItem.id) {
        return result;
      }

      if (targetItem.type !== 'LOST' && targetItem.type !== 'FOUND') {
        return result;
      }

      const eligibleStatuses = ['ACTIVE', 'MATCH_FOUND'];
      if (!eligibleStatuses.includes(targetItem.status)) {
        return result;
      }

      console.log(`[AI MATCH] New report: ${targetItem.id} (${targetItem.type} - "${targetItem.title}")`);

      // 2. Candidate Retrieval — Pre-filtered via PostgreSQL / Database
      // Rule 8: DO NOT send everything to Gemini. First retrieve a limited candidate set (top 20-25 max).
      const candidates = await supabaseDb.findEligibleCandidatesForMatchAlert(targetItem, 25);

      // Rule 5: IMPORTANT — DO NOT MATCH THE USER AGAINST THEMSELVES!
      // Automatic cross-user alerts must strictly identify relationships between reports of DIFFERENT users.
      const crossUserCandidates = candidates.filter(c => c.user_id !== targetItem.user_id);

      console.log(`[AI MATCH] Candidates found: ${crossUserCandidates.length} (from ${candidates.length} raw candidates)`);

      if (crossUserCandidates.length === 0) {
        return result;
      }

      let deepComparisonsCount = 0;

      // 3. Evaluate each candidate
      for (const candidate of crossUserCandidates) {
        try {
          const lostItem = targetItem.type === 'LOST' ? targetItem : candidate;
          const foundItem = targetItem.type === 'FOUND' ? targetItem : candidate;

          // Double verify different users
          if (lostItem.user_id === foundItem.user_id) {
            continue;
          }

          // Verify opposing types
          if (lostItem.type !== 'LOST' || foundItem.type !== 'FOUND') {
            continue;
          }

          // Rule 9: Check object compatibility first (Object type is a strong signal)
          const normLost = aiMatchingService.normalizeItem(lostItem.description, lostItem.title, lostItem.category);
          const normFound = aiMatchingService.normalizeItem(foundItem.description, foundItem.title, foundItem.category);

          const isCompatible = aiMatchingService.checkCompatibility(normLost, normFound);
          if (!isCompatible) {
            continue;
          }

          // Stage 1: Deterministic Multi-Signal Scoring (Category, Brand, Model, Color, Location, Date, Features, Image)
          const similarityResult = await aiMatchingService.evaluateSimilarity(lostItem, foundItem);
          if (!similarityResult.isCompatible) {
            continue;
          }

          let finalScore = similarityResult.matchScore;
          let reasons = [...similarityResult.matchReasons];
          let features = [...similarityResult.matchedFeatures];
          let aiEvaluated = similarityResult.aiEvaluated;

          // Stage 2: Deep Gemini Comparison for Strong Candidates (pre-score >= 50)
          if (finalScore >= 50) {
            deepComparisonsCount++;
            try {
              const deepComparison: DeepComparisonResult = await aiMatchingService.compareItemsDeep(lostItem, foundItem);
              aiEvaluated = true;

              if (deepComparison) {
                // If Gemini detects high confidence, incorporate Gemini's verified signals
                if (deepComparison.match_level === 'HIGH' && deepComparison.confidence >= 0.8) {
                  const geminiScore = Math.round(deepComparison.confidence * 100);
                  // Weighted combination: 60% Gemini semantic comparison + 40% deterministic metadata signals
                  finalScore = Math.max(finalScore, Math.round(finalScore * 0.4 + geminiScore * 0.6));
                  if (deepComparison.feature_matches && deepComparison.feature_matches.length > 0) {
                    features = Array.from(new Set([...features, ...deepComparison.feature_matches]));
                  }
                  if (deepComparison.explanation) {
                    reasons.unshift(deepComparison.explanation);
                  }
                } else if (deepComparison.match_level === 'NO_MATCH') {
                  // Contradictions identified by Gemini
                  finalScore = Math.min(finalScore, 40);
                  reasons.push('AI noticed significant physical or contextual differences.');
                }
              }
            } catch (deepErr) {
              console.warn('[AI MATCH] Deep comparison fallback used:', deepErr);
            }
          }

          // Rule 12: False Positive Protection
          // If generic item without distinctive features or brand markings, cap score <= 48
          if (similarityResult.isGenericMatch) {
            finalScore = Math.min(finalScore, 48);
          }

          // Rule 13: Configurable Match Threshold
          // Below threshold: Do not generate a user-facing alert
          if (finalScore < this.threshold) {
            continue;
          }

          console.log(`[AI MATCH] Potential match: ${lostItem.id} ↔ ${foundItem.id} = ${finalScore}%`);

          // Rule 15: DUPLICATE MATCH PREVENTION
          // Check whether lost_item_id + found_item_id already exists
          const existing = await supabaseDb.getExistingMatch(lostItem.id, foundItem.id);
          const matchId = existing ? existing.id : crypto.randomUUID();

          // Rule 38: MATCH UPDATE LOGIC
          // If already exists and score has not improved significantly (< +10%), update record but avoid re-notifying
          const isSignificantImprovement = existing && (finalScore >= existing.match_score + 10);
          const isNewMatch = !existing;

          const matchRecord: PotentialMatchRecord = {
            id: matchId,
            lost_item_id: lostItem.id,
            found_item_id: foundItem.id,
            match_score: finalScore,
            match_reasons: reasons,
            matched_features: features,
            ai_evaluated: aiEvaluated,
            status: existing?.status || 'PENDING',
            created_at: existing?.created_at || new Date().toISOString()
          };

          await supabaseDb.savePotentialMatch(matchRecord);

          // Update item statuses to MATCH_FOUND if ACTIVE
          if (lostItem.status === 'ACTIVE') {
            await supabaseDb.updateItem(lostItem.id, lostItem.user_id, { status: 'MATCH_FOUND' });
          }
          if (foundItem.status === 'ACTIVE') {
            await supabaseDb.updateItem(foundItem.id, foundItem.user_id, { status: 'MATCH_FOUND' });
          }

          result.matchesFound++;
          result.matches.push({
            matchId,
            lostItemId: lostItem.id,
            foundItemId: foundItem.id,
            score: finalScore,
            reasons,
            features,
            aiEvaluated
          });

          // Rule 16: MATCH ALERT DEDUPLICATION
          // Only send notifications when: new meaningful match appears OR confidence increases significantly
          if (isNewMatch || isSignificantImprovement) {
            await this.sendMatchNotifications({
              matchId,
              lostItem,
              foundItem,
              score: finalScore,
              reasons
            });
          }
        } catch (itemErr) {
          console.warn(`[AI MATCH] Error evaluating candidate ${candidate.id}:`, itemErr);
        }
      }

      console.log(`[AI MATCH] Completed matching for ${targetItem.id}. Deep comparisons: ${deepComparisonsCount}. Alerts created: ${result.matchesFound}`);
    } catch (err) {
      console.error('[AI MATCH] Error in processNewReport:', err);
    }

    return result;
  }

  /**
   * Creates localized, deduplicated notifications for the lost report owner and found report owner.
   */
  private async sendMatchNotifications(params: {
    matchId: string;
    lostItem: ItemRecord;
    foundItem: ItemRecord;
    score: number;
    reasons: string[];
  }) {
    const { matchId, lostItem, foundItem, score, reasons } = params;

    // 1. Notify Lost Report Owner
    try {
      const alreadyNotifiedLost = await supabaseDb.hasExistingNotificationForMatch(lostItem.user_id, lostItem.id);
      if (!alreadyNotifiedLost) {
        // Rule 19: Multilingual Notifications
        const detectedLostLang = multilingualEngine.detectLanguage(
          `${lostItem.title} ${lostItem.description}`
        );
        const { title, message } = this.formatLostNotification(
          detectedLostLang.language,
          lostItem,
          foundItem,
          score
        );

        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: lostItem.user_id,
          type: 'AI_MATCH',
          title,
          message,
          link_url: `/items/${lostItem.id}?match=${foundItem.id}`,
          related_item_id: lostItem.id,
          is_read: false
        });
      }
    } catch (e) {
      console.warn('[AI MATCH] Failed to notify lost item owner:', e);
    }

    // 2. Notify Found Report Owner
    try {
      const alreadyNotifiedFound = await supabaseDb.hasExistingNotificationForMatch(foundItem.user_id, foundItem.id);
      if (!alreadyNotifiedFound) {
        const detectedFoundLang = multilingualEngine.detectLanguage(
          `${foundItem.title} ${foundItem.description}`
        );
        const { title, message } = this.formatFoundNotification(
          detectedFoundLang.language,
          lostItem,
          foundItem,
          score
        );

        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: foundItem.user_id,
          type: 'AI_MATCH',
          title,
          message,
          link_url: `/items/${foundItem.id}?match=${lostItem.id}`,
          related_item_id: foundItem.id,
          is_read: false
        });
      }
    } catch (e) {
      console.warn('[AI MATCH] Failed to notify found item owner:', e);
    }
  }

  /**
   * Multilingual Lost Owner Notification Formatter
   */
  private formatLostNotification(
    lang: string,
    lost: ItemRecord,
    found: ItemRecord,
    score: number
  ): { title: string; message: string } {
    switch (lang) {
      case 'hi':
        return {
          title: `🔔 संभावित मैच: ${score}% समानता`,
          message: `आपके खोए हुए "${lost.title}" के लिए ${found.location} के पास एक संभावित मैच मिला है (${score}% मैच)। समीक्षा करने के लिए टैप करें।`
        };
      case 'kn':
        return {
          title: `🔔 ಸಂಭಾವ್ಯ ಹೊಂದಾಣಿಕೆ: ${score}% ಹೊಂದಾಣಿಕೆ`,
          message: `ನೀವು ಕಳೆದುಕೊಂಡ "${lost.title}" ಗೆ ${found.location} ಬಳಿ ಸಂಭಾವ್ಯ ಹೊಂದಾಣಿಕೆ ಕಂಡುಬಂದಿದೆ (${score}% ಹೊಂದಾಣಿಕೆ). ಪರಿಶೀಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ.`
        };
      case 'en':
      default:
        return {
          title: `🔔 Potential Match Found: ${score}% Similarity`,
          message: `Your lost "${lost.title}" may match a recently reported found item near ${found.location} (${score}% potential match). Tap to review.`
        };
    }
  }

  /**
   * Multilingual Found Owner Notification Formatter
   */
  private formatFoundNotification(
    lang: string,
    lost: ItemRecord,
    found: ItemRecord,
    score: number
  ): { title: string; message: string } {
    switch (lang) {
      case 'hi':
        return {
          title: `🔔 संभावित मैच: ${score}% समानता`,
          message: `आपके द्वारा रिपोर्ट की गई मिली वस्तु "${found.title}" किसी के खोए हुए सामान से मिलती-जुलती हो सकती है (${score}% मैच)।`
        };
      case 'kn':
        return {
          title: `🔔 ಸಂಭಾವ್ಯ ಹೊಂದಾಣಿಕೆ: ${score}% ಹೊಂದಾಣಿಕೆ`,
          message: `ನೀವು ವರದಿ ಮಾಡಿದ "${found.title}" ವಸ್ತುವು ಯಾರೋ ಕಳೆದುಕೊಂಡ ವರದಿಗೆ ಹೊಂದಿಕೆಯಾಗಬಹುದು (${score}% ಹೊಂದಾಣಿಕೆ).`
        };
      case 'en':
      default:
        return {
          title: `🔔 Potential Match Detected: ${score}% Similarity`,
          message: `Your reported found item "${found.title}" may match someone's lost report near ${lost.location} (${score}% potential match).`
        };
    }
  }
}

export const matchAlertService = new MatchAlertService();
