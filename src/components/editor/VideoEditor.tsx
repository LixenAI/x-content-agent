import React from 'react';
import { Clapperboard, Image as ImageIcon, Play } from 'lucide-react';
import type { Post } from '../../types';
import { useApp } from '../../state/AppContext';
import { BROLL_CATEGORIES, VIDEO_STYLES } from '../../lib/frameworks';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

const ASPECT_CLASS: Record<string, string> = {
  '9:16': 'aspect-[9/16] max-h-[420px] mx-auto',
  '16:9': 'aspect-video',
  '1:1': 'aspect-square',
};

export function VideoEditor({ post }: { post: Post }) {
  const { updatePost, generateVideoKeyframe, generatePostVideo } = useApp();
  const video = post.video;
  if (!video) return null;

  const patchVideoField = (patch: Partial<typeof video>) => {
    updatePost(post.id, { video: { ...video, ...patch } });
  };

  const styleName = VIDEO_STYLES.find(s => s.id === video.style)?.name ?? video.style;
  const preview = video.keyframeUrl ?? post.imageUrl;
  const generating = video.videoStatus === 'generating';

  return (
    <div>
      <div className={`relative rounded-2xl border border-bb-border overflow-hidden bg-bb-dark ${ASPECT_CLASS[video.aspectRatio] ?? 'aspect-square'}`}>
        {video.videoUrl && video.videoStatus === 'done' ? (
          <video controls src={video.videoUrl} className="w-full h-full object-contain bg-black" />
        ) : (
          <>
            {preview && <img src={preview} alt="Video keyframe" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 flex items-center justify-center">
              {generating ? (
                <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                  <div className="bb-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Generating video…
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                  <Play size={24} className="text-white ml-1" />
                </div>
              )}
            </div>
          </>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold">{video.aspectRatio}</span>
          <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold">{styleName}</span>
          {video.provider && video.videoStatus === 'done' && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/85 text-white text-[10px] font-semibold">via {video.provider}</span>
          )}
          {video.videoStatus === 'failed' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-semibold">demo preview</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => generateVideoKeyframe(post.id)}
          disabled={generating}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-primary hover:bg-bb-violet-soft disabled:opacity-50 transition-colors"
        >
          <ImageIcon size={14} /> {video.keyframeUrl ? 'New keyframe' : 'Generate keyframe'}
        </button>
        <button
          onClick={() => generatePostVideo(post.id)}
          disabled={generating}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bb-gradient text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Clapperboard size={14} /> {video.videoUrl ? 'Regenerate video' : 'Generate video'}
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1">Hook (first 2 seconds)</span>
          <input value={video.hook} onChange={e => patchVideoField({ hook: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1">Script</span>
          <textarea value={video.script} onChange={e => patchVideoField({ script: e.target.value })} rows={3} className={inputCls} />
        </label>
        <div>
          <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Scenes</span>
          <div className="space-y-1.5">
            {video.scenes.map((scene, i) => {
              const cat = BROLL_CATEGORIES.find(c => c.id === scene.category);
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-xl border border-bb-border bg-white text-xs">
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-bb-violet-soft text-bb-primary font-semibold">{cat?.label ?? scene.category}</span>
                  <span className="flex-1 text-bb-dark">{scene.description}</span>
                  <span className="shrink-0 text-bb-muted font-medium">{scene.duration}s</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
