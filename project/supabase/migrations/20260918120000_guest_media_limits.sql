-- Per-event browser guest quotas; does not turn anonymous sessions into verified people.
BEGIN;
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
COMMIT;
