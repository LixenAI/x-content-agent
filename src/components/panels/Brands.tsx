import React, { useEffect, useRef, useState } from 'react';
import { Building2, Globe, Pencil, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { Brand, BrandProfileDraft } from '../../types';
import { useApp } from '../../state/AppContext';
import { EmptyState, Modal, PlatformIcon, PrimaryButton } from '../shared';

const ANALYZE_STAGES = [
  'Reading website…',
  'Learning brand voice…',
  'Identifying audience & topics…',
  'Building brand profile…',
];

const EMPTY_DRAFT: BrandProfileDraft = {
  name: '', description: '', toneOfVoice: '', audience: '', topics: [], colors: ['#7C3AED', '#4F46E5'],
};

function TopicChips({ topics, onChange }: { topics: string[]; onChange: (topics: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !topics.includes(t)) onChange([...topics, t]);
    setInput('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {topics.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bb-violet-soft text-bb-primary text-xs font-medium">
            {t}
            <button onClick={() => onChange(topics.filter(x => x !== t))} className="hover:text-bb-error"><X size={11} /></button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder="Add a topic and press Enter"
        className="w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white"
      />
    </div>
  );
}

function LogoUpload({ logoUrl, onChange }: { logoUrl?: string; onChange: (dataUrl: string | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-xl border border-dashed border-bb-border bg-white flex items-center justify-center overflow-hidden shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain p-1" />
        ) : (
          <Upload size={16} className="text-bb-muted" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-lg border border-bb-border text-xs font-semibold text-bb-muted hover:text-bb-primary hover:border-bb-primary transition-colors"
        >
          {logoUrl ? 'Replace logo' : 'Upload logo'}
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-bb-muted hover:text-bb-error transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// Deliberately a div, not a <label>: some fields wrap chip/button groups, and a
// wrapping label hijacks clicks and accessible names for the first control.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white';

export function BrandWizard({ editBrand, onClose }: { editBrand: Brand | null; onClose: () => void }) {
  const { analyzeBrandWebsite, addBrand, updateBrand, showToast } = useApp();
  const [step, setStep] = useState<1 | 2>(editBrand ? 2 : 1);
  const [url, setUrl] = useState(editBrand?.website ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandProfileDraft>(editBrand ?? EMPTY_DRAFT);
  const [deepKnowledge, setDeepKnowledge] = useState(editBrand?.deepKnowledge ?? '');

  useEffect(() => {
    if (!analyzing) return;
    setStageIdx(0);
    const timer = setInterval(() => setStageIdx(i => Math.min(i + 1, ANALYZE_STAGES.length - 1)), 2200);
    return () => clearInterval(timer);
  }, [analyzing]);

  const analyze = async () => {
    if (!url.trim()) return;
    setError(null);
    setAnalyzing(true);
    try {
      const profile = await analyzeBrandWebsite(url.trim());
      setDraft(profile);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze that website.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveBrand = () => {
    if (!draft.name.trim()) { showToast('Give the brand a name'); return; }
    if (editBrand) {
      updateBrand(editBrand.id, { ...draft, website: url.trim(), deepKnowledge });
      showToast('Brand updated');
    } else {
      addBrand({ ...draft, website: url.trim(), deepKnowledge });
      showToast(`${draft.name} added — ready to create campaigns`);
    }
    onClose();
  };

  return (
    <Modal title={editBrand ? `Edit ${editBrand.name}` : 'Add a Brand'} onClose={onClose} wide={step === 2}>
      {step === 1 ? (
        <div className="space-y-5">
          <p className="text-sm text-bb-muted">
            Enter the brand's website and the AI will learn its voice, audience, and content topics automatically.
          </p>
          <Field label="Website URL">
            <div className="relative">
              <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bb-muted" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') analyze(); }}
                placeholder="https://yourbrand.com"
                className={`${inputCls} pl-9`}
                autoFocus
              />
            </div>
          </Field>
          {error && <div className="text-sm text-bb-error bg-red-50 rounded-xl px-3 py-2">{error}</div>}
          {analyzing ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bb-violet-soft">
              <div className="bb-spinner" />
              <span className="text-sm font-medium text-bb-primary">{ANALYZE_STAGES[stageIdx]}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setDraft(EMPTY_DRAFT); setStep(2); }}
                className="text-sm text-bb-muted hover:text-bb-primary transition-colors"
              >
                Skip — enter details manually
              </button>
              <PrimaryButton onClick={analyze} disabled={!url.trim()}>
                <Sparkles size={15} /> Analyze Website
              </PrimaryButton>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Brand name">
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Website">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tone of voice">
              <textarea value={draft.toneOfVoice} onChange={e => setDraft({ ...draft, toneOfVoice: e.target.value })} rows={2} className={inputCls} />
            </Field>
            <Field label="Target audience">
              <textarea value={draft.audience} onChange={e => setDraft({ ...draft, audience: e.target.value })} rows={2} className={inputCls} />
            </Field>
          </div>
          <Field label="Content topics">
            <TopicChips topics={draft.topics} onChange={topics => setDraft({ ...draft, topics })} />
          </Field>
          <Field label="Brand colors">
            <div className="flex items-center gap-2">
              {draft.colors.map((c, i) => (
                <input
                  key={i}
                  type="color"
                  value={c}
                  onChange={e => setDraft({ ...draft, colors: draft.colors.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="w-9 h-9 rounded-lg border border-bb-border cursor-pointer bg-white p-0.5"
                />
              ))}
              {draft.colors.length < 4 && (
                <button
                  onClick={() => setDraft({ ...draft, colors: [...draft.colors, '#4F46E5'] })}
                  className="w-9 h-9 rounded-lg border border-dashed border-bb-border text-bb-muted hover:border-bb-primary hover:text-bb-primary flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </Field>
          <Field label="Brand logo (watermarked onto every generated image)">
            <LogoUpload logoUrl={draft.logoUrl} onChange={logoUrl => setDraft({ ...draft, logoUrl })} />
          </Field>
          <Field label="Deep knowledge (optional)">
            <textarea
              value={deepKnowledge}
              onChange={e => setDeepKnowledge(e.target.value)}
              rows={3}
              placeholder="Paste product details, offers, FAQs, or anything else the AI should know when writing posts…"
              className={inputCls}
            />
          </Field>
          <div className="flex items-center justify-between pt-2">
            {!editBrand ? (
              <button onClick={() => setStep(1)} className="text-sm text-bb-muted hover:text-bb-primary transition-colors">← Back</button>
            ) : <span />}
            <PrimaryButton onClick={saveBrand}>{editBrand ? 'Save Changes' : 'Create Brand'}</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Brands() {
  const { brands, posts, campaigns, activeBrandId, setActiveBrandId, deleteBrand } = useApp();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const openNew = () => { setEditing(null); setWizardOpen(true); };
  const openEdit = (b: Brand) => { setEditing(b); setWizardOpen(true); };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl">Your Brands</h2>
          <p className="text-sm text-bb-muted mt-1">The AI learns each brand's voice from its website and writes every post to match.</p>
        </div>
        <PrimaryButton onClick={openNew}><Plus size={15} /> Add Brand</PrimaryButton>
      </div>

      {brands.length === 0 ? (
        <EmptyState
          icon={<Building2 size={26} />}
          title="No brands yet"
          subtitle="Add your first brand — just paste a website URL and the AI will build the brand profile for you."
          action={<PrimaryButton onClick={openNew}><Plus size={15} /> Add Brand</PrimaryButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brands.map(b => {
            const brandPosts = posts.filter(p => p.brandId === b.id);
            const brandCampaigns = campaigns.filter(c => c.brandId === b.id);
            const active = b.id === activeBrandId;
            return (
              <div key={b.id} className={`bb-card bb-card-hover p-5 ${active ? 'ring-2 ring-bb-primary/40' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: b.colors[0] ?? '#7C3AED' }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-heading font-semibold">{b.name}</div>
                      <div className="text-xs text-bb-muted">{b.website.replace(/^https?:\/\//, '') || 'No website'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-bb-muted hover:text-bb-primary hover:bg-bb-violet-soft transition-colors"><Pencil size={15} /></button>
                    <button
                      onClick={() => { if (confirm(`Delete ${b.name} and all its campaigns and posts?`)) deleteBrand(b.id); }}
                      className="p-1.5 rounded-lg text-bb-muted hover:text-bb-error hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-bb-muted mt-3 line-clamp-2">{b.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {b.topics.slice(0, 4).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-bb-violet-soft text-bb-primary text-[11px] font-medium">{t}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {(b.socialAccounts ?? []).length > 0 ? (
                    Array.from(new Set((b.socialAccounts ?? []).map(a => a.platform))).map(p => (
                      <span key={p} className="w-6 h-6 rounded-md bg-bb-violet-soft text-bb-primary flex items-center justify-center" title={p}>
                        <PlatformIcon platform={p} size={12} />
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-bb-muted italic">No accounts connected</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-bb-border">
                  <div className="text-xs text-bb-muted">
                    {brandCampaigns.length} campaign{brandCampaigns.length !== 1 && 's'} · {brandPosts.length} post{brandPosts.length !== 1 && 's'}
                  </div>
                  {active ? (
                    <span className="text-xs font-semibold text-bb-primary">Active brand</span>
                  ) : (
                    <button onClick={() => setActiveBrandId(b.id)} className="text-xs font-semibold text-bb-muted hover:text-bb-primary transition-colors">
                      Set active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizardOpen && <BrandWizard editBrand={editing} onClose={() => setWizardOpen(false)} />}
    </div>
  );
}
