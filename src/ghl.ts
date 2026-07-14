// GoHighLevel Social Planner integration. One Private Integration Token
// covers every social channel connected inside GHL — the app pushes posts
// into the planner and GHL handles the actual publishing at schedule time.
// Response shapes verified against a live GHL location.
import type { Post } from "./types";
import { appUrl } from "./meta";

const GHL_BASE = "https://services.leadconnectorhq.com";

export const ghlConfigured = () => !!process.env.GHL_API_TOKEN;

const ghlHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
  Version: "2021-07-28",
  "Content-Type": "application/json",
  Accept: "application/json",
});

async function ghlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GHL_BASE}${path}`, { ...init, headers: { ...ghlHeaders(), ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any).message ?? (data as any).error ?? `GHL API ${path} failed (${res.status})`;
    throw new Error(Array.isArray(msg) ? msg.join('; ') : String(msg));
  }
  return data as T;
}

export interface GhlSocialAccount {
  id: string;
  platform: string;
  name: string;
  avatar?: string;
}

export async function listSocialAccounts(locationId: string): Promise<GhlSocialAccount[]> {
  const data = await ghlFetch<any>(`/social-media-posting/${encodeURIComponent(locationId)}/accounts`);
  const accounts = data.results?.accounts ?? data.accounts ?? [];
  return accounts
    .filter((a: any) => !a.deleted && !a.isExpired)
    .map((a: any) => ({
      id: String(a.id),
      platform: String(a.platform ?? 'unknown'),
      name: String(a.name ?? a.id),
      avatar: typeof a.avatar === 'string' ? a.avatar : undefined,
    }));
}

// GHL's create-post requires a userId; resolve the first user of the
// location once and cache it (override with GHL_USER_ID).
const userIdCache = new Map<string, string>();

export async function resolveUserId(locationId: string): Promise<string> {
  if (process.env.GHL_USER_ID) return process.env.GHL_USER_ID;
  const cached = userIdCache.get(locationId);
  if (cached) return cached;
  const data = await ghlFetch<any>(`/users/?locationId=${encodeURIComponent(locationId)}`);
  const users = data.users ?? data.results ?? [];
  const id = users[0]?.id;
  if (!id) throw new Error("No GHL user found for this location — set GHL_USER_ID in env.");
  userIdCache.set(locationId, id);
  return id;
}

// Resolve the URL GHL should fetch for a piece of media (same rules as the
// Meta path): remote https passes through, data URLs map to the public
// /media/:key route, SVG placeholders are not publishable.
function resolveMediaUrl(url: string | null | undefined, mediaKey: string): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${appUrl()}${url}`;
  if (url.startsWith("data:image/svg")) return null;
  if (url.startsWith("data:")) return `${appUrl()}/media/${encodeURIComponent(mediaKey)}`;
  return null;
}

function assertPubliclyReachable() {
  if (appUrl().includes("localhost") || appUrl().includes("127.0.0.1")) {
    throw new Error("Deploy the app or set APP_URL to a public https origin — GHL must be able to fetch your media.");
  }
}

export interface GhlPlannerResult {
  ghlPostId: string;
  publishedNow: boolean;
}

export async function createPlannerPost(post: Post, locationId: string, accountIds: string[]): Promise<GhlPlannerResult> {
  if (accountIds.length === 0) throw new Error("No GHL-linked social accounts for this brand.");
  assertPubliclyReachable();

  const media: { url: string }[] = [];
  if (post.format === 'carousel' && post.slides?.length) {
    post.slides.forEach((s, i) => {
      const url = resolveMediaUrl(s.imageUrl, `${post.id}:s${i}`);
      if (url) media.push({ url });
    });
  } else if (post.format === 'video' && post.video) {
    const url = resolveMediaUrl(post.video.videoUrl, `${post.id}:v`);
    if (url) media.push({ url });
  } else {
    const url = resolveMediaUrl(post.imageUrl, post.id);
    if (url) media.push({ url });
  }
  if (media.length === 0) {
    throw new Error("No publishable media — generate real images/video first (placeholders can't be published).");
  }

  const userId = await resolveUserId(locationId);
  const isFuture = new Date(post.scheduledAt).getTime() > Date.now() + 60_000;
  const tags = post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : '';

  const body: Record<string, unknown> = {
    accountIds,
    type: post.format === 'video' ? 'reel' : 'post',
    userId,
    status: isFuture ? 'scheduled' : 'published',
    summary: `${post.caption}${tags}`,
    media,
  };
  if (isFuture) body.scheduleDate = new Date(post.scheduledAt).toISOString();

  const data = await ghlFetch<any>(`/social-media-posting/${encodeURIComponent(locationId)}/posts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const ghlPostId = data.post?.id ?? data.post?._id ?? data.id ?? data._id;
  if (!ghlPostId) throw new Error("GHL created the post but returned no id.");
  return { ghlPostId: String(ghlPostId), publishedNow: !isFuture };
}
