import type { Brand, BrandProfileDraft, Campaign, Platform } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
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

export async function generateImage(prompt: string): Promise<string> {
  const { imageUrl } = await post<{ imageUrl: string }>('/api/generate-image', { prompt });
  return imageUrl;
}

export interface GeneratedPostSeed {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  platform: Platform;
  dayOffset: number;
  time: string;
}

function extractJsonArray(text: string): unknown[] {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array in AI response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateCampaignPosts(
  brand: Brand,
  campaign: Campaign,
  count: number,
): Promise<GeneratedPostSeed[]> {
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

TASK
Write exactly ${count} social media posts for this campaign in the brand's voice.
Spread dayOffset values evenly from 0 to ${campaign.durationDays - 1}.
Vary the platforms across: ${campaign.platforms.join(', ')}.
Each imagePrompt must describe a striking, text-free social graphic using the brand colors (${brand.colors.join(', ')}).

Respond with ONLY a raw JSON array (no markdown, no commentary) of ${count} objects with this exact shape:
[{"caption": string, "hashtags": string[], "imagePrompt": string, "platform": "${campaign.platforms.join('"|"')}", "dayOffset": number, "time": "HH:MM"}]`;

  const text = await generateText(prompt);
  const raw = extractJsonArray(text);
  const platforms = new Set(campaign.platforms);

  return raw.slice(0, count).map((item, i) => {
    const p = item as Partial<GeneratedPostSeed>;
    return {
      caption: typeof p.caption === 'string' ? p.caption : `Post ${i + 1} for ${brand.name}`,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map(String).slice(0, 8) : [],
      imagePrompt: typeof p.imagePrompt === 'string'
        ? p.imagePrompt
        : `Social media graphic for ${brand.name}, brand colors ${brand.colors.join(', ')}`,
      platform: platforms.has(p.platform as Platform) ? (p.platform as Platform) : campaign.platforms[i % campaign.platforms.length],
      dayOffset: typeof p.dayOffset === 'number'
        ? Math.max(0, Math.min(campaign.durationDays - 1, Math.round(p.dayOffset)))
        : Math.floor((i / count) * campaign.durationDays),
      time: typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time) ? p.time : '09:00',
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
