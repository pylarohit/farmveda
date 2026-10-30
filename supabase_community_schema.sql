-- ============================================================
-- FarmVeda Community Module - Database Schema
-- Run this in Supabase SQL Editor to enable server-side tables
-- ============================================================

-- 1. Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_role TEXT DEFAULT 'farmer', -- 'farmer', 'expert', 'mentor', 'admin'
    is_verified_expert BOOLEAN DEFAULT false,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    category TEXT NOT NULL DEFAULT 'General Discussion',
    crop_type TEXT DEFAULT 'General',
    location TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    ai_summary TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'flagged', 'hidden'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Community Comments Table
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_role TEXT DEFAULT 'farmer',
    is_expert_response BOOLEAN DEFAULT false,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Community Likes Table
CREATE TABLE IF NOT EXISTS public.community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'post', 'comment'
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- 4. Community Reports Table
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Community Notifications Table
CREATE TABLE IF NOT EXISTS public.community_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_avatar TEXT,
    type TEXT NOT NULL, -- 'like', 'comment', 'expert_reply', 'announcement'
    post_id UUID,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expert Profiles Table
CREATE TABLE IF NOT EXISTS public.expert_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE,
    mentor_id TEXT,
    name TEXT NOT NULL,
    avatar TEXT,
    designation TEXT NOT NULL,
    specialization TEXT NOT NULL,
    experience_years INTEGER DEFAULT 5,
    verification_status TEXT DEFAULT 'verified', -- 'pending', 'verified', 'rejected'
    expertise_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    bio TEXT,
    rating NUMERIC(2,1) DEFAULT 4.9,
    total_answers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public posts are viewable by everyone" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Public comments are viewable by everyone" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Public likes are viewable by everyone" ON public.community_likes FOR SELECT USING (true);
CREATE POLICY "Public expert profiles are viewable by everyone" ON public.expert_profiles FOR SELECT USING (true);

-- Insert Policies
CREATE POLICY "Anyone can insert posts" ON public.community_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert comments" ON public.community_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert likes" ON public.community_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert reports" ON public.community_reports FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_crop_type ON public.community_posts(crop_type);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);

