-- ====================================================================
-- FINDIT AI — SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- AI-Powered Campus Lost & Found
-- "Lost something? Let's find it."
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. TABLE: profiles
-- Linked to Supabase auth.users
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    college TEXT DEFAULT 'Central Campus',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ====================================================================
-- 3. TABLE: items
-- Stores Lost and Found item records
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('LOST', 'FOUND')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    date_of_item TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    image_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'MATCH_FOUND', 'CLAIM_PENDING', 'RESOLVED', 'CLOSED')) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast search & filtering
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_date ON public.items(date_of_item DESC);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);

-- ====================================================================
-- 4. TABLE: item_images
-- Stores additional gallery images for items
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON public.item_images(item_id);

-- ====================================================================
-- 5. TABLE: potential_matches
-- AI matching results between Lost and Found reports
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.potential_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    found_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    match_score NUMERIC NOT NULL,
    match_reason TEXT NOT NULL,
    matched_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_lost_found_match UNIQUE (lost_item_id, found_item_id)
);

CREATE INDEX IF NOT EXISTS idx_potential_matches_lost ON public.potential_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_potential_matches_found ON public.potential_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_potential_matches_score ON public.potential_matches(match_score DESC);

-- ====================================================================
-- 6. TABLE: claims
-- Ownership verification claims submitted by users
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    verification_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_item_id ON public.claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

-- ====================================================================
-- 7. TABLE: notifications
-- Real-time campus alerts & notifications
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    related_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- ====================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER
-- When a user registers via Supabase Auth, populate public.profiles
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, college)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || encode(digest(NEW.email, 'sha256'), 'hex')),
        COALESCE(NEW.raw_user_meta_data->>'college', NEW.raw_user_meta_data->>'campus', 'Central Campus')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

    -- Create welcome notification
    INSERT INTO public.notifications (id, user_id, type, title, message)
    VALUES (
        gen_random_uuid(),
        NEW.id,
        'WELCOME',
        'Welcome to FindIt AI!',
        'Explore campus lost & found items or report a lost item to get started.'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------
-- Anyone authenticated or anonymous can view basic profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- ITEMS POLICIES
-- --------------------------------------------------------------------
-- Items are viewable by everyone
CREATE POLICY "Items are viewable by everyone" 
    ON public.items FOR SELECT 
    USING (true);

-- Authenticated users can create items
CREATE POLICY "Authenticated users can create items" 
    ON public.items FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Item owners can update their items
CREATE POLICY "Item owners can update their items" 
    ON public.items FOR UPDATE 
    USING (auth.uid() = user_id);

-- Item owners can delete their items
CREATE POLICY "Item owners can delete their items" 
    ON public.items FOR DELETE 
    USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- ITEM IMAGES POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Item images are viewable by everyone" 
    ON public.item_images FOR SELECT 
    USING (true);

CREATE POLICY "Item owners can insert images" 
    ON public.item_images FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.items 
            WHERE items.id = item_images.item_id 
            AND items.user_id = auth.uid()
        )
    );

CREATE POLICY "Item owners can delete images" 
    ON public.item_images FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.items 
            WHERE items.id = item_images.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- POTENTIAL MATCHES POLICIES
-- --------------------------------------------------------------------
-- Users can view potential matches for items they reported
CREATE POLICY "Users can view potential matches for their items" 
    ON public.potential_matches FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.items 
            WHERE (items.id = potential_matches.lost_item_id OR items.id = potential_matches.found_item_id)
            AND items.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- CLAIMS POLICIES
-- --------------------------------------------------------------------
-- Claimants can view their claims; Item owners can view claims on their items
CREATE POLICY "Users can view relevant claims" 
    ON public.claims FOR SELECT 
    USING (
        claimant_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.items 
            WHERE items.id = claims.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- Authenticated users can submit claims (cannot claim their own item)
CREATE POLICY "Authenticated users can submit claims" 
    ON public.claims FOR INSERT 
    WITH CHECK (
        auth.uid() = claimant_id AND
        NOT EXISTS (
            SELECT 1 FROM public.items 
            WHERE items.id = claims.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- Item owners can approve/reject claims; Claimants can cancel their pending claims
CREATE POLICY "Authorized users can update claims" 
    ON public.claims FOR UPDATE 
    USING (
        claimant_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.items 
            WHERE items.id = claims.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- --------------------------------------------------------------------
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid());

-- ====================================================================
-- 10. SUPABASE STORAGE BUCKETS SETUP
-- ====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('item-images', 'item-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
CREATE POLICY "Public item image access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'item-images' OR bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload item images" 
    ON storage.objects FOR INSERT 
    WITH CHECK ((bucket_id = 'item-images' OR bucket_id = 'avatars') AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads" 
    ON storage.objects FOR UPDATE 
    USING (auth.uid() = owner);

CREATE POLICY "Users can delete their own uploads" 
    ON storage.objects FOR DELETE 
    USING (auth.uid() = owner);
