import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl && 
  supabaseServiceKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseServiceKey.includes('your_supabase')
);

export const supabaseAdmin: SupabaseClient = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

/**
 * Validates a Supabase JWT access token and returns user profile data
 */
export async function verifySupabaseToken(token: string) {
  if (!isSupabaseServerConfigured) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    // Fetch profile details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Campus Student',
      campus: profile?.college || user.user_metadata?.college || user.user_metadata?.campus || 'Central Campus',
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url || '',
      phone: profile?.phone || user.user_metadata?.phone || '',
      role: 'student'
    };
  } catch (err) {
    console.warn('Failed to verify Supabase token:', err);
    return null;
  }
}
