import React, { useState } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import type { Post } from '../../types';
import { useApp } from '../../state/AppContext';

function scoreColor(score: number): string {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" data-testid="virality-ring">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#EDE9FE" strokeWidth="6" />
      <circle
        cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="39" textAnchor="middle" fontSize="17" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

export function ViralityCard({ post }: { post: Post }) {
  const { predictViralityFor } = useApp();
  const [loading, setLoading] = useState(false);
  const report = post.virality;

  const run = async () => {
    setLoading(true);
    await predictViralityFor(post.id);
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-bb-border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-heading font-semibold">
          <Gauge size={15} className="text-bb-primary" /> Virality Predictor
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-bb-primary hover:opacity-80 disabled:opacity-50"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : null}
          {report ? 'Re-score' : 'Predict virality'}
        </button>
      </div>
      {report && (
        <div className="flex gap-4 mt-3">
          <div className="shrink-0"><ScoreRing score={report.score} /></div>
          <div className="min-w-0 text-xs space-y-1.5">
            <div><span className="font-semibold">Hook:</span> <span className="text-bb-muted">{report.hookStrength}</span></div>
            <div><span className="font-semibold">Platform fit:</span> <span className="text-bb-muted">{report.platformFit}</span></div>
            {report.suggestions.length > 0 && (
              <ul className="text-bb-muted list-disc pl-4 space-y-0.5">
                {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
