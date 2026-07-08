import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import type { PostStatus } from '../../types';
import { useApp } from '../../state/AppContext';
import { EmptyState, FormatBadge, FormatIcon, PlatformIcon, StatusBadge } from '../shared';

const STATUS_CHIP: Record<PostStatus, string> = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  posted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Planner({ onOpenPost }: { onOpenPost: (id: string) => void }) {
  const { posts, activeBrandId, approveAllDrafts } = useApp();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const brandPosts = useMemo(
    () => posts
      .filter(p => p.brandId === activeBrandId)
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [posts, activeBrandId, statusFilter],
  );

  const draftCount = posts.filter(p => p.brandId === activeBrandId && p.status === 'draft').length;

  const weeks = useMemo(() => {
    const first = new Date(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    const out: Date[][] = [];
    for (let i = 0; i < 6; i++) out.push(cells.slice(i * 7, i * 7 + 7));
    return out;
  }, [cursor]);

  const today = new Date();

  const shiftMonth = (delta: number) => {
    setCursor(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-2xl">Social Planner</h2>
          <p className="text-sm text-bb-muted mt-1">Review, edit, and approve everything before it goes out.</p>
        </div>
        <div className="flex items-center gap-2">
          {draftCount > 0 && (
            <button
              onClick={approveAllDrafts}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
            >
              <CheckCheck size={15} /> Approve {draftCount} draft{draftCount !== 1 && 's'}
            </button>
          )}
          <div className="flex rounded-xl border border-bb-border overflow-hidden">
            {(['calendar', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  view === v ? 'bg-bb-primary text-white' : 'bg-white text-bb-muted hover:text-bb-primary'
                }`}
              >
                {v === 'calendar' ? <CalendarDays size={14} /> : <LayoutList size={14} />}
                {v === 'calendar' ? 'Calendar' : 'List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'draft', 'scheduled', 'posted'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors ${
              statusFilter === s ? 'bg-bb-primary text-white border-bb-primary' : 'bg-white text-bb-muted border-bb-border hover:border-bb-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {brandPosts.length === 0 && statusFilter === 'all' ? (
        <EmptyState
          icon={<CalendarDays size={26} />}
          title="Nothing scheduled yet"
          subtitle="Create a campaign and the AI-generated posts will land here for review."
        />
      ) : view === 'calendar' ? (
        <div className="bb-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-bb-border">
            <h3 className="font-heading font-semibold">{monthLabel(cursor)}</h3>
            <div className="flex gap-1">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-bb-violet-soft text-bb-muted hover:text-bb-primary transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-bb-violet-soft text-bb-muted hover:text-bb-primary transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-bb-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-bb-muted text-center">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-bb-border last:border-b-0">
              {week.map(day => {
                const dayPosts = brandPosts.filter(p => sameDay(new Date(p.scheduledAt), day));
                const inMonth = day.getMonth() === cursor.getMonth();
                return (
                  <div key={day.toISOString()} className={`min-h-[92px] p-1.5 border-r border-bb-border last:border-r-0 ${inMonth ? '' : 'bg-bb-bg/60'}`}>
                    <div className={`text-[11px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      sameDay(day, today) ? 'bb-gradient text-white' : inMonth ? 'text-bb-dark' : 'text-bb-muted/50'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 3).map(p => (
                        <button
                          key={p.id}
                          onClick={() => onOpenPost(p.id)}
                          className={`w-full flex items-center gap-1 px-1.5 py-1 rounded-md border text-left text-[10px] font-medium truncate hover:opacity-80 transition-opacity ${STATUS_CHIP[p.status]}`}
                        >
                          <PlatformIcon platform={p.platform} size={10} className="shrink-0" />
                          {p.format !== 'post' && <FormatIcon format={p.format} size={10} className="shrink-0" />}
                          <span className="truncate">{p.caption}</span>
                        </button>
                      ))}
                      {dayPosts.length > 3 && <div className="text-[10px] text-bb-muted px-1">+{dayPosts.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {brandPosts.map(p => (
            <button
              key={p.id}
              onClick={() => onOpenPost(p.id)}
              className="w-full bb-card bb-card-hover p-3.5 flex items-center gap-4 text-left"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-bb-violet-soft shrink-0">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                {p.format !== 'post' && (
                  <span className="absolute bottom-0.5 left-0.5"><FormatBadge format={p.format} /></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.caption}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-bb-muted">
                  <PlatformIcon platform={p.platform} size={12} />
                  {new Date(p.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <StatusBadge status={p.status} />
            </button>
          ))}
          {brandPosts.length === 0 && (
            <div className="bb-card p-8 text-center text-sm text-bb-muted">No {statusFilter} posts.</div>
          )}
        </div>
      )}
    </div>
  );
}
