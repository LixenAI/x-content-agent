import type { Brand, Campaign, Post, AgencySettings, IntegrationId } from '../types';

const KEYS = {
  brands: 'bb_brands',
  campaigns: 'bb_campaigns',
  postsMeta: 'bb_posts_meta',
  images: 'bb_images',
  activeBrand: 'bb_active_brand',
  settings: 'bb_settings',
  integrations: 'bb_integrations',
} as const;

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to persist ${key}`, err);
  }
}

export const loadBrands = () => load<Brand[]>(KEYS.brands, []);
export const saveBrands = (brands: Brand[]) => save(KEYS.brands, brands);

export const loadCampaigns = () => load<Campaign[]>(KEYS.campaigns, []);
export const saveCampaigns = (campaigns: Campaign[]) => save(KEYS.campaigns, campaigns);

export const loadActiveBrand = () => load<string | null>(KEYS.activeBrand, null);
export const saveActiveBrand = (id: string | null) => save(KEYS.activeBrand, id);

export const loadSettings = (fallback: AgencySettings) => load<AgencySettings>(KEYS.settings, fallback);
export const saveSettings = (settings: AgencySettings) => save(KEYS.settings, settings);

export const loadIntegrations = () => load<IntegrationId[]>(KEYS.integrations, []);
export const saveIntegrations = (ids: IntegrationId[]) => save(KEYS.integrations, ids);

// Posts are stored as metadata (small) + a media map (large, evictable) so a
// localStorage quota failure only costs media, never the posts themselves.
// Media map keys: `{id}` post image, `{id}:s{i}` slide i, `{id}:kf` video
// keyframe, `{id}:v` video (data URLs only — remote/proxy URLs stay in meta).
type ImageMap = Record<string, string>;

// Tiny inline SVG placeholders stay in metadata; every other data URL
// (Gemini/Pollinations images, keyframes) moves to the evictable map.
const isHeavy = (url: string | null | undefined): url is string =>
  !!url && url.startsWith('data:') && !url.startsWith('data:image/svg');

export function loadPosts(): Post[] {
  const meta = load<Post[]>(KEYS.postsMeta, []);
  const images = load<ImageMap>(KEYS.images, {});
  return meta.map(p => ({
    ...p,
    format: p.format ?? 'post', // migrate pre-format posts
    imageUrl: images[p.id] ?? p.imageUrl ?? null,
    slides: p.slides?.map((s, i) => ({ ...s, imageUrl: images[`${p.id}:s${i}`] ?? s.imageUrl ?? null })),
    video: p.video
      ? {
          ...p.video,
          keyframeUrl: images[`${p.id}:kf`] ?? p.video.keyframeUrl ?? null,
          videoUrl: images[`${p.id}:v`] ?? p.video.videoUrl ?? null,
        }
      : undefined,
  }));
}

export function savePosts(posts: Post[]) {
  const images: ImageMap = {};
  const meta = posts.map(p => {
    if (isHeavy(p.imageUrl)) images[p.id] = p.imageUrl;
    p.slides?.forEach((s, i) => { if (isHeavy(s.imageUrl)) images[`${p.id}:s${i}`] = s.imageUrl; });
    if (p.video) {
      if (isHeavy(p.video.keyframeUrl)) images[`${p.id}:kf`] = p.video.keyframeUrl;
      if (isHeavy(p.video.videoUrl)) images[`${p.id}:v`] = p.video.videoUrl;
    }
    return {
      ...p,
      imageUrl: isHeavy(p.imageUrl) ? null : p.imageUrl,
      slides: p.slides?.map(s => ({ ...s, imageUrl: isHeavy(s.imageUrl) ? null : s.imageUrl })),
      video: p.video
        ? {
            ...p.video,
            keyframeUrl: isHeavy(p.video.keyframeUrl) ? null : p.video.keyframeUrl,
            videoUrl: isHeavy(p.video.videoUrl) ? null : p.video.videoUrl,
          }
        : undefined,
    };
  });
  save(KEYS.postsMeta, meta);
  saveImagesWithEviction(images, posts);
}

function saveImagesWithEviction(images: ImageMap, posts: Post[]) {
  // Oldest posts' media gets evicted first when we run out of quota.
  const order = [...posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(p => p.id);
  const working = { ...images };
  const keysFor = (id: string) => Object.keys(working).filter(k => k === id || k.startsWith(`${id}:`));
  for (let attempt = 0; attempt <= order.length; attempt++) {
    try {
      localStorage.setItem(KEYS.images, JSON.stringify(working));
      return;
    } catch {
      const victim = order.find(id => keysFor(id).length > 0);
      if (!victim) return;
      keysFor(victim).forEach(k => delete working[k]);
    }
  }
}

export function resetAll() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}
