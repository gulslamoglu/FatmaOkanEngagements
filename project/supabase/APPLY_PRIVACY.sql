-- Apply once in Supabase SQL Editor after deploying this application version.
-- Ensure weddings.user_id references the couple admin account before enabling submissions.
BEGIN;
-- Per-event browser guest quotas; does not turn anonymous sessions into verified people.

CREATE INDEX IF NOT EXISTS idx_guests_event_session ON public.guests(wedding_id, session_id);
CREATE INDEX IF NOT EXISTS idx_memories_guest_event ON public.memories(guest_id, wedding_id);
CREATE INDEX IF NOT EXISTS idx_media_memory_type ON public.memory_media(memory_id, media_type);

CREATE OR REPLACE FUNCTION public.enforce_guest_media_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE event_id uuid; guest_session text; used_count bigint; max_count integer;
BEGIN
  -- ON CONFLICT DO NOTHING replays must not consume another allowance.
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.memory_media WHERE id = NEW.id) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.memory_id = OLD.memory_id AND NEW.media_type = OLD.media_type THEN RETURN NEW; END IF;
  SELECT m.wedding_id, g.session_id INTO event_id, guest_session
    FROM public.memories m JOIN public.guests g ON g.id = m.guest_id AND g.wedding_id = m.wedding_id
    WHERE m.id = NEW.memory_id;
  IF event_id IS NULL OR coalesce(guest_session, '') = '' THEN
    RAISE EXCEPTION 'Paylaşım için geçerli bir misafir kaydı gerekiyor.';
  END IF;
  -- Serialize different guests rows sharing the same event/session, including concurrent tabs.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(event_id::text || ':' || guest_session, 0));
  max_count := CASE NEW.media_type WHEN 'image' THEN 20 WHEN 'video' THEN 5 WHEN 'audio' THEN 2 ELSE 0 END;
  SELECT count(*) INTO used_count FROM public.memory_media mm
    JOIN public.memories m ON m.id = mm.memory_id
    JOIN public.guests g ON g.id = m.guest_id
    WHERE m.wedding_id = event_id AND g.session_id = guest_session
      AND mm.media_type = NEW.media_type AND mm.id <> NEW.id;
  IF used_count >= max_count THEN
    RAISE EXCEPTION 'Paylaşım hakkın doldu. Toplam 20 fotoğraf, 5 video ve 2 ses kaydı bırakabilirsin. Yazılı mesajlar sınırsız.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_guest_media_limits ON public.memory_media;
CREATE TRIGGER enforce_guest_media_limits BEFORE INSERT OR UPDATE OF memory_id, media_type ON public.memory_media
  FOR EACH ROW EXECUTE FUNCTION public.enforce_guest_media_limits();
REVOKE ALL ON FUNCTION public.enforce_guest_media_limits() FROM PUBLIC;

-- Deploy the updated application with this migration. Existing public storage URLs stop working.
-- Use authenticated, short-lived signed URLs instead. Ownership must already be configured.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS sharing_consent_version text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS sharing_consent_at timestamptz;

CREATE OR REPLACE FUNCTION private.is_event_owner(event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = event_id AND w.user_id = (SELECT auth.uid()));
$$;
CREATE OR REPLACE FUNCTION private.can_read_memory(memory_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memories m WHERE m.id = memory_id AND
    (private.is_event_owner(m.wedding_id) OR (m.type IN ('photo','video') AND m.status = 'approved')));
