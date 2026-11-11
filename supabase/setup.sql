-- =====================================================================
-- Maths with SK: full database setup for a NEW Supabase project
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: tables/indexes use IF NOT EXISTS.
-- Optional demo data (sample course, lectures, coupons) is in
-- supabase/migrations/20260609000001_seed_data.sql. Skip it for production.
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_pkr INTEGER NOT NULL CHECK (price_pkr >= 0),
    vsl_video_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. LECTURES TABLE
CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    title TEXT NOT NULL,
    bunny_video_id TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    value NUMERIC NOT NULL CHECK (value > 0),
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    expires_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    amount_pkr INTEGER NOT NULL CHECK (amount_pkr >= 0),
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL,
    gateway_ref TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    max_position_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (max_position_seconds >= 0),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_lecture UNIQUE (student_id, lecture_id)
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lectures_lookup ON public.lectures (course_id, week_number, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollments_lookup ON public.enrollments (student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON public.payments (gateway_ref);
CREATE INDEX IF NOT EXISTS idx_progress_lookup ON public.progress (student_id, lecture_id);

-- 9. ROW-LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Policy helper: Check if user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.students
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9a. Courses policies
CREATE POLICY "Allow public select for published courses" ON public.courses
    FOR SELECT USING (status = 'published');

CREATE POLICY "Allow admins all operations on courses" ON public.courses
    FOR ALL TO authenticated USING (public.is_admin());

-- 9b. Lectures policies
CREATE POLICY "Allow public select for published lectures" ON public.lectures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = lectures.course_id AND status = 'published'
        )
    );

CREATE POLICY "Allow admins all operations on lectures" ON public.lectures
    FOR ALL TO authenticated USING (public.is_admin());

-- 9c. Students policies
CREATE POLICY "Allow students to view and update own profile" ON public.students
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow students to insert own profile" ON public.students
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow students to update own profile" ON public.students
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow admins all operations on students" ON public.students
    FOR ALL TO authenticated USING (public.is_admin());

-- 9d. Enrollments policies
CREATE POLICY "Allow students to view own enrollments" ON public.enrollments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Allow admins all operations on enrollments" ON public.enrollments
    FOR ALL TO authenticated USING (public.is_admin());

-- 9e. Payments policies
CREATE POLICY "Allow students to view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Allow admins all operations on payments" ON public.payments
    FOR ALL TO authenticated USING (public.is_admin());

-- 9f. Coupons policies
CREATE POLICY "Allow public read of active coupons" ON public.coupons
    FOR SELECT USING (active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Allow admins all operations on coupons" ON public.coupons
    FOR ALL TO authenticated USING (public.is_admin());

-- 9g. Progress policies
CREATE POLICY "Allow students to view and update own progress" ON public.progress
    FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Allow admins all operations on progress" ON public.progress
    FOR ALL TO authenticated USING (public.is_admin());

-- ---------------- Blog ----------------
-- 10. POSTS (BLOG) TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for public lookup
CREATE INDEX IF NOT EXISTS idx_posts_slug_status ON public.posts (slug, status);

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public select for published posts
CREATE POLICY "Allow public select for published posts" ON public.posts
    FOR SELECT USING (status = 'published');

-- RLS Policy: Allow admins all operations on posts
CREATE POLICY "Allow admins all operations on posts" ON public.posts
    FOR ALL TO authenticated USING (public.is_admin());

-- Seed Blog Posts (1 Published, 1 Draft)
INSERT INTO public.posts (id, title, slug, content, meta_title, meta_description, image_url, status)
VALUES 
(
    'e1112222-3333-4444-5555-666677778888',
    'How to Master Completing the Square in A-Level Maths',
    'completing-the-square-guide',
    'Completing the square is one of the most vital techniques in A-Level Pure Mathematics. It allows you to find the vertex of a parabola, solve quadratic equations without the formula, and evaluate integrals involving quadratic forms.\n\n### The Standard Form\nA quadratic equation is written as:\n$$ax^2 + bx + c = 0$$\n\nTo complete the square when $a = 1$:\n1. Move the constant term $c$ to the right side.\n2. Add $(b/2)^2$ to both sides.\n3. Factor the perfect square trinomial on the left side.\n\n### Exam Tip\nAlways watch out for non-unit coefficients ($a \\neq 1$). Factor out $a$ from the first two terms before completing the square inside parentheses!\n\nCheck out the handwritten notes below for a step-by-step past paper problem walkthrough.',
    'Master Completing the Square - A-Level Maths Guide by SK',
    'Learn how to complete the square in A-Level Mathematics with step-by-step examples, past paper tips, and handwritten notes by SK.',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
    'published'
),
(
    'f2223333-4444-5555-6666-777788889999',
    'Quadratic Formula Proof & Common Past Paper Traps',
    'quadratic-formula-proof-and-traps',
    '### DRAFT POST - FOR ADMIN REVIEW ONLY\n\nThis article covers the formal derivation of the quadratic formula via completing the square, followed by a breakdown of top examiner traps in Cambridge P1 papers.\n\n### Derivation Overview:\nStart from $ax^2 + bx + c = 0$:\n$$x^2 + \\frac{b}{a}x = -\\frac{c}{a}$$\nCompleting the square:\n$$\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2}$$\nTaking square roots:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n*Note: Include handwritten diagram of discriminant cases before publishing.*',
    'Quadratic Formula Proof & Exam Traps | A-Level Maths SK',
    'Step-by-step proof of the quadratic formula and analysis of common mistakes made by students in Cambridge A-Level exams.',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
    'draft'
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------- Manual payment receipts ----------------
-- Migration: Add receipt_url to public.payments table for manual payment screenshots
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN public.payments.receipt_url IS 'URL or data URI of the uploaded transaction receipt screenshot for manual payments (EasyPaisa/JazzCash).';

-- ---------------- Coupon usage counter ----------------
-- Called by the payment webhook when a paid order used a coupon.
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id_param UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id_param;
$$;
REVOKE ALL ON FUNCTION public.increment_coupon_usage(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------- Make yourself admin (run AFTER signing up on the site) ----------------
-- UPDATE public.students SET role = 'admin' WHERE email = 'admin-email@example.com';
