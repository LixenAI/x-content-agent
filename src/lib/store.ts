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

// Posts are stored as metadata (small) + an image map (large, evictable) so a
// localStorage quota failure only costs images, never the posts themselves.
type ImageMap = Record<string, string>;

export function loadPosts(): Post[] {
  const meta = load<Post[]>(KEYS.postsMeta, []);
  const images = load<ImageMap>(KEYS.images, {});
  return meta.map(p => ({ ...p, imageUrl: images[p.id] ?? p.imageUrl ?? null }));
}

export function savePosts(posts: Post[]) {
  const meta = posts.map(p => ({
    ...p,
    // Keep tiny inline SVG placeholders in metadata; strip real generated images.
    imageUrl: p.imageUrl && p.imageUrl.startsWith('data:image/svg') ? p.imageUrl : null,
  }));
  save(KEYS.postsMeta, meta);

  const images: ImageMap = {};
  for (const p of posts) {
    if (p.imageUrl && !p.imageUrl.startsWith('data:image/svg')) images[p.id] = p.imageUrl;
  }
  saveImagesWithEviction(images, posts);
}

function saveImagesWithEviction(images: ImageMap, posts: Post[]) {
  // Oldest posts' images get evicted first when we run out of quota.
  const order = [...posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(p => p.id);
  const working = { ...images };
  for (let attempt = 0; attempt <= order.length; attempt++) {
    try {
      localStorage.setItem(KEYS.images, JSON.stringify(working));
      return;
    } catch {
      const victim = order.find(id => working[id]);
      if (!victim) return;
      delete working[victim];
    }
  }
}

export function resetAll() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}
