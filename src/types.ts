export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'linkedin';
export type PostStatus = 'draft' | 'scheduled' | 'posted';
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
}

export interface Post {
  id: string;
  brandId: string;
  campaignId: string | null;
  platform: Platform;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl: string | null;
  imageStatus: 'none' | 'generating' | 'done' | 'failed';
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

export type IntegrationId = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'gohighlevel';

export interface BrandProfileDraft {
  name: string;
  description: string;
  toneOfVoice: string;
  audience: string;
  topics: string[];
  colors: string[];
}
