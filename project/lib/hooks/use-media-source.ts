'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { storageObjectPath } from '@/lib/storage-source';
const cache = new Map<string, { expires:number; promise:Promise<string> }>();
export function useMediaSource(source:string, attempt=0, enabled=true) {
  const path = storageObjectPath(source, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [resolved, setResolved] = useState<{source:string; url:string; error:boolean}>({source:'',url:'',error:false});
  useEffect(() => {
    if (!path || !enabled) return;
    let alive = true;
    let request = 0;
    const client = getSupabase();
    const resolve = async () => {
      const currentRequest = ++request;
      try {
        const { data: { session } } = await client.auth.getSession();
        const key = (session?.user.id || 'anon') + ':' + path;
        if (attempt) cache.delete(key);
        let entry = cache.get(key);
        if (!entry || entry.expires < Date.now()) {
          const promise = client.storage.from('wedding-media').createSignedUrl(path, 600).then(({data,error}) => {
            if (error || !data?.signedUrl) { cache.delete(key); throw error || new Error('Medya açılamadı'); }
            return data.signedUrl;
          });
          entry = { expires: Date.now()+540000, promise }; cache.set(key, entry);
        }
        const url = await entry.promise;
        if (alive && currentRequest === request) setResolved({source,url,error:false});
      } catch { if (alive && currentRequest === request) setResolved({source,url:'',error:true}); }
    };
    void resolve();
    const timer = setInterval(() => { void resolve(); }, 540000);
    const {data} = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        request++; cache.clear(); setResolved({source,url:'',error:false});
        // Auth callbacks must not await another auth method inside Supabase's lock.
        setTimeout(() => { if(alive) void resolve(); }, 0);
      }
    });
    return () => { alive=false; clearInterval(timer); data.subscription.unsubscribe(); };
  }, [path, source, attempt, enabled]);
  if (!path) return {url:enabled?source:'',error:false};
  return enabled && resolved.source === source ? resolved : {url:'',error:false};
}
