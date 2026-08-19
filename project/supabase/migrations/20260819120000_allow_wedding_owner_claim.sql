/*
  Allow the first authenticated admin to claim a seeded wedding whose
  user_id is null. Once claimed, only that owner can update it.
*/
DROP POLICY IF EXISTS "owner_update_wedding" ON weddings;
CREATE POLICY "owner_update_wedding" ON weddings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);
