import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Copy as CopyIcon, GitFork } from 'lucide-react';
import { ShaderCanvas } from '../components/ShaderCanvas';
import { Controls } from '../components/Controls';
import { SaveModal } from '../components/SaveModal';
import { useStore, PRESET_SIZES } from '../store';
import { useAuth } from '../lib/auth';
import {
  createPreset,
  updatePreset as updatePresetApi,
  forkPreset,
} from '../lib/presets';
import type { Preset } from '../lib/presets';
import { supabase } from '../lib/supabase';

export function Editor() {
  const { presetId } = useParams<{ presetId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const {
    presetSizeId,
    customWidth,
    customHeight,
    activePresetId,
    setActivePresetId,
    loadFromPreset,
    getEditorState,
    reset,
  } = useStore();

  const presetSize = PRESET_SIZES.find(p => p.id === presetSizeId);
  const width = presetSizeId === 'custom' ? customWidth : (presetSize?.width || 1920);
  const height = presetSizeId === 'custom' ? customHeight : (presetSize?.height || 1080);
  const aspectRatio = `${width} / ${height}`;

  // Load preset on mount or when presetId changes
  useEffect(() => {
    if (presetId && presetId !== loadedRef.current) {
      loadedRef.current = presetId;
      supabase
        .from('presets')
        .select('*')
        .eq('id', presetId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.error('Failed to load preset:', error);
            navigate('/editor', { replace: true });
            return;
          }
          setPreset(data);
          setActivePresetId(data.id);
          setIsOwner(data.user_id === user?.id);
          loadFromPreset(data.state);
        });
    } else if (!presetId && loadedRef.current !== 'new') {
      loadedRef.current = 'new';
      reset();
      setActivePresetId(null);
      setPreset(null);
      setIsOwner(false);
    }
  }, [presetId, user?.id, navigate, setActivePresetId, loadFromPreset, reset]);

  const captureThumbnail = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const handleThumbnail = (e: Event) => {
        window.removeEventListener('thumbnail-ready', handleThumbnail);
        const blob = (e as CustomEvent).detail?.blob as Blob | null;
        resolve(blob);
      };
      window.addEventListener('thumbnail-ready', handleThumbnail);

      window.dispatchEvent(
        new CustomEvent('export-high-res', {
          detail: { width: 400, height: 300, type: 'thumbnail' },
        })
      );

      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('thumbnail-ready', handleThumbnail);
        resolve(null);
      }, 3000);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !activePresetId || !isOwner) return;
    setSaving(true);
    try {
      const thumbnailBlob = await captureThumbnail();
      const updated = await updatePresetApi(activePresetId, {
        state: getEditorState(),
        thumbnailBlob: thumbnailBlob || undefined,
      });
      setPreset(prev => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [user, activePresetId, isOwner, getEditorState, captureThumbnail]);

  const handleSaveAs = useCallback(async (name: string, isPublic: boolean) => {
    if (!user) return;
    try {
      const thumbnailBlob = await captureThumbnail();
      const newPreset = await createPreset(
        user.id,
        name,
        getEditorState(),
        isPublic,
        thumbnailBlob || undefined
      );
      setPreset(newPreset);
      setActivePresetId(newPreset.id);
      setIsOwner(true);
      loadedRef.current = newPreset.id;
      navigate(`/editor/${newPreset.id}`, { replace: true });
      setShowSaveModal(false);
    } catch (err) {
      console.error('Failed to save as:', err);
    }
  }, [user, getEditorState, captureThumbnail, navigate, setActivePresetId]);

  const handleFork = useCallback(async () => {
    if (!user || !presetId) return;
    setSaving(true);
    try {
      const forked = await forkPreset(presetId, user.id);
      setPreset(forked);
      setActivePresetId(forked.id);
      setIsOwner(true);
      loadedRef.current = forked.id;
      navigate(`/editor/${forked.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to fork:', err);
    } finally {
      setSaving(false);
    }
  }, [user, presetId, navigate, setActivePresetId]);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="absolute top-0 left-0 w-full px-6 py-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-800 hover:text-white transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Library
            </button>
            <h1 className="font-display text-2xl font-black tracking-tighter text-white drop-shadow-lg">
              {preset?.name || 'New Background'}
            </h1>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {preset && !isOwner && (
              <button
                onClick={handleFork}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-800 hover:text-white transition-all shadow-lg disabled:opacity-50"
              >
                <GitFork className="w-4 h-4" />
                Fork
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-800 hover:text-white transition-all shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100/90 backdrop-blur-md text-zinc-900 rounded-full text-sm font-medium hover:bg-white transition-all shadow-lg"
            >
              <CopyIcon className="w-4 h-4" />
              Save As
            </button>
          </div>
        </header>

        {/* Canvas Container */}
        <div className="flex-1 flex items-center justify-center p-12 lg:p-24 relative overflow-hidden">
          <div
            className="relative group transition-all duration-500 ease-in-out"
            style={{
              aspectRatio,
              maxHeight: '100%',
              maxWidth: '100%',
              width: '100%',
              height: 'auto',
            }}
          >
            <ShaderCanvas />
            <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </main>

      {/* Control Panel */}
      <aside className="w-[400px] shrink-0 border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-xl z-20 shadow-2xl">
        <Controls />
      </aside>

      {/* Save As Modal */}
      {showSaveModal && (
        <SaveModal
          onSave={handleSaveAs}
          onClose={() => setShowSaveModal(false)}
          defaultName={preset?.name ? `${preset.name} copy` : ''}
        />
      )}
    </div>
  );
}
