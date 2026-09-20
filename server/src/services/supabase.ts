import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl && 
  supabaseServiceKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseServiceKey.includes('your_supabase')
);

// Admin client with full server privileges
export const supabaseAdmin: SupabaseClient = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-service-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

// Public client
export const supabasePublic: SupabaseClient = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

export interface SupabaseUserProfile {
  id: string;
  email: string;
  name: string;
  campus: string;
  avatar: string;
  phone: string;
  role: string;
}

/**
 * Validates a Supabase JWT access token against the authoritative Supabase Auth service
 * and retrieves user profile details.
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseUserProfile | null> {
  if (!isSupabaseServerConfigured || !token) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    // Try fetching profile from profiles table
    let profileData: any = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profileData = profile;
    } catch {
      // Ignore if table not yet migrated
    }

    const name = profileData?.full_name || 
      user.user_metadata?.full_name || 
      user.user_metadata?.name || 
      user.email?.split('@')[0] || 
      'Campus Member';

    const campus = profileData?.college || 
      user.user_metadata?.college || 
      user.user_metadata?.campus || 
      'Central Campus';

    const avatar = profileData?.avatar_url || 
      user.user_metadata?.avatar_url || 
      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

    const phone = profileData?.phone || 
      user.user_metadata?.phone || 
      '';

    return {
      id: user.id,
      email: user.email || '',
      name,
      campus,
      avatar,
      phone,
      role: 'student'
    };
  } catch (err) {
    console.warn('Supabase token verification encountered an error:', err);
    return null;
  }
}
