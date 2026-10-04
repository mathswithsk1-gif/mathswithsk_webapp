-- Seed course
INSERT INTO public.courses (id, title, slug, description, price_pkr, vsl_video_id, status)
VALUES (
    'a5fa5e99-8cfb-4a5c-897d-419b457e5e32',
    'A-Level Maths: Quadratic Equations',
    'quadratic-equations',
    'Master quadratic equations for A-Level Maths. Covers solving by factoring, completing the square, the quadratic formula, and graphing quadratic functions with past paper practice.',
    4000,
    'mock-vsl-video-id',
    'published'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed lectures for the course
INSERT INTO public.lectures (id, course_id, week_number, order_index, title, bunny_video_id, duration_seconds, published_at)
VALUES 
(
    '1a3d90fc-2b63-4a1b-9f93-8bc6fa825c11',
    'a5fa5e99-8cfb-4a5c-897d-419b457e5e32',
    1,
    0,
    'Lecture 1.1: Introduction to Quadratics & Factoring',
    'mock-lecture-1',
    600, -- 10 mins
    NOW()
),
(
    '2b4e91fd-3c74-4b2c-a0a4-9cd7fa936d22',
    'a5fa5e99-8cfb-4a5c-897d-419b457e5e32',
    1,
    1,
    'Lecture 1.2: Completing the Square Method',
    'mock-lecture-2',
    900, -- 15 mins
    NOW()
),
(
    '3c5f92fe-4d85-4c3d-b1b5-ade8fa047e33',
    'a5fa5e99-8cfb-4a5c-897d-419b457e5e32',
    1,
    2,
    'Lecture 1.3: Deriving and Using the Quadratic Formula',
    'mock-lecture-3',
    1200, -- 20 mins
    NOW()
),
(
    '4d6a03ff-5e96-4d4e-c2c6-bdf9fa158f44',
    'a5fa5e99-8cfb-4a5c-897d-419b457e5e32',
    1,
    3,
    'Lecture 1.4: Discriminant & Nature of Roots',
    'mock-lecture-4',
    800, -- 13 mins 20 secs
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed coupons
INSERT INTO public.coupons (id, code, discount_type, value, max_uses, used_count, expires_at, active)
VALUES 
(
    'c1112222-3333-4444-5555-666677778888',
    'MATHS10',
    'percent',
    10, -- 10%
    100,
    0,
    NOW() + INTERVAL '30 days',
    TRUE
),
(
    'd2223333-4444-5555-6666-777788889999',
    'SK500',
    'fixed',
    500, -- 500 PKR off
    50,
    0,
    NOW() + INTERVAL '30 days',
    TRUE
)
ON CONFLICT (code) DO NOTHING;
