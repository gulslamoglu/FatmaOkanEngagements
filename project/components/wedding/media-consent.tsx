'use client';
import { ShieldCheck } from 'lucide-react';
export function MediaConsent({ checked, onChange, privateVoice = false, disabled = false }: { checked:boolean; onChange:(value:boolean)=>void; privateVoice?:boolean; disabled?:boolean }) {
  return <div className="rounded-2xl border border-primary/20 bg-secondary/50 p-4">
    <p className="mb-3 flex items-center gap-2 text-xs font-medium text-primary"><ShieldCheck className="h-4 w-4" /> {privateVoice ? 'Sadece çifte özel' : 'Paylaşmadan önce'}</p>
    <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span className="text-xs leading-relaxed text-charcoal">{privateVoice ? 'Ses kaydımın yalnızca çiftin yönetim panelinde dinlenebilmesi için yüklenmesini ve saklanmasını onaylıyorum.' : 'Seçtiğim fotoğraf ve videoların çiftle paylaşılmasını, saklanmasını ve nişan albümü ile canlı anı duvarında misafirlere gösterilmesini onaylıyorum. İçerikteki kişilerin paylaşım iznini aldım.'}</span></label>
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Onay vermeden dosyaların gönderilmez. Vazgeçersen sayfadan çıkabilirsin.</p>
  </div>;
}
