-- Migration: Add receipt_url to public.payments table for manual payment screenshots
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN public.payments.receipt_url IS 'URL or data URI of the uploaded transaction receipt screenshot for manual payments (EasyPaisa/JazzCash).';
