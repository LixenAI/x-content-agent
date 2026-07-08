// Creative strategy library distilled from proven ad/content playbooks:
// hook formulas + script frameworks (video-ad-generator), cinematic video
// styles (ai-video-generator-claude), b-roll shot categories (broll-generator),
// and a per-platform delivery matrix.
import type { AspectRatio, Platform } from '../types';

export interface HookFormula {
  id: string;
  name: string;
  pattern: string;
  example: string;
}

export const HOOK_FORMULAS: HookFormula[] = [
  {
    id: 'pattern-interrupt',
    name: 'Pattern Interrupt',
    pattern: 'Open with something unexpected or contrarian that breaks the scroll pattern.',
    example: '"Everything you know about morning routines is wrong."',
  },
  {
    id: 'question',
    name: 'Question',
    pattern: 'Open with a question the audience can\'t help answering in their head.',
    example: '"What would you do with 10 extra hours a week?"',
  },
  {
    id: 'bold-claim',
    name: 'Bold Claim',
    pattern: 'Open with a confident, specific promise or claim, then back it up.',
    example: '"This one change doubled our engagement in 30 days."',
  },
  {
    id: 'pov',
    name: 'POV',
    pattern: 'Open first-person, dropping the viewer into a relatable scene ("POV: you...").',
    example: '"POV: it\'s Sunday night and next week\'s content is already done."',
  },
  {
    id: 'stat-authority',
    name: 'Stat / Authority',
    pattern: 'Open with a surprising statistic or expert-backed fact that earns trust.',
    example: '"73% of buyers check your socials before they ever visit your site."',
  },
];

export interface ScriptFramework {
  id: string;
  name: string;
  beats: string[];
}

export const SCRIPT_FRAMEWORKS: ScriptFramework[] = [
  {
    id: 'problem-agitate-solve',
    name: 'Problem – Agitate – Solve',
    beats: ['Name the painful problem', 'Twist the knife — what it costs them', 'Reveal the solution and how it feels after'],
  },
  {
    id: 'before-after',
    name: 'Before / After',
    beats: ['Paint the frustrating "before" state', 'Show the transformation moment', 'Land on the aspirational "after" and how to get it'],
  },
  {
    id: 'feature-cascade',
    name: 'Feature Cascade',
    beats: ['Hook with the headline benefit', 'Rapid-fire 3 features, each tied to an outcome', 'Close with the single next step'],
  },
  {
    id: 'social-proof-stack',
    name: 'Social Proof Stack',
    beats: ['Open with a result or testimonial quote', 'Stack 2-3 quick proof points (numbers, names, reviews)', 'Invite the viewer to be next'],
  },
  {
    id: 'day-in-the-life',
    name: 'Day in the Life',
    beats: ['Set the scene of a real day', 'Weave the product/service naturally into the routine', 'End with the small moment that makes it worth it'],
  },
];

export interface VideoStyle {
  id: string;
  name: string;
  visualDirection: string;
  pacing: string;
}

export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'ugc-testimonial',
    name: 'UGC Testimonial',
    visualDirection: 'Handheld iPhone framing, natural window light, casual home/office setting, direct-to-camera authenticity, slight camera shake',
    pacing: 'Conversational, jump cuts every 2-3 seconds',
  },
  {
    id: 'product-demo',
    name: 'Product Demo',
    visualDirection: 'Clean tabletop macro shots, softbox lighting, 50mm lens shallow depth of field, hands interacting with product, seamless match cuts',
    pacing: 'Steady, one clear action per shot',
  },
  {
    id: 'faceless',
    name: 'Faceless Channel',
    visualDirection: 'Overhead and close-up b-roll only, moody desk setups, screen recordings, kinetic text overlays, no faces shown',
    pacing: 'Fast, beat-synced cuts',
  },
  {
    id: 'before-after',
    name: 'Before / After Transformation',
    visualDirection: 'Split-screen and whip-pan transitions, dull desaturated "before" grading snapping to vibrant "after", reveal framing',
    pacing: 'Slow build, punchy reveal',
  },
  {
    id: 'luxury-aesthetic',
    name: 'Luxury Aesthetic',
    visualDirection: 'Slow dolly-in, golden-hour rim light, 35mm anamorphic look, marble and glass textures, high contrast with deep shadows',
    pacing: 'Slow, deliberate, cinematic',
  },
  {
    id: 'saas-launch',
    name: 'SaaS Launch',
    visualDirection: 'Apple-keynote minimalism, floating UI mockups on gradient backgrounds, smooth camera orbits, precise light sweeps',
    pacing: 'Confident, feature beats every 3-4 seconds',
  },
];

export interface BrollCategory {
  id: string;
  label: string;
  purpose: string;
  promptHint: string;
}

