import { supabase, isSupabaseConfigured } from './supabase.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') 
  : (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

class ApiClient {
  private async getToken(): Promise<string | null> {
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      } catch {
        // fallback
      }
    }
    return localStorage.getItem('findit_auth_token');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data?.error ? data.error : 'Request failed';
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // Auth endpoints
  async register(userData: { name: string; email: string; password: string; campus?: string; phone?: string }) {
    return this.request<{ user: any; token: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials: { email: string; password: string }) {
    return this.request<{ user: any; token: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async updateProfile(profileData: { name?: string; campus?: string; phone?: string; avatar?: string }) {
    return this.request<{ user: any; message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Items endpoints
  async getItems(params: {
    q?: string;
    type?: string;
    category?: string;
    location?: string;
    status?: string;
    sort?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request<{ items: any[]; total: number; limit: number; offset: number }>(`/items?${query.toString()}`);
  }

  async aiSearch(data: { query: string; type?: string; imageBase64?: string }) {
    return this.request<{
      query: string;
      intent: any;
      totalCandidatesScanned: number;
      results: any[];
    }>('/items/ai-search', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getItemById(id: string) {
    return this.request<{
      item: any;
      isOwner: boolean;
      matches: any[];
      userClaim: any;
      claims: any[];
    }>(`/items/${id}`);
  }

  async verifyImage(formData: FormData) {
    return this.request<{
      imageAnalysis: any;
      consistency: any;
      normText: any;
    }>('/items/verify-image', {
      method: 'POST',
      body: formData
    });
  }

  // AI V2 specialized endpoints
  async compareAiItems(itemA: any, itemB: any) {
    return this.request<{
      isCompatible: boolean;
      score: number;
      confidenceLevel: string;
      featureMatches: string[];
      mismatches: string[];
      reasoning: string;
      safetyDisclaimer: string;
    }>('/ai/compare', {
      method: 'POST',
      body: JSON.stringify({ itemA, itemB })
    });
  }

  async analyzeImageAi(formData: FormData) {
    return this.request<{
      analysis: any;
      safetyDisclaimer: string;
    }>('/ai/analyze-image', {
      method: 'POST',
      body: formData
    });
  }

  async getAiItemMatches(id: string) {
    return this.request<{
      itemId: string;
      itemType: string;
      matchesCount: number;
      matches: any[];
    }>(`/ai/items/${id}/matches`);
  }

  async createItem(formData: FormData) {
    return this.request<{ 
      message: string; 
      item: any; 
      matchesFound: number;
      consistency?: any;
      warning?: string;
    }>('/items', {
      method: 'POST',
      body: formData
    });
  }

  async updateItem(id: string, updateData: any) {
    return this.request<{ message: string; item: any }>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteItem(id: string) {
    return this.request<{ message: string }>(`/items/${id}`, {
      method: 'DELETE'
    });
  }

  async rematchItem(id: string) {
    return this.request<{ message: string; matchesFound: number }>(`/items/${id}/rematch`, {
      method: 'POST'
    });
  }

  // Claims endpoints
  async submitClaim(claimData: {
    itemId: string;
    locationLost: string;
    dateLost: string;
    identifyingDetails: string;
    proofNotes?: string;
    contactShareConsent: boolean;
  }) {
    return this.request<{ message: string; claimId: string }>('/claims', {
      method: 'POST',
      body: JSON.stringify(claimData)
    });
  }

  async getMyClaims() {
    return this.request<{ claims: any[] }>('/claims/my-claims');
  }

  async getReceivedClaims() {
    return this.request<{ claims: any[] }>('/claims/received');
  }

  async updateClaimStatus(claimId: string, status: 'APPROVED' | 'REJECTED', resolutionNotes?: string) {
    return this.request<{ message: string; status: string }>(`/claims/${claimId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolutionNotes })
    });
  }

  // Notifications endpoints
  async getNotifications() {
    return this.request<{ notifications: any[]; unreadCount: number }>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PUT'
    });
  }

  // Stats endpoints
  async getCampusStats() {
    return this.request<{
      stats: {
        itemsLost: number;
        itemsFound: number;
        totalItems: number;
        resolvedItems: number;
        activeClaims: number;
        potentialMatches: number;
        recoveryRate: number;
      };
      categories: { category: string; count: number }[];
      recentRecoveries: any[];
    }>('/stats');
  }

  async getUserStats() {
    return this.request<{
      stats: {
        itemsLost: number;
        itemsFound: number;
        totalItems: number;
        resolvedItems: number;
        activeClaims: number;
        potentialMatches: number;
        unreadNotifications: number;
        recoveryRate: number;
      };
    }>('/stats/user');
  }
}

export const api = new ApiClient();
