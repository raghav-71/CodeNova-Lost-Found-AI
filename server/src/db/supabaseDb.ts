import crypto from 'crypto';
import { supabaseAdmin, isSupabaseServerConfigured } from '../services/supabase.js';

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  college: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
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
  latitude?: number;
  longitude?: number;
  date: string;
  time?: string;
  status: 'ACTIVE' | 'MATCH_FOUND' | 'CLAIM_PENDING' | 'RESOLVED' | 'CLOSED';
  primary_image?: string;
  characteristics?: string;
  // Multimodal AI Verification & Image Analysis Fields
  ai_object_type?: string;
  ai_category?: string;
  ai_subcategory?: string;
  ai_brand?: string;
  ai_model?: string;
  ai_color?: string;
  ai_features?: string[];
  ai_image_confidence?: number;
  ai_text_image_consistency?: 'CONSISTENT' | 'MINOR_MISMATCH' | 'MAJOR_MISMATCH' | 'UNKNOWN_IMAGE' | string;
  ai_analysis_version?: string;
  ai_analyzed_at?: string;
  ai_image_analysis?: any;
  created_at?: string;
  updated_at?: string;
  reporter_name?: string;
  reporter_campus?: string;
  reporter_avatar?: string;
  potential_matches_count?: number;
  top_match_score?: number;
  claims_count?: number;
  images?: { id: string; image_url: string }[];
}

export interface ClaimRecord {
  id: string;
  item_id: string;
  claimant_id: string;
  location_lost?: string;
  date_lost?: string;
  identifying_details?: string;
  proof_notes?: string;
  message?: string;
  contact_share_consent?: boolean | number;
  resolution_notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED' | 'CANCELLED';
  created_at?: string;
  updated_at?: string;
  item_title?: string;
  item_type?: 'LOST' | 'FOUND';
  item_category?: string;
  item_location?: string;
  item_image?: string;
  item_owner_id?: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_campus?: string;
  reporter_phone?: string;
  claimant_name?: string;
  claimant_email?: string;
  claimant_campus?: string;
  claimant_avatar?: string;
  claimant_phone?: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  related_item_id?: string;
  related_claim_id?: string;
  is_read: boolean | number;
  created_at?: string;
}

export interface PotentialMatchRecord {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  match_reasons: string[];
  matched_features: string[];
  ai_evaluated: boolean | number;
  status: string;
  created_at?: string;
}

class SupabaseDatabaseService {
  // In-memory isolated store fallback (synchronized with Supabase auth.users.id)
  private memoryProfiles: Map<string, ProfileRecord> = new Map();
  private memoryItems: Map<string, ItemRecord> = new Map();
  private memoryItemImages: Map<string, { id: string; item_id: string; image_url: string }> = new Map();
  private memoryClaims: Map<string, ClaimRecord> = new Map();
  private memoryNotifications: Map<string, NotificationRecord> = new Map();
  private memoryMatches: Map<string, PotentialMatchRecord> = new Map();

  private isPostgrestReady: boolean = false;

  constructor() {
    this.checkPostgrestAvailability();
  }

  public isPostgrestAvailable(): boolean {
    return this.isPostgrestReady;
  }

  public async checkPostgrestAvailability(): Promise<boolean> {
    if (!isSupabaseServerConfigured) {
      this.isPostgrestReady = false;
      return false;
    }
    try {
      const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
      const ready = !error;
      if (ready !== this.isPostgrestReady) {
        this.isPostgrestReady = ready;
        if (ready) {
          console.log('✅ [Supabase PostgreSQL] Authoritative database connection verified and ACTIVE.');
        } else {
          console.warn('⚠️ [Supabase PostgreSQL] Table check failed:', error?.message);
        }
      }
      return this.isPostgrestReady;
    } catch {
      this.isPostgrestReady = false;
      return false;
    }
  }

  private async ensurePostgrest(): Promise<boolean> {
    if (this.isPostgrestReady) return true;
    return this.checkPostgrestAvailability();
  }

