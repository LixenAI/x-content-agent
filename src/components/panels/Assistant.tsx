import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Sparkles, Lock } from 'lucide-react';
import type { ChatMessage } from '../../types';
import * as api from '../../lib/api';
import { useApp } from '../../state/AppContext';

const SUGGESTIONS = [
  "What's scheduled to go out this week?",
  'Write 3 hook variations for my next post',
  'Review my drafts — which one is weakest and why?',
  'Suggest 5 content ideas for this brand',
];

// The assistant replies in light markdown. Rather than pull in a parser, render
// the few things it actually uses: headings, bullets, numbered lists, and bold.
function renderInline(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <span key={key}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`')) {
          return <code key={i} className="px-1 py-0.5 rounded bg-bb-violet-soft text-bb-primary text-[12px]">{p.slice(1, -1)}</code>;
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </span>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = content.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (/^#{1,6}\s/.test(trimmed)) {
      return <div key={i} className="font-heading font-semibold mt-3 mb-1">{renderInline(trimmed.replace(/^#{1,6}\s/, ''), i)}</div>;
    }
    if (/^[-*]\s/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-bb-muted mt-[3px]">•</span>
          <span>{renderInline(trimmed.replace(/^[-*]\s/, ''), i)}</span>
        </div>
      );
    }
    const numbered = trimmed.match(/^(\d+)\.\s(.*)$/);
    if (numbered) {
      return (
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-bb-muted font-medium">{numbered[1]}.</span>
          <span>{renderInline(numbered[2], i)}</span>
        </div>
      );
    }
    return <div key={i}>{renderInline(trimmed, i)}</div>;
  });
  return <div className="space-y-0.5 leading-relaxed">{blocks}</div>;
}

export function Assistant() {
  const { activeBrand } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const reply = await api.chatWithAgent(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      // Keep the user's message on screen so their typing isn't lost on failure.
      setError(err instanceof Error ? err.message : 'The assistant is unavailable.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-heading font-bold text-2xl">AI Assistant</h2>
          <p className="text-sm text-bb-muted mt-1">
            Knows your brands, campaigns, and posts{activeBrand ? ` — currently viewing ${activeBrand.name}` : ''}.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="flex items-center gap-1.5 text-sm text-bb-muted hover:text-bb-primary transition-colors"
          >
            <RotateCcw size={14} /> New chat
          </button>
        )}
      </div>

      <div className="bb-card flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-11 h-11 rounded-2xl bb-gradient flex items-center justify-center text-white mb-3">
                <Sparkles size={20} />
              </div>
              <div className="font-heading font-semibold">Ask about your content</div>
              <p className="text-sm text-bb-muted mt-1 mb-5 max-w-sm">
                I can see your workspace and help you plan and write. I can't post or schedule anything —
                that stays in your hands.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-3 py-2.5 rounded-xl border border-bb-border hover:border-bb-primary hover:bg-bb-violet-soft transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bb-gradient text-white rounded-br-md'
                      : 'bg-bb-violet-soft text-bb-dark rounded-bl-md'
                  }`}
                >
                  {m.role === 'user' ? m.content : <FormattedMessage content={m.content} />}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-bb-violet-soft rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <div className="bb-spinner" />
                <span className="text-sm text-bb-muted">Thinking…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-bb-error bg-red-50 rounded-xl px-3 py-2">{error}</div>
          )}
        </div>

        <div className="border-t border-bb-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder="Ask about your content…  (Enter to send, Shift+Enter for a new line)"
              className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white max-h-40"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-xl bb-gradient text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <ArrowUp size={17} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2 px-1 text-[11px] text-bb-muted">
            <Lock size={11} />
            Read-only — the assistant can't publish, schedule, or change your content.
          </div>
        </div>
      </div>
    </div>
  );
}
