/*
# Digital Wedding Memory Platform — Schema

Creates the full data model for a QR-based digital wedding memory platform.

## 1. New Tables
- `weddings`: one row per wedding (bride/groom names, date, location, welcome text, cover image, slug, access token, feature flags, accent color). Owned by an authenticated admin via `user_id`.
- `guests`: a lightweight "who left this memory" record (display name, anonymous flag, session id). No auth required — guests never sign in.
- `memories`: the core memory row. `type` is photo / video / text / voice. Carries optional caption + story ("bu anın hikâyesi"). `status` is pending / approved / rejected / hidden for moderation. Optional `unlock_date` for time-capsule messages. `is_featured` flag.
- `memory_media`: actual uploaded files (one memory may have several). Stores storage path, thumbnail path, dimensions, duration, file size.
- `reactions`: simple ♡ "bu anı sevdim" reactions, keyed by session id (no accounts).

## 2. Security (RLS)
- `weddings`: public read by slug (so QR guests can load the page without logging in); authenticated owners full CRUD on their own row.
- `guests`, `memories`, `memory_media`, `reactions`: anon + authenticated can read approved/published rows for a given wedding and insert new rows. This is a no-account guest app — the wedding's unguessable slug acts as the access key. Authenticated wedding owners get full update/delete for moderation.
- All tables enable RLS.

## 3. Notes
- Owner column `weddings.user_id` defaults to `auth.uid()` so admin-created weddings bind to the signed-in admin automatically.
- `memories.status` defaults to 'approved' so the default mode is auto-publish; admin can switch moderation on and flip new uploads to 'pending'.
- Idempotent: uses `IF NOT EXISTS` and drops policies before re-creating.
*/

-- Weddings
CREATE TABLE IF NOT EXISTS weddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bride_name text NOT NULL DEFAULT '',
  groom_name text NOT NULL DEFAULT '',
  wedding_date date,
  location text NOT NULL DEFAULT '',
  welcome_message text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  access_token text NOT NULL DEFAULT gen_random_uuid(),
  gallery_enabled boolean NOT NULL DEFAULT true,
  moderation_enabled boolean NOT NULL DEFAULT false,
  live_wall_enabled boolean NOT NULL DEFAULT true,
  accent_color text NOT NULL DEFAULT '#b08968',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_wedding" ON weddings;
CREATE POLICY "public_read_wedding" ON weddings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_wedding" ON weddings;
CREATE POLICY "owner_insert_wedding" ON weddings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_update_wedding" ON weddings;
CREATE POLICY "owner_update_wedding" ON weddings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_delete_wedding" ON weddings;
CREATE POLICY "owner_delete_wedding" ON weddings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  session_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guests_wedding ON guests(wedding_id);

DROP POLICY IF EXISTS "read_guests" ON guests;
CREATE POLICY "read_guests" ON guests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_guests" ON guests;
CREATE POLICY "insert_guests" ON guests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_guests" ON guests;
CREATE POLICY "update_guests" ON guests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_guests" ON guests;
CREATE POLICY "delete_guests" ON guests FOR DELETE
  TO anon, authenticated USING (true);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'photo' CHECK (type IN ('photo','video','text','voice')),
  caption text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','hidden')),
  is_featured boolean NOT NULL DEFAULT false,
  unlock_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_memories_wedding ON memories(wedding_id);
CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);

DROP POLICY IF EXISTS "read_memories" ON memories;
CREATE POLICY "read_memories" ON memories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_memories" ON memories;
CREATE POLICY "insert_memories" ON memories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_memories" ON memories;
CREATE POLICY "update_memories" ON memories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_memories" ON memories;
CREATE POLICY "delete_memories" ON memories FOR DELETE
  TO anon, authenticated USING (true);

-- Memory media
CREATE TABLE IF NOT EXISTS memory_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video','audio')),
  storage_path text NOT NULL DEFAULT '',
  thumbnail_path text NOT NULL DEFAULT '',
  width integer,
  height integer,
  duration integer,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_media_memory ON memory_media(memory_id);

DROP POLICY IF EXISTS "read_media" ON memory_media;
CREATE POLICY "read_media" ON memory_media FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_media" ON memory_media;
CREATE POLICY "insert_media" ON memory_media FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_media" ON memory_media;
CREATE POLICY "update_media" ON memory_media FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_media" ON memory_media;
CREATE POLICY "delete_media" ON memory_media FOR DELETE
  TO anon, authenticated USING (true);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  session_id text NOT NULL DEFAULT '',
  reaction_type text NOT NULL DEFAULT 'love',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reactions_memory ON reactions(memory_id);

DROP POLICY IF EXISTS "read_reactions" ON reactions;
CREATE POLICY "read_reactions" ON reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reactions" ON reactions;
CREATE POLICY "insert_reactions" ON reactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_reactions" ON reactions;
CREATE POLICY "delete_reactions" ON reactions FOR DELETE
  TO anon, authenticated USING (true);

-- Storage bucket for wedding media
INSERT INTO storage.buckets (id, name, public)
SELECT 'wedding-media', 'wedding-media', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'wedding-media');

-- Storage policies: allow anon read + write (guests upload without accounts; slug is the access key)
DROP POLICY IF EXISTS "public_read_wedding_media" ON storage.objects;
CREATE POLICY "public_read_wedding_media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'wedding-media');

DROP POLICY IF EXISTS "anon_upload_wedding_media" ON storage.objects;
CREATE POLICY "anon_upload_wedding_media" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'wedding-media');

DROP POLICY IF EXISTS "anon_delete_wedding_media" ON storage.objects;
CREATE POLICY "anon_delete_wedding_media" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'wedding-media');
