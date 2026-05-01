import React, { useState } from 'react';
import { Check } from 'lucide-react';

export function AgentSettings() {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const Toggle = ({ label, initialOn }: { label: string, initialOn?: boolean }) => {
    const [isOn, setIsOn] = useState(initialOn || false);
    return (
      <div className="flex items-center justify-between mb-3 text-left">
        <span className="text-[13px] text-renx-dark">{label}</span>
        <div className={`toggle ${isOn ? 'on' : ''}`} onClick={() => setIsOn(!isOn)}>
          <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] left-[3px] shadow transition-transform ${isOn ? 'translate-x-[18px]' : ''}`}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[600px] mx-auto pb-20">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-renx-border">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] text-left">⚙️ Agent Configuration</div>
        </div>
        <div className="p-6">
          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Agent Identity</div>
          
          <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Agent Name</label>
          <input type="text" defaultValue="RennXAI Social Media Manager" className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors mb-4" />
          
          <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Brand Handle</label>
          <input type="text" defaultValue="@RennXAI" className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors mb-4" />
          
          <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Master Canva Templates</label>
          <div className="flex flex-col gap-2 mb-6">
            <div className="text-[11px] text-renx-gray text-left">These links are configured in the Content Generator.</div>
          </div>

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Posting Preferences</div>
          <Toggle label="Auto-post to Meta" initialOn={true} />
          <Toggle label="Auto-post to TikTok" initialOn={false} />
          <Toggle label="Slack lead alerts" initialOn={true} />
          <Toggle label="Weekly performance reports" initialOn={true} />
          <Toggle label="Validation milestone alerts" initialOn={true} />
          <div className="mb-6"></div>

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Validation Targets</div>
          <div className="grid grid-cols-2 gap-3.5 mb-6 text-left">
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Freebie Download Target</label>
              <input type="number" defaultValue="50" className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors mb-4" />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Video View Threshold</label>
              <input type="number" defaultValue="5000" className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors mb-4" />
            </div>
          </div>

          <button 
            onClick={() => showToast('✓ Settings saved')}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-renx-navy text-white rounded-lg font-heading text-[12.5px] font-bold tracking-[0.03em] hover:bg-[#0a1f38] transition-colors"
          >
            Save Configuration
          </button>
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
