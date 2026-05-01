import React from 'react';

export function LeadScoring() {
  const getAvatarFallback = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const LeadRow = ({ initials, handle, trigger, time, score }: any) => {
    return (
      <div className="flex items-center gap-3 p-3 px-4 rounded-[10px] mb-2 glass-card border-white/50 text-left">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-renx-blue to-renx-teal flex items-center justify-center font-heading text-[13px] font-bold text-white shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <div className="font-heading text-[13px] font-bold text-renx-navy mb-0.5">{handle}</div>
          <div className="text-[11.5px] text-renx-gray">{trigger} {time ? `· ${time}` : ''}</div>
        </div>
        {score === 'hot' && <span className="font-heading text-[11px] font-bold px-2.5 py-1 rounded-[10px] tracking-[0.04em] bg-[#FDECEA]/80 text-renx-error">🔴 HOT</span>}
        {score === 'warm' && <span className="font-heading text-[11px] font-bold px-2.5 py-1 rounded-[10px] tracking-[0.04em] bg-[#FFF3E0]/80 text-[#E65100]">🟡 WARM</span>}
        {score === 'cold' && <span className="font-heading text-[11px] font-bold px-2.5 py-1 rounded-[10px] tracking-[0.04em] bg-renx-surface/80 text-renx-gray">⚫ COLD</span>}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-renx-border flex justify-between items-center text-left">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em]">🎯 Lead Scoring Dashboard</div>
          <div className="text-[11px] text-renx-gray">Auto-routed to Slack #rxai-leads</div>
        </div>
        <div className="p-6">
          <div className="font-heading text-[11px] font-bold text-renx-error tracking-[0.1em] uppercase mb-3 text-left">🔴 Hot Leads — Route to Renn Now</div>
          <LeadRow initials="KL" handle="@karenliveswell" trigger='DM: "how do I start with the CRM?"' time="2h ago" score="hot" />
          <LeadRow initials="MP" handle="@mariapcaregiving" trigger='Comment: "how do I sign up?" + downloaded freebie' time="4h ago" score="hot" />
          <LeadRow initials="TJ" handle="@theresaJ_home" trigger='DM: "interested in the affiliate program"' time="1d ago" score="hot" />

          <div className="font-heading text-[11px] font-bold text-[#E65100] tracking-[0.1em] uppercase mb-3 mt-5 text-left">🟡 Warm Leads — Add to Nurture</div>
          <LeadRow initials="BS" handle="@brenda_solopreneur" trigger="Saved 4 posts · Follows @RennXAI" time="3 days" score="warm" />
          <LeadRow initials="AC" handle="@anitacareconsult" trigger='Shared carousel + comment "this is exactly what I need"' time="" score="warm" />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden self-start">
        <div className="px-6 py-4 border-b border-renx-border text-left">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em]">📋 Lead Rules</div>
        </div>
        <div className="p-6">
          <div className="bg-renx-error/5 rounded-[10px] p-3.5 mb-3 border-l-4 border-renx-error text-left">
            <div className="font-heading text-[11px] font-bold text-renx-error mb-2">🔴 HOT — Route Immediately</div>
            <div className="text-xs text-renx-dark leading-[1.7]">
              · "how do I start?" DM<br/>
              · "how do I sign up?" comment<br/>
              · Freebie + DM within 24h<br/>
              · Pricing question in any channel
            </div>
          </div>
          
          <div className="bg-[#E65100]/5 rounded-[10px] p-3.5 mb-3 border-l-4 border-[#E65100] text-left">
            <div className="font-heading text-[11px] font-bold text-[#E65100] mb-2">🟡 WARM — Add to Nurture</div>
            <div className="text-xs text-renx-dark leading-[1.7]">
              · Follows + saves 3+ posts<br/>
              · Engages 3+ times in 7 days<br/>
              · Question comment about services
            </div>
          </div>

          <div className="bg-renx-surface rounded-[10px] p-3.5 border-l-4 border-renx-slate text-left">
            <div className="font-heading text-[11px] font-bold text-renx-gray mb-2">⚫ COLD — Monitor Only</div>
            <div className="text-xs text-renx-dark leading-[1.7]">
              · New follower, no engagement<br/>
              · Single-post like only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
