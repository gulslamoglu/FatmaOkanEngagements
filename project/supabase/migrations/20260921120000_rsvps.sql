-- Guest attendance responses. Guests can submit through the RPC, while only
-- the wedding owner can read the responses from the admin panel.
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

CREATE OR REPLACE FUNCTION public.submit_rsvp(
  event_id uuid,
  guest_session text,
  guest_name_input text,
  attendance_input text,
  guest_count_input integer,
  note_input text DEFAULT ''
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  guest_record_id uuid;
  response_id uuid;
  clean_name text := btrim(coalesce(guest_name_input, ''));
  clean_note text := btrim(coalesce(note_input, ''));
  normalized_count integer := coalesce(guest_count_input, 0);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.weddings WHERE id = event_id) THEN
    RAISE EXCEPTION 'Etkinlik bulunamadı';
  END IF;
  IF coalesce(guest_session, '') = '' OR length(guest_session) > 200 THEN
    RAISE EXCEPTION 'Geçersiz misafir kimliği';
  END IF;
  IF clean_name = '' OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Lütfen adını ve soyadını yaz';
  END IF;
  IF attendance_input NOT IN ('attending', 'not_attending', 'maybe') THEN
    RAISE EXCEPTION 'Geçersiz katılım durumu';
  END IF;
  IF normalized_count < 0 OR normalized_count > 20 OR
    (attendance_input = 'attending' AND normalized_count < 1) OR
    (attendance_input <> 'attending' AND normalized_count <> 0) THEN
    RAISE EXCEPTION 'Geçersiz katılımcı sayısı';
  END IF;
  IF length(clean_note) > 500 THEN RAISE EXCEPTION 'Not çok uzun'; END IF;

  SELECT g.id INTO guest_record_id FROM public.guests g
    WHERE g.wedding_id = event_id AND g.session_id = guest_session
    ORDER BY g.created_at, g.id LIMIT 1;

  INSERT INTO public.rsvps(wedding_id, guest_id, session_id, guest_name, attendance, guest_count, note, updated_at)
    VALUES (event_id, guest_record_id, guest_session, clean_name, attendance_input, normalized_count, clean_note, now())
    ON CONFLICT (wedding_id, session_id) DO UPDATE SET
      guest_id = EXCLUDED.guest_id,
      guest_name = EXCLUDED.guest_name,
      attendance = EXCLUDED.attendance,
      guest_count = EXCLUDED.guest_count,
      note = EXCLUDED.note,
      updated_at = now()
    RETURNING id INTO response_id;

  RETURN jsonb_build_object('id', response_id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp(uuid,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(uuid,text,text,text,integer,text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';