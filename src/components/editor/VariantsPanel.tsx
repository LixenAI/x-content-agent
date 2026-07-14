import React, { useState } from 'react';
import { RefreshCw, Shuffle } from 'lucide-react';
import type { CaptionVariant, Post } from '../../types';
import { useApp } from '../../state/AppContext';

export function VariantsPanel({ post }: { post: Post }) {
  const { fetchVariants, updatePost, showToast } = useApp();
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const run = async () => {
    setLoading(true);
    setOpen(true);
    setVariants(await fetchVariants(post.id));
    setLoading(false);
  };

  const use = (v: CaptionVariant) => {
    updatePost(post.id, { caption: v.caption });
    showToast(`Applied "${v.hookName}" variant`);
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border border-bb-border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-heading font-semibold">
          <Shuffle size={15} className="text-bb-primary" /> A/B Variants
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-bb-primary hover:opacity-80 disabled:opacity-50"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : null}
          Generate 3 variants
        </button>
      </div>
      {open && !loading && variants.length > 0 && (
        <div className="space-y-2 mt-3">
          {variants.map(v => (
            <div key={v.hookId} className="p-2.5 rounded-xl border border-bb-border bg-bb-bg/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-bb-primary">{v.hookName}</span>
                <button onClick={() => use(v)} className="text-[11px] font-semibold text-white bb-gradient px-2 py-0.5 rounded-md hover:opacity-90">
                  Use this
                </button>
              </div>
              <p className="text-xs text-bb-dark mt-1.5">{v.caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
