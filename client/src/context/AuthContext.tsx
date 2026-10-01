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
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase getSession returned error:', error);
          }

          if (session?.user && mounted) {
            const sbToken = session.access_token;
            localStorage.setItem('findit_auth_token', sbToken);
            setToken(sbToken);
            await syncUserProfile(session.user);
            if (mounted) setIsLoading(false);
            return;
          }
        }

        // Check if there is an active valid token from backend auth
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
        if (!mounted) return;

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const sbToken = session.access_token;
            localStorage.setItem('findit_auth_token', sbToken);
            setToken(sbToken);
            await syncUserProfile(session.user);
          } else {
            localStorage.removeItem('findit_auth_token');
            setToken(null);
            setUser(null);
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

    if (!isSupabaseConfigured) {
      // If client environment variables are not configured, try backend auth endpoint
      try {
        const res = await api.login({ email: cleanEmail, password });
        if (res?.token && res?.user) {
          localStorage.setItem('findit_auth_token', res.token);
          setToken(res.token);
          setUser(res.user);
          return;
        }
      } catch (apiErr: any) {
        if (apiErr.message?.includes('not configured')) {
          throw new Error('Supabase configuration is missing. Check the required environment variables.');
        }
        throw apiErr;
      }
      throw new Error('Supabase configuration is missing. Check the required environment variables.');
    }

    // 1. Direct Supabase sign in
    let { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    // 2. If email confirmation was pending in Supabase, auto-confirm through server and sign in immediately
    if (error && error.message.toLowerCase().includes('email not confirmed')) {
      try {
        const res = await api.login({ email: cleanEmail, password });
        if (res?.token && res?.user) {
          localStorage.setItem('findit_auth_token', res.token);
          setToken(res.token);
          setUser(res.user);
          // Sync client-side Supabase session as well
          const retry = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          if (retry.data?.user) {
            await syncUserProfile(retry.data.user);
          }
          return;
        }
      } catch (loginFallbackErr: any) {
        throw new Error(loginFallbackErr.message || 'Invalid email or password.');
      }
    }

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      throw new Error(error.message || 'Invalid email or password.');
    }

    if (data?.session && data?.user) {
      const sbToken = data.session.access_token;
      localStorage.setItem('findit_auth_token', sbToken);
      setToken(sbToken);
      await syncUserProfile(data.user);
    }
  };

  const register = async (name: string, email: string, password: string, campus?: string, phone?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanCampus = campus?.trim() || 'Central Campus';
    const cleanPhone = phone?.trim() || '';

    // Register via server to ensure auto-confirmed email in Supabase Auth
    try {
      const res = await api.register({
        name: cleanName,
        email: cleanEmail,
        password,
        campus: cleanCampus,
        phone: cleanPhone
      });

      if (res?.token && res?.user) {
        localStorage.setItem('findit_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);

        // Also establish the session in the client Supabase SDK
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password
            });
          } catch {
            // Server token is already valid and active
          }
        }
        return;
      }
    } catch (apiErr: any) {
      // If server returned specific message, propagate it
      if (apiErr.message?.includes('already exists') || apiErr.message?.includes('already registered')) {
        throw new Error('An account with this campus email already exists. Please log in.');
      }
      if (apiErr.message?.includes('not configured')) {
        throw new Error('Supabase configuration is missing. Check the required environment variables.');
      }
      throw apiErr;
    }

    // Direct fallback login if needed
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
