// Single-tenant password gate.
//
// The app has no user model — one shared password (APP_PASSWORD) unlocks the
// whole workspace, which matches how it's actually used: one operator running
// their own agency. Login exchanges the password for an HMAC-signed session
// cookie; nothing about the session lives server-side, so restarts and redeploys
// don't sign anyone out.
//
// Fails CLOSED in production: with no APP_PASSWORD set, protected routes return
// 503 rather than serving an open app, so a missing env var can't silently
// expose the workspace and everything it can publish to.
import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db";

const COOKIE_NAME = "cpa_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const authConfigured = () => !!process.env.APP_PASSWORD;
const isProduction = () => process.env.NODE_ENV === "production";

// Signing key: an explicit SESSION_SECRET wins; otherwise generate one and keep
// it in the kv table on the persistent disk so existing cookies stay valid
// across restarts. Regenerating per boot would sign everyone out on redeploy.
let cachedSecret: string | null = null;
function sessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET) {
    cachedSecret = process.env.SESSION_SECRET;
    return cachedSecret;
  }
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get("session_secret") as { value: string } | undefined;
  if (row) {
    cachedSecret = JSON.parse(row.value) as string;
    return cachedSecret;
  }
  const generated = crypto.randomBytes(32).toString("hex");
  db().prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run("session_secret", JSON.stringify(generated));
  cachedSecret = generated;
  return cachedSecret;
}

// Length-independent comparison: hash both sides first so timingSafeEqual never
// sees mismatched buffer lengths (which would throw and leak length via the
// error path).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function issueToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 1) return false;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

function setSessionCookie(res: Response, token: string) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  // Secure would make the cookie unusable over plain-http localhost dev.
  if (isProduction()) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function clearSessionCookie(res: Response) {
  const attrs = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isProduction()) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export const isAuthed = (req: Request): boolean => tokenValid(readCookie(req, COOKIE_NAME));

export function login(res: Response, password: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !safeEqual(password, expected)) return false;
  setSessionCookie(res, issueToken());
  return true;
}

export function logout(res: Response) {
  clearSessionCookie(res);
}

/**
 * Gate for everything that reads or mutates workspace data. Mount AFTER the
 * genuinely public routes: /api/auth/*, /api/health, and /media/:key — that
 * last one has to stay open because Meta's and GHL's servers fetch post images
 * from it directly and never carry a session cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!authConfigured()) {
    if (isProduction()) {
      return res.status(503).json({
        error: "APP_PASSWORD is not set. Set it in the environment to enable login; refusing to serve an unprotected app in production.",
      });
    }
    return next(); // local dev convenience only
  }
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: "Not authenticated." });
}
