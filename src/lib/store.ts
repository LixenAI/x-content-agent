// Server-first persistence via /api/state and per-record PUT/DELETE endpoints.
// A small sessionStorage warm cache keeps first paint instant while the
// initial /api/state call resolves.
import type { AgencySettings, Brand, Campaign, IntegrationId, Post } from '../types';

const CACHE_KEY = 'cpa_snapshot_cache';

export interface AppSnapshot {
  brands: Brand[];
  campaigns: Campaign[];
  posts: Post[];
  activeBrandId: string | null;
  settings: AgencySettings | null;
  integrations: IntegrationId[];
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadState(): Promise<AppSnapshot> {
  return jsonFetch<AppSnapshot>('/api/state');
}

export function loadCachedSnapshot(): AppSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppSnapshot) : null;
  } catch { return null; }
}

export function cacheSnapshot(snapshot: AppSnapshot) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* ignore quota */ }
}

const put = <T>(path: string, body: unknown) =>
  jsonFetch<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const del = (path: string) => jsonFetch<{ ok: true }>(path, { method: 'DELETE' });

export const saveBrand = (brand: Brand) => put(`/api/brands/${brand.id}`, brand);
export const deleteBrand = (id: string) => del(`/api/brands/${id}`);
export const saveCampaign = (campaign: Campaign) => put(`/api/campaigns/${campaign.id}`, campaign);
export const deleteCampaign = (id: string) => del(`/api/campaigns/${id}`);
export const savePost = (post: Post) => put(`/api/posts/${post.id}`, post);
export const deletePost = (id: string) => del(`/api/posts/${id}`);
export const saveKV = (key: string, value: unknown) => put(`/api/kv/${key}`, { value });
export const resetAll = () => jsonFetch('/api/reset', { method: 'POST' });

// Coalesce rapid writes to the same record (e.g. caption typing) into one
// network request per key. Last write wins.
export function debouncedPerKey<T>(fn: (arg: T) => Promise<unknown>, keyFn: (arg: T) => string, ms = 400) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const latest = new Map<string, T>();
  return (arg: T) => {
    const key = keyFn(arg);
    latest.set(key, arg);
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(key, setTimeout(() => {
      const value = latest.get(key)!;
      latest.delete(key);
      timers.delete(key);
      fn(value).catch(err => console.warn(`Save failed for ${key}:`, err));
    }, ms));
  };
}
