import React, { useMemo } from 'react';
import { FlaskConical, TrendingUp } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { demoAnalytics } from '../../lib/demo';
import { PlatformIcon, PLATFORM_COLORS, PLATFORM_LABELS } from '../shared';

export function Analytics() {
  const { posts, activeBrandId } = useApp();
  const data = useMemo(() => demoAnalytics(), []);

  const topPosts = posts
    .filter(p => p.brandId === activeBrandId)
    .slice(0, 4)
    .map((p, i) => ({ post: p, reach: [12400, 9800, 7200, 5100][i] ?? 3000, engagement: [6.2, 5.1, 4.4, 3.9][i] ?? 3.0 }));

  const maxReach = Math.max(...data.weekly.map(w => w.reach));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Analytics</h2>
          <p className="text-sm text-bb-muted mt-1">Performance across all connected accounts.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
          <FlaskConical size={12} /> Sample data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.stats.map(s => (
          <div key={s.label} className="bb-card p-4">
            <div className="text-xs text-bb-muted">{s.label}</div>
            <div className="font-heading font-bold text-2xl mt-1">{s.value}</div>
            <div className="text-xs font-semibold text-bb-success flex items-center gap-1 mt-1">
              <TrendingUp size={11} /> {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bb-card p-5">
          <h3 className="font-heading font-semibold mb-4">Reach & engagement</h3>
          <svg viewBox="0 0 600 220" className="w-full">
            {data.weekly.map((w, i) => {
              const barW = 44;
              const gap = (600 - data.weekly.length * barW) / (data.weekly.length + 1);
              const x = gap + i * (barW + gap);
              const reachH = (w.reach / maxReach) * 160;
              const engH = (w.engagement / maxReach) * 160 * 8;
              return (
                <g key={w.label}>
                  <rect x={x} y={180 - reachH} width={barW * 0.55} height={reachH} rx={4} fill="#7C3AED" opacity={0.85} />
                  <rect x={x + barW * 0.62} y={180 - engH} width={barW * 0.38} height={engH} rx={4} fill="#7A9BBF" />
                  <text x={x + barW / 2} y={200} textAnchor="middle" fontSize={12} fill="#6B7280">{w.label}</text>
                </g>
              );
            })}
          </svg>
          <div className="flex items-center gap-4 text-xs text-bb-muted mt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-bb-primary" /> Reach</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7A9BBF' }} /> Engagement</span>
          </div>
        </div>

        <div className="bb-card p-5">
          <h3 className="font-heading font-semibold mb-4">Platform split</h3>
          <div className="space-y-3.5">
            {data.platformSplit.map(s => (
              <div key={s.platform}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 font-medium">
                    <PlatformIcon platform={s.platform} size={14} /> {PLATFORM_LABELS[s.platform]}
                  </span>
                  <span className="text-bb-muted">{s.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-bb-violet-soft overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: PLATFORM_COLORS[s.platform] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topPosts.length > 0 && (
        <div className="bb-card p-5">
          <h3 className="font-heading font-semibold mb-4">Top posts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topPosts.map(({ post, reach, engagement }) => (
              <div key={post.id} className="rounded-xl border border-bb-border overflow-hidden">
                <div className="aspect-square bg-bb-violet-soft">
                  {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <div className="text-xs truncate">{post.caption}</div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-bb-muted">
                    <span className="flex items-center gap-1"><PlatformIcon platform={post.platform} size={10} /> {reach.toLocaleString()} reach</span>
                    <span className="font-semibold text-bb-success">{engagement}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
