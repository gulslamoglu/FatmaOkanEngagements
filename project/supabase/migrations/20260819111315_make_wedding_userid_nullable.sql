/*
# Make weddings.user_id nullable

The seed wedding (and future weddings created by seeding) need to exist before
an admin signs up. user_id becomes nullable so a wedding can be unowned until
an admin claims it via the admin panel. RLS already permits public SELECT and
authenticated-owner mutations.
*/
ALTER TABLE weddings ALTER COLUMN user_id DROP NOT NULL;
