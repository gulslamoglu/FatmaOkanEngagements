const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {PGlite}=require('@electric-sql/pglite');
test('private text/audio remain owner-only, including storage and mutation attempts',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   CREATE ROLE anon; CREATE ROLE authenticated;
   CREATE SCHEMA auth; CREATE SCHEMA storage;
   CREATE TABLE auth.users(id uuid PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated;
   CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);
   CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb DEFAULT '{}');
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20260819111151_create_wedding_platform_schema.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20260918120000_guest_media_limits.sql','utf8'));
  const owner=randomUUID(),other=randomUUID(),event=randomUUID(),guest=randomUUID();
  await db.query('INSERT INTO auth.users VALUES($1),($2)',[owner,other]);
  await db.query('INSERT INTO weddings(id,user_id,slug,cover_image_url) VALUES($1,$2,$3,$4)',[event,owner,'test','https://example.test/storage/v1/object/public/wedding-media/'+event+'/cover.webp']);
  await db.query('INSERT INTO guests(id,wedding_id,session_id) VALUES($1,$2,$3)',[guest,event,'guest-session']);
  const ids={};
  for(const [kind,status] of [['photo','approved'],['video','approved'],['text','approved'],['voice','approved'],['photo','pending']]){
   const key=kind+'-'+status,id=randomUUID();ids[key]=id;
   await db.query('INSERT INTO memories(id,wedding_id,guest_id,type,status,story) VALUES($1,$2,$3,$4,$5,$6)',[id,event,guest,kind,status,'private-content']);
   if(kind!=='text'){
    const mediaType=kind==='photo'?'image':kind==='voice'?'audio':'video';
    const object=event+'/'+key+'.'+(kind==='photo'?'webp':'webm');
    await db.query('INSERT INTO memory_media(memory_id,media_type,storage_path) VALUES($1,$2,$3)',[id,mediaType,object]);
    await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3)', ['wedding-media',object,JSON.stringify({mimetype:mediaType+'/webm'})]);
   }
  }
  await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3)',['wedding-media',event+'/cover.webp','{"mimetype":"image/webp"}']);
  await db.exec(fs.readFileSync('supabase/APPLY_PRIVACY.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/APPLY_PRIVACY.sql','utf8'));
  const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='weddings'")).rows.map(row=>row.column_name);
  assert.ok(columns.includes('event_guide')); assert.ok(columns.includes('cover_position'));
  await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated');
  await db.exec('SET ROLE anon');
  const publicRows=(await db.query('SELECT type FROM memories ORDER BY type')).rows;assert.equal(publicRows.map(r=>r.type).join(','),'photo,video');
  assert.equal((await db.query('SELECT * FROM memories WHERE id=$1',[ids['text-approved']])).rows.length,0);
  assert.equal((await db.query('SELECT * FROM memory_media WHERE media_type=$1',['audio'])).rows.length,0);
  assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1',[event+'/voice-approved.webm'])).rows.length,0);
  assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1',[event+'/cover.webp'])).rows.length,1);
  await db.query('UPDATE memories SET type=$1 WHERE id=$2',['photo',ids['voice-approved']]);
  // A public attachment referring to the old voice path still must not reveal the actual audio object.
  await db.query('INSERT INTO memory_media(memory_id,media_type,storage_path) VALUES($1,$2,$3)',[ids['photo-approved'],'image',event+'/voice-approved.webm']);
  assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1',[event+'/voice-approved.webm'])).rows.length,0);
  await assert.rejects(db.query('INSERT INTO memories(wedding_id,guest_id,type) VALUES($1,$2,$3)',[event,guest,'photo']),/onay/);
  const voice=randomUUID();
  const voicePath=event+'/voice/'+voice+'.webm';
  await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3)',['wedding-media',voicePath,'{"mimetype":"audio/webm"}']);
  const payload=JSON.stringify([{id:voice,kind:'audio',path:voicePath,fileSize:100,duration:5}]);
  await assert.rejects(db.query('SELECT public.submit_media_memories($1,$2,$3,$4)',[event,'guest-session',payload,'public-media-v1']),/onay/);
  await db.query('SELECT public.submit_media_memories($1,$2,$3,$4)',[event,'guest-session',payload,'private-voice-v1']);
  await db.query('SELECT public.submit_media_memories($1,$2,$3,$4)',[event,'guest-session',payload,'private-voice-v1']);
  await db.query('INSERT INTO memories(wedding_id,guest_id,type,story) VALUES($1,$2,$3,$4)',[event,guest,'text','another secret']);
  const usage=(await db.query('SELECT public.guest_media_usage($1,$2) AS value',[event,'guest-session'])).rows[0].value;assert.equal(usage.audio,2);assert.ok(!JSON.stringify(usage).includes('secret'));
  assert.equal((await db.query('SELECT public.sharing_ready($1) AS ready',[event])).rows[0].ready,true);
  await db.exec('RESET ROLE; SET ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[other]);
  assert.equal((await db.query("SELECT * FROM memories WHERE type IN ('voice','text')")).rows.length,0);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);
  assert.equal((await db.query("SELECT * FROM memories WHERE type='voice'")).rows.length,2);
  assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1',[event+'/voice-approved.webm'])).rows.length,1);
  assert.equal((await db.query('SELECT type FROM memories WHERE id=$1',[ids['voice-approved']])).rows[0].type,'voice');
  await db.exec('RESET ROLE');assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='wedding-media'")).rows[0].public,false);
 }finally{await db.close();}
});
