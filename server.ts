import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "node:crypto";
import { attachMedia, db, splitMedia } from "./src/db";
import { exchangeCode, listIgAccounts, loginUrl, metaConfigured, publishToInstagram, type MetaConnectionRecord } from "./src/meta";
import { createPlannerPost, ghlConfigured, listSocialAccounts as listGhlAccounts } from "./src/ghl";
import { authConfigured, isAuthed, login, logout, requireAuth } from "./src/auth";

// .env.local (documented in README as the local-dev file) takes precedence
// over .env; load .env first so .env.local's values win on overlap.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const hasGeminiKey = () => !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
const hasKlingKeys = () => !!process.env.KLING_ACCESS_KEY && !!process.env.KLING_SECRET_KEY;
const hasHiggsfieldKey = () => !!process.env.HIGGSFIELD_API_KEY;

const ASPECT_DIMS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
};

// ---------- Image providers ----------

async function geminiImage(prompt: string, aspectRatio: string): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: (["1:1", "9:16", "16:9"].includes(aspectRatio) ? aspectRatio : "1:1") as "1:1" | "9:16" | "16:9" } },
  });
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Gemini returned no image data");
}

// Free, keyless image generation — keeps demo mode producing real images.
async function pollinationsImage(prompt: string, aspectRatio: string): Promise<string> {
  const { width, height } = ASPECT_DIMS[aspectRatio] ?? ASPECT_DIMS["1:1"];
  const seed = Math.floor(Math.random() * 1e9);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 600))}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.startsWith("image/")) {
      throw new Error(`Pollinations failed (${res.status})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- Video providers ----------
// Kling and Higgsfield request/response shapes follow their public API docs
// but are unverified without live keys; each provider is isolated so a shape
// mismatch just falls through the cascade to the next provider.

interface VideoOpts {
  prompt?: string;
  imageUrl?: string; // may be a data URL
  aspectRatio: string;
}

function dataUrlToBase64(url: string): string | null {
  const match = url.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : null;
}

function klingJwt(accessKey: string, secretKey: string): string {
  const b64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url({ iss: accessKey, exp: now + 1800, nbf: now - 5 });
  const signature = crypto.createHmac("sha256", secretKey).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function klingVideo(opts: VideoOpts): Promise<string> {
  const token = klingJwt(process.env.KLING_ACCESS_KEY!, process.env.KLING_SECRET_KEY!);
  const base = "https://api.klingai.com/v1";
  const isImageToVideo = !!opts.imageUrl;
  const path = isImageToVideo ? "/videos/image2video" : "/videos/text2video";
  const body: Record<string, unknown> = {
    model_name: "kling-v1-6",
    prompt: opts.prompt || "Cinematic subtle motion, high quality",
    aspect_ratio: opts.aspectRatio,
    duration: "5",
    mode: "std",
  };
  if (isImageToVideo && opts.imageUrl) {
    body.image = dataUrlToBase64(opts.imageUrl) ?? opts.imageUrl;
  }
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const createRes = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok || created.code !== 0) {
    throw new Error(`Kling create failed: ${created.message || createRes.status}`);
  }
  const taskId = created.data?.task_id;
  if (!taskId) throw new Error("Kling returned no task_id");

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000));
    const pollToken = klingJwt(process.env.KLING_ACCESS_KEY!, process.env.KLING_SECRET_KEY!);
    const pollRes = await fetch(`${base}${path}/${taskId}`, { headers: { Authorization: `Bearer ${pollToken}` } });
    const poll = await pollRes.json().catch(() => ({}));
    const status = poll.data?.task_status;
    if (status === "succeed") {
      const url = poll.data?.task_result?.videos?.[0]?.url;
      if (url) return url;
      throw new Error("Kling succeeded but returned no video URL");
    }
    if (status === "failed") throw new Error(`Kling task failed: ${poll.data?.task_status_msg || "unknown"}`);
  }
  throw new Error("Kling task timed out");
}

async function higgsfieldVideo(opts: VideoOpts): Promise<string> {
  const base = "https://platform.higgsfield.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    "hf-api-key": process.env.HIGGSFIELD_API_KEY!,
    Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY!}`,
  };
  const body: Record<string, unknown> = {
    prompt: opts.prompt || "Cinematic subtle motion, high quality",
    aspect_ratio: opts.aspectRatio,
  };
  if (opts.imageUrl && !opts.imageUrl.startsWith("data:")) body.image_url = opts.imageUrl;
  const createRes = await fetch(`${base}/image2video`, { method: "POST", headers, body: JSON.stringify(body) });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) throw new Error(`Higgsfield create failed: ${created.message || createRes.status}`);
  const jobId = created.id || created.job_set_id || created.data?.id;
  if (!jobId) throw new Error("Higgsfield returned no job id");

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000));
    const pollRes = await fetch(`${base}/job-sets/${jobId}`, { headers });
    const poll = await pollRes.json().catch(() => ({}));
    const job = poll.jobs?.[0] ?? poll;
    const status = job.status || poll.status;
    if (status === "completed" || status === "succeed") {
      const url = job.results?.raw?.url || job.result?.url || job.video_url;
      if (url) return url;
      throw new Error("Higgsfield completed but returned no video URL");
    }
    if (status === "failed" || status === "nsfw") throw new Error(`Higgsfield job failed: ${status}`);
  }
  throw new Error("Higgsfield job timed out");
}

