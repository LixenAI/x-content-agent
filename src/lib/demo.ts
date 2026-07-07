import type { Brand, BrandProfileDraft, Campaign, Platform } from '../types';

export function demoBrandProfile(url: string): BrandProfileDraft {
  let host = 'yourbrand.com';
  try {
    host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch { /* keep fallback */ }
  const base = host.split('.')[0];
  const name = base.charAt(0).toUpperCase() + base.slice(1);
  return {
    name,
    description: `${name} helps modern customers get more done with a product they love. (Demo profile — connect a Gemini API key to analyze the real website.)`,
    toneOfVoice: 'Friendly, confident, and helpful — speaks like a smart friend, not a corporation.',
    audience: 'Small business owners and marketing teams looking to grow online.',
    topics: ['Behind the scenes', 'Customer wins', 'Tips & how-tos', 'Product highlights', 'Industry trends'],
    colors: ['#7C3AED', '#4F46E5', '#F59E0B'],
  };
}

interface DemoPostSeed {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  platform: Platform;
  dayOffset: number;
  time: string;
}

const CAPTION_TEMPLATES = [
  (brand: string, topic: string) =>
    `Ever wondered how ${brand} approaches ${topic.toLowerCase()}? Here's a peek behind the curtain — and why it matters for you. 👀`,
  (brand: string, topic: string) =>
    `3 things we've learned about ${topic.toLowerCase()} (the hard way) so you don't have to. Save this one. 📌`,
  (brand: string, topic: string) =>
    `Hot take: ${topic} isn't optional anymore. Here's how the ${brand} team makes it effortless. 🔥`,
  (brand: string, topic: string) =>
    `The ${brand} guide to ${topic.toLowerCase()} — simple steps, real results. Which one are you trying first? 💬`,
  (brand: string, topic: string) =>
    `We asked our community about ${topic.toLowerCase()} and the answers surprised us. Thread below 🧵`,
];

const POST_TIMES = ['09:00', '12:30', '17:00'];

export function demoCampaignPosts(brand: Brand, campaign: Campaign, count: number): DemoPostSeed[] {
  const topics = campaign.topics.length ? campaign.topics : ['Tips & how-tos'];
  const platforms = campaign.platforms.length ? campaign.platforms : ['instagram' as Platform];
  const interval = Math.max(1, Math.floor(campaign.durationDays / Math.max(count, 1)));
  const seeds: DemoPostSeed[] = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const template = CAPTION_TEMPLATES[i % CAPTION_TEMPLATES.length];
    seeds.push({
      caption: template(brand.name, topic),
      hashtags: [
        `#${brand.name.replace(/\s+/g, '')}`,
        `#${topic.replace(/[^a-zA-Z0-9]/g, '')}`,
        '#SmallBusiness',
        '#GrowthTips',
      ],
      imagePrompt: `Modern, vibrant social media graphic for ${brand.name} about "${topic}", brand colors ${brand.colors.join(', ')}, clean minimal design, no text`,
      platform: platforms[i % platforms.length],
      dayOffset: Math.min(i * interval, campaign.durationDays - 1),
      time: POST_TIMES[i % POST_TIMES.length],
    });
  }
  return seeds;
}

export function placeholderImage(brand: Brand, seed: number): string {
  const colors = brand.colors.length >= 2 ? brand.colors : ['#7C3AED', '#4F46E5'];
  const c1 = colors[seed % colors.length];
  const c2 = colors[(seed + 1) % colors.length];
  const initial = (brand.name.charAt(0) || 'B').toUpperCase();
  const angle = (seed * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<circle cx="${80 + (seed * 53) % 240}" cy="${80 + (seed * 91) % 240}" r="120" fill="rgba(255,255,255,0.12)"/>` +
    `<text x="200" y="228" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="rgba(255,255,255,0.85)" text-anchor="middle">${initial}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface DemoAnalytics {
  stats: { label: string; value: string; delta: string }[];
  weekly: { label: string; reach: number; engagement: number }[];
  platformSplit: { platform: Platform; pct: number }[];
}

export function demoAnalytics(): DemoAnalytics {
  return {
    stats: [
      { label: 'Total Reach', value: '48.2K', delta: '+12.4%' },
      { label: 'Engagement Rate', value: '5.8%', delta: '+0.9%' },
      { label: 'New Followers', value: '1,204', delta: '+18.2%' },
      { label: 'Link Clicks', value: '3,417', delta: '+7.1%' },
    ],
    weekly: [
      { label: 'W1', reach: 6200, engagement: 310 },
      { label: 'W2', reach: 8400, engagement: 460 },
      { label: 'W3', reach: 7100, engagement: 380 },
      { label: 'W4', reach: 9800, engagement: 610 },
      { label: 'W5', reach: 11400, engagement: 720 },
      { label: 'W6', reach: 10500, engagement: 640 },
    ],
    platformSplit: [
      { platform: 'instagram', pct: 42 },
      { platform: 'facebook', pct: 26 },
      { platform: 'tiktok', pct: 19 },
      { platform: 'linkedin', pct: 13 },
    ],
  };
}
