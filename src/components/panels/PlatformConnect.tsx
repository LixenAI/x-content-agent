import React, { useState } from 'react';
import { Facebook, Music, Hexagon, MessageSquare, BookOpen, Check, AlertTriangle, Instagram } from 'lucide-react';

export function PlatformConnect() {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const ConnectionCard = ({ 
    icon: Icon, name, desc, status, details, isHexagon = false, isMeta = false, onConnect = null
  }: any) => {
    return (
      <div className="glass-card rounded-[14px] p-5 px-6 flex items-center gap-4 mb-3 text-left">
        <div className={`text-[28px] ${isHexagon ? 'text-purple-600' : isMeta ? 'text-blue-600' : 'text-renx-dark'}`}>
          <Icon size={32} />
        </div>
        <div className="flex-1">
          <div className="font-heading text-sm font-bold text-renx-navy mb-1">{name}</div>
          <div className="text-xs text-renx-gray">{desc}</div>
        </div>
        <div className="text-right">
          {status === 'connected' ? (
            <>
              <div className="text-[11px] font-semibold text-renx-success flex items-center justify-end gap-1"><Check size={12}/> Connected</div>
              <div className="text-[10px] text-renx-gray mt-1">{details}</div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold text-[#E65100] flex items-center justify-end gap-1"><AlertTriangle size={12}/> Not Connected</div>
              <button 
                onClick={onConnect}
                className="mt-2 px-3 py-1 bg-renx-blue text-white rounded text-[11px] font-bold"
              >
                Connect {name.split(' ')[0]}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-renx-border">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] text-left">🔗 Platform Connections</div>
        </div>
        <div className="p-6">
          <ConnectionCard 
            icon={Instagram}
            isMeta={true}
            name="Instagram Account"
            desc="Publish Reels, carousels, stories, and text posts via Meta Graph API"
            status="connected"
            details="@rennxai_studio · Connected"
          />
          <ConnectionCard 
            icon={Music}
            name="TikTok Business"
            desc="Post videos and manage content via TikTok Content Posting API"
            status="connected"
            details="@RennXAI · Connected via API"
          />
          <ConnectionCard 
            icon={Hexagon}
            isHexagon={true}
            name="Canva"
            desc="Template DAHHwyusVIU · 10-page proposal system · carousel generation"
            status="connected"
            details="RennXAI Template · 10 slides"
          />
          <ConnectionCard 
            icon={MessageSquare}
            name="Slack"
            desc="Lead alerts → #rxai-leads · Reports → #rxai-content · Logs → #rxai-agent-log"
            status="connected"
            details="Workspace: RennXAI"
          />
          <ConnectionCard 
            icon={BookOpen}
            name="Notion"
            desc="Content calendar, SOPs, lead pipeline, revenue tracker"
            status="connected"
            details="RennXAI Operating HQ"
          />

          <div className="mt-4 p-3.5 bg-renx-surface rounded-[10px] border border-renx-border text-left">
            <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.08em] uppercase mb-2">META API SETUP INSTRUCTIONS</div>
            <div className="text-xs text-renx-dark leading-[1.7]">
              1. Create a Meta Developer App at <strong>developers.facebook.com</strong><br/>
              2. Add <strong>instagram_basic</strong>, <strong>pages_manage_posts</strong>, <strong>publish_video</strong> permissions<br/>
              3. Get Page Access Token for @RennXAI page<br/>
              4. Add token to agent environment as <code>META_PAGE_TOKEN</code>
            </div>
          </div>

        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-renx-navy text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium z-50 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Check size={16} className="text-renx-success" />
          {toast}
        </div>
      )}
    </div>
  );
}