  // --------------------------------------------------------------------------
  // PROFILES
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) return data as ProfileRecord;
      } catch {
        // fallback
      }
    }
    return this.memoryProfiles.get(userId) || null;
  }

  async upsertProfile(profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    college?: string;
    phone?: string;
  }): Promise<ProfileRecord> {
    const record: ProfileRecord = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`,
      college: profile.college || 'Central Campus',
      phone: profile.phone || '',
      updated_at: new Date().toISOString()
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .upsert(record)
          .select()
          .single();
        if (!error && data) return data as ProfileRecord;
      } catch {
        // fallback
      }
    }

    const existing = this.memoryProfiles.get(profile.id);
    const saved: ProfileRecord = {
      ...record,
      created_at: existing?.created_at || new Date().toISOString()
    };
    this.memoryProfiles.set(profile.id, saved);
    return saved;
  }

  async updateProfile(userId: string, updates: {
    name?: string;
    campus?: string;
    phone?: string;
    avatar?: string;
  }): Promise<ProfileRecord | null> {
    const existing = await this.getProfile(userId);
    if (!existing) return null;

    const updated: ProfileRecord = {
      ...existing,
      full_name: updates.name !== undefined ? updates.name : existing.full_name,
      college: updates.campus !== undefined ? updates.campus : existing.college,
      phone: updates.phone !== undefined ? updates.phone : existing.phone,
      avatar_url: updates.avatar !== undefined ? updates.avatar : existing.avatar_url,
      updated_at: new Date().toISOString()
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update(updated)
          .eq('id', userId)
          .select()
          .single();
        if (!error && data) return data as ProfileRecord;
      } catch {
        // fallback
      }
    }

    this.memoryProfiles.set(userId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // ITEMS
  // --------------------------------------------------------------------------
  async getItems(options: {
    q?: string;
    type?: string;
    category?: string;
    location?: string;
    status?: string;
    sort?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ItemRecord[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let itemsList: ItemRecord[] = Array.from(this.memoryItems.values());

    if (this.isPostgrestReady) {
      try {
        let query = supabaseAdmin
          .from('items')
          .select('*, profiles:user_id(full_name, college, avatar_url)', { count: 'exact' });

        if (options.type && options.type !== 'ALL') query = query.eq('type', options.type.toUpperCase());
        if (options.category && options.category !== 'ALL') query = query.eq('category', options.category);
        if (options.status && options.status !== 'ALL') query = query.eq('status', options.status.toUpperCase());
        if (options.userId) query = query.eq('user_id', options.userId);
        if (options.location && options.location !== 'ALL') query = query.ilike('location', `%${options.location}%`);
        if (options.q && options.q.trim()) {
          query = query.or(`title.ilike.%${options.q.trim()}%,description.ilike.%${options.q.trim()}%,category.ilike.%${options.q.trim()}%,location.ilike.%${options.q.trim()}%`);
        }

        if (options.sort === 'oldest') {
          query = query.order('created_at', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && data) {
          const mapped = data.map((item: any) => ({
            ...item,
            reporter_name: item.profiles?.full_name || 'Campus Member',
            reporter_campus: item.profiles?.college || 'Central Campus',
            reporter_avatar: item.profiles?.avatar_url || '',
            potential_matches_count: this.countPotentialMatchesForItem(item.id),
            claims_count: this.countClaimsForItem(item.id)
          }));
          return { items: mapped, total: count || mapped.length };
        }
      } catch {
        // fallback
      }
    }

    // In-memory filtering & sorting
    if (options.type && options.type !== 'ALL') {
      itemsList = itemsList.filter(i => i.type === options.type?.toUpperCase());
    }
    if (options.category && options.category !== 'ALL') {
      itemsList = itemsList.filter(i => i.category === options.category);
    }
    if (options.status && options.status !== 'ALL') {
      itemsList = itemsList.filter(i => i.status === options.status?.toUpperCase());
    }
    if (options.userId) {
      itemsList = itemsList.filter(i => i.user_id === options.userId);
    }
    if (options.location && options.location !== 'ALL') {
      const loc = options.location.toLowerCase();
      itemsList = itemsList.filter(i => 
        i.location.toLowerCase().includes(loc) || (i.building_zone && i.building_zone.toLowerCase().includes(loc))
      );
    }
    if (options.q && options.q.trim().length > 0) {
      const q = options.q.toLowerCase().trim();
      itemsList = itemsList.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        (i.characteristics && i.characteristics.toLowerCase().includes(q))
      );
    }

    if (options.sort === 'oldest') {
      itemsList.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else {
      itemsList.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    const total = itemsList.length;
    const paginated = itemsList.slice(offset, offset + limit).map(item => {
      const profile = this.memoryProfiles.get(item.user_id);
      return {
        ...item,
        reporter_name: profile?.full_name || 'Campus Member',
        reporter_campus: profile?.college || 'Central Campus',
        reporter_avatar: profile?.avatar_url || '',
        potential_matches_count: this.countPotentialMatchesForItem(item.id),
        claims_count: this.countClaimsForItem(item.id)
      };
    });

    return { items: paginated, total };
  }

  async getItemById(id: string): Promise<ItemRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('items')
          .select('*, profiles:user_id(full_name, college, avatar_url)')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          const imagesRes = await supabaseAdmin.from('item_images').select('id, image_url').eq('item_id', id);
          return {
            ...data,
            reporter_name: data.profiles?.full_name || 'Campus Member',
            reporter_campus: data.profiles?.college || 'Central Campus',
            reporter_avatar: data.profiles?.avatar_url || '',
            images: imagesRes.data || [],
            potential_matches_count: this.countPotentialMatchesForItem(id),
            claims_count: this.countClaimsForItem(id)
          };
        }
      } catch {
        // fallback
      }
    }

    const item = this.memoryItems.get(id);
    if (!item) return null;

    const profile = this.memoryProfiles.get(item.user_id);
    const images = Array.from(this.memoryItemImages.values()).filter(img => img.item_id === id);

    return {
      ...item,
      reporter_name: profile?.full_name || 'Campus Member',
      reporter_campus: profile?.college || 'Central Campus',
      reporter_avatar: profile?.avatar_url || '',
      images,
      potential_matches_count: this.countPotentialMatchesForItem(id),
      claims_count: this.countClaimsForItem(id)
    };
  }

  async createItem(item: Omit<ItemRecord, 'created_at' | 'updated_at'>): Promise<ItemRecord> {
    const now = new Date().toISOString();
    const created: ItemRecord = {
      ...item,
      created_at: now,
      updated_at: now
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('items')
          .insert({
            id: created.id,
            user_id: created.user_id,
            type: created.type,
            title: created.title,
            description: created.description,
            category: created.category,
            location: created.location,
            building_zone: created.building_zone || null,
            date: created.date,
            time: created.time || null,
            status: created.status,
            primary_image: created.primary_image || null,
            characteristics: created.characteristics || null,
            ai_object_type: created.ai_object_type || null,
            ai_category: created.ai_category || null,
            ai_subcategory: created.ai_subcategory || null,
            ai_brand: created.ai_brand || null,
            ai_model: created.ai_model || null,
            ai_color: created.ai_color || null,
            ai_features: created.ai_features || [],
            ai_image_confidence: created.ai_image_confidence || null,
            ai_text_image_consistency: created.ai_text_image_consistency || null,
            ai_analysis_version: created.ai_analysis_version || null,
            ai_analyzed_at: created.ai_analyzed_at || null,
            ai_image_analysis: created.ai_image_analysis || null
          })
          .select()
          .single();
        if (!error && data) {
          if (created.primary_image) {
            await supabaseAdmin.from('item_images').insert({
              id: crypto.randomUUID(),
              item_id: created.id,
              image_url: created.primary_image
            });
          }
          return data as ItemRecord;
        }
      } catch {
        // fallback
      }
    }

    this.memoryItems.set(created.id, created);
    if (created.primary_image) {
      const imgId = crypto.randomUUID();
      this.memoryItemImages.set(imgId, {
        id: imgId,
        item_id: created.id,
        image_url: created.primary_image
      });
    }
    return created;
  }

  async updateItem(id: string, userId: string, updates: Partial<ItemRecord>): Promise<ItemRecord | null> {
    const existing = await this.getItemById(id);
    if (!existing) return null;
    if (existing.user_id !== userId) return null;

    const updated: ItemRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('items')
          .update({
            title: updated.title,
            description: updated.description,
            category: updated.category,
            location: updated.location,
            building_zone: updated.building_zone || null,
            date: updated.date,
            time: updated.time || null,
            status: updated.status,
            characteristics: updated.characteristics || null,
            ai_object_type: updated.ai_object_type || null,
            ai_category: updated.ai_category || null,
            ai_subcategory: updated.ai_subcategory || null,
            ai_brand: updated.ai_brand || null,
            ai_model: updated.ai_model || null,
            ai_color: updated.ai_color || null,
            ai_features: updated.ai_features || [],
            ai_image_confidence: updated.ai_image_confidence || null,
            ai_text_image_consistency: updated.ai_text_image_consistency || null,
            ai_analysis_version: updated.ai_analysis_version || null,
            ai_analyzed_at: updated.ai_analyzed_at || null,
            ai_image_analysis: updated.ai_image_analysis || null,
            updated_at: updated.updated_at
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (!error && data) return data as ItemRecord;
      } catch {
        // fallback
      }
    }

    this.memoryItems.set(id, updated);
    return updated;
  }

  async deleteItem(id: string, userId: string): Promise<boolean> {
    const existing = await this.getItemById(id);
    if (!existing || existing.user_id !== userId) return false;

    if (this.isPostgrestReady) {
      try {
        const { error } = await supabaseAdmin
          .from('items')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (!error) return true;
      } catch {
        // fallback
      }
    }

    this.memoryItems.delete(id);
    return true;
  }

  // --------------------------------------------------------------------------
  // CLAIMS
  // --------------------------------------------------------------------------
  async getClaimById(claimId: string): Promise<ClaimRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .select('*, items(*, profiles:user_id(full_name, college, avatar_url)), claimant:claimant_id(full_name, email, college, avatar_url)')
          .eq('id', claimId)
          .maybeSingle();
        if (!error && data) {
          return {
            ...data,
            item_title: data.items?.title,
            item_type: data.items?.type,
            item_category: data.items?.category,
            item_location: data.items?.location,
            item_image: data.items?.primary_image,
            item_owner_id: data.items?.user_id,
            reporter_name: data.items?.profiles?.full_name,
            reporter_campus: data.items?.profiles?.college,
            claimant_name: data.claimant?.full_name,
            claimant_email: data.claimant?.email,
            claimant_campus: data.claimant?.college,
            claimant_avatar: data.claimant?.avatar_url
          };
        }
      } catch {
        // fallback
      }
    }

    const claim = this.memoryClaims.get(claimId);
    if (!claim) return null;

    const item = this.memoryItems.get(claim.item_id);
    const reporter = item ? this.memoryProfiles.get(item.user_id) : null;
    const claimant = this.memoryProfiles.get(claim.claimant_id);

    return {
      ...claim,
      item_title: item?.title,
      item_type: item?.type,
      item_category: item?.category,
      item_location: item?.location,
      item_image: item?.primary_image,
      item_owner_id: item?.user_id,
      reporter_name: reporter?.full_name,
      reporter_campus: reporter?.college,
      claimant_name: claimant?.full_name,
      claimant_email: claimant?.email,
      claimant_campus: claimant?.college,
      claimant_avatar: claimant?.avatar_url
    };
  }

  async getActiveClaim(itemId: string, claimantId: string): Promise<ClaimRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .select('*')
          .eq('item_id', itemId)
          .eq('claimant_id', claimantId)
          .in('status', ['PENDING', 'APPROVED'])
          .limit(1);
        if (!error && data && data.length > 0) return data[0] as ClaimRecord;
      } catch {
        // fallback
      }
    }
    const claims = Array.from(this.memoryClaims.values()).filter(
      c => c.item_id === itemId && c.claimant_id === claimantId && ['PENDING', 'APPROVED'].includes(c.status)
    );
    return claims.length > 0 ? claims[0] : null;
  }

  async getUserClaimForItem(itemId: string, claimantId: string): Promise<ClaimRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .select('*')
          .eq('item_id', itemId)
          .eq('claimant_id', claimantId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) return data[0] as ClaimRecord;
      } catch {
        // fallback
      }
    }
    const claims = Array.from(this.memoryClaims.values()).filter(
      c => c.item_id === itemId && c.claimant_id === claimantId
    );
    return claims.length > 0 ? claims[claims.length - 1] : null;
  }

  async getClaimsForItem(itemId: string): Promise<ClaimRecord[]> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .select('*, claimant:claimant_id(full_name, email, college, avatar_url)')
          .eq('item_id', itemId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((c: any) => ({
            ...c,
            claimant_name: c.claimant?.full_name || 'Campus Member',
            claimant_email: c.claimant?.email,
            claimant_campus: c.claimant?.college,
            claimant_avatar: c.claimant?.avatar_url
          }));
        }
      } catch {
        // fallback
      }
    }
    const claims = Array.from(this.memoryClaims.values()).filter(c => c.item_id === itemId);
    return claims.map(c => {
      const claimant = this.memoryProfiles.get(c.claimant_id);
      return {
        ...c,
        claimant_name: claimant?.full_name || 'Campus Member',
        claimant_email: claimant?.email,
        claimant_campus: claimant?.college,
        claimant_avatar: claimant?.avatar_url
      };
    });
  }

  async createClaim(claimData: Omit<ClaimRecord, 'created_at' | 'updated_at'>): Promise<ClaimRecord> {
    const now = new Date().toISOString();
    const created: ClaimRecord = {
      ...claimData,
      created_at: now,
      updated_at: now
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .insert({
            id: created.id,
            item_id: created.item_id,
            claimant_id: created.claimant_id,
            location_lost: created.location_lost || 'Campus',
            date_lost: created.date_lost || new Date().toISOString().split('T')[0],
            identifying_details: created.identifying_details || created.message || 'Direct claim from matching lost report.',
            proof_notes: created.proof_notes || created.message || null,
            contact_share_consent: Boolean(created.contact_share_consent ?? true),
            status: created.status
          })
          .select()
          .single();
        if (!error && data) return data as ClaimRecord;
      } catch {
        // fallback
      }
    }

    this.memoryClaims.set(created.id, created);
    return created;
  }

  async getClaimsSubmittedByUser(claimantId: string): Promise<ClaimRecord[]> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('claims')
          .select('*, items:item_id(title, type, category, location, primary_image, user_id, profiles:user_id(full_name, college, email, phone))')
          .eq('claimant_id', claimantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((c: any) => ({
            ...c,
            item_title: c.items?.title || 'Campus Item',
            item_type: c.items?.type || 'FOUND',
            item_category: c.items?.category,
            item_location: c.items?.location,
            item_image: c.items?.primary_image,
            item_owner_id: c.items?.user_id,
            finder_name: c.items?.profiles?.full_name || 'Campus Finder',
            finder_campus: c.items?.profiles?.college || 'Central Campus',
            finder_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.items?.profiles?.email : undefined,
            finder_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.items?.profiles?.phone : undefined,
            reporter_name: c.items?.profiles?.full_name || 'Campus Finder',
            reporter_campus: c.items?.profiles?.college || 'Central Campus',
            reporter_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.items?.profiles?.email : undefined,
            reporter_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.items?.profiles?.phone : undefined
          }));
        }
      } catch {
        // fallback
      }
    }

    const claims = Array.from(this.memoryClaims.values())
      .filter(c => c.claimant_id === claimantId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return claims.map(c => {
      const item = this.memoryItems.get(c.item_id);
      const reporter = item ? this.memoryProfiles.get(item.user_id) : null;
      return {
        ...c,
        item_title: item?.title || 'Campus Item',
        item_type: item?.type || 'FOUND',
        item_category: item?.category,
        item_location: item?.location,
        item_image: item?.primary_image,
        item_owner_id: item?.user_id,
        finder_name: reporter?.full_name || 'Campus Finder',
        finder_campus: reporter?.college || 'Central Campus',
        finder_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? reporter?.email : undefined,
        finder_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? reporter?.phone : undefined,
        reporter_name: reporter?.full_name || 'Campus Finder',
        reporter_campus: reporter?.college || 'Central Campus',
        reporter_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? reporter?.email : undefined,
        reporter_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? reporter?.phone : undefined
      };
    });
  }

  async getClaimsReceivedByUser(ownerId: string): Promise<ClaimRecord[]> {
    if (this.isPostgrestReady) {
      try {
        const { data: userItems } = await supabaseAdmin
          .from('items')
          .select('id, title, type, category, location, primary_image, user_id')
          .eq('user_id', ownerId);

        if (userItems && userItems.length > 0) {
          const itemMap = new Map(userItems.map(i => [i.id, i]));
          const itemIds = userItems.map(i => i.id);
          const { data: claimsData } = await supabaseAdmin
            .from('claims')
            .select('*, claimant:claimant_id(full_name, email, phone, college, avatar_url)')
            .in('item_id', itemIds)
            .order('created_at', { ascending: false });

          if (claimsData) {
            return claimsData.map((c: any) => {
              const item = itemMap.get(c.item_id);
              return {
                ...c,
                item_title: item?.title || 'Campus Item',
                item_type: item?.type || 'FOUND',
                item_category: item?.category,
                item_location: item?.location,
                item_image: item?.primary_image,
                item_owner_id: item?.user_id,
                claimant_name: c.claimant?.full_name || 'Campus Claimant',
                claimant_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.claimant?.email : undefined,
                claimant_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? c.claimant?.phone : undefined,
                claimant_campus: c.claimant?.college || 'Central Campus',
                claimant_avatar: c.claimant?.avatar_url
              };
            });
          }
        } else {
          return [];
        }
      } catch {
        // fallback
      }
    }

    const userItemIds = new Set(
      Array.from(this.memoryItems.values())
        .filter(i => i.user_id === ownerId)
        .map(i => i.id)
    );

    const claims = Array.from(this.memoryClaims.values())
      .filter(c => userItemIds.has(c.item_id))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return claims.map(c => {
      const item = this.memoryItems.get(c.item_id);
      const claimant = this.memoryProfiles.get(c.claimant_id);
      return {
        ...c,
        item_title: item?.title || 'Campus Item',
        item_type: item?.type || 'FOUND',
        item_category: item?.category,
        item_location: item?.location,
        item_image: item?.primary_image,
        item_owner_id: item?.user_id,
        claimant_name: claimant?.full_name || 'Campus Claimant',
        claimant_email: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? claimant?.email : undefined,
        claimant_phone: (c.status === 'APPROVED' || c.status === 'RESOLVED') ? claimant?.phone : undefined,
        claimant_campus: claimant?.college || 'Central Campus',
        claimant_avatar: claimant?.avatar_url
      };
    });
  }

  async updateClaimStatus(
    claimId: string,
    status: 'APPROVED' | 'REJECTED' | 'RESOLVED' | 'CANCELLED',
    resolutionNotes?: string
  ): Promise<ClaimRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data: claimData } = await supabaseAdmin
          .from('claims')
          .update({
            status,
            resolution_notes: resolutionNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', claimId)
          .select()
          .single();

        if (claimData) {
          if (status === 'RESOLVED') {
            await supabaseAdmin.from('items').update({ status: 'RESOLVED', updated_at: new Date().toISOString() }).eq('id', claimData.item_id);
            await supabaseAdmin
              .from('claims')
              .update({
                status: 'REJECTED',
                resolution_notes: 'Item resolved with verified claimant.',
                updated_at: new Date().toISOString()
              })
              .eq('item_id', claimData.item_id)
              .neq('id', claimId)
              .in('status', ['PENDING', 'APPROVED']);
          } else if (status === 'APPROVED') {
            // Keep item in CLAIM_PENDING during physical handover
            await supabaseAdmin.from('items').update({ status: 'CLAIM_PENDING', updated_at: new Date().toISOString() }).eq('id', claimData.item_id);
          } else {
            const { data: pendingClaims } = await supabaseAdmin
              .from('claims')
              .select('id')
              .eq('item_id', claimData.item_id)
              .neq('id', claimId)
              .in('status', ['PENDING', 'APPROVED']);
            if (!pendingClaims || pendingClaims.length === 0) {
              await supabaseAdmin.from('items').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', claimData.item_id);
            }
          }
          return claimData as ClaimRecord;
        }
      } catch {
        // fallback
      }
    }

    const claim = this.memoryClaims.get(claimId);
    if (!claim) return null;

    const updated: ClaimRecord = {
      ...claim,
      status,
      resolution_notes: resolutionNotes || claim.resolution_notes,
      updated_at: new Date().toISOString()
    };

    this.memoryClaims.set(claimId, updated);

    // If resolved, mark item as RESOLVED and reject competing claims
    if (status === 'RESOLVED') {
      const item = this.memoryItems.get(claim.item_id);
      if (item) {
        this.memoryItems.set(item.id, {
          ...item,
          status: 'RESOLVED',
          updated_at: new Date().toISOString()
        });
      }

      // Reject competing claims
      for (const [id, c] of this.memoryClaims.entries()) {
        if (c.item_id === claim.item_id && id !== claimId && ['PENDING', 'APPROVED'].includes(c.status)) {
          this.memoryClaims.set(id, {
            ...c,
            status: 'REJECTED',
            resolution_notes: 'Item resolved with verified claimant.',
            updated_at: new Date().toISOString()
          });
        }
      }
    } else if (status === 'APPROVED') {
      // Keep item in CLAIM_PENDING so physical handover can be coordinated
      const item = this.memoryItems.get(claim.item_id);
      if (item && item.status !== 'RESOLVED') {
        this.memoryItems.set(item.id, {
          ...item,
          status: 'CLAIM_PENDING',
          updated_at: new Date().toISOString()
        });
      }
    } else {
      // REJECTED or CANCELLED
      const item = this.memoryItems.get(claim.item_id);
      if (item && item.status === 'CLAIM_PENDING') {
        const remaining = Array.from(this.memoryClaims.values()).some(
          c => c.item_id === item.id && c.id !== claimId && ['PENDING', 'APPROVED'].includes(c.status)
        );
        this.memoryItems.set(item.id, {
          ...item,
          status: remaining ? 'CLAIM_PENDING' : 'ACTIVE',
          updated_at: new Date().toISOString()
        });
      }
    }

    return updated;
  }

  // --------------------------------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------------------------------
  async getNotifications(userId: string): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) {
          const unreadCount = data.filter((n: any) => !n.is_read).length;
          return { notifications: data as NotificationRecord[], unreadCount };
        }
      } catch {
        // fallback
      }
    }

    const userNotifs = Array.from(this.memoryNotifications.values())
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const unreadCount = userNotifs.filter(n => !n.is_read).length;
    return { notifications: userNotifs.slice(0, 50), unreadCount };
  }

  async createNotification(notif: Omit<NotificationRecord, 'created_at'>): Promise<NotificationRecord> {
    const created: NotificationRecord = {
      ...notif,
      created_at: new Date().toISOString()
    };

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .insert({
            id: notif.id,
            user_id: notif.user_id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link_url: notif.link_url || null,
            related_item_id: notif.related_item_id || null,
            related_claim_id: notif.related_claim_id || null,
            is_read: Boolean(notif.is_read)
          })
          .select()
          .single();
        if (!error && data) return data as NotificationRecord;
      } catch {
        // fallback
      }
    }

    this.memoryNotifications.set(created.id, created);
    return created;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (this.isPostgrestReady) {
      try {
        const { error } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', userId);
        if (!error) return true;
      } catch {
        // fallback
      }
    }

    const notif = this.memoryNotifications.get(id);
    if (!notif || notif.user_id !== userId) return false;
    this.memoryNotifications.set(id, { ...notif, is_read: true });
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false)
          .select('id');
        if (!error && data) return data.length;
      } catch {
        // fallback
      }
    }

    let count = 0;
    for (const [id, notif] of this.memoryNotifications.entries()) {
      if (notif.user_id === userId && !notif.is_read) {
        this.memoryNotifications.set(id, { ...notif, is_read: true });
        count++;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // POTENTIAL MATCHES
  // --------------------------------------------------------------------------
  async getPotentialMatchesForItem(itemId: string, type: 'LOST' | 'FOUND'): Promise<any[]> {
    if (this.isPostgrestReady) {
      try {
        const col = type === 'LOST' ? 'lost_item_id' : 'found_item_id';
        const opposingCol = type === 'LOST' ? 'found_item_id' : 'lost_item_id';
        const { data: matches, error } = await supabaseAdmin
          .from('potential_matches')
          .select('*')
          .eq(col, itemId)
          .gte('match_score', 40)
          .order('match_score', { ascending: false });

        if (!error && matches && matches.length > 0) {
          const otherItemIds = matches.map((m: any) => m[opposingCol]);
          const { data: otherItems } = await supabaseAdmin
            .from('items')
            .select('*, profiles:user_id(full_name, college, avatar_url)')
            .in('id', otherItemIds);

          const otherItemMap = new Map((otherItems || []).map((i: any) => [i.id, i]));
          return matches.map((m: any) => {
            const otherItem = otherItemMap.get(m[opposingCol]);
            return {
              match_id: m.id,
              lost_item_id: m.lost_item_id,
              found_item_id: m.found_item_id,
              match_score: m.match_score,
              match_reasons: m.match_reasons,
              matched_features: m.matched_features,
              ai_evaluated: m.ai_evaluated,
              match_status: m.status,
              ...(otherItem || {}),
              reporter_name: otherItem?.profiles?.full_name || 'Campus Member',
              reporter_campus: otherItem?.profiles?.college || 'Central Campus'
            };
          });
        }
      } catch {
        // fallback
      }
    }

    const matches = Array.from(this.memoryMatches.values()).filter(m => 
      (type === 'LOST' ? m.lost_item_id === itemId : m.found_item_id === itemId) && m.match_score >= 40
    );

    return matches.map(m => {
      const otherId = type === 'LOST' ? m.found_item_id : m.lost_item_id;
      const otherItem = this.memoryItems.get(otherId);
      const reporter = otherItem ? this.memoryProfiles.get(otherItem.user_id) : null;
      return {
        match_id: m.id,
        lost_item_id: m.lost_item_id,
        found_item_id: m.found_item_id,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        matched_features: m.matched_features,
        ai_evaluated: m.ai_evaluated,
        match_status: m.status,
        ...(otherItem || {}),
        reporter_name: reporter?.full_name || 'Campus Member',
        reporter_campus: reporter?.college || 'Central Campus'
      };
    }).sort((a, b) => b.match_score - a.match_score);
  }

  async savePotentialMatch(match: PotentialMatchRecord): Promise<void> {
    if (this.isPostgrestReady) {
      try {
        await supabaseAdmin
          .from('potential_matches')
          .upsert({
            id: match.id,
            lost_item_id: match.lost_item_id,
            found_item_id: match.found_item_id,
            match_score: match.match_score,
            match_reasons: match.match_reasons,
            matched_features: match.matched_features,
            ai_evaluated: Boolean(match.ai_evaluated),
            status: match.status
          }, { onConflict: 'lost_item_id,found_item_id' });
      } catch {
        // fallback
      }
    }
    this.memoryMatches.set(match.id, match);
  }

  async getExistingMatch(lostItemId: string, foundItemId: string): Promise<PotentialMatchRecord | null> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('potential_matches')
          .select('*')
          .eq('lost_item_id', lostItemId)
          .eq('found_item_id', foundItemId)
          .maybeSingle();
        if (!error && data) return data as PotentialMatchRecord;
      } catch {
        // fallback
      }
    }

    for (const m of this.memoryMatches.values()) {
      if (m.lost_item_id === lostItemId && m.found_item_id === foundItemId) {
        return m;
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // STATS
  // --------------------------------------------------------------------------
  async getCampusStats(): Promise<{
    itemsLost: number;
    itemsFound: number;
    totalItems: number;
    resolvedItems: number;
    activeClaims: number;
    potentialMatches: number;
    recoveryRate: number;
  }> {
    if (this.isPostgrestReady) {
      try {
        const [lostRes, foundRes, resolvedRes, claimsRes, matchesRes] = await Promise.all([
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('type', 'LOST'),
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('type', 'FOUND'),
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('status', 'RESOLVED'),
          supabaseAdmin.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabaseAdmin.from('potential_matches').select('id', { count: 'exact', head: true })
        ]);
        const lostCount = lostRes.count || 0;
        const foundCount = foundRes.count || 0;
        const resolvedCount = resolvedRes.count || 0;
        const totalItems = lostCount + foundCount;
        const activeClaims = claimsRes.count || 0;
        const potentialMatches = matchesRes.count || 0;
        const recoveryRate = totalItems > 0 ? Math.round((resolvedCount / Math.max(1, lostCount)) * 100) : 0;
        return {
          itemsLost: lostCount,
          itemsFound: foundCount,
          totalItems,
          resolvedItems: resolvedCount,
          activeClaims,
          potentialMatches,
          recoveryRate: Math.min(100, Math.max(0, recoveryRate))
        };
      } catch {
        // fallback
      }
    }

    const items = Array.from(this.memoryItems.values());
    const lostCount = items.filter(i => i.type === 'LOST').length;
    const foundCount = items.filter(i => i.type === 'FOUND').length;
    const resolvedCount = items.filter(i => i.status === 'RESOLVED').length;
    const totalItems = lostCount + foundCount;
    const activeClaims = Array.from(this.memoryClaims.values()).filter(c => c.status === 'PENDING').length;
    const potentialMatches = this.memoryMatches.size;
    const recoveryRate = totalItems > 0 ? Math.round((resolvedCount / Math.max(1, lostCount)) * 100) : 0;

    return {
      itemsLost: lostCount,
      itemsFound: foundCount,
      totalItems,
      resolvedItems: resolvedCount,
      activeClaims,
      potentialMatches,
      recoveryRate: Math.min(100, Math.max(0, recoveryRate))
    };
  }

  async getUserPersonalStats(userId: string): Promise<{
    itemsLost: number;
    itemsFound: number;
    totalItems: number;
    resolvedItems: number;
    activeClaims: number;
    potentialMatches: number;
    unreadNotifications: number;
    recoveryRate: number;
  }> {
    if (this.isPostgrestReady) {
      try {
        const [lostRes, foundRes, resolvedRes, claimsRes, notifsRes, userItems] = await Promise.all([
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('type', 'LOST'),
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('type', 'FOUND'),
          supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'RESOLVED'),
          supabaseAdmin.from('claims').select('id', { count: 'exact', head: true }).eq('claimant_id', userId).eq('status', 'PENDING'),
          supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
          supabaseAdmin.from('items').select('id').eq('user_id', userId)
        ]);

        const itemsLost = lostRes.count || 0;
        const itemsFound = foundRes.count || 0;
        const resolvedItems = resolvedRes.count || 0;
        const totalItems = itemsLost + itemsFound;
        let activeClaims = claimsRes.count || 0;
        if (userItems.data && userItems.data.length > 0) {
          const uids = userItems.data.map(i => i.id);
          const receivedClaimsRes = await supabaseAdmin
            .from('claims')
            .select('id', { count: 'exact', head: true })
            .in('item_id', uids)
            .neq('claimant_id', userId)
            .eq('status', 'PENDING');
          activeClaims += (receivedClaimsRes.count || 0);
        }
        const unreadNotifications = notifsRes.count || 0;

        let potentialMatches = 0;
        if (userItems.data && userItems.data.length > 0) {
          const uids = userItems.data.map(i => i.id);
          const { count: matchCount } = await supabaseAdmin
            .from('potential_matches')
            .select('id', { count: 'exact', head: true })
            .or(`lost_item_id.in.(${uids.join(',')}),found_item_id.in.(${uids.join(',')})`);
          potentialMatches = matchCount || 0;
        }

        const recoveryRate = totalItems > 0 ? Math.round((resolvedItems / Math.max(1, itemsLost)) * 100) : 0;
        return {
          itemsLost,
          itemsFound,
          totalItems,
          resolvedItems,
          activeClaims,
          potentialMatches,
          unreadNotifications,
          recoveryRate: Math.min(100, Math.max(0, recoveryRate))
        };
      } catch {
        // fallback
      }
    }

    const userItems = Array.from(this.memoryItems.values()).filter(i => i.user_id === userId);
    const itemsLost = userItems.filter(i => i.type === 'LOST').length;
    const itemsFound = userItems.filter(i => i.type === 'FOUND').length;
    const resolvedItems = userItems.filter(i => i.status === 'RESOLVED').length;
    const totalItems = itemsLost + itemsFound;

    const userItemIds = new Set(userItems.map(i => i.id));
    const activeClaims = Array.from(this.memoryClaims.values()).filter(
      c => c.status === 'PENDING' && (c.claimant_id === userId || (c.item_owner_id === userId || userItemIds.has(c.item_id)))
    ).length;

    const potentialMatches = Array.from(this.memoryMatches.values()).filter(
      m => userItemIds.has(m.lost_item_id) || userItemIds.has(m.found_item_id)
    ).length;

    const unreadNotifications = Array.from(this.memoryNotifications.values()).filter(
      n => n.user_id === userId && !n.is_read
    ).length;

    const recoveryRate = totalItems > 0 ? Math.round((resolvedItems / Math.max(1, itemsLost)) * 100) : 0;

    return {
      itemsLost,
      itemsFound,
      totalItems,
      resolvedItems,
      activeClaims,
      potentialMatches,
      unreadNotifications,
      recoveryRate: Math.min(100, Math.max(0, recoveryRate))
    };
  }

  // Helpers
  private countPotentialMatchesForItem(itemId: string): number {
    return Array.from(this.memoryMatches.values()).filter(
      m => m.lost_item_id === itemId || m.found_item_id === itemId
    ).length;
  }

  private countClaimsForItem(itemId: string): number {
    return Array.from(this.memoryClaims.values()).filter(c => c.item_id === itemId).length;
  }

  // AI Matcher candidate pre-filtering query helper
  async findEligibleCandidatesForMatchAlert(targetItem: ItemRecord, limit: number = 25): Promise<ItemRecord[]> {
    const opposingType: 'LOST' | 'FOUND' = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';

    if (this.isPostgrestReady) {
      try {
        // Query eligible candidates: opposite type, active/match_found, cross-user only, not same id
        let query = supabaseAdmin
          .from('items')
          .select('*')
          .eq('type', opposingType)
          .in('status', ['ACTIVE', 'MATCH_FOUND'])
          .neq('user_id', targetItem.user_id)
          .neq('id', targetItem.id);

        // Prioritize same category if possible, or fetch top candidates
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit * 2);

        if (!error && data && data.length > 0) {
          // Pre-rank candidates based on category/location/title overlap
          const targetCategory = targetItem.category?.toLowerCase() || '';
          const targetLocation = targetItem.location?.toLowerCase() || '';
          const targetTitleWords = targetItem.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);

          const scored = (data as ItemRecord[]).map(c => {
            let score = 0;
            if (c.category && c.category.toLowerCase() === targetCategory) score += 40;
            if (c.location && targetLocation && (c.location.toLowerCase().includes(targetLocation) || targetLocation.includes(c.location.toLowerCase()))) score += 30;
            const cText = `${c.title} ${c.description}`.toLowerCase();
            for (const word of targetTitleWords) {
              if (cText.includes(word)) score += 15;
            }
            return { item: c, score };
          });

          scored.sort((a, b) => b.score - a.score);
          return scored.slice(0, limit).map(s => s.item);
        }
      } catch (err) {
        console.warn('[Supabase DB] Error in findEligibleCandidatesForMatchAlert:', err);
      }
    }

    // In-memory fallback
    const targetCategory = targetItem.category?.toLowerCase() || '';
    const targetLocation = targetItem.location?.toLowerCase() || '';
    const targetTitleWords = targetItem.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const candidates = Array.from(this.memoryItems.values()).filter(
      i => i.type === opposingType &&
           ['ACTIVE', 'MATCH_FOUND'].includes(i.status) &&
           i.user_id !== targetItem.user_id &&
           i.id !== targetItem.id
    );

    const scored = candidates.map(c => {
      let score = 0;
      if (c.category && c.category.toLowerCase() === targetCategory) score += 40;
      if (c.location && targetLocation && (c.location.toLowerCase().includes(targetLocation) || targetLocation.includes(c.location.toLowerCase()))) score += 30;
      const cText = `${c.title} ${c.description}`.toLowerCase();
      for (const word of targetTitleWords) {
        if (cText.includes(word)) score += 15;
      }
      return { item: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }

  // Get all potential matches for a user across all their reported items (single query to avoid N+1)
  async getPotentialMatchesForUser(userId: string): Promise<any[]> {
    if (this.isPostgrestReady) {
      try {
        const { data: userItems, error: itemsError } = await supabaseAdmin
          .from('items')
          .select('id, type')
          .eq('user_id', userId);

        if (itemsError || !userItems || userItems.length === 0) {
          return [];
        }

        const userItemIds = userItems.map(i => i.id);
        const userItemTypeMap = new Map(userItems.map(i => [i.id, i.type]));

        const { data: matches, error: matchesError } = await supabaseAdmin
          .from('potential_matches')
          .select('*')
          .or(`lost_item_id.in.(${userItemIds.join(',')}),found_item_id.in.(${userItemIds.join(',')})`)
          .gte('match_score', 40)
          .order('match_score', { ascending: false });

        if (matchesError || !matches || matches.length === 0) {
          return [];
        }

        // Identify other items to hydrate
        const otherItemIds = matches.map((m: any) => {
          return userItemIds.includes(m.lost_item_id) ? m.found_item_id : m.lost_item_id;
        });

        const { data: otherItems } = await supabaseAdmin
          .from('items')
          .select('*, profiles:user_id(full_name, college, avatar_url)')
          .in('id', otherItemIds);

        const otherItemMap = new Map((otherItems || []).map((i: any) => [i.id, i]));

        return matches.map((m: any) => {
          const isMyLost = userItemIds.includes(m.lost_item_id);
          const myItemId = isMyLost ? m.lost_item_id : m.found_item_id;
          const otherItemId = isMyLost ? m.found_item_id : m.lost_item_id;
          const otherItem = otherItemMap.get(otherItemId);

          return {
            match_id: m.id,
            lost_item_id: m.lost_item_id,
            found_item_id: m.found_item_id,
            origin_item_id: myItemId,
            match_score: m.match_score,
            match_reasons: m.match_reasons,
            matched_features: m.matched_features,
            ai_evaluated: m.ai_evaluated,
            match_status: m.status,
            created_at: m.created_at,
            ...(otherItem || {}),
            reporter_name: otherItem?.profiles?.full_name || 'Campus Member',
            reporter_campus: otherItem?.profiles?.college || 'Central Campus'
          };
        });
      } catch (err) {
        console.warn('[Supabase DB] Error in getPotentialMatchesForUser:', err);
      }
    }

    // In-memory fallback
    const userItems = Array.from(this.memoryItems.values()).filter(i => i.user_id === userId);
    const userItemIds = new Set(userItems.map(i => i.id));
    if (userItemIds.size === 0) return [];

    const matches = Array.from(this.memoryMatches.values()).filter(
      m => (userItemIds.has(m.lost_item_id) || userItemIds.has(m.found_item_id)) && m.match_score >= 40
    );

    return matches.map(m => {
      const isMyLost = userItemIds.has(m.lost_item_id);
      const myItemId = isMyLost ? m.lost_item_id : m.found_item_id;
      const otherId = isMyLost ? m.found_item_id : m.lost_item_id;
      const otherItem = this.memoryItems.get(otherId);
      const reporter = otherItem ? this.memoryProfiles.get(otherItem.user_id) : null;

      return {
        match_id: m.id,
        lost_item_id: m.lost_item_id,
        found_item_id: m.found_item_id,
        origin_item_id: myItemId,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        matched_features: m.matched_features,
        ai_evaluated: m.ai_evaluated,
        match_status: m.status,
        created_at: m.created_at,
        ...(otherItem || {}),
        reporter_name: reporter?.full_name || 'Campus Member',
        reporter_campus: reporter?.college || 'Central Campus'
      };
    }).sort((a, b) => b.match_score - a.match_score);
  }

  // Get a single match details with both items hydrated and strict user access validation
  async getPotentialMatchById(matchId: string, requestingUserId?: string): Promise<{
    match: PotentialMatchRecord;
    lostItem: ItemRecord;
    foundItem: ItemRecord;
    isOwner: boolean;
  } | null> {
    let matchRecord: PotentialMatchRecord | null = null;

    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('potential_matches')
          .select('*')
          .eq('id', matchId)
          .maybeSingle();
        if (!error && data) {
          matchRecord = data as PotentialMatchRecord;
        }
      } catch (err) {
        console.warn('[Supabase DB] Error in getPotentialMatchById:', err);
      }
    }

    if (!matchRecord) {
      matchRecord = this.memoryMatches.get(matchId) || null;
    }

    if (!matchRecord) return null;

    const lostItem = await this.getItemById(matchRecord.lost_item_id);
    const foundItem = await this.getItemById(matchRecord.found_item_id);

    if (!lostItem || !foundItem) return null;

    const isOwner = requestingUserId
      ? (lostItem.user_id === requestingUserId || foundItem.user_id === requestingUserId)
      : false;

    // Security check: If authenticated user requested it, they must own one of the items
    if (requestingUserId && !isOwner) {
      return null;
    }

    return {
      match: matchRecord,
      lostItem,
      foundItem,
      isOwner
    };
  }

  // Check if a match notification was already sent to avoid duplicates
  async hasExistingNotificationForMatch(userId: string, relatedItemId: string): Promise<boolean> {
    if (this.isPostgrestReady) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'AI_MATCH')
          .eq('related_item_id', relatedItemId)
          .limit(1);
        if (!error && data && data.length > 0) return true;
      } catch {
        // fallback
      }
    }

    return Array.from(this.memoryNotifications.values()).some(
      n => n.user_id === userId && n.type === 'AI_MATCH' && n.related_item_id === relatedItemId
    );
  }

  // AI Matcher raw query helper
  async getAllActiveItemsForMatching(opposingType: 'LOST' | 'FOUND', targetItemId: string): Promise<ItemRecord[]> {
    if (this.isPostgrestReady) {
      try {
        const { data } = await supabaseAdmin
          .from('items')
          .select('*')
          .eq('type', opposingType)
          .in('status', ['ACTIVE', 'MATCH_FOUND'])
          .neq('id', targetItemId);
        if (data) return data as ItemRecord[];
      } catch {
        // fallback
      }
    }
    return Array.from(this.memoryItems.values()).filter(
      i => i.type === opposingType && ['ACTIVE', 'MATCH_FOUND'].includes(i.status) && i.id !== targetItemId
    );
  }
}

export const supabaseDb = new SupabaseDatabaseService();
