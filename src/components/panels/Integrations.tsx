import React, { useEffect, useState } from 'react';
import { Check, Clapperboard, FlaskConical, KeyRound, Link2, Palette, Plus, Trash2, Zap } from 'lucide-react';
import type { IntegrationId, MetaIgAccount, Platform, ProviderStatus, SocialAccount } from '../../types';
import { useApp } from '../../state/AppContext';
import { getMetaAccounts, disconnectMeta } from '../../lib/api';
import { PlatformIcon, PLATFORM_LABELS } from '../shared';

interface SocialDef {
  platform: Platform;
  name: string;
  description: string;
}

const SOCIAL_PLATFORMS: SocialDef[] = [
  { platform: 'instagram', name: 'Instagram', description: 'Publish posts, carousels, and reels directly to the connected feed.' },
  { platform: 'facebook', name: 'Facebook', description: 'Autopost to pages and groups this brand manages.' },
  { platform: 'tiktok', name: 'TikTok', description: 'Schedule short-form video content to this brand\'s TikTok.' },
  { platform: 'linkedin', name: 'LinkedIn', description: 'Share thought-leadership posts to this brand\'s LinkedIn.' },
];

interface CreativeDef {
  id: IntegrationId;
  name: string;
  description: string;
  icon: React.ReactNode;
  providerKey?: keyof Pick<ProviderStatus, 'gemini' | 'kling' | 'higgsfield'>;
}

const CREATIVE_INTEGRATIONS: CreativeDef[] = [
  { id: 'canva', name: 'Canva', description: 'Polish generated carousel slides in Canva — download slides and drop them into a design.', icon: <Palette size={20} /> },
  { id: 'kling', name: 'Kling AI', description: 'Premium image-to-video generation for scroll-stopping motion content.', icon: <Clapperboard size={20} />, providerKey: 'kling' },
  { id: 'higgsfield', name: 'Higgsfield', description: 'Cinematic AI video engine for UGC and ad-style clips.', icon: <Clapperboard size={20} />, providerKey: 'higgsfield' },
];

function slugifyHandle(name: string): string {
  return '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ConnectedAccountRow({ account, onDisconnect }: { account: SocialAccount; onDisconnect: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-bb-violet-soft/60 border border-bb-border">
      <div className="flex items-center gap-2 min-w-0">
        {account.avatarUrl && <img src={account.avatarUrl} alt="" className="w-5 h-5 rounded-full" />}
        <span className="text-sm font-semibold text-bb-dark truncate">{account.handle}</span>
        {account.igUserId ? (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold uppercase tracking-wide">Live</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-semibold uppercase tracking-wide">Simulated</span>
        )}
        <span className="text-[11px] text-bb-muted">· {relativeTime(account.connectedAt)}</span>
      </div>
      <button
        onClick={onDisconnect}
        aria-label={`Disconnect ${account.handle}`}
        className="p-1 rounded-md text-bb-muted hover:text-bb-error hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function MetaConnectionCard() {
  const { providerStatus, metaStatus, refreshMetaStatus, showToast } = useApp();
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectMeta();
      await refreshMetaStatus();
      showToast('Meta account disconnected');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${metaStatus.connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
          <Link2 size={20} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-heading font-semibold">Meta Connection <span className="text-xs font-normal text-bb-muted">(agency-wide)</span></div>
          {metaStatus.connected ? (
            <div className="text-xs text-bb-success font-medium flex items-center gap-1 mt-0.5">
              <Check size={11} /> Connected as {metaStatus.name}
              {metaStatus.expiresAt && <span className="text-bb-muted font-normal">· token renews {new Date(metaStatus.expiresAt).toLocaleDateString()}</span>}
            </div>
          ) : providerStatus.metaConfigured ? (
            <div className="text-xs text-bb-muted mt-0.5">One Meta login unlocks every Facebook Page and Instagram Business account you admin — assign them to brands below.</div>
          ) : (
            <div className="text-xs text-bb-muted mt-0.5">Set <code className="font-mono">META_APP_ID</code> and <code className="font-mono">META_APP_SECRET</code> in the environment (see README for the Meta Developer Portal checklist).</div>
          )}
        </div>
        {metaStatus.connected ? (
          <button
            onClick={disconnect}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-bb-border text-sm font-semibold text-bb-muted hover:text-bb-error hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => { window.location.href = '/api/meta/login'; }}
            disabled={!providerStatus.metaConfigured}
            className="bb-gradient text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Connect Meta account
          </button>
        )}
      </div>
    </div>
  );
}

