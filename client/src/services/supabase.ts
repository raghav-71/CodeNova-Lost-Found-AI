import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your_supabase_anon_key')
);

// Initialize Supabase Client with graceful fallback
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

/**
 * Upload an image file to the Supabase Storage 'item-images' bucket
 */
export async function uploadItemImageToSupabase(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase Storage is not configured. Falling back to server upload.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `items/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Failed to upload item image to Supabase: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('item-images').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload user avatar to the Supabase Storage 'avatars' bucket
 */
export async function uploadAvatarToSupabase(file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase Storage is not configured.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Subscribe to real-time notification alerts for the current user
 */
export function subscribeToRealtimeNotifications(
  userId: string,
  onNewNotification: (notification: any) => void
) {
  if (!isSupabaseConfigured || !userId) return null;

  const channel = supabase
    .channel(`public:notifications:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to real-time claim status changes
 */
export function subscribeToRealtimeClaims(
  onClaimChange: (claim: any) => void
) {
  if (!isSupabaseConfigured) return null;

  const channel = supabase
    .channel('public:claims:live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'claims',
      },
      (payload) => {
        onClaimChange(payload.new);
      }
    )
    .subscribe();

  return channel;
}
