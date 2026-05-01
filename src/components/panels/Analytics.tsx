import React from 'react';

export function Analytics() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-xl p-[18px] px-5 border-l-4 border-l-renx-blue border border-renx-border/50 text-left">
          <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Total Reach</div>
          <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">14.2K</div>
          <div className="text-[11px] text-renx-success font-semibold">↑ 23% this week</div>
        </div>
        <div className="glass-card rounded-xl p-[18px] px-5 border-l-4 border-l-renx-teal border border-renx-border/50 text-left">
          <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Freebie Downloads</div>
          <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">12</div>
          <div className="text-[11px] text-renx-success font-semibold">↑ 38 to GHL unlock</div>
        </div>
        <div className="glass-card rounded-xl p-[18px] px-5 border-l-4 border-l-renx-navy border border-renx-border/50 text-left">
          <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Followers (Total)</div>
          <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">10.1K</div>
          <div className="text-[11px] text-renx-success font-semibold">↑ +47 this week</div>
        </div>
        <div className="glass-card rounded-xl p-[18px] px-5 border-l-4 border-l-[#E65100] border border-renx-border/50 text-left">
          <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Hot Leads</div>
          <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">3</div>
          <div className="text-[11px] text-[#E65100] font-semibold">→ Routed to Slack</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-renx-border">
            <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] text-left">📈 Reach by Platform (7 days)</div>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between gap-2 h-[100px]">
              {[45, 60, 80, 100, 30, 20, 10].map((h, i) => {
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                const isToday = i === 3;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 w-full">
                    <div className="flex-1 flex items-end w-full group">
                      <div 
                        className={`w-full rounded-t flex-1 transition-all group-hover:opacity-100 ${isToday ? 'bg-gradient-to-b from-[#B9D1DA] to-renx-blue opacity-80' : i > 3 ? 'bg-renx-slate opacity-40' : 'bg-gradient-to-b from-renx-blue to-renx-teal opacity-70'}`}
                        style={{ height: `${h}%` }}
                      ></div>
                    </div>
                    <div className={`text-[9px] ${isToday ? 'text-renx-blue font-bold' : 'text-renx-gray'}`}>{days[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-renx-border">
            <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] text-left">🎯 Funnel Performance</div>
          </div>
          <div className="p-6">
            <div className="mb-3">
              <div className="flex justify-between text-xs text-renx-dark mb-1">
                <span>Bio clicks</span><span className="font-bold text-renx-navy">147</span>
              </div>
              <div className="h-1.5 bg-renx-surface rounded-full">
                <div className="h-full w-full bg-renx-blue rounded-full"></div>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-renx-dark mb-1">
                <span>Freebie page visits</span><span className="font-bold text-renx-navy">63</span>
              </div>
              <div className="h-1.5 bg-renx-surface rounded-full">
                <div className="h-full w-[42%] bg-renx-teal rounded-full"></div>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-renx-dark mb-1">
                <span>Freebie downloads</span><span className="font-bold text-renx-navy">12</span>
              </div>
              <div className="h-1.5 bg-renx-surface rounded-full">
                <div className="h-full w-[19%] bg-renx-light-blue rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-renx-dark mb-1">
                <span>Ebook purchases ($9)</span><span className="font-bold text-renx-success">2</span>
              </div>
              <div className="h-1.5 bg-renx-surface rounded-full">
                <div className="h-full w-[3%] bg-renx-success rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
