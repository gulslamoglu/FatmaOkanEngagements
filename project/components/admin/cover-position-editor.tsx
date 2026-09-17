'use client';
import { ReliableImage } from '@/components/media/reliable-media';
import { coverPosition, coverStyle, type CoverPosition } from '@/lib/cover-position';
export function CoverPositionEditor({src,value,onChange,disabled=false}:{src:string;value?:CoverPosition;onChange:(value:CoverPosition)=>void;disabled?:boolean}) {
 const position=coverPosition(value);
 return <div className="my-4 rounded-2xl border border-border bg-background p-4">
 <p className="text-sm font-medium">Kapakta görünecek alanı ayarla</p><p className="mt-1 text-xs leading-6 text-muted-foreground">Yüzleri görünür tutmak için fotoğrafı sağa/sola veya yukarı/aşağı konumlandır. Orijinal fotoğraf kırpılmaz.</p>
 <div className="mt-4 grid grid-cols-[1fr_2fr] items-center gap-4">
 {[{label:'Telefon',aspect:'9 / 18'},{label:'Masaüstü',aspect:'16 / 9'}].map(preview=><div key={preview.label}><p className="mb-2 text-xs text-muted-foreground">{preview.label}</p><div className="relative isolate overflow-hidden rounded-xl" style={{aspectRatio:preview.aspect}}><ReliableImage key={src} src={src} eager alt={preview.label+' kapak önizlemesi'} mediaStyle={coverStyle(position)} className="absolute inset-0 h-full w-full" mediaClassName="object-cover" /><div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"><span className="font-serif text-lg text-white">Bizim günümüz</span></div></div></div>)}
 </div><div className="mt-5 grid gap-4 sm:grid-cols-2">{(['x','y'] as const).map(axis=><label key={axis} className="text-xs">{axis==='x'?'Yatay konum':'Dikey konum'} <span className="text-muted-foreground">{position[axis]}%</span><input type="range" min="0" max="100" step="1" value={position[axis]} disabled={disabled} onChange={e=>onChange({...position,[axis]:Number(e.target.value)})} className="mt-2 block w-full accent-primary" /></label>)}</div><button type="button" disabled={disabled} onClick={()=>onChange({x:50,y:50})} className="mt-3 rounded-full border border-border px-3 py-2 text-xs">Ortala</button></div>;
}