$$;
CREATE OR REPLACE FUNCTION private.owns_memory(memory_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memories m WHERE m.id = memory_id AND private.is_event_owner(m.wedding_id));
$$;
CREATE OR REPLACE FUNCTION private.can_read_attachment(memory_id uuid, media_type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.owns_memory(memory_id) OR (media_type IN ('image','video') AND private.can_read_memory(memory_id));
$$;
CREATE OR REPLACE FUNCTION private.can_insert_attachment(memory_id uuid, media_type text, object_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memories m JOIN public.guests g ON g.id = m.guest_id AND g.wedding_id = m.wedding_id
    WHERE m.id = memory_id AND split_part(object_path, '/', 1) = m.wedding_id::text AND
      ((m.type = 'photo' AND media_type = 'image') OR (m.type = 'video' AND media_type = 'video') OR (m.type = 'voice' AND media_type = 'audio')));
$$;
CREATE OR REPLACE FUNCTION private.can_read_object(object_name text, mime_type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(object_name, '/', 1) AND w.user_id = (SELECT auth.uid()))
  OR (
    coalesce(mime_type, '') NOT LIKE 'audio/%' AND split_part(object_name, '/', 2) <> 'voice'
    AND NOT EXISTS (SELECT 1 FROM public.memory_media mm JOIN public.memories m ON m.id = mm.memory_id
      WHERE (mm.storage_path = object_name OR mm.thumbnail_path = object_name) AND (m.type IN ('voice','text') OR mm.media_type = 'audio'))
    AND (
      EXISTS (SELECT 1 FROM public.memory_media mm JOIN public.memories m ON m.id = mm.memory_id
        WHERE (mm.storage_path = object_name OR mm.thumbnail_path = object_name)
          AND mm.media_type IN ('image','video') AND m.type IN ('photo','video') AND m.status = 'approved')
      OR EXISTS (SELECT 1 FROM public.weddings w WHERE w.cover_image_url = object_name
        OR right(w.cover_image_url, length('/storage/v1/object/public/wedding-media/' || object_name)) = '/storage/v1/object/public/wedding-media/' || object_name)
    )
  );
$$;
REVOKE ALL ON FUNCTION private.is_event_owner(uuid), private.can_read_memory(uuid), private.owns_memory(uuid), private.can_read_attachment(uuid,text), private.can_insert_attachment(uuid,text,text), private.can_read_object(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_event_owner(uuid), private.can_read_memory(uuid), private.owns_memory(uuid), private.can_read_attachment(uuid,text), private.can_insert_attachment(uuid,text,text), private.can_read_object(text,text) TO anon, authenticated;

-- Restrictive guards also constrain any legacy permissive policies that may exist in production.
DROP POLICY IF EXISTS privacy_read_memories ON public.memories;
CREATE POLICY privacy_read_memories ON public.memories AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (private.is_event_owner(wedding_id) OR (type IN ('photo','video') AND status = 'approved'));
DROP POLICY IF EXISTS privacy_update_memories ON public.memories;
CREATE POLICY privacy_update_memories ON public.memories AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (private.is_event_owner(wedding_id)) WITH CHECK (private.is_event_owner(wedding_id));
DROP POLICY IF EXISTS privacy_delete_memories ON public.memories;
CREATE POLICY privacy_delete_memories ON public.memories AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (private.is_event_owner(wedding_id));
DROP POLICY IF EXISTS privacy_read_media ON public.memory_media;
CREATE POLICY privacy_read_media ON public.memory_media AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (private.can_read_attachment(memory_id, media_type));
DROP POLICY IF EXISTS privacy_insert_media ON public.memory_media;
CREATE POLICY privacy_insert_media ON public.memory_media AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (private.can_insert_attachment(memory_id, media_type, storage_path));
DROP POLICY IF EXISTS privacy_update_media ON public.memory_media;
CREATE POLICY privacy_update_media ON public.memory_media AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (private.owns_memory(memory_id)) WITH CHECK (private.owns_memory(memory_id));
DROP POLICY IF EXISTS privacy_delete_media ON public.memory_media;
CREATE POLICY privacy_delete_media ON public.memory_media AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (private.owns_memory(memory_id));
DROP POLICY IF EXISTS privacy_read_reactions ON public.reactions;
CREATE POLICY privacy_read_reactions ON public.reactions AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (private.can_read_memory(memory_id));
DROP POLICY IF EXISTS privacy_insert_reactions ON public.reactions;
CREATE POLICY privacy_insert_reactions ON public.reactions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (private.can_read_memory(memory_id));

-- Do not let an arbitrary new account claim an unowned event and read private messages.
DROP POLICY IF EXISTS owner_update_wedding ON public.weddings;
CREATE POLICY owner_update_wedding ON public.weddings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

UPDATE storage.buckets SET public = false WHERE id = 'wedding-media';
DROP POLICY IF EXISTS privacy_read_storage ON storage.objects;
CREATE POLICY privacy_read_storage ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id <> 'wedding-media' OR private.can_read_object(name, metadata->>'mimetype'));
DROP POLICY IF EXISTS privacy_delete_storage ON storage.objects;
CREATE POLICY privacy_delete_storage ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id <> 'wedding-media' OR EXISTS (SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND private.is_event_owner(w.id)));
DROP POLICY IF EXISTS privacy_update_storage ON storage.objects;
CREATE POLICY privacy_update_storage ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'wedding-media' OR EXISTS (SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND private.is_event_owner(w.id)))
  WITH CHECK (bucket_id <> 'wedding-media' OR EXISTS (SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND private.is_event_owner(w.id)));