function SocialCard({ def }: { def: SocialDef }) {
  const { activeBrand, connectSocialAccount, disconnectSocialAccount, metaStatus, showToast } = useApp();
  const [inputOpen, setInputOpen] = useState(false);
  const [handle, setHandle] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [igAccounts, setIgAccounts] = useState<MetaIgAccount[] | null>(null);
  const [igError, setIgError] = useState<string | null>(null);

  const canPickReal = def.platform === 'instagram' && metaStatus.connected;

  useEffect(() => {
    if (inputOpen && canPickReal && igAccounts === null) {
      getMetaAccounts().then(setIgAccounts).catch(err => setIgError(err instanceof Error ? err.message : 'Failed to load accounts'));
    }
  }, [inputOpen, canPickReal, igAccounts]);

  if (!activeBrand) return null;
  const accounts = (activeBrand.socialAccounts ?? []).filter(a => a.platform === def.platform);
  const connected = accounts.length > 0;

  const openInput = () => {
    setHandle(slugifyHandle(activeBrand.name));
    setInputOpen(true);
  };

  const assignReal = (ig: MetaIgAccount) => {
    connectSocialAccount(activeBrand.id, 'instagram', `@${ig.username}`, ig.pageName, {
      igUserId: ig.igUserId,
      pageId: ig.pageId,
      avatarUrl: ig.avatarUrl,
    });
    showToast(`@${ig.username} assigned to ${activeBrand.name} — posts will publish for real`);
    setInputOpen(false);
  };

  const submit = () => {
    if (!handle.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      connectSocialAccount(activeBrand.id, def.platform, handle.trim(), activeBrand.name);
      showToast(`Connected ${handle.trim()} to ${activeBrand.name} on ${def.name}`);
      setConnecting(false);
      setInputOpen(false);
      setHandle('');
    }, 900);
  };

  return (
    <div className="bb-card bb-card-hover p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
          <PlatformIcon platform={def.platform} size={20} />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold">{def.name}</div>
          {connected && (
            <div className="text-xs text-bb-success font-medium flex items-center gap-1">
              <Check size={11} /> {accounts.length} account{accounts.length !== 1 && 's'}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-bb-muted mt-3">{def.description}</p>

      {accounts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {accounts.map(a => (
            <React.Fragment key={a.id}>
              <ConnectedAccountRow
                account={a}
                onDisconnect={() => {
                  disconnectSocialAccount(activeBrand.id, a.id);
                  showToast(`Disconnected ${a.handle}`);
                }}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {inputOpen ? (
        <div className="mt-3 space-y-2">
          {canPickReal && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-bb-muted uppercase tracking-wide">Your Instagram accounts (via Meta)</div>
              {igError && <div className="text-xs text-bb-error bg-red-50 rounded-xl px-3 py-2">{igError}</div>}
              {igAccounts === null && !igError && (
                <div className="flex items-center gap-2 text-xs text-bb-muted px-1 py-2"><div className="bb-spinner" /> Loading accounts…</div>
              )}
              {igAccounts?.length === 0 && (
                <div className="text-xs text-bb-muted px-1 py-1">No Instagram Business accounts found — make sure your IG is Business/Creator and linked to a Facebook Page you admin.</div>
              )}
              {(igAccounts ?? []).map(ig => {
                const alreadyAssigned = accounts.some(a => a.igUserId === ig.igUserId);
                return (
                  <div key={ig.igUserId} className="flex items-center justify-between px-3 py-2 rounded-xl border border-bb-border bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      {ig.avatarUrl && <img src={ig.avatarUrl} alt="" className="w-6 h-6 rounded-full" />}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">@{ig.username}</div>
                        <div className="text-[10px] text-bb-muted truncate">{ig.pageName}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => assignReal(ig)}
                      disabled={alreadyAssigned}
                      className="shrink-0 px-2.5 py-1 rounded-lg bb-gradient text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
                    >
                      {alreadyAssigned ? 'Assigned' : 'Assign'}
                    </button>
                  </div>
                );
              })}
              <div className="text-[11px] font-semibold text-bb-muted uppercase tracking-wide pt-1.5">Or add a simulated handle</div>
            </div>
          )}
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setInputOpen(false); }}
            placeholder={`@${def.name.toLowerCase()}handle`}
            className="w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white"
            autoFocus={!canPickReal}
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={connecting || !handle.trim()}
              className="flex-1 flex items-center justify-center gap-2 bb-gradient text-white px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {connecting ? <><div className="bb-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Connecting…</> : 'Connect'}
            </button>
            <button
              onClick={() => setInputOpen(false)}
              disabled={connecting}
              className="px-3 py-2 rounded-xl border border-bb-border text-sm text-bb-muted hover:text-bb-dark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openInput}
          className={`w-full mt-4 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            connected
              ? 'border border-bb-border text-bb-primary hover:bg-bb-violet-soft'
              : 'bb-gradient text-white hover:opacity-90'
          }`}
        >
          <Plus size={14} /> {connected ? 'Add another' : `Connect ${def.name}`}
        </button>
      )}
    </div>
  );
}

