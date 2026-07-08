import React, { useState } from 'react';
import { Check, Clapperboard, FlaskConical, KeyRound, Palette, Zap } from 'lucide-react';
import type { IntegrationId, Platform, ProviderStatus } from '../../types';
import { useApp } from '../../state/AppContext';
import { PlatformIcon } from '../shared';

interface IntegrationDef {
  id: IntegrationId;
  name: string;
  description: string;
  platform?: Platform;
  icon?: React.ReactNode;
  providerKey?: keyof Pick<ProviderStatus, 'gemini' | 'kling' | 'higgsfield'>;
}

const SOCIAL_INTEGRATIONS: IntegrationDef[] = [
  { id: 'instagram', name: 'Instagram', description: 'Publish posts, carousels, and reels directly to your feed.', platform: 'instagram' },
  { id: 'facebook', name: 'Facebook', description: 'Autopost to pages and groups you manage.', platform: 'facebook' },
  { id: 'tiktok', name: 'TikTok', description: 'Schedule short-form video content to your account.', platform: 'tiktok' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Share thought-leadership posts and document carousels.', platform: 'linkedin' },
  { id: 'gohighlevel', name: 'GoHighLevel', description: 'Sync generated content into the HighLevel Social Planner for every sub-account.', icon: <Zap size={20} /> },
];

const CREATIVE_INTEGRATIONS: IntegrationDef[] = [
  { id: 'canva', name: 'Canva', description: 'Polish generated carousel slides in Canva — download slides and drop them into a design.', icon: <Palette size={20} /> },
  { id: 'kling', name: 'Kling AI', description: 'Premium image-to-video generation for scroll-stopping motion content.', icon: <Clapperboard size={20} />, providerKey: 'kling' },
  { id: 'higgsfield', name: 'Higgsfield', description: 'Cinematic AI video engine for UGC and ad-style clips.', icon: <Clapperboard size={20} />, providerKey: 'higgsfield' },
];

export function Integrations() {
  const { integrations, toggleIntegration, providerStatus, showToast } = useApp();
  const [connecting, setConnecting] = useState<IntegrationId | null>(null);

  const connect = (id: IntegrationId, name: string) => {
    if (integrations.includes(id)) {
      toggleIntegration(id);
      showToast(`${name} disconnected`);
      return;
    }
    setConnecting(id);
    setTimeout(() => {
      toggleIntegration(id);
      setConnecting(null);
      showToast(`${name} connected`);
    }, 1000);
  };

  const renderCard = (item: IntegrationDef) => {
    const connected = integrations.includes(item.id);
    const busy = connecting === item.id;
    const keyed = item.providerKey ? providerStatus[item.providerKey] : null;
    return (
      <div key={item.id} className="bb-card bb-card-hover p-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
            {item.platform ? <PlatformIcon platform={item.platform} size={20} /> : item.icon}
          </div>
          <div className="flex-1">
            <div className="font-heading font-semibold">{item.name}</div>
            {connected && (
              <div className="text-xs text-bb-success font-medium flex items-center gap-1">
                <Check size={11} /> Connected
              </div>
            )}
          </div>
          {keyed !== null && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
              keyed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              <KeyRound size={10} /> {keyed ? 'API key detected' : 'No key — demo fallback'}
            </span>
          )}
        </div>
        <p className="text-sm text-bb-muted mt-3">{item.description}</p>
        <button
          onClick={() => connect(item.id, item.name)}
          disabled={busy}
          className={`w-full mt-4 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            connected
              ? 'border border-bb-border text-bb-muted hover:text-bb-error hover:border-red-200 hover:bg-red-50'
              : 'bb-gradient text-white hover:opacity-90'
          }`}
        >
          {busy ? <><div className="bb-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Connecting…</> : connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl">Integrations</h2>
        <p className="text-sm text-bb-muted mt-1">Connect publishing channels and creative engines.</p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <FlaskConical size={15} className="shrink-0" />
        Demo — social connections are simulated and stored locally. Images stay real even without keys via free providers (Pollinations).
      </div>

      <div>
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-bb-muted mb-3">Publishing channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_INTEGRATIONS.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-bb-muted mb-3">Creative engines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CREATIVE_INTEGRATIONS.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
