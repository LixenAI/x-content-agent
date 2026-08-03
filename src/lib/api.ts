import type {
  AspectRatio, Brand, BrandProfileDraft, Campaign, CaptionVariant, ChatMessage, GhlSocialAccount,
  MetaIgAccount, MetaStatus, Platform, Post, PostFormat, ProviderStatus, ViralityReport,
} from '../types';
import { BROLL_CATEGORIES, frameworksPromptBlock, HOOK_FORMULAS, PLATFORM_MATRIX } from './frameworks';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface AuthStatus {
  authConfigured: boolean;
  authenticated: boolean;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return request<AuthStatus>('/api/auth/status');
}

export async function loginWithPassword(password: string): Promise<void> {
  await post('/api/auth/login', { password });
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function getProviders(): Promise<ProviderStatus> {
  return request<ProviderStatus>('/api/providers');
}

export async function chatWithAgent(messages: ChatMessage[]): Promise<string> {
  const { reply } = await post<{ reply: string }>('/api/agent/chat', { messages });
  return reply;
}

export async function getMetaStatus(): Promise<MetaStatus> {
  return request<MetaStatus>('/api/meta/status');
}

export async function getMetaAccounts(): Promise<MetaIgAccount[]> {
  const { accounts } = await request<{ accounts: MetaIgAccount[] }>('/api/meta/accounts');
  return accounts;
}

export async function disconnectMeta(): Promise<void> {
  await request('/api/meta/disconnect', { method: 'POST' });
}

export async function publishNow(postId: string): Promise<Post> {
  const { post } = await request<{ post: Post }>(`/api/posts/${postId}/publish`, { method: 'POST' });
  return post;
}

export async function getGhlAccounts(locationId: string): Promise<GhlSocialAccount[]> {
  const { accounts } = await request<{ accounts: GhlSocialAccount[] }>(`/api/ghl/accounts/${encodeURIComponent(locationId)}`);
  return accounts;
}

export async function syncToGhl(postId: string): Promise<Post> {
  const { post } = await request<{ post: Post }>(`/api/posts/${postId}/sync-ghl`, { method: 'POST' });
  return post;
}

export async function analyzeWebsite(url: string): Promise<BrandProfileDraft> {
  const { brand } = await post<{ brand: BrandProfileDraft }>('/api/analyze-website', { url });
  return {
    name: brand.name || 'New Brand',
    description: brand.description || '',
    toneOfVoice: brand.toneOfVoice || '',
    audience: brand.audience || '',
    topics: Array.isArray(brand.topics) ? brand.topics.slice(0, 8) : [],
    colors: Array.isArray(brand.colors) ? brand.colors.filter(c => /^#[0-9a-fA-F]{3,8}$/.test(c)).slice(0, 4) : [],
  };
}

export async function generateText(prompt: string): Promise<string> {
  const { text } = await post<{ text: string }>('/api/generate-text', { prompt });
  return text;
}

export async function generateImage(prompt: string, aspectRatio: AspectRatio = '1:1'): Promise<string> {
  const { imageUrl } = await post<{ imageUrl: string }>('/api/generate-image', { prompt, aspectRatio });
  return imageUrl;
}

export async function generateVideoPro(input: {
  prompt?: string;
  imageUrl?: string;
  aspectRatio: AspectRatio;
}): Promise<{ videoUrl: string; provider: string }> {
  return post<{ videoUrl: string; provider: string }>('/api/generate-video-pro', input);
}

export interface GeneratedPostSeed {
  format: PostFormat;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  platform: Platform;
  dayOffset: number;
  time: string;
  slides?: { heading: string; body: string; imagePrompt: string }[];
  video?: {
    hook: string;
    script: string;
    style: string;
    scenes: { category: string; description: string; imagePrompt: string; duration: number }[];
  };
}

function extractJson(text: string, open: string, close: string): string {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = cleaned.indexOf(open);
  const end = cleaned.lastIndexOf(close);
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON in AI response');
  return cleaned.slice(start, end + 1);
}

const extractJsonArray = (text: string): unknown[] => JSON.parse(extractJson(text, '[', ']'));
const extractJsonObject = (text: string): Record<string, unknown> => JSON.parse(extractJson(text, '{', '}'));

const VALID_CATEGORIES = new Set(BROLL_CATEGORIES.map(c => c.id));

export async function generateCampaignPosts(
  brand: Brand,
  campaign: Campaign,
  counts: { post: number; carousel: number; video: number },
): Promise<GeneratedPostSeed[]> {
  const total = counts.post + counts.carousel + counts.video;
  const prompt = `You are the AI content engine for a social media automation platform.

BRAND PROFILE
Name: ${brand.name}
Website: ${brand.website}
Description: ${brand.description}
Tone of voice: ${brand.toneOfVoice}
Audience: ${brand.audience}
${brand.deepKnowledge ? `Deep knowledge from the brand:\n${brand.deepKnowledge}` : ''}

CAMPAIGN BRIEF
Name: ${campaign.name}
Goal: ${campaign.goal}
Topics to rotate through: ${campaign.topics.join(', ')}
Platforms: ${campaign.platforms.join(', ')}
Duration: ${campaign.durationDays} days

${frameworksPromptBlock({
    hookFormula: campaign.hookFormula,
    scriptFramework: campaign.scriptFramework,
    videoStyle: campaign.videoStyle,
    platforms: campaign.platforms,
  })}

TASK
Write exactly ${counts.post} single-image posts, ${counts.carousel} carousels, and ${counts.video} videos (${total} items total) in the brand's voice.
Spread dayOffset values evenly from 0 to ${campaign.durationDays - 1}. Vary platforms across: ${campaign.platforms.join(', ')}.
- Every caption opens with one of the hook formulas.
- Carousels: 5-7 slides. Slide 1 is a scroll-stopping hook headline; middle slides each deliver ONE concrete value point; last slide is a CTA. Each slide gets a text-free imagePrompt using brand colors (${brand.colors.join(', ')}).
- Videos: "hook" is a spoken opening line of 8 words or less (the first 2 seconds must earn attention); "script" is a voiceover of 80 words or less following the framework beats; 3-6 scenes, each with a "category" from [${BROLL_CATEGORIES.map(c => c.id).join('|')}], a one-line description, a cinematic text-free imagePrompt (camera move, lens, lighting, subject, brand colors), and a duration of 2-8 seconds.
- Every imagePrompt must describe a striking, text-free visual.

Respond with ONLY a raw JSON array (no markdown, no commentary) of ${total} objects:
[{"format": "post"|"carousel"|"video", "caption": string, "hashtags": string[], "imagePrompt": string, "platform": string, "dayOffset": number, "time": "HH:MM",
  "slides": [{"heading": string, "body": string, "imagePrompt": string}]  // carousels only
, "video": {"hook": string, "script": string, "style": string, "scenes": [{"category": string, "description": string, "imagePrompt": string, "duration": number}]}  // videos only
}]`;

  const text = await generateText(prompt);
  const raw = extractJsonArray(text);
  const platforms = new Set(campaign.platforms);

  return raw.slice(0, total).map((item, i) => {
    const p = item as Partial<GeneratedPostSeed>;
    const platform = platforms.has(p.platform as Platform)
      ? (p.platform as Platform)
      : campaign.platforms[i % campaign.platforms.length];

    let format: PostFormat = p.format === 'carousel' || p.format === 'video' ? p.format : 'post';
    let slides: GeneratedPostSeed['slides'];
    let video: GeneratedPostSeed['video'];

    if (format === 'carousel') {
      const rawSlides = Array.isArray(p.slides) ? p.slides.filter(s => s && typeof s === 'object') : [];
      if (rawSlides.length >= 3) {
        slides = rawSlides.slice(0, 7).map((s, si) => ({
          heading: typeof s.heading === 'string' ? s.heading : `Slide ${si + 1}`,
          body: typeof s.body === 'string' ? s.body : '',
          imagePrompt: typeof s.imagePrompt === 'string' ? s.imagePrompt : `Graphic for ${brand.name}, brand colors ${brand.colors.join(', ')}`,
        }));
      } else {
        format = 'post'; // malformed carousel payload -> downgrade
      }
    }

    if (format === 'video') {
      const v = p.video;
      const rawScenes = v && Array.isArray(v.scenes) ? v.scenes.filter(s => s && typeof s === 'object') : [];
      if (v && rawScenes.length >= 2) {
        video = {
          hook: typeof v.hook === 'string' ? v.hook : `The truth about ${campaign.topics[0] ?? 'this'}`,
          script: typeof v.script === 'string' ? v.script : '',
          style: typeof v.style === 'string' ? v.style : 'ugc-testimonial',
          scenes: rawScenes.slice(0, 6).map(s => ({
            category: VALID_CATEGORIES.has(String(s.category)) ? String(s.category) : 'product',
            description: typeof s.description === 'string' ? s.description : '',
            imagePrompt: typeof s.imagePrompt === 'string' ? s.imagePrompt : `Cinematic shot for ${brand.name}`,
            duration: typeof s.duration === 'number' ? Math.max(2, Math.min(8, Math.round(s.duration))) : 4,
          })),
        };
      } else {
        format = 'post'; // malformed video payload -> downgrade
      }
    }

    return {
      format,
      caption: typeof p.caption === 'string' ? p.caption : `Post ${i + 1} for ${brand.name}`,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map(String).slice(0, 8) : [],
      imagePrompt: typeof p.imagePrompt === 'string'
        ? p.imagePrompt
        : `Social media graphic for ${brand.name}, brand colors ${brand.colors.join(', ')}`,
      platform,
      dayOffset: typeof p.dayOffset === 'number'
        ? Math.max(0, Math.min(campaign.durationDays - 1, Math.round(p.dayOffset)))
        : Math.floor((i / total) * campaign.durationDays),
      time: typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time) ? p.time : '09:00',
      slides,
      video,
    };
  });
}

export async function predictVirality(postItem: Post, brand: Brand): Promise<ViralityReport> {
  const detail = postItem.format === 'video'
    ? `Video hook: "${postItem.video?.hook}". Script: ${postItem.video?.script}`
    : postItem.format === 'carousel'
      ? `Carousel slides: ${postItem.slides?.map(s => s.heading).join(' | ')}`
      : '';
  const text = await generateText(
    `You are a social media performance analyst. Rate this ${postItem.format} for ${postItem.platform} (audience: ${brand.audience}; platform norms: ${PLATFORM_MATRIX[postItem.platform].tone}).

Caption: ${postItem.caption}
Hashtags: ${postItem.hashtags.join(' ')}
${detail}

Respond with ONLY a raw JSON object:
{"score": <0-100 integer virality prediction>, "hookStrength": "<one sentence on the opening line>", "platformFit": "<one sentence on platform fit>", "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]}`,
  );
  const raw = extractJsonObject(text);
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    hookStrength: typeof raw.hookStrength === 'string' ? raw.hookStrength : 'No analysis available.',
    platformFit: typeof raw.platformFit === 'string' ? raw.platformFit : 'No analysis available.',
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String).slice(0, 4) : [],
  };
}

export async function generateVariants(postItem: Post, brand: Brand): Promise<CaptionVariant[]> {
  const formulas = HOOK_FORMULAS.slice(0, 3);
  const text = await generateText(
    `Rewrite this ${postItem.platform} caption for ${brand.name} (tone: ${brand.toneOfVoice}) three times, once per hook formula. Keep the core message; keep each under 60 words.

Original caption: ${postItem.caption}

Formulas:
${formulas.map(f => `- ${f.id} (${f.name}): ${f.pattern}`).join('\n')}

Respond with ONLY a raw JSON array:
[{"hookId": "${formulas.map(f => f.id).join('"|"')}", "caption": string}]`,
  );
  const raw = extractJsonArray(text);
  return raw.slice(0, 3).map((item, i) => {
    const v = item as { hookId?: string; caption?: string };
    const formula = formulas.find(f => f.id === v.hookId) ?? formulas[i % formulas.length];
    return {
      hookId: formula.id,
      hookName: formula.name,
      caption: typeof v.caption === 'string' ? v.caption : postItem.caption,
    };
  });
}

export async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const idx = next++;
      try {
        await tasks[idx]();
      } catch {
        // Individual task failures are handled by the task itself.
      }
    }
  });
  await Promise.all(workers);
}
