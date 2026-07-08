import React from 'react';
import { ArrowRight, Building2, CalendarDays, CheckCircle2, FileText, Megaphone, Sparkles } from 'lucide-react';
import type { Tab } from '../../types';
import { useApp } from '../../state/AppContext';
import { FormatBadge, PlatformIcon, StatusBadge } from '../shared';

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bb-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-bb-violet-soft text-bb-primary flex items-center justify-center">{icon}</div>
      <div>
        <div className="font-heading font-bold text-xl leading-tight">{value}</div>
        <div className="text-xs text-bb-muted">{label}</div>
      </div>
    </div>
  );
}

export function Dashboard({ onNavigate, onOpenPost }: { onNavigate: (tab: Tab) => void; onOpenPost: (id: string) => void }) {
  const { brands, campaigns, posts, settings, setActiveBrandId } = useApp();

  const scheduled = posts.filter(p => p.status === 'scheduled');
  const drafts = posts.filter(p => p.status === 'draft');
  const upcoming = [...scheduled]
    .filter(p => new Date(p.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bb-gradient opacity-10" />
        <h2 className="font-heading font-bold text-2xl">Welcome back to {settings.agencyName} 👋</h2>
        <p className="text-sm text-bb-muted mt-1.5 max-w-xl">
          Your AI content engine is managing {brands.length} brand{brands.length !== 1 && 's'} with {scheduled.length} post{scheduled.length !== 1 && 's'} queued to publish.
          {drafts.length > 0 && ` ${drafts.length} draft${drafts.length !== 1 ? 's are' : ' is'} waiting for review.`}
        </p>
        <div className="flex flex-wrap gap-2.5 mt-4">
          <button onClick={() => onNavigate('campaigns')} className="bb-gradient text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Sparkles size={15} /> Create Campaign
          </button>
          <button onClick={() => onNavigate('brands')} className="px-4 py-2 rounded-xl border border-bb-border bg-white text-sm font-semibold text-bb-primary hover:bg-bb-violet-soft transition-colors flex items-center gap-2">
            <Building2 size={15} /> Add Brand
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={<Building2 size={18} />} label="Brands" value={brands.length} />
        <StatTile icon={<Megaphone size={18} />} label="Campaigns" value={campaigns.length} />
        <StatTile icon={<CalendarDays size={18} />} label="Scheduled" value={scheduled.length} />
        <StatTile icon={<FileText size={18} />} label="Drafts to review" value={drafts.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Upcoming posts</h3>
            <button onClick={() => onNavigate('planner')} className="text-xs font-semibold text-bb-primary flex items-center gap-1 hover:opacity-80">
              Open Planner <ArrowRight size={12} />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-bb-muted py-6 text-center">
              Nothing queued yet — approve drafts in the Planner or create a campaign.
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(p => (
                <button key={p.id} onClick={() => onOpenPost(p.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bb-violet-soft/50 transition-colors text-left">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-bb-violet-soft shrink-0">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                    {p.format !== 'post' && (
                      <span className="absolute bottom-0 left-0 scale-75 origin-bottom-left"><FormatBadge format={p.format} /></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{p.caption}</div>
                    <div className="text-xs text-bb-muted flex items-center gap-1.5 mt-0.5">
                      <PlatformIcon platform={p.platform} size={11} />
                      {new Date(p.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Brands</h3>
            <button onClick={() => onNavigate('brands')} className="text-xs font-semibold text-bb-primary flex items-center gap-1 hover:opacity-80">
              Manage <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {brands.map(b => {
              const count = posts.filter(p => p.brandId === b.id).length;
              const approved = posts.filter(p => p.brandId === b.id && p.status !== 'draft').length;
              return (
                <button
                  key={b.id}
                  onClick={() => { setActiveBrandId(b.id); onNavigate('campaigns'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-bb-violet-soft/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: b.colors[0] ?? '#7C3AED' }}>
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.name}</div>
                    <div className="text-xs text-bb-muted">{count} posts · {approved} approved</div>
                  </div>
                  <CheckCircle2 size={15} className={approved === count && count > 0 ? 'text-bb-success' : 'text-bb-border'} />
                </button>
              );
            })}
            {brands.length === 0 && <div className="text-sm text-bb-muted py-4 text-center">No brands yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
