import React, { useState } from 'react';
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type { PostStatus } from '../types';
import { useApp } from '../state/AppContext';
import { Modal, PlatformIcon, PLATFORM_LABELS, PrimaryButton, StatusBadge } from './shared';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

export function PostEditorModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { posts, brands, updatePost, deletePost, generatePostImage, rewriteCaption, showToast } = useApp();
  const post = posts.find(p => p.id === postId);
  const brand = brands.find(b => b.id === post?.brandId);
  const [rewriting, setRewriting] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  if (!post) return null;

  const localDateTime = (() => {
    const d = new Date(post.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const doRewrite = async () => {
    setRewriting(true);
    await rewriteCaption(post.id);
    setRewriting(false);
  };

  return (
    <Modal title="Edit Post" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform preview */}
        <div>
          <div className="rounded-2xl border border-bb-border overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-bb-border">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: brand?.colors[0] ?? '#7C3AED' }}>
                {(brand?.name.charAt(0) ?? 'B').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold leading-tight">{brand?.name ?? 'Brand'}</div>
                <div className="text-[11px] text-bb-muted flex items-center gap-1">
                  <PlatformIcon platform={post.platform} size={11} /> {PLATFORM_LABELS[post.platform]}
                </div>
              </div>
              <StatusBadge status={post.status} />
            </div>
            <div className="relative aspect-square bg-bb-violet-soft">
              {post.imageUrl && <img src={post.imageUrl} alt="Post visual" className="w-full h-full object-cover" />}
              {post.imageStatus === 'generating' && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm font-medium text-bb-primary">
                  <div className="bb-spinner" /> Generating image…
                </div>
              )}
            </div>
            <div className="px-4 py-3 text-sm whitespace-pre-wrap">{post.caption}</div>
            {post.hashtags.length > 0 && (
              <div className="px-4 pb-3 text-xs text-bb-indigo">{post.hashtags.join(' ')}</div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => generatePostImage(post.id)}
              disabled={post.imageStatus === 'generating'}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-primary hover:bg-bb-violet-soft disabled:opacity-50 transition-colors"
            >
              <ImageIcon size={15} /> {post.imageStatus === 'done' ? 'Regenerate Image' : 'Generate AI Image'}
            </button>
            <button
              onClick={() => setPromptOpen(o => !o)}
              className="px-3 py-2 rounded-xl border border-bb-border text-sm text-bb-muted hover:text-bb-primary hover:bg-bb-violet-soft transition-colors"
            >
              Edit prompt
            </button>
          </div>
          {promptOpen && (
            <textarea
              value={post.imagePrompt}
              onChange={e => updatePost(post.id, { imagePrompt: e.target.value })}
              rows={3}
              className={`${inputCls} mt-2`}
            />
          )}
        </div>

        {/* Editing controls */}
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Caption</span>
            <textarea
              value={post.caption}
              onChange={e => updatePost(post.id, { caption: e.target.value })}
              rows={6}
              className={inputCls}
            />
          </label>
          <button
            onClick={doRewrite}
            disabled={rewriting}
            className="flex items-center gap-2 text-sm font-medium text-bb-primary hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {rewriting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Rewrite with AI
          </button>
          <label className="block">
            <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Hashtags</span>
            <input
              value={post.hashtags.join(' ')}
              onChange={e => updatePost(post.id, { hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
              className={inputCls}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Scheduled for</span>
              <input
                type="datetime-local"
                value={localDateTime}
                onChange={e => { if (e.target.value) updatePost(post.id, { scheduledAt: new Date(e.target.value).toISOString() }); }}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Status</span>
              <select
                value={post.status}
                onChange={e => updatePost(post.id, { status: e.target.value as PostStatus })}
                className={inputCls}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="posted">Posted</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-bb-border">
            <button
              onClick={() => { if (confirm('Delete this post?')) { deletePost(post.id); onClose(); } }}
              className="flex items-center gap-1.5 text-sm text-bb-muted hover:text-bb-error transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
            {post.status === 'draft' ? (
              <PrimaryButton onClick={() => { updatePost(post.id, { status: 'scheduled' }); showToast('Post approved and scheduled'); onClose(); }}>
                <CheckCircle2 size={15} /> Approve & Schedule
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
