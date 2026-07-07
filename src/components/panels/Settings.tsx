import React from 'react';
import { Paintbrush, RotateCcw } from 'lucide-react';
import { useApp } from '../../state/AppContext';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-bb-muted mt-1">{hint}</span>}
    </label>
  );
}

export function Settings() {
  const { settings, updateSettings, resetData } = useApp();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl">Settings</h2>
        <p className="text-sm text-bb-muted mt-1">White-label the platform for your agency — changes apply instantly.</p>
      </div>

      <div className="bb-card p-6 space-y-5">
        <div className="flex items-center gap-2 font-heading font-semibold">
          <Paintbrush size={16} className="text-bb-primary" /> White Label
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Agency name" hint="Shown in the sidebar and dashboard.">
            <input value={settings.agencyName} onChange={e => updateSettings({ agencyName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Logo text" hint="1-2 characters for the logo mark.">
            <input value={settings.logoText} maxLength={2} onChange={e => updateSettings({ logoText: e.target.value.toUpperCase() })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.accentColor}
                onChange={e => updateSettings({ accentColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-bb-border cursor-pointer bg-white p-0.5"
              />
              <span className="text-sm text-bb-muted font-mono">{settings.accentColor}</span>
            </div>
          </Field>
          <Field label="Custom domain" hint="Where clients access your branded portal.">
            <input value={settings.customDomain} onChange={e => updateSettings({ customDomain: e.target.value })} placeholder="social.youragency.com" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="bb-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-heading font-semibold">Reset all data</div>
            <p className="text-sm text-bb-muted mt-1">Clears every brand, campaign, and post, and restores the sample workspace.</p>
          </div>
          <button
            onClick={() => { if (confirm('Reset all data? This deletes every brand, campaign, and post.')) resetData(); }}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-bb-error text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}
