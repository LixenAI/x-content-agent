import React, { useState } from 'react';
import { Check, FlaskConical, Zap } from 'lucide-react';
import type { IntegrationId, Platform } from '../../types';
import { useApp } from '../../state/AppContext';
import { PlatformIcon } from '../shared';

const INTEGRATIONS: { id: IntegrationId; name: string; description: string; platform?: Platform }[] = [
  { id: 'instagram', name: 'Instagram', description: 'Publish posts, reels, and stories directly to your feed.', platform: 'instagram' },
  { id: 'facebook', name: 'Facebook', description: 'Autopost to pages and groups you manage.', platform: 'facebook' },
  { id: 'tiktok', name: 'TikTok', description: 'Schedule short-form video content to your account.', platform: 'tiktok' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Share thought-leadership posts to profiles and company pages.', platform: 'linkedin' },
  { id: 'gohighlevel', name: 'GoHighLevel', description: 'Sync generated content into the HighLevel Social Planner for every sub-account.' },
];

export function Integrations() {
  const { integrations, toggleIntegration, showToast } = useApp();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl">Integrations</h2>
        <p className="text-sm text-bb-muted mt-1">Connect the accounts your content should publish to.</p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <FlaskConical size={15} className="shrink-0" />
        Demo — no real accounts are linked. Connections are simulated and stored locally.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(item => {
          const connected = integrations.includes(item.id);
          const busy = connecting === item.id;
          return (
            <div key={item.id} className="bb-card bb-card-hover p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
                  {item.platform ? <PlatformIcon platform={item.platform} size={20} /> : <Zap size={20} />}
                </div>
                <div className="flex-1">
                  <div className="font-heading font-semibold">{item.name}</div>
                  {connected && (
                    <div className="text-xs text-bb-success font-medium flex items-center gap-1">
                      <Check size={11} /> Connected
                    </div>
                  )}
                </div>
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
        })}
      </div>
    </div>
  );
}
