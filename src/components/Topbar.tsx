import React from 'react';
import { Sparkles } from 'lucide-react';
import type { Tab } from '../types';
import { useApp } from '../state/AppContext';

const TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  brands: 'Brands',
  campaigns: 'Campaigns',
  planner: 'Social Planner',
  assistant: 'AI Assistant',
  analytics: 'Analytics',
  integrations: 'Integrations',
  settings: 'Settings',
};

export function Topbar({ activeTab, onNewCampaign }: { activeTab: Tab; onNewCampaign: () => void }) {
  const { activeBrand } = useApp();

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 md:px-8 bg-white/60 backdrop-blur-md border-b border-bb-border">
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-bold text-lg">{TITLES[activeTab]}</h1>
        {activeBrand && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bb-violet-soft text-bb-primary text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeBrand.colors[0] ?? '#7C3AED' }} />
            {activeBrand.name}
          </span>
        )}
      </div>
      <button
        onClick={onNewCampaign}
        className="bb-gradient text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md shadow-sky-300/50"
      >
        <Sparkles size={15} />
        New Campaign
      </button>
    </header>
  );
}
