export type MemoryType = 'photo' | 'video' | 'text' | 'voice';
export type MemoryStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface Wedding {
  id: string;
  user_id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string | null;
  location: string;
  welcome_message: string;
  cover_image_url: string;
  slug: string;
  access_token: string;
  gallery_enabled: boolean;
  moderation_enabled: boolean;
  live_wall_enabled: boolean;
  accent_color: string;
  created_at: string;
}

export interface Guest {
  id: string;
  wedding_id: string;
  display_name: string;
  is_anonymous: boolean;
  session_id: string;
  created_at: string;
}

export interface MemoryMedia {
  id: string;
  memory_id: string;
  media_type: 'image' | 'video' | 'audio';
  storage_path: string;
  thumbnail_path: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  file_size: number | null;
}

export interface Memory {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  type: MemoryType;
  caption: string;
  story: string;
  status: MemoryStatus;
  is_featured: boolean;
  unlock_date: string | null;
  created_at: string;
  guests?: Guest | null;
  memory_media?: MemoryMedia[];
}

export interface Reaction {
  id: string;
  memory_id: string;
  session_id: string;
  reaction_type: string;
  created_at: string;
}