export const BROLL_CATEGORIES: BrollCategory[] = [
  { id: 'pain', label: 'Pain', purpose: 'Show the problem being felt', promptHint: 'frustrated person mid-struggle, tense body language, cluttered environment' },
  { id: 'failed', label: 'Failed Solution', purpose: 'Show old approaches falling short', promptHint: 'abandoned tools, crossed-out lists, visible disappointment' },
  { id: 'desired', label: 'Desired Outcome', purpose: 'Show the dream state', promptHint: 'relaxed confident person enjoying results, bright airy setting' },
  { id: 'science', label: 'Science / Mechanism', purpose: 'Show how it works', promptHint: 'clean diagram-like macro detail, process in motion, precise and technical' },
  { id: 'authority', label: 'Authority', purpose: 'Build credibility', promptHint: 'expert setting, professional context, awards or press cues' },
  { id: 'texture', label: 'Texture', purpose: 'Sensory close-up of the product', promptHint: 'extreme macro texture, satisfying slow detail, rich materials' },
  { id: 'sensory', label: 'Sensory Moment', purpose: 'Evoke feeling', promptHint: 'steam, light flares, slow-motion pour or touch, atmosphere-first' },
  { id: 'product', label: 'Product Hero', purpose: 'Showcase the product itself', promptHint: 'hero product shot, clean backdrop, brand colors, studio lighting' },
];

export interface PlatformSpec {
  imageAspect: AspectRatio;
  videoAspect: AspectRatio;
  tone: string;
  maxHashtags: number;
}

export const PLATFORM_MATRIX: Record<Platform, PlatformSpec> = {
  instagram: { imageAspect: '1:1', videoAspect: '9:16', tone: 'visual-first, aspirational, emoji-friendly', maxHashtags: 6 },
  tiktok: { imageAspect: '9:16', videoAspect: '9:16', tone: 'punchy, native, trend-aware, no corporate speak', maxHashtags: 4 },
  facebook: { imageAspect: '1:1', videoAspect: '1:1', tone: 'conversational, community-minded, story-led', maxHashtags: 3 },
  linkedin: { imageAspect: '16:9', videoAspect: '16:9', tone: 'professional but human, insight-led, first-person', maxHashtags: 4 },
};

function roundRobin<T extends { id: string }>(items: T[], id: string | undefined, index: number): T {
  if (id && id !== 'auto') {
    const found = items.find(item => item.id === id);
    if (found) return found;
  }
  return items[index % items.length];
}

export const resolveHook = (id: string | undefined, index: number) => roundRobin(HOOK_FORMULAS, id, index);
export const resolveFramework = (id: string | undefined, index: number) => roundRobin(SCRIPT_FRAMEWORKS, id, index);
export const resolveVideoStyle = (id: string | undefined, index: number) => roundRobin(VIDEO_STYLES, id, index);

export function aspectToDims(aspect: AspectRatio): { width: number; height: number } {
  switch (aspect) {
    case '9:16': return { width: 768, height: 1344 };
    case '16:9': return { width: 1344, height: 768 };
    default: return { width: 1024, height: 1024 };
  }
}

export function frameworksPromptBlock(opts: {
  hookFormula?: string;
  scriptFramework?: string;
  videoStyle?: string;
  platforms: Platform[];
}): string {
  const hooks = opts.hookFormula && opts.hookFormula !== 'auto'
    ? [resolveHook(opts.hookFormula, 0)]
    : HOOK_FORMULAS;
  const frameworks = opts.scriptFramework && opts.scriptFramework !== 'auto'
    ? [resolveFramework(opts.scriptFramework, 0)]
    : SCRIPT_FRAMEWORKS;
  const style = resolveVideoStyle(opts.videoStyle, 0);

  return `CREATIVE PLAYBOOK
Hook formulas (rotate across posts${hooks.length === 1 ? ' — REQUIRED formula below' : ''}):
${hooks.map(h => `- ${h.name}: ${h.pattern} e.g. ${h.example}`).join('\n')}

Script frameworks (structure captions and video scripts on these beats):
${frameworks.map(f => `- ${f.name}: ${f.beats.join(' → ')}`).join('\n')}

Video style${opts.videoStyle && opts.videoStyle !== 'auto' ? ` (REQUIRED): ${style.name} — ${style.visualDirection}. Pacing: ${style.pacing}` : ` options: ${VIDEO_STYLES.map(s => `${s.id} (${s.visualDirection.split(',')[0]})`).join('; ')}`}

B-roll scene categories (use the id in the "category" field):
${BROLL_CATEGORIES.map(c => `- ${c.id}: ${c.purpose} — ${c.promptHint}`).join('\n')}

Platform delivery rules:
${opts.platforms.map(p => `- ${p}: tone ${PLATFORM_MATRIX[p].tone}; max ${PLATFORM_MATRIX[p].maxHashtags} hashtags; video aspect ${PLATFORM_MATRIX[p].videoAspect}`).join('\n')}`;
}
