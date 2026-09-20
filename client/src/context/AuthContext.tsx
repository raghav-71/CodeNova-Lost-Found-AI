import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, campus?: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('findit_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch and sync up-to-date user profile
  const syncUserProfile = async (sessionUser?: any) => {
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      console.warn('Could not fetch server profile, using fallback profile attributes:', err);
    }

    if (sessionUser) {
      const fallbackUser: User = {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Campus Member',
        campus: sessionUser.user_metadata?.college || sessionUser.user_metadata?.campus || 'Central Campus',
        avatar: sessionUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${sessionUser.id}`,
        phone: sessionUser.user_metadata?.phone || '',
        role: 'student'
      };
      setUser(fallbackUser);
      return fallbackUser;
    }

    return null;
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const storedToken = localStorage.getItem('findit_auth_token');

        if (storedToken) {
          try {
            const res = await api.getCurrentUser();
            if (res?.user && mounted) {
              setToken(storedToken);
              setUser(res.user);
              setIsLoading(false);
              return;
            }
          } catch {
            // Token is invalid/expired
          }
        }

        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            const sbToken = session.access_token;
            localStorage.setItem('findit_auth_token', sbToken);
            setToken(sbToken);
            await syncUserProfile(session.user);
            if (mounted) setIsLoading(false);
            return;
          }
        }

        // If no valid session, clear state
        if (mounted) {
          localStorage.removeItem('findit_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Supabase Auth State Change Listener (authoritative listener)
    let authSubscription: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const sbToken = session.access_token;
            localStorage.setItem('findit_auth_token', sbToken);
            setToken(sbToken);
            await syncUserProfile(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('findit_auth_token');
          setToken(null);
          setUser(null);
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. First attempt Supabase direct sign-in
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!error && data?.session) {
          localStorage.setItem('findit_auth_token', data.session.access_token);
          setToken(data.session.access_token);
          await syncUserProfile(data.user);
          return;
        }
      } catch (directErr) {
        console.warn('Direct Supabase sign-in encountered an issue, trying backend auth:', directErr);
      }
    }

    // 2. Fallback to server /auth/login (which auto-confirms email and validates via Supabase Auth)
    const res = await api.login({ email: cleanEmail, password });
    if (res?.token && res?.user) {
      localStorage.setItem('findit_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return;
    }

    throw new Error('Invalid email or password. Please check your credentials.');
  };

  const register = async (name: string, email: string, password: string, campus?: string, phone?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Register via server to ensure auto-confirmed email in Supabase Auth
    const res = await api.register({
      name: cleanName,
      email: cleanEmail,
      password,
      campus,
      phone
    });

    if (res?.token && res?.user) {
      localStorage.setItem('findit_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return;
    }

    // If no session token returned, attempt direct login
    await login(cleanEmail, password);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout error:', err);
      }
    }
    localStorage.removeItem('findit_auth_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
