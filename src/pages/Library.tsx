import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Globe, Lock, MoreHorizontal, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchMyPresets, fetchPublicPresets, deletePreset, updatePreset } from '../lib/presets';
import type { Preset } from '../lib/presets';

export function Library() {
  const { user, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [publicPresets, setPublicPresets] = useState<Preset[]>([]);
  const [myPresets, setMyPresets] = useState<Preset[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicPresets()
      .then(setPublicPresets)
      .catch(console.error)
      .finally(() => setLoadingPublic(false));
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingMine(true);
      fetchMyPresets(user.id)
        .then(setMyPresets)
        .catch(console.error)
        .finally(() => setLoadingMine(false));
    } else {
      setMyPresets([]);
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this background?')) return;
    try {
      await deletePreset(id);
      setMyPresets(prev => prev.filter(p => p.id !== id));
      setPublicPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setMenuOpenId(null);
  };

  const handleTogglePublic = async (preset: Preset) => {
    try {
      const updated = await updatePreset(preset.id, { is_public: !preset.is_public });
      setMyPresets(prev => prev.map(p => p.id === preset.id ? { ...p, is_public: updated.is_public } : p));
      // Re-fetch public presets to ensure community section is accurate
      const freshPublic = await fetchPublicPresets();
      setPublicPresets(freshPublic);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
    setMenuOpenId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter text-white">Grounds</h1>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mt-1">Background Generator</p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              user ? (
                <>
                  <button
                    onClick={() => navigate('/editor')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-full text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full ring-2 ring-zinc-700 shadow-md"
                    />
                  )}
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-3 py-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={signIn}
                  className="px-5 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-full text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Community Section */}
        <section>
          <h2 className="text-lg font-medium text-zinc-300 mb-6">Community</h2>
          {loadingPublic ? (
            <LoadingGrid />
          ) : publicPresets.length === 0 ? (
            <div className="text-center text-zinc-600 py-16 border border-dashed border-zinc-800 rounded-xl">
              No community backgrounds yet. Be the first to share one!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {publicPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onClick={() => navigate(`/editor/${preset.id}`)}
                  showAuthor
                />
              ))}
            </div>
          )}
        </section>

        {/* User's Backgrounds */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-zinc-300">Your Backgrounds</h2>
              <button
                onClick={() => navigate('/editor')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>
            {loadingMine ? (
              <LoadingGrid />
            ) : myPresets.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-500 mb-4">Create your first background</p>
                <button
                  onClick={() => navigate('/editor')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Get Started
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myPresets.map(preset => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onClick={() => navigate(`/editor/${preset.id}`)}
                    actions={
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === preset.id ? null : preset.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpenId === preset.id && (
                          <div
                            className="absolute right-0 bottom-8 z-10 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleTogglePublic(preset)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                              {preset.is_public ? (
                                <><Lock className="w-3.5 h-3.5" /> Make Private</>
                              ) : (
                                <><Globe className="w-3.5 h-3.5" /> Make Public</>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(preset.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Unauthenticated CTA */}
        {!user && !loading && (
          <section className="text-center py-8">
            <p className="text-zinc-500 mb-4">Sign in to create and save your own backgrounds</p>
            <button
              onClick={signIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              Sign In to Create
            </button>
          </section>
        )}
      </main>

      {/* Close menu on outside click */}
      {menuOpenId && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}

function PresetCard({
  preset,
  onClick,
  showAuthor,
  actions,
}: {
  preset: Preset;
  onClick: () => void;
  showAuthor?: boolean;
  actions?: React.ReactNode;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const showThumbnail = preset.thumbnail_url && !thumbnailError;

  return (
    <div
      onClick={onClick}
      className="group bg-zinc-900/50 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-all hover:shadow-lg"
    >
      {/* Thumbnail */}
      {showThumbnail ? (
        <div className="aspect-[16/10] bg-zinc-900 overflow-hidden rounded-t-lg">
          <img
            src={preset.thumbnail_url!}
            alt={preset.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setThumbnailError(true)}
          />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-zinc-900 flex items-center justify-center rounded-t-lg">
          <div className="flex w-3/4 h-2 rounded-full overflow-hidden">
            {preset.state.palette.map((color: string, i: number) => (
              <div key={i} style={{ backgroundColor: color }} className="flex-1 h-full" />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-zinc-200 truncate">{preset.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-500 capitalize">{preset.state.mode}</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-500">{preset.state.variant}</span>
              {preset.is_public && (
                <>
                  <span className="text-zinc-700">·</span>
                  <Globe className="w-3 h-3 text-zinc-600" />
                </>
              )}
            </div>
            {showAuthor && preset.profiles?.display_name && (
              <p className="text-xs text-zinc-600 mt-1">by {preset.profiles.display_name}</p>
            )}
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
          <div className="aspect-[16/10] bg-zinc-800/50" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-zinc-800/50 rounded w-2/3" />
            <div className="h-3 bg-zinc-800/50 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
