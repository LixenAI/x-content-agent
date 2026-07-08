import type { Brand, BrandProfileDraft, Campaign, CaptionVariant, Platform, Post, ViralityReport } from '../types';
import { BROLL_CATEGORIES, PLATFORM_MATRIX, resolveFramework, resolveHook, resolveVideoStyle } from './frameworks';

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
  format: 'post' | 'carousel' | 'video';
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

const SLIDE_TIPS = [
  (topic: string) => `Start small: pick one ${topic.toLowerCase()} habit and repeat it daily.`,
  (topic: string) => `Track what works — the numbers around ${topic.toLowerCase()} never lie.`,
  (topic: string) => `Steal from the best: study 3 brands that nail ${topic.toLowerCase()}.`,
  (topic: string) => `Consistency beats intensity. Show up for ${topic.toLowerCase()} every week.`,
];

export function demoCampaignPosts(
  brand: Brand,
  campaign: Campaign,
  counts: { post: number; carousel: number; video: number },
): DemoPostSeed[] {
  const topics = campaign.topics.length ? campaign.topics : ['Tips & how-tos'];
  const platforms = campaign.platforms.length ? campaign.platforms : ['instagram' as Platform];
  const total = counts.post + counts.carousel + counts.video;
  const interval = Math.max(1, Math.floor(campaign.durationDays / Math.max(total, 1)));
  const seeds: DemoPostSeed[] = [];

  const baseSeed = (i: number, topic: string): Omit<DemoPostSeed, 'format'> => ({
    caption: CAPTION_TEMPLATES[i % CAPTION_TEMPLATES.length](brand.name, topic),
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

  for (let i = 0; i < total; i++) {
    const topic = topics[i % topics.length];
    const base = baseSeed(i, topic);

    if (i < counts.post) {
      seeds.push({ format: 'post', ...base });
    } else if (i < counts.post + counts.carousel) {
      // Educational carousel: hook slide -> value slides -> CTA slide.
      const slides = [
        {
          heading: `${3 + (i % 2)} ${topic.toLowerCase()} mistakes everyone makes`,
          body: `Swipe to see what's quietly holding your ${topic.toLowerCase()} back →`,
          imagePrompt: `Bold title card graphic for ${brand.name}, brand colors ${brand.colors.join(', ')}, dramatic minimal design, no text`,
        },
        ...SLIDE_TIPS.slice(0, 3).map((tip, s) => ({
          heading: `Tip ${s + 1}`,
          body: tip(topic),
          imagePrompt: `Clean illustrative graphic about ${topic.toLowerCase()} tip ${s + 1} for ${brand.name}, brand colors ${brand.colors.join(', ')}, flat modern style, no text`,
        })),
        {
          heading: 'Your move',
          body: `Follow ${brand.name} for more ${topic.toLowerCase()} plays — and share this with someone who needs it.`,
          imagePrompt: `Call-to-action closing card for ${brand.name}, brand colors ${brand.colors.join(', ')}, arrow motif, energetic, no text`,
        },
      ];
      seeds.push({
        format: 'carousel',
        ...base,
        caption: `${slides[0].heading} — full breakdown inside. Save this one. 📌`,
        slides,
      });
    } else {
      const style = resolveVideoStyle(campaign.videoStyle, i);
      const hook = resolveHook(campaign.hookFormula, i);
      const framework = resolveFramework(campaign.scriptFramework, i);
      const arc = ['pain', 'failed', 'desired', 'product'];
      const scenes = arc.map((catId, s) => {
        const cat = BROLL_CATEGORIES.find(c => c.id === catId) ?? BROLL_CATEGORIES[0];
        return {
          category: cat.id,
          description: `${cat.purpose} for ${topic.toLowerCase()}`,
          imagePrompt: `${cat.promptHint}, themed around ${topic.toLowerCase()} for ${brand.name}, ${style.visualDirection}, brand colors ${brand.colors.join(', ')}`,
          duration: 3 + (s % 3),
        };
      });
      seeds.push({
        format: 'video',
        ...base,
        caption: `${hook.example.replace(/"/g, '')} Watch till the end. 🎬`,
        video: {
          hook: hook.example.replace(/"/g, ''),
          script: framework.beats.map(b => `${b} — through the lens of ${topic.toLowerCase()} at ${brand.name}.`).join(' '),
          style: style.id,
          scenes,
        },
      });
    }
  }
  return seeds;
}

export function demoVirality(post: Post): ViralityReport {
  let score = 45;
  const suggestions: string[] = [];
  const len = post.caption.length;

  if (len >= 60 && len <= 200) score += 15;
  else suggestions.push(len < 60 ? 'Expand the caption — 60-200 characters performs best.' : 'Tighten the caption to under 200 characters.');

  if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(post.caption)) score += 8;
  else suggestions.push('Add 1-2 emoji to boost scannability.');

  if (post.hashtags.length >= 3 && post.hashtags.length <= 6) score += 10;
  else if (post.hashtags.length > 8) { score -= 5; suggestions.push('Cut back to 3-6 focused hashtags.'); }
  else suggestions.push('Add 3-6 targeted hashtags.');

  if (/^(\d|what|why|how|pov|ever)/i.test(post.caption.trim())) score += 7;
  else suggestions.push('Open with a question, number, or POV to hook faster.');

  if (post.format === 'carousel') score += 8;
  if (post.format === 'video') score += 12;

  score = Math.max(5, Math.min(98, score));
  if (suggestions.length === 0) suggestions.push('Strong post — consider an A/B variant to test a bolder hook.');
  return {
    score,
    hookStrength: score >= 70 ? 'Strong opener — earns the pause.' : score >= 45 ? 'Decent hook, could be sharper in the first line.' : 'Weak hook — the first line needs a pattern interrupt.',
    platformFit: `${PLATFORM_MATRIX[post.platform].tone} — ${post.format} content suits ${post.platform} well.`,
    suggestions: suggestions.slice(0, 4),
  };
}

export function demoVariants(post: Post): CaptionVariant[] {
  const core = post.caption.replace(/^[^a-zA-Z0-9]*/, '').split(/[.!?]/)[0].slice(0, 90);
  return [
    { hookId: 'pattern-interrupt', hookName: 'Pattern Interrupt', caption: `Stop scrolling. ${core} — and almost nobody talks about it. 👀` },
    { hookId: 'question', hookName: 'Question', caption: `What if ${core.charAt(0).toLowerCase()}${core.slice(1)}? Here's the honest answer. 💬` },
    { hookId: 'bold-claim', hookName: 'Bold Claim', caption: `${core} — this is the single highest-leverage move you can make this month. 🔥` },
  ];
}

export function animatedVideoPlaceholder(brand: Brand, seed: number): string {
  const colors = brand.colors.length >= 2 ? brand.colors : ['#7C3AED', '#4F46E5'];
  const c1 = colors[seed % colors.length];
  const c2 = colors[(seed + 1) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g"><stop offset="0%" stop-color="${c1}"><animate attributeName="stop-color" values="${c1};${c2};${c1}" dur="4s" repeatCount="indefinite"/></stop>` +
    `<stop offset="100%" stop-color="${c2}"><animate attributeName="stop-color" values="${c2};${c1};${c2}" dur="4s" repeatCount="indefinite"/></stop>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<circle cx="200" cy="200" r="52" fill="rgba(255,255,255,0.25)"/>` +
    `<polygon points="185,175 185,225 230,200" fill="#fff"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
