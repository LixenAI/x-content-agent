import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../../types';
import { useApp } from '../../state/AppContext';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

function downloadDataUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function CarouselEditor({ post }: { post: Post }) {
  const { generateSlideImage, updatePost, providerStatus, showToast } = useApp();
  const [index, setIndex] = useState(0);
  const slides = post.slides ?? [];
  const slide = slides[Math.min(index, slides.length - 1)];
  if (!slide) return null;

  const patchSlideField = (field: 'heading' | 'body' | 'imagePrompt', value: string) => {
    updatePost(post.id, {
      slides: slides.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    });
  };

  const downloadSlide = (i: number) => {
    const s = slides[i];
    if (s.imageUrl) downloadDataUrl(s.imageUrl, `slide-${i + 1}.png`);
  };

  const downloadAll = () => {
    slides.forEach((s, i) => { if (s.imageUrl) downloadDataUrl(s.imageUrl, `slide-${i + 1}.png`); });
    showToast('Slide images downloaded');
  };

  const openInCanva = () => {
    window.open(providerStatus.canvaTemplateUrl ?? 'https://www.canva.com/design/create?type=Presentation', '_blank');
    showToast('Tip: download the slides and drop them into your Canva design');
  };

  return (
    <div>
      <div className="rounded-2xl border border-bb-border overflow-hidden bg-white">
        <div className="relative aspect-square bg-bb-violet-soft">
          {slide.imageUrl && <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />}
          {slide.imageStatus === 'generating' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm font-medium text-bb-primary">
              <div className="bb-spinner" /> Generating slide…
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
            <div className="text-white font-heading font-bold leading-tight">{slide.heading}</div>
            <div className="text-white/85 text-xs mt-1 line-clamp-2">{slide.body}</div>
          </div>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 shadow flex items-center justify-center text-bb-dark disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setIndex(i => Math.min(slides.length - 1, i + 1))}
            disabled={index === slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 shadow flex items-center justify-center text-bb-dark disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-2.5" data-testid="slide-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-bb-primary' : 'w-1.5 bg-bb-border hover:bg-bb-primary/40'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="text-xs font-semibold text-bb-muted uppercase tracking-wide">Slide {index + 1} of {slides.length}</div>
        <input value={slide.heading} onChange={e => patchSlideField('heading', e.target.value)} placeholder="Slide heading" className={inputCls} />
        <textarea value={slide.body} onChange={e => patchSlideField('body', e.target.value)} placeholder="Slide body" rows={2} className={inputCls} />
        <textarea value={slide.imagePrompt} onChange={e => patchSlideField('imagePrompt', e.target.value)} placeholder="Image prompt" rows={2} className={`${inputCls} text-xs text-bb-muted`} />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => generateSlideImage(post.id, index)}
            disabled={slide.imageStatus === 'generating'}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-primary hover:bg-bb-violet-soft disabled:opacity-50 transition-colors"
          >
            <ImageIcon size={14} /> {slide.imageUrl && slide.imageStatus === 'done' ? 'Regenerate image' : 'Generate image'}
          </button>
          <button
            onClick={() => downloadSlide(index)}
            disabled={!slide.imageUrl}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-dark hover:bg-bb-violet-soft disabled:opacity-50 transition-colors"
          >
            <Download size={14} /> Download slide
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={downloadAll}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-dark hover:bg-bb-violet-soft transition-colors"
          >
            <Download size={14} /> Download all
          </button>
          <button
            onClick={openInCanva}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#7D2AE8]/10 border border-[#7D2AE8]/30 text-sm font-semibold text-[#7D2AE8] hover:bg-[#7D2AE8]/20 transition-colors"
          >
            <ExternalLink size={14} /> Open in Canva
          </button>
        </div>
      </div>
    </div>
  );
}