function GhlCard() {
  const { activeBrand, connectGhlSubAccount, disconnectGhlSubAccount, showToast } = useApp();
  const [inputOpen, setInputOpen] = useState(false);
  const [subId, setSubId] = useState('');
  const [connecting, setConnecting] = useState(false);

  if (!activeBrand) return null;
  const accounts = activeBrand.ghlSubAccounts ?? [];
  const connected = accounts.length > 0;

  const submit = () => {
    if (!subId.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      connectGhlSubAccount(activeBrand.id, subId.trim(), activeBrand.name);
      showToast(`Linked GHL sub-account ${subId.trim()} to ${activeBrand.name}`);
      setConnecting(false);
      setInputOpen(false);
      setSubId('');
    }, 900);
  };

  return (
    <div className="bb-card bb-card-hover p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
          <Zap size={20} />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold">GoHighLevel</div>
          {connected && (
            <div className="text-xs text-bb-success font-medium flex items-center gap-1">
              <Check size={11} /> {accounts.length} sub-account{accounts.length !== 1 && 's'}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-bb-muted mt-3">Sync generated content into this brand's HighLevel Social Planner sub-account.</p>

      {accounts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {accounts.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-bb-violet-soft/60 border border-bb-border">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono font-semibold text-bb-dark truncate">{a.subAccountId}</span>
                <span className="text-[11px] text-bb-muted">· {relativeTime(a.connectedAt)}</span>
              </div>
              <button
                onClick={() => { disconnectGhlSubAccount(activeBrand.id, a.id); showToast('GHL sub-account unlinked'); }}
                className="p-1 rounded-md text-bb-muted hover:text-bb-error hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {inputOpen ? (
        <div className="mt-3 space-y-2">
          <input
            value={subId}
            onChange={e => setSubId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setInputOpen(false); }}
            placeholder="HighLevel sub-account ID"
            className="w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={connecting || !subId.trim()}
              className="flex-1 flex items-center justify-center gap-2 bb-gradient text-white px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {connecting ? <><div className="bb-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Linking…</> : 'Link'}
            </button>
            <button
              onClick={() => setInputOpen(false)}
              disabled={connecting}
              className="px-3 py-2 rounded-xl border border-bb-border text-sm text-bb-muted hover:text-bb-dark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setSubId(''); setInputOpen(true); }}
          className={`w-full mt-4 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            connected
              ? 'border border-bb-border text-bb-primary hover:bg-bb-violet-soft'
              : 'bb-gradient text-white hover:opacity-90'
          }`}
        >
          <Plus size={14} /> {connected ? 'Add another' : 'Link sub-account'}
        </button>
      )}
    </div>
  );
}

function CreativeCard({ def }: { def: CreativeDef }) {
  const { integrations, toggleIntegration, providerStatus, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const connected = integrations.includes(def.id);
  const keyed = def.providerKey ? providerStatus[def.providerKey] : null;

  const connect = () => {
    if (connected) {
      toggleIntegration(def.id);
      showToast(`${def.name} disconnected`);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      toggleIntegration(def.id);
      setBusy(false);
      showToast(`${def.name} connected`);
    }, 1000);
  };

  return (
    <div className="bb-card bb-card-hover p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${connected ? 'bb-gradient text-white' : 'bg-bb-violet-soft text-bb-primary'}`}>
          {def.icon}
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold">{def.name}</div>
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
      <p className="text-sm text-bb-muted mt-3">{def.description}</p>
      <button
        onClick={connect}
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
}

export function Integrations() {
  const { activeBrand } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl">Integrations</h2>
        <p className="text-sm text-bb-muted mt-1">Social accounts are scoped per brand; creative engines are shared across the whole agency.</p>
      </div>

      <MetaConnectionCard />

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <FlaskConical size={15} className="shrink-0" />
        Handles typed by hand stay simulated. Instagram accounts assigned through the Meta connection publish for real on schedule.
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-bb-muted">Publishing accounts</h3>
          {activeBrand && (
            <div className="flex items-center gap-2 text-xs text-bb-muted">
              For
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bb-violet-soft text-bb-primary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeBrand.colors[0] ?? '#1A6FD4' }} />
                {activeBrand.name}
              </span>
              (switch brands in the sidebar)
            </div>
          )}
        </div>
        {activeBrand ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOCIAL_PLATFORMS.map(def => (
              <React.Fragment key={def.platform}><SocialCard def={def} /></React.Fragment>
            ))}
            <GhlCard />
          </div>
        ) : (
          <div className="bb-card p-6 text-sm text-bb-muted text-center">Add a brand first to connect social accounts.</div>
        )}
      </div>

      <div>
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-bb-muted mb-3">Creative engines (agency-wide)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CREATIVE_INTEGRATIONS.map(def => (
            <React.Fragment key={def.id}><CreativeCard def={def} /></React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// Suppress unused-import warning — PLATFORM_LABELS may be needed by callers.
void PLATFORM_LABELS;
