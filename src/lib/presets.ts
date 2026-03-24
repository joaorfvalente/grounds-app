import { supabase } from './supabase';
import type { Mode, Object3D } from '../store';

export interface PresetState {
  mode: Mode;
  variant: string;
  seed: number;
  brightness: number;
  contrast: number;
  vignette: number;
  grain: number;
  edgeSoftness: number;
  palette: string[];
  modeParams: Record<string, number>;
  objects3d: Object3D[];
}

export interface Preset {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  thumbnail_url: string | null;
  state: PresetState;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export async function fetchMyPresets(userId: string): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchPublicPresets(options?: { limit?: number; offset?: number }): Promise<Preset[]> {
  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from('presets')
    .select('*, profiles(display_name, avatar_url)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function createPreset(
  userId: string,
  name: string,
  state: PresetState,
  isPublic: boolean,
  thumbnailBlob?: Blob
): Promise<Preset> {
  let thumbnailUrl: string | null = null;

  const { data, error } = await supabase
    .from('presets')
    .insert({
      user_id: userId,
      name,
      state,
      is_public: isPublic,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single();

  if (error) throw error;

  if (thumbnailBlob && data) {
    thumbnailUrl = await uploadThumbnail(data.id, thumbnailBlob);
    await supabase
      .from('presets')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', data.id);
    data.thumbnail_url = thumbnailUrl;
  }

  return data;
}

export async function updatePreset(
  id: string,
  updates: {
    name?: string;
    state?: PresetState;
    is_public?: boolean;
    thumbnailBlob?: Blob;
  }
): Promise<Preset> {
  const { thumbnailBlob, ...dbUpdates } = updates;

  if (thumbnailBlob) {
    const thumbnailUrl = await uploadThumbnail(id, thumbnailBlob);
    (dbUpdates as Record<string, unknown>).thumbnail_url = thumbnailUrl;
  }

  const { data, error } = await supabase
    .from('presets')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePreset(id: string): Promise<void> {
  // Delete thumbnail from storage
  await supabase.storage
    .from('thumbnails')
    .remove([`${id}.jpg`]);

  const { error } = await supabase
    .from('presets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function forkPreset(presetId: string, userId: string): Promise<Preset> {
  const { data: original, error: fetchError } = await supabase
    .from('presets')
    .select('*')
    .eq('id', presetId)
    .single();

  if (fetchError || !original) throw fetchError || new Error('Preset not found');

  const { data, error } = await supabase
    .from('presets')
    .insert({
      user_id: userId,
      name: `${original.name} (fork)`,
      state: original.state,
      is_public: false,
      thumbnail_url: original.thumbnail_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function uploadThumbnail(presetId: string, blob: Blob): Promise<string> {
  const path = `${presetId}.jpg`;

  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(path);

  return data.publicUrl;
}
