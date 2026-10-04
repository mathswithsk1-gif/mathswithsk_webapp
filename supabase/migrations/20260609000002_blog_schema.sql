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