CREATE OR REPLACE FUNCTION public.guest_media_usage(event_id uuid, guest_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF coalesce(guest_session,'') = '' OR length(guest_session) > 200 THEN RAISE EXCEPTION 'Geçersiz misafir kimliği'; END IF;
  SELECT jsonb_build_object('image',count(*) FILTER (WHERE mm.media_type='image'), 'video',count(*) FILTER (WHERE mm.media_type='video'),
    'audio',count(*) FILTER (WHERE mm.media_type='audio'), 'ids',coalesce(jsonb_agg(mm.id),'[]'::jsonb)) INTO result
    FROM public.memory_media mm JOIN public.memories m ON m.id = mm.memory_id JOIN public.guests g ON g.id = m.guest_id
    WHERE m.wedding_id = event_id AND g.session_id = guest_session;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.guest_media_usage(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_media_usage(uuid,text) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.sharing_ready(event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.weddings WHERE id = event_id AND user_id IS NOT NULL)
    AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'wedding-media' AND public = false)
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid = 'public.memory_media'::regclass AND tgname = 'enforce_guest_media_limits' AND NOT tgisinternal);
$$;
REVOKE ALL ON FUNCTION public.sharing_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sharing_ready(uuid) TO anon, authenticated;

-- Guest attendance responses. Guests submit through the RPC; only the event owner can read them.
CREATE TABLE IF NOT EXISTS public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  guest_name text NOT NULL,
  attendance text NOT NULL CHECK (attendance IN ('attending', 'not_attending', 'maybe')),
  guest_count integer NOT NULL DEFAULT 0 CHECK (guest_count BETWEEN 0 AND 20),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, session_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rsvps_wedding_updated ON public.rsvps(wedding_id, updated_at DESC);
