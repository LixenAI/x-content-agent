import React from 'react';
import { 
  Sparkles, CalendarDays, Link2, BarChart3, Target, Settings, History
} from 'lucide-react';
import { Tab } from '../App';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => {
    const isActive = activeTab === tab;
    return (
      <button 
        onClick={() => onTabChange(tab)}
        className={`w-full flex items-center gap-3 px-5 py-2.5 transition-all text-[13.5px] border-l-[3px] font-medium
          ${isActive 
            ? 'bg-renx-blue/10 text-renx-blue border-renx-blue' 
            : 'text-renx-slate border-transparent hover:bg-white/50 hover:text-renx-navy'}`}
      >
        <Icon size={16} className={isActive ? "text-renx-blue" : "text-slate-400"} />
        {label}
      </button>
    );
  };

  return (
    <nav className="w-[240px] glass-panel border-r border-renx-border flex flex-col flex-shrink-0 z-20">
      <div className="p-6 pb-5 border-b border-renx-border">
        <img 
          className="w-[140px] h-auto drop-shadow-sm" 
          src="/mnt/user-data/uploads/Copy_of_RennX_Logo_Mockup__350_x_180_px_.png" 
          alt="RennXAI Studio" 
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as any).nextElementSibling.style.display = 'block';
          }}
        />
        <div style={{display: 'none'}} className="font-heading text-lg font-extrabold text-renx-navy">
          Renn<span className="text-renx-blue">X</span>AI
        </div>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <div className="font-heading text-[9px] font-bold tracking-[0.12em] text-slate-400 px-5 pt-4 pb-2 uppercase text-left">
          Content
        </div>
        <NavItem tab="generate" icon={Sparkles} label="Content Generator" />
        <NavItem tab="history" icon={History} label="Content History" />
        <NavItem tab="schedule" icon={CalendarDays} label="Schedule Queue" />

        <div className="font-heading text-[9px] font-bold tracking-[0.12em] text-slate-400 px-5 pt-4 pb-2 uppercase text-left">
          Distribution
        </div>
        <NavItem tab="platforms" icon={Link2} label="Platform Connect" />
        <NavItem tab="analytics" icon={BarChart3} label="Analytics" />

        <div className="font-heading text-[9px] font-bold tracking-[0.12em] text-slate-400 px-5 pt-4 pb-2 uppercase text-left">
          Pipeline
        </div>
        <NavItem tab="leads" icon={Target} label="Lead Scoring" />
        <NavItem tab="settings" icon={Settings} label="Agent Settings" />
      </div>

      <div className="p-4 px-5 border-t border-renx-border">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-renx-success animate-pulse shadow-[0_0_8px_rgba(27,129,140,0.6)]"></div>
          Agent active · @RennXAI
        </div>
      </div>
    </nav>
  );
}
