import crypto from 'crypto';
import {
  ConversationSession,
  ConversationTurn,
  StructuredSearchIntent
} from './multilingualEngine.js';

export class ConversationManager {
  // In-memory session store (sessionId -> ConversationSession)
  private sessions = new Map<string, ConversationSession>();
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Run periodic cleanup every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
  }

  /**
   * Retrieves an existing session or provisions a new one.
   */
  getOrCreateSession(sessionId?: string, userId?: string): ConversationSession {
    const now = new Date().toISOString();

    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.updatedAt = now;
      if (userId && !session.userId) session.userId = userId;
      return session;
    }

    const newId = sessionId && sessionId.trim().length > 0 ? sessionId.trim() : crypto.randomUUID();
    const newSession: ConversationSession = {
      sessionId: newId,
      userId,
      createdAt: now,
      updatedAt: now,
      language: 'en',
      history: [],
      currentIntent: 'lost_item_search',
      activeFilters: {
        item_type: 'ALL'
      },
      resultContextItemIds: []
    };

    this.sessions.set(newId, newSession);
    return newSession;
  }

  /**
   * Retrieves a session by ID.
   */
  getSession(sessionId: string): ConversationSession | null {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    s.updatedAt = new Date().toISOString();
    return s;
  }

  /**
   * Merges incoming intent and query into the active conversational context.
   * Ensures follow-up queries retain prior search context.
   */
  mergeTurn(
    sessionId: string,
    query: string,
    intent: StructuredSearchIntent,
    aiResponseText: string,
    resultItemIds: string[]
  ): ConversationSession {
    const session = this.getOrCreateSession(sessionId);
    const now = new Date().toISOString();

    // 1. Record History Turn
    session.history.push({
      role: 'user',
      query,
      intent: intent.intent,
      timestamp: now
    });

    session.history.push({
      role: 'assistant',
      response: aiResponseText,
      intent: intent.intent,
      timestamp: now
    });

    // Keep history bounded to last 10 turns
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }

    // 2. Language continuity (adopt user's newest language)
    session.language = intent.language;
    session.currentIntent = intent.intent;
    session.updatedAt = now;

    // 3. Contextual Filter Merging
    const prev = session.activeFilters;

    // Object: If new intent has a specific object (not 'item'), use it; else retain previous
    const newObj = intent.object?.value && intent.object.value !== 'item' ? intent.object.value : prev.object;

    // Category / Subcategory: retain previous if not specified in follow-up
    const newCat = intent.category?.value && intent.category.value !== 'other' ? intent.category.value : prev.category;
    const newSubcat = intent.subcategory && intent.subcategory !== 'other' ? intent.subcategory : prev.subcategory;

    // Brand: check if user asks to remove brand (e.g. "remove jbl", "without brand")
    const lowerQuery = query.toLowerCase();
    let newBrand = prev.brand;
    if (lowerQuery.includes('remove') && prev.brand && lowerQuery.includes(prev.brand.toLowerCase())) {
      newBrand = undefined;
    } else if (intent.brand) {
      newBrand = intent.brand;
    }

    // Color: merge or override
    let newColors = prev.color || [];
    if (intent.color && intent.color.length > 0) {
      newColors = intent.color;
    }

    // Location: override if specified in follow-up
    let newLoc = prev.location;
    if (intent.location?.normalized) {
      newLoc = intent.location.normalized;
    }

    // Date: override if specified in follow-up
    let newDate = prev.date;
    if (intent.date?.normalized) {
      newDate = intent.date.normalized;
    }

    // Direction (item_type)
    const newType = intent.item_type && intent.item_type !== 'ALL' ? intent.item_type : prev.item_type;

    session.activeFilters = {
      item_type: newType,
      object: newObj,
      category: newCat,
      subcategory: newSubcat,
      brand: newBrand,
      model: intent.model || prev.model,
      color: newColors,
      location: newLoc,
      date: newDate,
      minConfidence: intent.min_confidence || prev.minConfidence
    };

    // Store result context item IDs for reference resolving (e.g. "first one", "second one")
    if (resultItemIds.length > 0) {
      session.resultContextItemIds = resultItemIds;
    }

    return session;
  }

  /**
   * Clears a session.
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Housekeeping: deletes sessions older than 30 mins.
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      const updatedTime = new Date(session.updatedAt).getTime();
      if (now - updatedTime > this.SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}

export const conversationManager = new ConversationManager();
