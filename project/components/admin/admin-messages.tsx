'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateLong } from '@/lib/format';

interface TextMemory {
  id: string;
  story: string;
  caption: string;
  created_at: string;
  status: string;
  guests: { display_name: string; is_anonymous: boolean } | null;
}

export function AdminMessages() {
  const [messages, setMessages] = useState<TextMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('memories')
      .select('*, guests (*)')
      .eq('type', 'text')
      .order('created_at', { ascending: false });
    if(error) { toast.error('Mesajlar yüklenemedi: '+error.message); setLoading(false); return; }
    setMessages((data || []) as unknown as TextMemory[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mesaj silinsin mi?')) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('memories').delete().eq('id', id).select('id').single();
    if (error) { toast.error('Silinemedi'); return; }
    toast.success('Silindi');
    load();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-3xl font-light text-charcoal">Dijital Anı Defteri</h1>
          <p className="text-sm text-muted-foreground">Misafirlerin bıraktığı yazılı mesajlar</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Henüz mesaj yok.</p>
      ) : (
        <div className="mt-8 columns-1 gap-6 md:columns-2 lg:columns-3">
          {messages.map((m) => (
            <div key={m.id} className="mb-6 break-inside-avoid rounded-2xl border border-border bg-card p-6">
              <p className="font-serif text-lg font-light text-charcoal italic leading-relaxed">
                &quot;{m.story}&quot;
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    — {m.guests?.is_anonymous ? 'Anonim' : m.guests?.display_name || 'Bir misafir'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateLong(m.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
