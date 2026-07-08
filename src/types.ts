export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'linkedin';
export type PostStatus = 'draft' | 'scheduled' | 'posted';
export type PostFormat = 'post' | 'carousel' | 'video';
export type MediaStatus = 'none' | 'generating' | 'done' | 'failed';
export type AspectRatio = '1:1' | '9:16' | '16:9';
export type Tab = 'dashboard' | 'brands' | 'campaigns' | 'planner' | 'analytics' | 'integrations' | 'settings';

export interface Brand {
  id: string;
  name: string;
  website: string;
  description: string;
  toneOfVoice: string;
  audience: string;
  topics: string[];
  colors: string[];
  deepKnowledge: string;
  createdAt: string;
}

export interface FormatMix {
  post: number;
  carousel: number;
  video: number;
}

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  goal: string;
  topics: string[];
  platforms: Platform[];
  postsPerWeek: number;
  durationDays: number;
  startDate: string;
  status: 'generating' | 'ready' | 'failed';
  createdAt: string;
  formatMix?: FormatMix; // percentages, sums to 100
  hookFormula?: string; // HOOK_FORMULAS id or 'auto'
  scriptFramework?: string; // SCRIPT_FRAMEWORKS id or 'auto'
  videoStyle?: string; // VIDEO_STYLES id or 'auto'
}

export interface CarouselSlide {
  heading: string;
  body: string;
  imagePrompt: string;
  imageUrl: string | null;
  imageStatus: MediaStatus;
}

export interface VideoScene {
  category: string; // BROLL_CATEGORIES id
  description: string;
  imagePrompt: string;
  duration: number; // seconds
}

export interface VideoPlan {
  hook: string;
  script: string;
  style: string; // VIDEO_STYLES id
  aspectRatio: AspectRatio;
  scenes: VideoScene[];
  keyframeUrl: string | null;
  videoUrl: string | null;
  videoStatus: 'none' | 'keyframe' | 'generating' | 'done' | 'failed';
  provider: string | null; // 'kling' | 'higgsfield' | 'veo' | 'demo'
}

export interface ViralityReport {
  score: number; // 0-100
  hookStrength: string;
  platformFit: string;
  suggestions: string[];
}

export interface Post {
  id: string;
  brandId: string;
  campaignId: string | null;
  platform: Platform;
  format: PostFormat;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl: string | null;
  imageStatus: MediaStatus;
  slides?: CarouselSlide[];
  video?: VideoPlan;
  virality?: ViralityReport | null;
  scheduledAt: string;
  status: PostStatus;
  createdAt: string;
}

export interface AgencySettings {
  agencyName: string;
  accentColor: string;
  logoText: string;
  customDomain: string;
}

export type IntegrationId = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'gohighlevel' | 'canva' | 'kling' | 'higgsfield';

export interface BrandProfileDraft {
  name: string;
  description: string;
  toneOfVoice: string;
  audience: string;
  topics: string[];
  colors: string[];
}

export interface ProviderStatus {
  gemini: boolean;
  kling: boolean;
  higgsfield: boolean;
  pollinations: boolean;
  canvaTemplateUrl: string | null;
}

export interface CaptionVariant {
  hookId: string;
  hookName: string;
  caption: string;
}
