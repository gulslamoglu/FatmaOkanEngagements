-- Non-destructive cover framing: original storage image stays unchanged.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS cover_position jsonb NOT NULL DEFAULT '{"x":50,"y":50}'::jsonb;
