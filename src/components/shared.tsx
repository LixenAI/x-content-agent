import React, { useEffect } from 'react';
import { Facebook, Image as ImageIcon, Instagram, Layers, Linkedin, Music2, Play, X, Zap } from 'lucide-react';
import type { Platform, PostFormat, PostStatus } from '../types';

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  tiktok: '#111111',
  linkedin: '#0A66C2',
};

export function PlatformIcon({ platform, size = 16, className = '' }: { platform: Platform; size?: number; className?: string }) {
  const props = { size, className };
  switch (platform) {
    case 'facebook': return <Facebook {...props} />;
    case 'instagram': return <Instagram {...props} />;
    case 'tiktok': return <Music2 {...props} />;
    case 'linkedin': return <Linkedin {...props} />;
  }
}

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  posted: 'bg-emerald-100 text-emerald-700',
};

export const FORMAT_LABELS: Record<PostFormat, string> = {
  post: 'Post',
  carousel: 'Carousel',
  video: 'Video',
};

export function FormatIcon({ format, size = 12, className = '' }: { format: PostFormat; size?: number; className?: string }) {
  const props = { size, className };
  switch (format) {
    case 'carousel': return <Layers {...props} />;
    case 'video': return <Play {...props} />;
    default: return <ImageIcon {...props} />;
  }
}

export function FormatBadge({ format }: { format: PostFormat }) {
  if (format === 'post') return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-bb-dark/80 text-white text-[9px] font-semibold uppercase tracking-wide">
      <FormatIcon format={format} size={9} />
      {FORMAT_LABELS[format]}
    </span>
  );
}

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function Modal({ title, onClose, children, wide = false }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bb-dark/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bb-card w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-bb-border shrink-0">
          <h2 className="font-heading font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bb-violet-soft text-bb-muted hover:text-bb-dark transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bb-gradient text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
      <Zap size={14} />
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bb-card p-12 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-bb-violet-soft flex items-center justify-center text-bb-primary">{icon}</div>
      <h3 className="font-heading font-semibold text-lg">{title}</h3>
      <p className="text-sm text-bb-muted max-w-sm">{subtitle}</p>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className = '', type = 'button' }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bb-gradient text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}