async function veoVideo(opts: VideoOpts): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const aspectRatio = opts.aspectRatio === "9:16" ? "9:16" : "16:9";
  const params: Record<string, unknown> = {
    model: 'veo-3.1-lite-generate-preview',
    prompt: opts.prompt || "Cinematic subtle motion, high quality",
    config: { numberOfVideos: 1, resolution: '1080p', aspectRatio },
  };
  if (opts.imageUrl) {
    const base64 = dataUrlToBase64(opts.imageUrl);
    if (base64) {
      const mimeType = opts.imageUrl.slice(5, opts.imageUrl.indexOf(';'));
      params.image = { imageBytes: base64, mimeType };
    }
  }
  let operation = await ai.models.generateVideos(params as any);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Veo returned no video URI");
  return `/api/video-proxy?url=${encodeURIComponent(downloadLink)}`;
}

async function startServer() {
  const app = express();
  // Hosting platforms (Render, Heroku, Fly, …) assign the port via PORT and
  // route traffic to it. Hardcoding 3000 leaves the platform to sniff the
  // listening port instead, which is racy and strands deploys in a health-check
  // loop when it doesn't converge. Fall back to 3000 for local dev.
  const PORT = Number(process.env.PORT) || 3000;

  // Credentialed same-origin requests only: the session cookie must not be
  // readable by arbitrary origins, and the SPA is served from this same origin.
  app.use(cors({ origin: true, credentials: true }));
  // Posts/carousels/brands carry base64 image data URLs (generated images,
  // watermark-composited PNGs, uploaded logos) well past Express's 100kb
  // default — raise the limit so those PUTs don't 413.
  app.use(express.json({ limit: "25mb" }));

  // ---------- Auth (must be registered before the gate below) ----------

  // Unauthenticated liveness probe for the platform health check. Deliberately
  // says nothing about configuration — /api/providers is behind the gate.
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/auth/status", (req, res) => {
    res.json({ authConfigured: authConfigured(), authenticated: authConfigured() ? isAuthed(req) : true });
  });

  app.post("/api/auth/login", (req, res) => {
    if (!authConfigured()) return res.status(400).json({ error: "Login is not configured on this server." });
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!login(res, password)) return res.status(401).json({ error: "Incorrect password." });
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (_req, res) => {
    logout(res);
    res.json({ ok: true });
  });

  // Everything below /api requires a session. Registered here so every route
  // defined later inherits it by default — new endpoints are protected unless
  // someone deliberately mounts them above this line.
  app.use("/api", requireAuth);

  // API Route for Gemini Text
  app.post("/api/generate-text", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }
      
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      let errorMsg = err.message || 'Failed to generate text';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: `Gemini API Error: ${errorMsg}` });
    }
  });

  // API Route for Website Brand Analysis
  app.post("/api/analyze-website", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }

      const { url } = req.body;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL is required." });

      let target: URL;
      try {
        target = new URL(url.startsWith('http') ? url : `https://${url}`);
        if (!['http:', 'https:'].includes(target.protocol)) throw new Error('bad protocol');
      } catch {
        return res.status(400).json({ error: "Please enter a valid website URL." });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let html = '';
      try {
        const siteRes = await fetch(target.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        if (!siteRes.ok) {
          return res.status(502).json({ error: `Could not load the website (HTTP ${siteRes.status}).` });
        }
        html = await siteRes.text();
      } catch {
        return res.status(502).json({ error: "Could not reach that website. Check the URL and try again." });
      } finally {
        clearTimeout(timeout);
      }

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;|&\w+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);

      const siteSummary = [
        `URL: ${target.toString()}`,
        titleMatch ? `Page title: ${titleMatch[1].trim()}` : '',
        descMatch ? `Meta description: ${descMatch[1].trim()}` : '',
        `Page text: ${bodyText}`,
      ].filter(Boolean).join('\n');

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Analyze this website content and extract a brand profile for social media marketing.

${siteSummary}

Return a JSON object with exactly these fields:
- "name": the brand/company name
- "description": 1-2 sentence summary of what they do and their value proposition
- "toneOfVoice": how the brand speaks (e.g. "playful and bold", "professional and reassuring")
- "audience": who their target customers are
- "topics": array of 5-6 short content pillar topics for social posts
- "colors": array of 2-3 hex color codes matching the brand's likely palette (infer from industry/vibe if unknown)`,
        config: { responseMimeType: "application/json" },
      });

      let jsonText = (response.text || '').trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      const brand = JSON.parse(jsonText);
      res.json({ brand });
    } catch (err: any) {
      console.error("Analyze Website Error:", err);
      let errorMsg = err.message || 'Failed to analyze website';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: `Website analysis failed: ${errorMsg}` });
    }
  });

  // API Route for Anthropic
  app.post("/api/anthropic", async (req, res) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          error: "API key missing. Connect your Anthropic API key in the settings or .env file." 
        });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true"
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API Error:", errorText);
        let errorMsg = "Failed to generate content.";
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = `Anthropic API Error: ${parsed.error?.message || errorText}`;
        } catch(e) {
          errorMsg = `Anthropic API Error: ${errorText}`;
        }
        return res.status(response.status).json({ error: errorMsg });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Image generation with provider cascade: Gemini -> Pollinations (free, keyless)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    if (hasGeminiKey()) {
      try {
        const imageUrl = await geminiImage(prompt, aspectRatio);
        return res.json({ imageUrl, provider: "gemini" });
      } catch (err: any) {
        console.error("Gemini Image Error (falling back to Pollinations):", err.message);
      }
    }
    try {
      const imageUrl = await pollinationsImage(prompt, aspectRatio);
      return res.json({ imageUrl, provider: "pollinations" });
    } catch (err: any) {
      console.error("Pollinations Image Error:", err.message);
      return res.status(503).json({ error: "No image provider available right now." });
    }
  });

  // Which media providers are configured (drives Integrations UI status chips)
  app.get("/api/providers", (_req, res) => {
    res.json({
      gemini: hasGeminiKey(),
      kling: hasKlingKeys(),
      higgsfield: hasHiggsfieldKey(),
      pollinations: true,
      canvaTemplateUrl: process.env.CANVA_TEMPLATE_URL || null,
      metaConfigured: metaConfigured(),
      ghlConfigured: ghlConfigured(),
    });
  });

  // Video generation with provider cascade: Kling -> Higgsfield -> Veo
  app.post("/api/generate-video-pro", async (req, res) => {
    const { prompt, imageUrl, aspectRatio = "9:16", provider } = req.body;
    if (!prompt && !imageUrl) {
      return res.status(400).json({ error: "prompt or imageUrl is required." });
    }
    const opts: VideoOpts = { prompt, imageUrl, aspectRatio };

    const all: { name: string; available: boolean; run: (o: VideoOpts) => Promise<string> }[] = [
      { name: "kling", available: hasKlingKeys(), run: klingVideo },
      { name: "higgsfield", available: hasHiggsfieldKey(), run: higgsfieldVideo },
      { name: "veo", available: hasGeminiKey(), run: veoVideo },
    ];
    const candidates = all.filter(p => p.available && (!provider || p.name === provider));

    const attempts: string[] = [];
    for (const p of candidates) {
      try {
        const videoUrl = await p.run(opts);
        return res.json({ videoUrl, provider: p.name });
      } catch (err: any) {
        console.error(`Video provider ${p.name} failed:`, err.message);
        attempts.push(`${p.name}: ${err.message}`);
      }
    }
    res.status(503).json({
      error: "No video provider available — set KLING_ACCESS_KEY/KLING_SECRET_KEY, HIGGSFIELD_API_KEY, or GEMINI_API_KEY.",
      attempts,
    });
  });

  // API Route for Gemini TTS
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }
      const { text, voice = 'Kore' } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required." });

      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr" } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audioUrl: `data:audio/wav;base64,${base64Audio}` });
      } else {
        res.status(500).json({ error: "Failed to generate TTS." });
      }
    } catch (err: any) {
      console.error("Gemini TTS Error:", err);
      let errorMsg = err.message || 'Failed to generate TTS';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route for Video Proxy
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { url } = req.query;
      if (!url || typeof url !== 'string') return res.status(400).send('URL required.');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey || '' }
      });

      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch video.');
      }

      const contentType = response.headers.get('content-type') || 'video/mp4';
      res.setHeader('Content-Type', contentType);
      
      if (response.body) {
        const { Readable } = await import('stream');
        const readable = Readable.fromWeb(response.body as any);
        readable.pipe(res);
      } else {
        res.status(500).send("No video body returned.");
      }
    } catch (err: any) {
      console.error("Video proxy error:", err);
      res.status(500).send("Video proxy error");
    }
  });

  // API Route for Google Veo Video
  app.post("/api/generate-video", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }

      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      let aspectRatio: "16:9" | "9:16" = "16:9";
      if (prompt.includes("9:16")) aspectRatio = "9:16";

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        res.json({ videoUrl: `/api/video-proxy?url=${encodeURIComponent(downloadLink)}` });
      } else {
        res.status(500).json({ error: "Failed to generate video (no URI returned)." });
      }
    } catch (err: any) {
      console.error("Veo Error:", err);
      let errorMsg = err.message || 'Failed to generate video';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // ================ Persistence (SQLite) ================
  // JSON blobs per record; media data URLs split into a separate table so
  // reads stay cheap and one big generated image doesn't bloat the parent row.

  app.get("/api/state", (_req, res) => {
    try {
      const d = db();
      const brands = d.prepare("SELECT data FROM brands ORDER BY created_at ASC").all().map((r: any) => JSON.parse(r.data));
      const campaigns = d.prepare("SELECT data FROM campaigns ORDER BY created_at ASC").all().map((r: any) => JSON.parse(r.data));
      const rawPosts = d.prepare("SELECT data FROM posts ORDER BY created_at ASC").all().map((r: any) => JSON.parse(r.data));
      const mediaRows = d.prepare("SELECT key, data_url FROM media").all() as { key: string; data_url: string }[];
      const mediaByKey = new Map(mediaRows.map(r => [r.key, r.data_url]));
      const posts = rawPosts.map(p => attachMedia(p, mediaByKey));
      const kvRows = d.prepare("SELECT key, value FROM kv").all() as { key: string; value: string }[];
      const kv = Object.fromEntries(kvRows.map(r => [r.key, JSON.parse(r.value)]));
      res.json({
        brands, campaigns, posts,
        activeBrandId: kv.active_brand ?? null,
        settings: kv.settings ?? null,
        integrations: kv.integrations ?? [],
      });
    } catch (err: any) {
      console.error("GET /api/state failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/brands/:id", (req, res) => {
    const { id } = req.params;
    const brand = req.body;
    if (!brand || brand.id !== id) return res.status(400).json({ error: "id mismatch" });
    db().prepare("INSERT INTO brands (id, data, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data")
      .run(id, JSON.stringify(brand), brand.createdAt || new Date().toISOString());
    res.json({ ok: true });
  });

  app.delete("/api/brands/:id", (req, res) => {
    db().prepare("DELETE FROM brands WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.put("/api/campaigns/:id", (req, res) => {
    const { id } = req.params;
    const campaign = req.body;
    if (!campaign || campaign.id !== id) return res.status(400).json({ error: "id mismatch" });
    db().prepare("INSERT INTO campaigns (id, brand_id, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data")
      .run(id, campaign.brandId, JSON.stringify(campaign), campaign.createdAt || new Date().toISOString());
    res.json({ ok: true });
  });

  app.delete("/api/campaigns/:id", (req, res) => {
    const d = db();
    const tx = d.transaction((id: string) => {
      d.prepare("DELETE FROM posts WHERE campaign_id = ?").run(id);
      d.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
    });
    tx(req.params.id);
    res.json({ ok: true });
  });

  app.put("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    const post = req.body;
    if (!post || post.id !== id) return res.status(400).json({ error: "id mismatch" });
    const { media, strippedPost } = splitMedia(post);
    const d = db();
    const tx = d.transaction(() => {
      d.prepare("INSERT INTO posts (id, brand_id, campaign_id, data, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, brand_id = excluded.brand_id, campaign_id = excluded.campaign_id")
        .run(id, post.brandId, post.campaignId ?? null, JSON.stringify(strippedPost), post.createdAt || new Date().toISOString());
      d.prepare("DELETE FROM media WHERE post_id = ?").run(id);
      const insertMedia = d.prepare("INSERT INTO media (key, post_id, data_url, created_at) VALUES (?, ?, ?, ?)");
      const now = new Date().toISOString();
      for (const m of media) insertMedia.run(m.key, id, m.url, now);
    });
    try {
      tx();
      res.json({ ok: true });
    } catch (err: any) {
      console.error("PUT /api/posts failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    db().prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.put("/api/kv/:key", (req, res) => {
    const { key } = req.params;
    if (!/^[a-z_]+$/.test(key)) return res.status(400).json({ error: "invalid key" });
    db().prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, JSON.stringify(req.body?.value ?? null));
    res.json({ ok: true });
  });

  app.post("/api/reset", (_req, res) => {
    const d = db();
    const tx = d.transaction(() => {
      d.prepare("DELETE FROM media").run();
      d.prepare("DELETE FROM posts").run();
      d.prepare("DELETE FROM campaigns").run();
      d.prepare("DELETE FROM brands").run();
      d.prepare("DELETE FROM kv").run();
    });
    tx();
    res.json({ ok: true });
  });

  // ================ Meta (Instagram) publishing ================

  const kvGet = <T>(key: string): T | null => {
    const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : null;
  };
  const kvSet = (key: string, value: unknown) =>
    db().prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, JSON.stringify(value));
  const kvDel = (key: string) => db().prepare("DELETE FROM kv WHERE key = ?").run(key);

  const getMetaConnection = () => kvGet<MetaConnectionRecord>("meta_connection");

  app.get("/api/meta/status", (_req, res) => {
    const conn = getMetaConnection();
    res.json(conn
      ? { connected: true, name: conn.name, expiresAt: conn.expiresAt }
      : { connected: false });
  });

  app.get("/api/meta/login", (_req, res) => {
    if (!metaConfigured()) {
      return res.status(400).send("Set META_APP_ID and META_APP_SECRET first.");
    }
    const state = crypto.randomBytes(16).toString("hex");
    kvSet("meta_oauth_state", { state, createdAt: Date.now() });
    res.redirect(loginUrl(state));
  });

  app.get("/api/meta/callback", async (req, res) => {
    try {
      const { code, state, error_description } = req.query as Record<string, string>;
      if (error_description) return res.redirect(`/?meta=error&reason=${encodeURIComponent(error_description)}`);
      const saved = kvGet<{ state: string; createdAt: number }>("meta_oauth_state");
      kvDel("meta_oauth_state");
      if (!code || !saved || saved.state !== state || Date.now() - saved.createdAt > 10 * 60 * 1000) {
        return res.redirect("/?meta=error&reason=invalid_state");
      }
      const conn = await exchangeCode(code);
      kvSet("meta_connection", conn);
      res.redirect("/?meta=connected");
    } catch (err: any) {
      console.error("Meta callback error:", err.message);
      res.redirect(`/?meta=error&reason=${encodeURIComponent(err.message)}`);
    }
  });

  app.get("/api/meta/accounts", async (_req, res) => {
    const conn = getMetaConnection();
    if (!conn) return res.status(401).json({ error: "Meta account not connected." });
    try {
      res.json({ accounts: await listIgAccounts(conn.accessToken) });
    } catch (err: any) {
      console.error("Meta accounts error:", err.message);
      res.status(502).json({ error: `Could not list Instagram accounts: ${err.message}` });
    }
  });

  app.post("/api/meta/disconnect", (_req, res) => {
    kvDel("meta_connection");
    res.json({ ok: true });
  });

  // Public media route — Meta's servers fetch post media from here.
  app.get("/media/:key", (req, res) => {
    const row = db().prepare("SELECT data_url FROM media WHERE key = ?").get(req.params.key) as { data_url: string } | undefined;
    if (!row) return res.status(404).send("Not found");
    const match = row.data_url.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return res.status(415).send("Unsupported media encoding");
    res.setHeader("Content-Type", match[1]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(match[2], "base64"));
  });

  const loadPostRow = (id: string) => {
    const row = db().prepare("SELECT data FROM posts WHERE id = ?").get(id) as { data: string } | undefined;
    if (!row) return null;
    const post = JSON.parse(row.data);
    const mediaRows = db().prepare("SELECT key, data_url FROM media WHERE post_id = ?").all(id) as { key: string; data_url: string }[];
    return attachMedia(post, new Map(mediaRows.map(r => [r.key, r.data_url])));
  };

  const savePostRow = (post: any) => {
    const { media, strippedPost } = splitMedia(post);
    const d = db();
    const tx = d.transaction(() => {
      d.prepare("UPDATE posts SET data = ? WHERE id = ?").run(JSON.stringify(strippedPost), post.id);
      d.prepare("DELETE FROM media WHERE post_id = ?").run(post.id);
      const ins = d.prepare("INSERT INTO media (key, post_id, data_url, created_at) VALUES (?, ?, ?, ?)");
      const now = new Date().toISOString();
      for (const m of media) ins.run(m.key, post.id, m.url, now);
    });
    tx();
  };

  const findRealAccount = (post: any) => {
    const row = db().prepare("SELECT data FROM brands WHERE id = ?").get(post.brandId) as { data: string } | undefined;
    if (!row) return null;
    const brand = JSON.parse(row.data);
    return (brand.socialAccounts ?? []).find((a: any) => a.platform === post.platform && a.igUserId) ?? null;
  };

  async function publishPost(post: any): Promise<any> {
    const conn = getMetaConnection();
    if (!conn) throw new Error("Meta account not connected.");
    const account = findRealAccount(post);
    if (!account) throw new Error(`No real Instagram account assigned to this brand for ${post.platform}.`);
    const result = await publishToInstagram(post, account, conn.accessToken);
    const updated = {
      ...post,
      status: "posted",
      publishedAt: new Date().toISOString(),
      permalink: result.permalink,
      publishError: null,
    };
    savePostRow(updated);
    return updated;
  }

  app.post("/api/posts/:id/publish", async (req, res) => {
    const post = loadPostRow(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (!getMetaConnection()) return res.status(400).json({ error: "Meta account not connected — connect it in Integrations first." });
    try {
      res.json({ post: await publishPost(post) });
    } catch (err: any) {
      console.error(`Publish failed for post ${post.id}:`, err.message);
      savePostRow({ ...post, publishError: err.message, publishAttempts: (post.publishAttempts ?? 0) + 1 });
      res.status(502).json({ error: err.message });
    }
  });

  // ---- GoHighLevel Social Planner ----

  const loadBrandRow = (brandId: string) => {
    const row = db().prepare("SELECT data FROM brands WHERE id = ?").get(brandId) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  };

  // The brand's GHL location + the account ids a post should go to: prefer
  // accounts matching the post's platform, else all GHL-linked accounts
  // (cross-posting is normal in the planner).
  const ghlTargetsFor = (post: any): { locationId: string; accountIds: string[] } | null => {
    const brand = loadBrandRow(post.brandId);
    const locationId = brand?.ghlSubAccounts?.[0]?.subAccountId;
    if (!locationId) return null;
    const linked = (brand.socialAccounts ?? []).filter((a: any) => a.ghlAccountId);
    if (linked.length === 0) return null;
    const matching = linked.filter((a: any) => a.platform === post.platform);
    const accountIds = (matching.length ? matching : linked).map((a: any) => a.ghlAccountId);
    return { locationId, accountIds };
  };

  app.get("/api/ghl/accounts/:locationId", async (req, res) => {
    if (!ghlConfigured()) return res.status(401).json({ error: "Set GHL_API_TOKEN first — see README." });
    try {
      res.json({ accounts: await listGhlAccounts(req.params.locationId) });
    } catch (err: any) {
      console.error("GHL accounts error:", err.message);
      res.status(502).json({ error: `Could not list GHL accounts: ${err.message}` });
    }
  });

  async function syncPostToGhl(post: any): Promise<any> {
    const targets = ghlTargetsFor(post);
    if (!targets) throw new Error("Link a GHL sub-account to this brand and assign at least one GHL social account first.");
    const result = await createPlannerPost(post, targets.locationId, targets.accountIds);
    const updated = {
      ...post,
      ghlPostId: result.ghlPostId,
      publishError: null,
      ...(result.publishedNow ? { status: "posted", publishedAt: new Date().toISOString() } : {}),
    };
    savePostRow(updated);
    return updated;
  }

  app.post("/api/posts/:id/sync-ghl", async (req, res) => {
    if (!ghlConfigured()) return res.status(400).json({ error: "Set GHL_API_TOKEN first — see README." });
    const post = loadPostRow(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (post.ghlPostId) return res.status(409).json({ error: "Already in the GHL planner.", post });
    try {
      res.json({ post: await syncPostToGhl(post) });
    } catch (err: any) {
      console.error(`GHL sync failed for post ${post.id}:`, err.message);
      savePostRow({ ...post, publishError: err.message, publishAttempts: (post.publishAttempts ?? 0) + 1 });
      res.status(502).json({ error: err.message });
    }
  });

  // Auto-publish worker, every 60s. GHL branch first: approved posts due
  // within 24h are pushed into the GHL planner ahead of time (GHL owns the
  // exact-time publishing). Direct-Meta branch handles the rest. Both are
  // dormant unless configured — demo mode never logs errors.
  const runScheduler = async () => {
    if (!ghlConfigured() && !(metaConfigured() && getMetaConnection())) return; // fully dormant in demo mode
    const rows = db().prepare("SELECT id FROM posts").all() as { id: string }[];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const horizonIso = new Date(now + 24 * 3600 * 1000).toISOString();

    for (const { id } of rows) {
      const post = loadPostRow(id);
      if (!post || post.status !== "scheduled" || (post.publishAttempts ?? 0) >= 3) continue;

      // Branch 1: GHL planner sync (24h ahead)
      if (ghlConfigured() && !post.ghlPostId && post.scheduledAt <= horizonIso && ghlTargetsFor(post)) {
        try {
          await syncPostToGhl(post);
          console.log(`Synced post ${id} (${post.platform}) to GHL planner`);
        } catch (err: any) {
          console.error(`GHL sync failed for ${id} (attempt ${(post.publishAttempts ?? 0) + 1}/3):`, err.message);
          savePostRow({ ...post, publishError: err.message, publishAttempts: (post.publishAttempts ?? 0) + 1 });
        }
        continue;
      }
      if (post.ghlPostId) continue; // GHL owns it from here

      // Branch 2: direct Meta publish at due time
      if (metaConfigured() && getMetaConnection() && post.scheduledAt <= nowIso && findRealAccount(post)) {
        try {
          await publishPost(post);
          console.log(`Auto-published post ${id} (${post.platform}) via Meta`);
        } catch (err: any) {
          console.error(`Auto-publish failed for ${id} (attempt ${(post.publishAttempts ?? 0) + 1}/3):`, err.message);
          savePostRow({ ...post, publishError: err.message, publishAttempts: (post.publishAttempts ?? 0) + 1 });
        }
      }
    }
  };
  setInterval(() => { runScheduler().catch(err => console.error("Scheduler tick failed:", err.message)); }, 60 * 1000);

  // Warm the connection so first request is snappy
  db();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
