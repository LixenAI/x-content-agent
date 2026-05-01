import React, { useState, useEffect } from 'react';
import { History, Search, FileText, Film, Layers, Smartphone, Trash2 } from 'lucide-react';

export interface GeneratedContent {
  id: string;
  topic: string;
  format: string;
  platform: string;
  resultText: string;
  createdAt: string;
  veoUrl?: string;
  imageUrl?: string;
}

export function ContentHistory() {
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('renx_content_history');
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load history', err);
      }
    };
    loadHistory();
  }, []);

  const deleteItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('renx_content_history', JSON.stringify(newHistory));
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'carousel': return <Layers size={14} />;
      case 'video': return <Film size={14} />;
      case 'caption': return <FileText size={14} />;
      case 'story': return <Smartphone size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const filteredHistory = history.filter(item => 
    item.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.resultText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-card rounded-xl overflow-hidden p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-lg font-bold text-renx-navy flex items-center gap-2">
          <History className="text-renx-blue" size={20} /> Content History
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-renx-gray" size={14} />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-renx-border shadow-sm rounded-lg text-[12px] focus:outline-none focus:border-renx-blue w-[250px]"
          />
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-renx-border">
          <History className="mx-auto text-renx-slate mb-3" size={32} />
          <p className="text-renx-gray font-medium text-[13px]">No generated content yet.</p>
          <p className="text-renx-slate text-[11px] mt-1">Content you generate will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map((item) => (
            <div key={item.id} className="bg-white border border-renx-border rounded-xl p-5 shadow-sm relative group hover:shadow-md transition-shadow">
              <button 
                onClick={() => deleteItem(item.id)}
                className="absolute top-4 right-4 text-renx-slate hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-renx-surface border border-renx-border rounded-md text-[10px] font-bold text-renx-dark uppercase tracking-wider">
                  {getFormatIcon(item.format)} {item.format}
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider">{item.platform}</span>
                <span className="text-[10px] text-renx-gray ml-auto">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="font-heading text-[14px] font-bold text-renx-navy mb-2 line-clamp-1">{item.topic}</h3>
              
              <div className="text-[12px] text-renx-gray bg-renx-surface rounded p-3 line-clamp-4 whitespace-pre-wrap font-mono relative">
                {item.resultText}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-renx-surface to-transparent"></div>
              </div>
            </div>
          ))}
          
          {filteredHistory.length === 0 && (
             <div className="col-span-2 text-center py-8 text-renx-gray text-[13px]">
               No history matched your search.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
