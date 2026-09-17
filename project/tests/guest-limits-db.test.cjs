const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
test('database migration enforces file quotas, atomic batches and safe retries', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public.guests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wedding_id uuid NOT NULL, session_id text NOT NULL);
      CREATE TABLE public.memories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wedding_id uuid NOT NULL, guest_id uuid REFERENCES public.guests(id), type text, status text);
      CREATE TABLE public.memory_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), memory_id uuid REFERENCES public.memories(id), media_type text);
    `);
    await db.exec(fs.readFileSync('supabase/migrations/20260918120000_guest_media_limits.sql','utf8'));
    const event = randomUUID();
    async function memory(session, kind, wedding=event) {
      const guest=randomUUID(), id=randomUUID();
      await db.query('INSERT INTO guests(id,wedding_id,session_id) VALUES($1,$2,$3)',[guest,wedding,session]);
      await db.query('INSERT INTO memories(id,wedding_id,guest_id,type,status) VALUES($1,$2,$3,$4,$5)',[id,wedding,guest,kind,'pending']);
      return id;
    }
    async function insert(id,kind,count=1) {
      return db.query('INSERT INTO memory_media(memory_id,media_type) SELECT $1::uuid,$2::text FROM generate_series(1,$3::int) RETURNING id',[id,kind,count]);
    }
    for (const [kind,limit] of [['image',20],['video',5],['audio',2]]) {
      const id=await memory('guest-'+kind,kind);
      const saved=await insert(id,kind,limit);
      await assert.rejects(insert(id,kind), /Paylaşım hakkın doldu/);
      // Lost response: replaying the saved media must succeed even at the cap.
      await db.query('INSERT INTO memory_media(id,memory_id,media_type) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[saved.rows[0].id,id,kind]);
      const duplicateGuest=await memory('guest-'+kind,kind);
      await assert.rejects(insert(duplicateGuest,kind), /Paylaşım hakkın doldu/);
      const otherGuest=await memory('other-'+kind,kind); await insert(otherGuest,kind);
      const otherEvent=await memory('guest-'+kind,kind,randomUUID()); await insert(otherEvent,kind);
      const count=await db.query('SELECT count(*)::int AS total FROM memory_media WHERE memory_id=$1',[id]);
      assert.equal(count.rows[0].total,limit);
    }
    const batch=await memory('batch','photo'); await insert(batch,'image',19);
    await assert.rejects(insert(batch,'image',2), /Paylaşım hakkın doldu/);
    assert.equal((await db.query('SELECT count(*)::int AS total FROM memory_media WHERE memory_id=$1',[batch])).rows[0].total,19);
    await insert(batch,'image');
    const voice=(await insert(batch,'audio')).rows[0].id;
    await assert.rejects(db.query('UPDATE memory_media SET media_type=$1 WHERE id=$2',['image',voice]), /Paylaşım hakkın doldu/);
    const text=await memory('guest-image','text');
    await db.query('INSERT INTO memories(wedding_id,guest_id,type) SELECT wedding_id,guest_id,$2 FROM memories,generate_series(1,100) WHERE id=$1',[text,'text']);
    const nullGuest=randomUUID();
    await db.query('INSERT INTO memories(id,wedding_id,type) VALUES($1,$2,$3)',[nullGuest,event,'photo']);
    await assert.rejects(insert(nullGuest,'image'), /geçerli bir misafir/);
  } finally { await db.close(); }
});