DROP POLICY IF EXISTS "owner_read_rsvps" ON public.rsvps;
CREATE POLICY "owner_read_rsvps" ON public.rsvps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.submit_rsvp(event_id uuid, guest_session text, guest_name_input text,
  attendance_input text, guest_count_input integer, note_input text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE guest_record_id uuid; response_id uuid; clean_name text := btrim(coalesce(guest_name_input, ''));
  clean_note text := btrim(coalesce(note_input, '')); normalized_count integer := coalesce(guest_count_input, 0);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.weddings WHERE id = event_id) THEN RAISE EXCEPTION 'Etkinlik bulunamadı'; END IF;
  IF coalesce(guest_session, '') = '' OR length(guest_session) > 200 THEN RAISE EXCEPTION 'Geçersiz misafir kimliği'; END IF;
  IF clean_name = '' OR length(clean_name) > 120 THEN RAISE EXCEPTION 'Lütfen adını ve soyadını yaz'; END IF;
  IF attendance_input NOT IN ('attending', 'not_attending', 'maybe') THEN RAISE EXCEPTION 'Geçersiz katılım durumu'; END IF;
  IF normalized_count < 0 OR normalized_count > 20 OR (attendance_input = 'attending' AND normalized_count < 1)
    OR (attendance_input <> 'attending' AND normalized_count <> 0) THEN RAISE EXCEPTION 'Geçersiz katılımcı sayısı'; END IF;
  IF length(clean_note) > 500 THEN RAISE EXCEPTION 'Not çok uzun'; END IF;
  SELECT g.id INTO guest_record_id FROM public.guests g WHERE g.wedding_id = event_id AND g.session_id = guest_session ORDER BY g.created_at, g.id LIMIT 1;
  INSERT INTO public.rsvps(wedding_id, guest_id, session_id, guest_name, attendance, guest_count, note, updated_at)
    VALUES (event_id, guest_record_id, guest_session, clean_name, attendance_input, normalized_count, clean_note, now())
    ON CONFLICT (wedding_id, session_id) DO UPDATE SET guest_id = EXCLUDED.guest_id, guest_name = EXCLUDED.guest_name,
      attendance = EXCLUDED.attendance, guest_count = EXCLUDED.guest_count, note = EXCLUDED.note, updated_at = now()
    RETURNING id INTO response_id;
  RETURN jsonb_build_object('id', response_id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp(uuid,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(uuid,text,text,text,integer,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.require_media_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.memories WHERE id = NEW.id) THEN RETURN NEW; END IF;
  IF NEW.type <> 'text' THEN
    IF NEW.sharing_consent_at IS NULL OR NEW.sharing_consent_version IS DISTINCT FROM
      (CASE WHEN NEW.type = 'voice' THEN 'private-voice-v1' ELSE 'public-media-v1' END) THEN
      RAISE EXCEPTION 'Dosyayı göndermeden önce paylaşım onayı gerekiyor.';
    END IF;
    NEW.sharing_consent_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.require_media_consent() FROM PUBLIC;
DROP TRIGGER IF EXISTS require_media_consent ON public.memories;
CREATE TRIGGER require_media_consent BEFORE INSERT ON public.memories FOR EACH ROW EXECUTE FUNCTION private.require_media_consent();
-- A definer RPC permits write-only private submissions without granting guests SELECT on private rows.
CREATE OR REPLACE FUNCTION public.submit_media_memories(event_id uuid, guest_session text, submissions jsonb, consent_version text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item jsonb; record_id uuid; guest_id uuid; media_kind text; memory_kind text; object_path text; thumb_path text;
  expected_version text; publish_status text; accepted integer := 0; existing_guest text; existing_kind text;
BEGIN
  IF NOT public.sharing_ready(event_id) THEN RAISE EXCEPTION 'Paylaşım alanı henüz hazır değil.'; END IF;
  IF submissions IS NULL OR jsonb_typeof(submissions) <> 'array' OR jsonb_array_length(submissions) NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Geçersiz dosya seçimi'; END IF;
  SELECT g.id INTO guest_id FROM public.guests g WHERE g.wedding_id = event_id AND g.session_id = guest_session ORDER BY g.created_at, g.id LIMIT 1;
  IF guest_id IS NULL OR coalesce(guest_session,'') = '' THEN RAISE EXCEPTION 'Misafir kaydı bulunamadı'; END IF;
  SELECT CASE WHEN w.moderation_enabled THEN 'pending' ELSE 'approved' END INTO publish_status FROM public.weddings w WHERE w.id = event_id;
  FOR item IN SELECT value FROM jsonb_array_elements(submissions) LOOP
    record_id := (item->>'id')::uuid; media_kind := item->>'kind'; object_path := item->>'path'; thumb_path := coalesce(item->>'thumbnailPath','');
    IF media_kind NOT IN ('image','video','audio') OR record_id IS NULL THEN RAISE EXCEPTION 'Geçersiz dosya'; END IF;
    IF media_kind <> 'image' AND jsonb_array_length(submissions) <> 1 THEN RAISE EXCEPTION 'Tek seferde bir video veya ses kaydı gönderilebilir'; END IF;
    memory_kind := CASE media_kind WHEN 'image' THEN 'photo' WHEN 'video' THEN 'video' ELSE 'voice' END;
    expected_version := CASE media_kind WHEN 'audio' THEN 'private-voice-v1' ELSE 'public-media-v1' END;
    IF consent_version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Paylaşım onayı gerekiyor'; END IF;
    IF object_path IS NULL OR left(object_path, length(event_id::text || '/' || (CASE WHEN media_kind='audio' THEN 'voice/' ELSE '' END) || record_id::text || '.'))
      <> event_id::text || '/' || (CASE WHEN media_kind='audio' THEN 'voice/' ELSE '' END) || record_id::text || '.' THEN RAISE EXCEPTION 'Geçersiz dosya yolu'; END IF;
    IF thumb_path <> '' AND left(thumb_path,length(event_id::text || '/' || record_id::text || '-thumb.')) <> event_id::text || '/' || record_id::text || '-thumb.' THEN RAISE EXCEPTION 'Geçersiz önizleme yolu'; END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='wedding-media' AND o.name=object_path) THEN RAISE EXCEPTION 'Dosya henüz yüklenmedi'; END IF;
    IF thumb_path <> '' AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='wedding-media' AND o.name=thumb_path) THEN RAISE EXCEPTION 'Önizleme henüz yüklenmedi'; END IF;
    IF length(coalesce(item->>'caption','')) > 240 OR length(coalesce(item->>'story','')) > 500 THEN RAISE EXCEPTION 'Başlık veya açıklama çok uzun'; END IF;
    SELECT g.session_id, m.type INTO existing_guest, existing_kind FROM public.memories m JOIN public.guests g ON g.id=m.guest_id
      WHERE m.id=record_id AND m.wedding_id=event_id;
    IF EXISTS (SELECT 1 FROM public.memories WHERE id=record_id) AND (existing_guest IS DISTINCT FROM guest_session OR existing_kind IS DISTINCT FROM memory_kind) THEN RAISE EXCEPTION 'Bu kayıt gönderilemedi'; END IF;
    INSERT INTO public.memories(id,wedding_id,guest_id,type,caption,story,status,sharing_consent_version,sharing_consent_at)
      VALUES(record_id,event_id,guest_id,memory_kind,coalesce(item->>'caption',''),coalesce(item->>'story',''),publish_status,consent_version,now()) ON CONFLICT(id) DO NOTHING;
    INSERT INTO public.memory_media(id,memory_id,media_type,storage_path,thumbnail_path,file_size,duration)
      VALUES(record_id,record_id,media_kind,object_path,thumb_path,(item->>'fileSize')::bigint,(item->>'duration')::integer) ON CONFLICT(id) DO NOTHING;
    accepted := accepted + 1;
  END LOOP;
  RETURN accepted;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_media_memories(uuid,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_media_memories(uuid,text,jsonb,text) TO anon, authenticated;

-- Non-destructive cover framing: original storage image stays unchanged.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS cover_position jsonb NOT NULL DEFAULT '{"x":50,"y":50}'::jsonb;

-- Optional content; existing pages work before this migration is applied.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS event_guide jsonb NOT NULL DEFAULT '{"schedule":[],"menu":[],"note":""}'::jsonb;

UPDATE public.weddings SET event_guide = '{"schedule":[{"time":"19:00","title":"Nişanımıza hoş geldiniz","description":"Bu özel akşamı birlikte karşılıyoruz."}],"menu":[{"title":"Antre Tabağı","description":"Nar ekşili kısır, patates salatası, şakşuka, dereotlu yoğurtlu boncuk makarna, Pembe Sultan, Girit mezesi, buğdaylı haydari"},{"title":"Ara Sıcak","description":"Kızarmış çıtır Çin böreği"},{"title":"Ana Yemek","description":"Dana lokum (patates yatağında), tereyağlı pirinç pilavı, patates püresi, domates ve biber"},{"title":"Tatlı","description":"Düğün pastası"},{"title":"İçecekler","description":"Sınırsız meşrubat ve su"}],"note":"333 DAVET · KIYI FLORYA — Ziyafet Menü"}'::jsonb, location = '333 Wedding Garden · Gümüşpala Mahallesi, İskeçe Caddesi No: 7/3, Avcılar / İstanbul' WHERE slug = 'fatma-okan' AND event_guide = '{"schedule":[],"menu":[],"note":""}'::jsonb;

NOTIFY pgrst, 'reload schema';
COMMIT;
