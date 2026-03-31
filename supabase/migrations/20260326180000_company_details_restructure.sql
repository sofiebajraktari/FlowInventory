ALTER TABLE public.company_details
  ADD COLUMN IF NOT EXISTS pos_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_info text NOT NULL DEFAULT '';

ALTER TABLE public.company_details
  DROP COLUMN IF EXISTS branch_name,
  DROP COLUMN IF EXISTS business_number,
  DROP COLUMN IF EXISTS accent_color;
