import React from 'react';
import { Tab } from '../App';
import { Facebook, Music, Hexagon, Instagram } from 'lucide-react';

interface TopbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Topbar({ activeTab, onTabChange }: TopbarProps) {
  const titles: Record<Tab, string> = {
    generate: 'Content Generator',
    history: 'Content History',
    schedule: 'Schedule Queue',
    platforms: 'Platform Connections',
    analytics: 'Analytics',
    leads: 'Lead Scoring',
    settings: 'Agent Settings'
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-renx-border px-8 h-[64px] flex items-center justify-between flex-shrink-0 z-10 sticky top-0 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="font-heading text-[16px] font-black text-renx-navy tracking-tight">
          {titles[activeTab]}
        </div>
        <div className="h-5 w-px bg-renx-border hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-[11px] font-semibold text-renx-gray uppercase tracking-widest">System Online</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors" title="Facebook">
          <Facebook size={16} />
        </div>
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-50 text-pink-600 border border-pink-100 shadow-sm cursor-pointer hover:bg-pink-100 transition-colors" title="Instagram">
          <Instagram size={16} />
        </div>
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-800 border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors" title="TikTok">
          <Music size={16} />
        </div>
      </div>
    </div>
  );
}
