import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// The db file lives next to the server binary so dev (tsx server.ts) and
// prod (dist/server.mjs) both find the same one when run from repo root.
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data.db");

let dbInstance: Database.Database | null = null;

export function db(): Database.Database {
  if (dbInstance) return dbInstance;
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      campaign_id TEXT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS media (
      key TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      data_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_brand ON posts(brand_id);
    CREATE INDEX IF NOT EXISTS idx_media_post ON media(post_id);
  `);
  return dbInstance;
}

// Tiny inline SVG placeholders stay in the post JSON; large data URLs move
// to the media table so a single row read stays cheap.
const isHeavy = (url: string | null | undefined): url is string =>
  !!url && url.startsWith("data:") && !url.startsWith("data:image/svg");

interface PostMedia {
  imageUrl?: string | null;
  slides?: { imageUrl?: string | null }[];
  video?: { keyframeUrl?: string | null; videoUrl?: string | null };
}

export function splitMedia(post: PostMedia & { id: string }): { media: { key: string; url: string }[]; strippedPost: PostMedia } {
  const media: { key: string; url: string }[] = [];
  const strip = <T extends PostMedia>(p: T): T => {
    const out: PostMedia = { ...p };
    if (isHeavy(p.imageUrl)) { media.push({ key: post.id, url: p.imageUrl! }); out.imageUrl = null; }
    if (p.slides) {
      out.slides = p.slides.map((s, i) => {
        if (isHeavy(s.imageUrl)) { media.push({ key: `${post.id}:s${i}`, url: s.imageUrl! }); return { ...s, imageUrl: null }; }
        return s;
      });
    }
    if (p.video) {
      const v = { ...p.video };
      if (isHeavy(p.video.keyframeUrl)) { media.push({ key: `${post.id}:kf`, url: p.video.keyframeUrl! }); v.keyframeUrl = null; }
      if (isHeavy(p.video.videoUrl)) { media.push({ key: `${post.id}:v`, url: p.video.videoUrl! }); v.videoUrl = null; }
      out.video = v;
    }
    return out as T;
  };
  return { media, strippedPost: strip(post) };
}

export function attachMedia<T extends PostMedia & { id: string }>(post: T, mediaByKey: Map<string, string>): T {
  const withImage = mediaByKey.get(post.id);
  const out: T = { ...post };
  if (withImage) out.imageUrl = withImage;
  if (post.slides) {
    out.slides = post.slides.map((s, i) => {
      const url = mediaByKey.get(`${post.id}:s${i}`);
      return url ? { ...s, imageUrl: url } : s;
    });
  }
  if (post.video) {
    const kf = mediaByKey.get(`${post.id}:kf`);
    const v = mediaByKey.get(`${post.id}:v`);
    if (kf || v) out.video = { ...post.video, ...(kf ? { keyframeUrl: kf } : {}), ...(v ? { videoUrl: v } : {}) };
  }
  return out;
}
