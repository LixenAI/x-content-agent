// Meta Graph API integration: OAuth, IG account discovery, and publishing.
// All request shapes follow the documented Instagram Content Publishing API.
// Publishing requires media at PUBLIC https URLs — Meta's servers fetch them.
import type { Post, SocialAccount } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface MetaConnectionRecord {
  accessToken: string;
  expiresAt: string;
  name: string;
}

export interface MetaIgAccount {
  igUserId: string;
  pageId: string;
  pageName: string;
  username: string;
  avatarUrl?: string;
}

export const metaConfigured = () => !!process.env.META_APP_ID && !!process.env.META_APP_SECRET;

export function appUrl(): string {
  const url = process.env.APP_URL;
  if (url && url !== "MY_APP_URL") return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

const redirectUri = () => `${appUrl()}/api/meta/callback`;

export function loginUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri(),
    scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API ${path} failed (${res.status})`);
  }
  return data as T;
}

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API ${path} failed (${res.status})`);
  }
  return data as T;
}

export async function exchangeCode(code: string): Promise<MetaConnectionRecord> {
  // code -> short-lived user token
  const short = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri(),
    code,
  });
  // short-lived -> long-lived (~60 days)
  const long = await graphGet<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: short.access_token,
  });
  const me = await graphGet<{ name?: string }>("/me", { fields: "name", access_token: long.access_token });
  const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 24 * 3600) * 1000).toISOString();
  return { accessToken: long.access_token, expiresAt, name: me.name ?? "Meta user" };
}

export async function listIgAccounts(token: string): Promise<MetaIgAccount[]> {
  const res = await graphGet<{
    data: { id: string; name: string; instagram_business_account?: { id: string; username?: string; profile_picture_url?: string } }[];
  }>("/me/accounts", {
    fields: "id,name,instagram_business_account{id,username,profile_picture_url}",
    limit: "100",
    access_token: token,
  });
  return (res.data ?? [])
    .filter(page => page.instagram_business_account?.id)
    .map(page => ({
      igUserId: page.instagram_business_account!.id,
      pageId: page.id,
      pageName: page.name,
      username: page.instagram_business_account!.username ?? page.name,
      avatarUrl: page.instagram_business_account!.profile_picture_url,
    }));
}

// ---------- Publishing ----------

function publicMediaUrl(key: string): string {
  return `${appUrl()}/media/${encodeURIComponent(key)}`;
}

function assertPubliclyReachable() {
  if (appUrl().includes("localhost") || appUrl().includes("127.0.0.1")) {
    throw new Error("Deploy the app or set APP_URL to a public https origin — Meta must be able to fetch your images.");
  }
}

function captionFor(post: Post): string {
  const tags = post.hashtags.length ? `\n\n${post.hashtags.join(" ")}` : "";
  return `${post.caption}${tags}`.slice(0, 2200);
}

// Resolve the URL Meta should fetch for a piece of media. Remote https URLs
// pass through; data URLs map to the /media/:key public route; server-relative
// paths (Veo proxy) are made absolute.
function resolveMediaUrl(url: string | null | undefined, mediaKey: string): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${appUrl()}${url}`;
  if (url.startsWith("data:image/svg")) return null; // placeholders are not publishable
  if (url.startsWith("data:")) return publicMediaUrl(mediaKey);
  return null;
}

async function waitForContainer(igUserId: string, creationId: string, token: string): Promise<void> {
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const status = await graphGet<{ status_code?: string }>(`/${creationId}`, {
      fields: "status_code",
      access_token: token,
    });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") throw new Error("Media container processing failed");
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Media container processing timed out");
}

export interface PublishResult {
  mediaId: string;
  permalink: string | null;
}

export async function publishToInstagram(post: Post, account: SocialAccount, token: string): Promise<PublishResult> {
  if (!account.igUserId) throw new Error("Account has no linked Instagram Business id");
  assertPubliclyReachable();
  const ig = account.igUserId;
  const caption = captionFor(post);
  let creationId: string;

  if (post.format === 'carousel' && post.slides?.length) {
    const childIds: string[] = [];
    for (let i = 0; i < Math.min(post.slides.length, 10); i++) {
      const url = resolveMediaUrl(post.slides[i].imageUrl, `${post.id}:s${i}`);
      if (!url) continue;
      const child = await graphPost<{ id: string }>(`/${ig}/media`, {
        image_url: url,
        is_carousel_item: "true",
        access_token: token,
      });
      childIds.push(child.id);
    }
    if (childIds.length < 2) throw new Error("Carousel needs at least 2 slides with generated (non-placeholder) images");
    const container = await graphPost<{ id: string }>(`/${ig}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    });
    creationId = container.id;
  } else if (post.format === 'video' && post.video) {
    const videoUrl = resolveMediaUrl(post.video.videoUrl, `${post.id}:v`);
    if (!videoUrl || post.video.videoUrl?.startsWith("data:")) {
      throw new Error("Video is not publicly hosted — generate it via Kling/Higgsfield/Veo first");
    }
    const container = await graphPost<{ id: string }>(`/${ig}/media`, {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: token,
    });
    creationId = container.id;
    await waitForContainer(ig, creationId, token); // videos process asynchronously
  } else {
    const imageUrl = resolveMediaUrl(post.imageUrl, post.id);
    if (!imageUrl) throw new Error("Post has no publishable image — generate an AI image first (placeholders can't be published)");
    const container = await graphPost<{ id: string }>(`/${ig}/media`, {
      image_url: imageUrl,
      caption,
      access_token: token,
    });
    creationId = container.id;
  }

  const published = await graphPost<{ id: string }>(`/${ig}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });

  let permalink: string | null = null;
  try {
    const info = await graphGet<{ permalink?: string }>(`/${published.id}`, {
      fields: "permalink",
      access_token: token,
    });
    permalink = info.permalink ?? null;
  } catch { /* permalink is nice-to-have */ }

  return { mediaId: published.id, permalink };
}
