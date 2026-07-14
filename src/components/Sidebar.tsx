import React, { useState } from 'react';
import { BarChart3, Building2, CalendarDays, ChevronDown, FlaskConical, LayoutDashboard, Megaphone, Plug, Settings, Check } from 'lucide-react';
import type { Tab } from '../types';
import { useApp } from '../state/AppContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  tab: Tab;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
}

function NavItem({ icon, label, tab, activeTab, onClick }: NavItemProps) {
  const active = tab === activeTab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-white' : 'text-white/55'}>{icon}</span>
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">{children}</div>;
}

function BrandSwitcher() {
  const { brands, activeBrand, setActiveBrandId } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative px-3 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: activeBrand?.colors[0] ?? '#7C3AED' }}
        >
          {(activeBrand?.name.charAt(0) ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/45">Active brand</div>
          <div className="text-sm text-white font-medium truncate">{activeBrand?.name ?? 'No brand'}</div>
        </div>
        <ChevronDown size={14} className={`text-white/45 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-30 rounded-xl bg-bb-sidebar-hover border border-white/10 shadow-xl overflow-hidden">
          {brands.map(b => (
            <button
              key={b.id}
              onClick={() => { setActiveBrandId(b.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 text-left"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: b.colors[0] ?? '#7C3AED' }}>
                {b.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/85 truncate flex-1">{b.name}</span>
              {b.id === activeBrand?.id && <Check size={13} className="text-bb-primary" />}
            </button>
          ))}
          {brands.length === 0 && <div className="px-3 py-2.5 text-xs text-white/45">No brands yet</div>}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const { settings, demoMode } = useApp();

  return (
    <aside className="w-60 shrink-0 bg-bb-sidebar flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 pt-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-heading font-bold text-sm shadow-lg"
          style={{ background: `linear-gradient(135deg, ${settings.accentColor}, #4F46E5)` }}
        >
          {settings.logoText || 'CP'}
        </div>
        <div>
          <div className="font-heading font-bold text-white leading-tight">{settings.agencyName}</div>
          <div className="text-[10px] text-white/40 tracking-wide">Pro Content Studio</div>
        </div>
      </div>

      <BrandSwitcher />

      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        <SectionLabel>Workspace</SectionLabel>
        <NavItem icon={<LayoutDashboard size={17} />} label="Dashboard" tab="dashboard" activeTab={activeTab} onClick={onTabChange} />
        <NavItem icon={<Building2 size={17} />} label="Brands" tab="brands" activeTab={activeTab} onClick={onTabChange} />

        <SectionLabel>Content</SectionLabel>
        <NavItem icon={<Megaphone size={17} />} label="Campaigns" tab="campaigns" activeTab={activeTab} onClick={onTabChange} />
        <NavItem icon={<CalendarDays size={17} />} label="Social Planner" tab="planner" activeTab={activeTab} onClick={onTabChange} />
        <NavItem icon={<BarChart3 size={17} />} label="Analytics" tab="analytics" activeTab={activeTab} onClick={onTabChange} />

        <SectionLabel>Setup</SectionLabel>
        <NavItem icon={<Plug size={17} />} label="Integrations" tab="integrations" activeTab={activeTab} onClick={onTabChange} />
        <NavItem icon={<Settings size={17} />} label="Settings" tab="settings" activeTab={activeTab} onClick={onTabChange} />
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        {demoMode ? (
          <div className="flex items-center gap-2 text-xs text-amber-300/90">
            <FlaskConical size={13} />
            Demo mode — sample AI output
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Content engine online
          </div>
        )}
      </div>
    </aside>
  );
}
