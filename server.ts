import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "node:crypto";
import { attachMedia, db, splitMedia } from "./src/db";

dotenv.config();

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
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
