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
  demoLogin: (email: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('findit_auth_token') || localStorage.getItem('codenova_auth_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          // 1. Check Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            const sbToken = session.access_token;
            localStorage.setItem('findit_auth_token', sbToken);
            setToken(sbToken);

            // Fetch profile
            try {
              const res = await api.getCurrentUser();
              if (mounted) setUser(res.user);
            } catch {
              if (mounted) {
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Campus Student',
                  campus: session.user.user_metadata?.college || session.user.user_metadata?.campus || 'Central Campus',
                  avatar: session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`,
                  role: 'student'
                });
              }
            }
            if (mounted) setIsLoading(false);
            return;
          }
        }

        // 2. Fallback to stored local token
        const storedToken = localStorage.getItem('findit_auth_token');
        if (storedToken) {
          try {
            const res = await api.getCurrentUser();
            if (mounted) setUser(res.user);
          } catch (err) {
            console.warn('Session expired or invalid token:', err);
            localStorage.removeItem('findit_auth_token');
            if (mounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Supabase Auth State Change Listener
    let authSubscription: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const sbToken = session.access_token;
          localStorage.setItem('findit_auth_token', sbToken);
          setToken(sbToken);
          try {
            const res = await api.getCurrentUser();
            setUser(res.user);
          } catch {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Campus Student',
              campus: session.user.user_metadata?.college || 'Central Campus',
              avatar: session.user.user_metadata?.avatar_url || '',
              role: 'student'
            });
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        // If Supabase auth fails, try local API
        try {
          const res = await api.login({ email, password });
          localStorage.setItem('findit_auth_token', res.token);
          setToken(res.token);
          setUser(res.user);
          return;
        } catch {
          throw new Error(error.message || 'Invalid email or password.');
        }
      }

      if (data.session) {
        localStorage.setItem('findit_auth_token', data.session.access_token);
        setToken(data.session.access_token);
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
        } catch {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || 'Campus Student',
            campus: data.user.user_metadata?.college || 'Central Campus',
            avatar: data.user.user_metadata?.avatar_url || '',
            role: 'student'
          });
        }
      }
    } else {
      const res = await api.login({ email, password });
      localStorage.setItem('findit_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (name: string, email: string, password: string, campus?: string, phone?: string) => {
    if (isSupabaseConfigured) {
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            college: campus?.trim() || 'Central Campus',
            phone: phone?.trim() || null,
            avatar_url: avatarUrl
          }
        }
      });

      if (error) {
        try {
          const res = await api.register({ name, email, password, campus, phone });
          localStorage.setItem('findit_auth_token', res.token);
          setToken(res.token);
          setUser(res.user);
          return;
        } catch {
          throw new Error(error.message || 'Registration failed.');
        }
      }

      if (data.session) {
        localStorage.setItem('findit_auth_token', data.session.access_token);
        setToken(data.session.access_token);
      }

      // Also ensure backend record is ready
      try {
        const res = await api.register({ name, email, password, campus, phone });
        localStorage.setItem('findit_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      } catch {
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: name.trim(),
            campus: campus?.trim() || 'Central Campus',
            phone: phone?.trim(),
            avatar: avatarUrl,
            role: 'student'
          });
        }
      }
    } else {
      const res = await api.register({ name, email, password, campus, phone });
      localStorage.setItem('findit_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const demoLogin = async (email: string) => {
    await login(email, 'password123');
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
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, demoLogin, updateUser }}>
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
