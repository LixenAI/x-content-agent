import React, { useState } from 'react';
import { CalendarDays, Megaphone, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Platform, Tab } from '../../types';
import { useApp } from '../../state/AppContext';
import { EmptyState, Modal, PlatformIcon, PLATFORM_LABELS, PrimaryButton } from '../shared';

const ALL_PLATFORMS: Platform[] = ['instagram', 'facebook', 'tiktok', 'linkedin'];

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function OptionPills<T extends string | number>({ options, value, onChange, render }: {
  options: T[]; value: T; onChange: (v: T) => void; render?: (v: T) => string;
}) {
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
            opt === value ? 'bg-bb-primary text-white border-bb-primary' : 'bg-white border-bb-border text-bb-muted hover:border-bb-primary hover:text-bb-primary'
          }`}
        >
          {render ? render(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}

export function CampaignWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { activeBrand, createCampaign, showToast } = useApp();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [topics, setTopics] = useState<string[]>(activeBrand?.topics.slice(0, 3) ?? []);
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  if (!activeBrand) {
    return (
      <Modal title="New Campaign" onClose={onClose}>
        <p className="text-sm text-bb-muted">Add a brand first — the AI needs a brand profile to write in the right voice.</p>
      </Modal>
    );
  }

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));

  const toggleTopic = (t: string) =>
    setTopics(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));

  const postCount = Math.min(Math.max(1, Math.round((postsPerWeek * durationDays) / 7)), 30);

  const submit = async () => {
    if (!name.trim()) { showToast('Give the campaign a name'); return; }
    if (platforms.length === 0) { showToast('Pick at least one platform'); return; }
    if (topics.length === 0) { showToast('Pick at least one topic'); return; }
    setSubmitting(true);
    onCreated();
    onClose();
    await createCampaign({
      name: name.trim(),
      goal: goal.trim() || 'Grow brand awareness and engagement',
      topics, platforms, postsPerWeek, durationDays, startDate,
    });
  };

  return (
    <Modal title={`New Campaign for ${activeBrand.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Campaign name">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Launch" className={inputCls} autoFocus />
          </Field>
          <Field label="Start date">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Goal">
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Drive signups for the new plan" className={inputCls} />
        </Field>
        <Field label="Topics (from brand profile)">
          <div className="flex flex-wrap gap-2">
            {activeBrand.topics.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  topics.includes(t) ? 'bg-bb-violet-soft border-bb-primary text-bb-primary' : 'bg-white border-bb-border text-bb-muted hover:border-bb-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Platforms">
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  platforms.includes(p) ? 'bg-bb-violet-soft border-bb-primary text-bb-primary' : 'bg-white border-bb-border text-bb-muted hover:border-bb-primary'
                }`}
              >
                <PlatformIcon platform={p} size={15} />
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Posts per week">
            <OptionPills options={[3, 5, 7]} value={postsPerWeek} onChange={setPostsPerWeek} />
          </Field>
          <Field label="Duration">
            <OptionPills options={[7, 14, 30]} value={durationDays} onChange={setDurationDays} render={v => `${v} days`} />
          </Field>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-bb-border">
          <div className="text-sm text-bb-muted">
            The AI will write <span className="font-semibold text-bb-dark">{postCount} posts</span> in {activeBrand.name}'s voice.
          </div>
          <PrimaryButton onClick={submit} disabled={submitting}>
            <Sparkles size={15} /> Generate Campaign
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

export function Campaigns({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { campaigns, posts, activeBrand, activeBrandId, deleteCampaign, campaignProgress } = useApp();
  const [wizardOpen, setWizardOpen] = useState(false);
  const brandCampaigns = campaigns.filter(c => c.brandId === activeBrandId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Campaigns</h2>
          <p className="text-sm text-bb-muted mt-1">
            {activeBrand ? `Autonomous content runs for ${activeBrand.name} — a month of posts in minutes.` : 'Add a brand to start creating campaigns.'}
          </p>
        </div>
        <PrimaryButton onClick={() => setWizardOpen(true)}><Plus size={15} /> New Campaign</PrimaryButton>
      </div>

      {campaignProgress && (
        <div className="bb-card p-4 flex items-center gap-3 border-bb-primary/40">
          <div className="bb-spinner" />
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {campaignProgress.stage === 'writing' ? 'Writing posts in your brand voice…' : `Generating images ${campaignProgress.imagesDone}/${campaignProgress.imagesTotal}`}
            </div>
            {campaignProgress.stage === 'images' && (
              <div className="h-1.5 mt-2 rounded-full bg-bb-violet-soft overflow-hidden">
                <div
                  className="h-full bb-gradient rounded-full transition-all"
                  style={{ width: `${(campaignProgress.imagesDone / Math.max(campaignProgress.imagesTotal, 1)) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {brandCampaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={26} />}
          title="No campaigns yet"
          subtitle="Create a campaign and the AI will generate weeks of on-brand posts with images — ready to review in the Social Planner."
          action={<PrimaryButton onClick={() => setWizardOpen(true)}><Plus size={15} /> New Campaign</PrimaryButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brandCampaigns.map(c => {
            const cPosts = posts.filter(p => p.campaignId === c.id);
            const scheduled = cPosts.filter(p => p.status !== 'draft').length;
            const withImages = cPosts.filter(p => p.imageStatus === 'done').length;
            return (
              <div key={c.id} className="bb-card bb-card-hover p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-heading font-semibold">{c.name}</div>
                    <div className="text-xs text-bb-muted mt-0.5">{c.goal}</div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete campaign "${c.name}" and its ${cPosts.length} posts?`)) deleteCampaign(c.id); }}
                    className="p-1.5 rounded-lg text-bb-muted hover:text-bb-error hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {c.platforms.map(p => (
                    <span key={p} className="w-7 h-7 rounded-lg bg-bb-violet-soft text-bb-primary flex items-center justify-center">
                      <PlatformIcon platform={p} size={14} />
                    </span>
                  ))}
                  <span className="text-xs text-bb-muted ml-1">{c.durationDays} days · {c.postsPerWeek}/week · starts {c.startDate}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-bb-border text-center">
                  <div>
                    <div className="font-heading font-bold text-lg">{cPosts.length}</div>
                    <div className="text-[11px] text-bb-muted">Posts</div>
                  </div>
                  <div>
                    <div className="font-heading font-bold text-lg">{scheduled}</div>
                    <div className="text-[11px] text-bb-muted">Approved</div>
                  </div>
                  <div>
                    <div className="font-heading font-bold text-lg">{withImages}</div>
                    <div className="text-[11px] text-bb-muted">AI Images</div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('planner')}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-bb-border text-sm font-medium text-bb-primary hover:bg-bb-violet-soft transition-colors"
                >
                  <CalendarDays size={15} /> Review in Planner
                </button>
              </div>
            );
          })}
        </div>
      )}

      {wizardOpen && <CampaignWizard onClose={() => setWizardOpen(false)} onCreated={() => undefined} />}
    </div>
  );
}
