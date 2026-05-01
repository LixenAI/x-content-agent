import React from 'react';
import { Target } from 'lucide-react';

export function ValidationBanner() {
  return (
    <div className="bg-gradient-to-br from-[#0D2B4E] to-[#1A6E8A] rounded-[14px] p-5 px-6 mb-6 flex items-center justify-between text-white border border-white/10 shadow-xl relative overflow-hidden">
      <div className="relative z-10">
        <div className="font-heading text-[13px] font-extrabold mb-1 tracking-[0.03em] flex items-center gap-2">
          <Target size={16} /> VALIDATION MILESTONE TRACKER
        </div>
        <div className="text-xs opacity-70">
          Hit 50 freebie downloads to unlock GoHighLevel
        </div>
      </div>
      <div className="flex-1 mx-6 max-w-md">
        <div className="flex justify-between text-[11px] opacity-70 mb-1.5">
          <span>Freebie Downloads</span>
          <span>12 / 50</span>
        </div>
        <div className="h-2 bg-white/15 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-renx-light-blue to-white rounded-full transition-all duration-500"
            style={{ width: '24%' }}
          ></div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-heading text-[22px] font-black">24%</div>
        <div className="text-[11px] opacity-60">to GHL unlock</div>
      </div>
    </div>
  );
}
